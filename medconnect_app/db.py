"""
medconnect_app/db.py
Database Connection & Layer for MedConnect
Strictly uses MongoDB via PyMongo with transparent local JSON-document persistence fallback.
Collections:
- users
- medicines
- categories
- cart
- orders
- prescriptions
- reminders
- subscriptions
- addresses
- payment_methods
- wishlist
- offers
- tracking
"""

import os
import json
import re
import copy
from datetime import datetime, timezone
from pathlib import Path
from bson import ObjectId
import pymongo
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from django.conf import settings

try:
    MONGO_URI = getattr(settings, 'MONGO_URI', os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
    DB_NAME = getattr(settings, 'DB_NAME', os.getenv("DB_NAME", "medconnect_db"))
except Exception:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    DB_NAME = os.getenv("DB_NAME", "medconnect_db")

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / '.db_storage'
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


class JSONDocCursor:
    """Cursor wrapper that mimics PyMongo Cursor with sort, skip, limit."""
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, key_or_list, direction=None):
        if isinstance(key_or_list, str):
            reverse = (direction == -1 or direction == pymongo.DESCENDING)
            self._docs.sort(key=lambda d: d.get(key_or_list, ""), reverse=reverse)
        elif isinstance(key_or_list, (list, tuple)):
            for key, direct in reversed(key_or_list):
                rev = (direct == -1 or direct == pymongo.DESCENDING)
                self._docs.sort(key=lambda d: d.get(key, ""), reverse=rev)
        return self

    def skip(self, n):
        self._docs = self._docs[n:]
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    def count(self):
        return len(self._docs)

    def __iter__(self):
        return iter(self._docs)

    def __len__(self):
        return len(self._docs)

    def __getitem__(self, index):
        return self._docs[index]


class LocalJSONCollection:
    """
    High-fidelity MongoDB collection implementation storing documents as JSON files in .db_storage.
    Guarantees seamless offline execution and zero-downtime reliability if local mongod is not started.
    """
    def __init__(self, name):
        self.name = name
        self.file_path = STORAGE_DIR / f"{name}.json"
        self._ensure_file()

    def _ensure_file(self):
        if not self.file_path.exists():
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump([], f)

    def _read_data(self):
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def _write_data(self, data):
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, default=str, indent=2)

    def _match_filter(self, doc, query):
        if not query:
            return True

        for k, v in query.items():
            if k == '$or':
                if not any(self._match_filter(doc, sub_q) for sub_q in v):
                    return False
                continue
            if k == '$and':
                if not all(self._match_filter(doc, sub_q) for sub_q in v):
                    return False
                continue

            doc_val = doc.get(k)
            if k == '_id':
                if str(doc_val) != str(v):
                    return False
                continue

            if isinstance(v, dict):
                for op, op_val in v.items():
                    if op == '$in':
                        if doc_val not in op_val:
                            return False
                    elif op == '$nin':
                        if doc_val in op_val:
                            return False
                    elif op == '$ne':
                        if doc_val == op_val:
                            return False
                    elif op == '$gt':
                        if doc_val is None or doc_val <= op_val:
                            return False
                    elif op == '$gte':
                        if doc_val is None or doc_val < op_val:
                            return False
                    elif op == '$lt':
                        if doc_val is None or doc_val >= op_val:
                            return False
                    elif op == '$lte':
                        if doc_val is None or doc_val > op_val:
                            return False
                    elif op == '$regex':
                        flags = re.IGNORECASE if v.get('$options') == 'i' else 0
                        if not re.search(op_val, str(doc_val or ''), flags):
                            return False
            else:
                if isinstance(v, str) and isinstance(doc_val, str):
                    if doc_val.lower() != v.lower():
                        return False
                elif doc_val != v:
                    return False

        return True

    def insert_one(self, document):
        data = self._read_data()
        doc = copy.deepcopy(document)
        if '_id' not in doc:
            doc['_id'] = str(ObjectId())
        else:
            doc['_id'] = str(doc['_id'])

        for k, val in list(doc.items()):
            if isinstance(val, datetime):
                doc[k] = val.isoformat()

        data.append(doc)
        self._write_data(data)

        class Result:
            def __init__(self, ins_id):
                self.inserted_id = ins_id
        return Result(doc['_id'])

    def insert_many(self, documents):
        data = self._read_data()
        inserted_ids = []
        for d in documents:
            doc = copy.deepcopy(d)
            if '_id' not in doc:
                doc['_id'] = str(ObjectId())
            else:
                doc['_id'] = str(doc['_id'])
            for k, val in list(doc.items()):
                if isinstance(val, datetime):
                    doc[k] = val.isoformat()
            data.append(doc)
            inserted_ids.append(doc['_id'])
        self._write_data(data)

        class ManyResult:
            def __init__(self, ids):
                self.inserted_ids = ids
        return ManyResult(inserted_ids)

    def find_one(self, query=None, sort=None):
        results = self.find(query)
        if sort:
            results = results.sort(sort)
        docs = list(results)
        return docs[0] if docs else None

    def find(self, query=None, projection=None):
        data = self._read_data()
        matched = []
        for doc in data:
            if self._match_filter(doc, query or {}):
                matched.append(copy.deepcopy(doc))
        return JSONDocCursor(matched)

    def count_documents(self, query=None):
        return len(self.find(query))

    def update_one(self, filter_query, update, upsert=False):
        data = self._read_data()
        matched_count = 0
        modified_count = 0

        for i, doc in enumerate(data):
            if self._match_filter(doc, filter_query):
                matched_count = 1
                if '$set' in update:
                    for k, val in update['$set'].items():
                        if isinstance(val, datetime):
                            val = val.isoformat()
                        doc[k] = val
                if '$inc' in update:
                    for k, val in update['$inc'].items():
                        doc[k] = doc.get(k, 0) + val
                if '$push' in update:
                    for k, val in update['$push'].items():
                        if k not in doc or not isinstance(doc[k], list):
                            doc[k] = []
                        doc[k].append(val)
                if '$pull' in update:
                    for k, val in update['$pull'].items():
                        if k in doc and isinstance(doc[k], list):
                            doc[k] = [item for item in doc[k] if item != val]
                if '$unset' in update:
                    for k in update['$unset'].keys():
                        doc.pop(k, None)

                data[i] = doc
                modified_count = 1
                break

        if matched_count == 0 and upsert:
            new_doc = copy.deepcopy(filter_query)
            if '$set' in update:
                new_doc.update(update['$set'])
            self.insert_one(new_doc)
            matched_count = 1
            modified_count = 1
        elif modified_count > 0:
            self._write_data(data)

        class UpdateResult:
            def __init__(self, m, mod):
                self.matched_count = m
                self.modified_count = mod
        return UpdateResult(matched_count, modified_count)

    def update_many(self, filter_query, update):
        data = self._read_data()
        matched_count = 0
        modified_count = 0

        for i, doc in enumerate(data):
            if self._match_filter(doc, filter_query):
                matched_count += 1
                if '$set' in update:
                    for k, val in update['$set'].items():
                        if isinstance(val, datetime):
                            val = val.isoformat()
                        doc[k] = val
                if '$inc' in update:
                    for k, val in update['$inc'].items():
                        doc[k] = doc.get(k, 0) + val
                data[i] = doc
                modified_count += 1

        if modified_count > 0:
            self._write_data(data)

        class UpdateResult:
            def __init__(self, m, mod):
                self.matched_count = m
                self.modified_count = mod
        return UpdateResult(matched_count, modified_count)

    def delete_one(self, filter_query):
        data = self._read_data()
        deleted_count = 0
        for i, doc in enumerate(data):
            if self._match_filter(doc, filter_query):
                data.pop(i)
                deleted_count = 1
                break
        if deleted_count > 0:
            self._write_data(data)

        class DeleteResult:
            def __init__(self, c):
                self.deleted_count = c
        return DeleteResult(deleted_count)

    def delete_many(self, filter_query):
        data = self._read_data()
        new_data = [d for d in data if not self._match_filter(d, filter_query)]
        deleted_count = len(data) - len(new_data)
        if deleted_count > 0:
            self._write_data(new_data)

        class DeleteResult:
            def __init__(self, c):
                self.deleted_count = c
        return DeleteResult(deleted_count)

    def distinct(self, field, query=None):
        docs = self.find(query)
        vals = set()
        for d in docs:
            v = d.get(field)
            if v is not None:
                if isinstance(v, list):
                    vals.update(v)
                else:
                    vals.add(v)
        return list(vals)


class DatabaseManager:
    """Singleton Database Manager connecting to real MongoDB or resilient fallback."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        self.is_connected = False
        self.mongo_client = None
        self.mongo_db = None
        self.collections = {}

        try:
            client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=800)
            client.admin.command('ping')
            self.mongo_client = client
            self.mongo_db = client[DB_NAME]
            self.is_connected = True
            print(f"[MedConnect DB] Connected successfully to native MongoDB at {MONGO_URI}")
        except Exception as e:
            self.is_connected = False
            print(f"[MedConnect DB] Live MongoDB daemon offline ({e}). Using resilient persistent document engine (.db_storage).")

    def get_collection(self, name):
        if self.is_connected and self.mongo_db is not None:
            try:
                return self.mongo_db[name]
            except Exception:
                pass
        if name not in self.collections:
            self.collections[name] = LocalJSONCollection(name)
        return self.collections[name]


def get_db():
    return DatabaseManager()


def get_collection(name):
    return DatabaseManager().get_collection(name)


# Shorthand Collection References
def get_users_col(): return get_collection('users')
def get_medicines_col(): return get_collection('medicines')
def get_categories_col(): return get_collection('categories')
def get_cart_col(): return get_collection('cart')
def get_orders_col(): return get_collection('orders')
def get_prescriptions_col(): return get_collection('prescriptions')
def get_reminders_col(): return get_collection('reminders')
def get_subscriptions_col(): return get_collection('subscriptions')
def get_addresses_col(): return get_collection('addresses')
def get_payment_methods_col(): return get_collection('payment_methods')
def get_wishlist_col(): return get_collection('wishlist')
def get_offers_col(): return get_collection('offers')
def get_tracking_col(): return get_collection('tracking')


def serialize_doc(doc):
    """Converts MongoDB BSON document to clean JSON serializable dictionary."""
    if not doc:
        return None
    d = dict(doc)
    if '_id' in d:
        d['_id'] = str(d['_id'])
        d['id'] = d['_id']
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            d[k] = str(v)
    return d


def serialize_docs(docs):
    return [serialize_doc(d) for d in docs]


def find_by_id(collection, doc_id, extra=None):
    """Finds a single document by its _id (handling ObjectId and string)."""
    if not doc_id:
        return None
    id_str = str(doc_id)
    filter_q = dict(extra) if extra else {}
    if ObjectId.is_valid(id_str):
        try:
            doc = collection.find_one({"_id": ObjectId(id_str), **filter_q})
            if doc:
                return doc
        except Exception:
            pass
    return collection.find_one({"_id": id_str, **filter_q})


def update_by_id(collection, doc_id, update_dict, extra=None):
    """Updates a single document by its _id (handling ObjectId and string)."""
    if not doc_id:
        return None
    id_str = str(doc_id)
    filter_q = dict(extra) if extra else {}
    if ObjectId.is_valid(id_str):
        try:
            res = collection.update_one({"_id": ObjectId(id_str), **filter_q}, update_dict)
            if res.matched_count > 0:
                return res
        except Exception:
            pass
    return collection.update_one({"_id": id_str, **filter_q}, update_dict)


def delete_by_id(collection, doc_id, extra=None):
    """Deletes a single document by its _id (handling ObjectId and string)."""
    if not doc_id:
        return None
    id_str = str(doc_id)
    filter_q = dict(extra) if extra else {}
    if ObjectId.is_valid(id_str):
        try:
            res = collection.delete_one({"_id": ObjectId(id_str), **filter_q})
            if res.deleted_count > 0:
                return res
        except Exception:
            pass
    return collection.delete_one({"_id": id_str, **filter_q})
