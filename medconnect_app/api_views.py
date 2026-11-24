"""
medconnect_app/api_views.py
Django REST Framework & JSON API Endpoints for MedConnect.
Handles asynchronous operations: Cart, Wishlist, Prescriptions OCR,
Live GPS Tracking, AI Medical Tutor, Reminders, Subscriptions, Addresses.
"""

import os
import re
import json
import uuid
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from medconnect_app.db import (
    get_cart_col, get_medicines_col, get_wishlist_col,
    get_prescriptions_col, get_reminders_col, get_subscriptions_col,
    get_addresses_col, get_payment_methods_col, get_tracking_col,
    get_orders_col, serialize_doc, serialize_docs,
    find_by_id, update_by_id, delete_by_id
)
from medconnect_app.ocr_scanner import scan_prescription
from medconnect_app.ai_tutor import generate_tutor_response


def get_current_user_id(request):
    user_id = request.session.get('user_id')
    if not user_id:
        from medconnect_app.seed_data import seed_database
        from medconnect_app.db import get_users_col
        seed_database()
        demo = get_users_col().find_one({"email": "demo@medconnect.com"})
        if demo:
            user_id = str(demo['_id'])
            request.session['user_id'] = user_id
    return user_id


# ==============================================================================
# CART APIS
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def add_to_cart_api(request):
    """
    Adds medicine to MongoDB cart collection.
    Saves medicine name, price, quantity, and STRICTLY these four details:
    1. Manufacturing Date
    2. Expiry Date
    3. Contents / Composition
    4. Uses
    """
    user_id = get_current_user_id(request)
    data = request.data or {}
    med_id = data.get('medicine_id')
    qty = int(data.get('quantity', 1))

    if not med_id:
        return Response({'success': False, 'error': 'Medicine ID is required'}, status=400)

    med_col = get_medicines_col()
    med = med_col.find_one({"_id": str(med_id)})
    if not med:
        try:
            med = med_col.find_one({"_id": ObjectId(med_id)})
        except Exception:
            pass
    if not med:
        return Response({'success': False, 'error': 'Medicine not found in catalog'}, status=404)

    cart_col = get_cart_col()
    existing_item = cart_col.find_one({
        "user_id": user_id,
        "medicine_id": str(med["_id"])
    })

    if existing_item:
        new_qty = existing_item.get('quantity', 1) + qty
        update_by_id(
            cart_col,
            existing_item["_id"],
            {"$set": {"quantity": new_qty}}
        )
    else:
        # Save ONLY the medicine name, price, quantity, and 4 specific medicine details
        cart_item_doc = {
            "user_id": user_id,
            "medicine_id": str(med["_id"]),
            "name": med.get("name"),
            "price": float(med.get("price", 0.0)),
            "quantity": qty,
            # THE FOUR STRICT DETAILS:
            "manufacturing_date": med.get("manufacturing_date", "2026-03-01"),
            "expiry_date": med.get("expiry_date", "2028-03-01"),
            "contents": med.get("contents", "Active pharmaceutical composition"),
            "uses": med.get("uses", "General health and therapeutics."),
            "image": med.get("image", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        cart_col.insert_one(cart_item_doc)

    # Compute updated totals
    cart_items = list(cart_col.find({"user_id": user_id}))
    total_qty = sum(item.get('quantity', 1) for item in cart_items)
    subtotal = sum(item.get('price', 0) * item.get('quantity', 1) for item in cart_items)

    return Response({
        'success': True,
        'message': f"{med.get('name')} added to your cart successfully!",
        'cart_count': total_qty,
        'subtotal': round(subtotal, 2)
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def update_cart_quantity_api(request):
    """Updates quantity of an item in the cart or removes it if qty <= 0."""
    user_id = get_current_user_id(request)
    data = request.data or {}
    cart_item_id = data.get('cart_item_id')
    change = int(data.get('change', 0))
    target_qty = data.get('quantity')

    if not cart_item_id:
        return Response({'success': False, 'error': 'Cart item ID is required'}, status=400)

    cart_col = get_cart_col()
    item = find_by_id(cart_col, cart_item_id, extra={"user_id": user_id})
    if not item:
        return Response({'success': False, 'error': 'Cart item not found'}, status=404)

    if target_qty is not None:
        new_qty = int(target_qty)
    else:
        new_qty = item.get('quantity', 1) + change

    if new_qty <= 0:
        delete_by_id(cart_col, cart_item_id)
        is_deleted = True
        item_total = 0.0
    else:
        update_by_id(cart_col, cart_item_id, {"$set": {"quantity": new_qty}})
        is_deleted = False
        item_total = round(new_qty * item.get('price', 0), 2)

    cart_items = list(cart_col.find({"user_id": user_id}))
    total_count = sum(i.get('quantity', 1) for i in cart_items)
    subtotal = sum(i.get('price', 0) * i.get('quantity', 1) for i in cart_items)
    delivery_fee = 0.00 if (subtotal >= 200 or subtotal == 0) else 15.00
    grand_total = subtotal + delivery_fee

    return Response({
        'success': True,
        'is_deleted': is_deleted,
        'quantity': new_qty,
        'item_total': item_total,
        'cart_count': total_count,
        'subtotal': round(subtotal, 2),
        'delivery_fee': round(delivery_fee, 2),
        'total': round(grand_total, 2)
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def remove_from_cart_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    cart_item_id = data.get('cart_item_id')

    if not cart_item_id:
        return Response({'success': False, 'error': 'Cart item ID is required'}, status=400)

    cart_col = get_cart_col()
    delete_by_id(cart_col, cart_item_id, extra={"user_id": user_id})

    cart_items = list(cart_col.find({"user_id": user_id}))
    total_count = sum(i.get('quantity', 1) for i in cart_items)
    subtotal = sum(i.get('price', 0) * i.get('quantity', 1) for i in cart_items)
    delivery_fee = 0.00 if (subtotal >= 200 or subtotal == 0) else 15.00
    grand_total = subtotal + delivery_fee

    return Response({
        'success': True,
        'message': 'Medicine removed from cart',
        'cart_count': total_count,
        'subtotal': round(subtotal, 2),
        'delivery_fee': round(delivery_fee, 2),
        'total': round(grand_total, 2)
    })


# ==============================================================================
# WISHLIST APIS
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def toggle_wishlist_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    med_id = data.get('medicine_id')

    if not med_id:
        return Response({'success': False, 'error': 'Medicine ID is required'}, status=400)

    wishlist_col = get_wishlist_col()
    existing = wishlist_col.find_one({"user_id": user_id, "medicine_id": str(med_id)})

    if existing:
        delete_by_id(wishlist_col, existing["_id"])
        in_wishlist = False
        message = "Removed from wishlist"
    else:
        med_col = get_medicines_col()
        med = med_col.find_one({"_id": str(med_id)})
        if not med:
            try:
                med = med_col.find_one({"_id": ObjectId(med_id)})
            except Exception:
                pass
        if not med:
            return Response({'success': False, 'error': 'Medicine not found'}, status=404)

        wishlist_doc = {
            "user_id": user_id,
            "medicine_id": str(med["_id"]),
            "name": med.get("name"),
            "price": med.get("price"),
            "category": med.get("category"),
            "manufacturer": med.get("manufacturer"),
            "dosage": med.get("dosage"),
            "image": med.get("image", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        wishlist_col.insert_one(wishlist_doc)
        in_wishlist = True
        message = "Saved to wishlist"

    count = wishlist_col.count_documents({"user_id": user_id})
    return Response({
        'success': True,
        'in_wishlist': in_wishlist,
        'wishlist_count': count,
        'message': message
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def wishlist_to_cart_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    item_id = data.get('item_id')

    wishlist_col = get_wishlist_col()
    wish_item = wishlist_col.find_one({"_id": str(item_id), "user_id": user_id})
    if not wish_item:
        return Response({'success': False, 'error': 'Wishlist item not found'}, status=404)

    med_id = wish_item.get('medicine_id')
    med = get_medicines_col().find_one({"_id": str(med_id)})

    cart_col = get_cart_col()
    existing = cart_col.find_one({"user_id": user_id, "medicine_id": str(med_id)})
    if existing:
        cart_col.update_one({"_id": str(existing["_id"])}, {"$inc": {"quantity": 1}})
    else:
        cart_doc = {
            "user_id": user_id,
            "medicine_id": str(med_id),
            "name": wish_item.get("name"),
            "price": float(wish_item.get("price", 0.0)),
            "quantity": 1,
            # Strictly maintain the 4 details
            "manufacturing_date": med.get("manufacturing_date", "2026-03-01") if med else "2026-03-01",
            "expiry_date": med.get("expiry_date", "2028-03-01") if med else "2028-03-01",
            "contents": med.get("contents", "Active therapeutic agents") if med else "Active ingredients",
            "uses": med.get("uses", "Clinical health guidance") if med else "General medical indication",
            "image": wish_item.get("image", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        cart_col.insert_one(cart_doc)

    delete_by_id(wishlist_col, item_id)
    total_qty = sum(i.get('quantity', 1) for i in cart_col.find({"user_id": user_id}))

    return Response({
        'success': True,
        'message': 'Moved to cart successfully!',
        'cart_count': total_qty
    })


# ==============================================================================
# PRESCRIPTION OCR & SCANNER APIS
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def upload_prescription_ocr_api(request):
    """
    Accepts uploaded prescription image or PDF, saves to media,
    scans using OCR engine, extracts medicine names, dosage, frequency, duration,
    and returns verified preview data for the user.
    """
    user_id = get_current_user_id(request)
    file_obj = request.FILES.get('prescription_file')

    if not file_obj:
        return Response({'success': False, 'error': 'No prescription file provided'}, status=400)

    # Save to media/prescriptions
    upload_dir = settings.MEDIA_ROOT / 'prescriptions'
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = os.path.splitext(file_obj.name)[1].lower()
    unique_name = f"rx_{user_id[:8]}_{uuid.uuid4().hex[:8]}{file_ext}"
    saved_path = upload_dir / unique_name

    with open(saved_path, 'wb+') as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)

    file_url = f"{settings.MEDIA_URL}prescriptions/{unique_name}"

    # Run OCR Scanning Engine
    ocr_results = scan_prescription(saved_path)

    # Save record in MongoDB prescriptions collection
    rx_doc = {
        "user_id": user_id,
        "file_name": file_obj.name,
        "file_url": file_url,
        "file_type": file_ext.replace('.', '').upper(),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "Verified & Extracted",
        "doctor_info": ocr_results.get("doctor_info", {}),
        "medicines": ocr_results.get("medicines", []),
        "medicines_count": ocr_results.get("count", 0)
    }
    res = get_prescriptions_col().insert_one(rx_doc)

    return Response({
        'success': True,
        'prescription_id': str(res.inserted_id),
        'file_url': file_url,
        'doctor_info': ocr_results.get("doctor_info"),
        'medicines': ocr_results.get("medicines"),
        'count': ocr_results.get("count"),
        'message': 'Prescription scanned successfully! Please verify medicines below.'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_and_add_to_cart_api(request):
    """
    Allows user to confirm or edit OCR-extracted medicines and adds them directly
    into the MongoDB Cart with the strict 4 required medicine details!
    """
    user_id = get_current_user_id(request)
    data = request.data or {}
    items = data.get('medicines', [])

    if not items:
        return Response({'success': False, 'error': 'No medicines provided for ordering'}, status=400)

    cart_col = get_cart_col()
    med_col = get_medicines_col()
    added_count = 0

    for item in items:
        med_name = item.get('name', '').strip()
        qty = int(item.get('quantity', 1))

        # Look up matched medicine in MongoDB
        db_med = med_col.find_one({"name": {"$regex": f"^{re.escape(med_name)}", "$options": "i"}})
        if not db_med:
            # Create a realistic catalog entry if it was custom prescribed
            db_med = {
                "_id": str(ObjectId()),
                "name": med_name,
                "price": float(item.get('price', 45.00)),
                "manufacturing_date": "2026-03-10",
                "expiry_date": "2028-03-10",
                "contents": item.get('dosage', 'Prescription formulation'),
                "uses": f"Prescribed for {item.get('instructions', 'clinical therapy')}",
                "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
            }

        existing_cart = cart_col.find_one({"user_id": user_id, "name": db_med.get("name")})
        if existing_cart:
            update_by_id(cart_col, existing_cart["_id"], {"$inc": {"quantity": qty}})
        else:
            cart_doc = {
                "user_id": user_id,
                "medicine_id": str(db_med.get("_id", ObjectId())),
                "name": db_med.get("name"),
                "price": float(db_med.get("price", 50.0)),
                "quantity": qty,
                # STRICT REQUIREMENT DETAILS:
                "manufacturing_date": db_med.get("manufacturing_date", "2026-03-01"),
                "expiry_date": db_med.get("expiry_date", "2028-03-01"),
                "contents": db_med.get("contents", "Active therapeutic agents"),
                "uses": db_med.get("uses", "Relief and clinical management"),
                "image": db_med.get("image", ""),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            cart_col.insert_one(cart_doc)
        added_count += 1

    total_qty = sum(i.get('quantity', 1) for i in cart_col.find({"user_id": user_id}))

    return Response({
        'success': True,
        'message': f"{added_count} prescribed medicines added to your cart!",
        'cart_count': total_qty
    })


# ==============================================================================
# LIVE TRACKING APIS
# ==============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def tracking_data_api(request, order_number):
    """Returns live tracking coordinates, delivery status, and simulated driver movement."""
    tracking_col = get_tracking_col()
    track = tracking_col.find_one({"order_number": str(order_number)})

    if not track:
        # Fallback to default active order
        track = tracking_col.find_one({"status": "out_for_delivery"})
    if not track:
        track = tracking_col.find_one({})

    if not track:
        return Response({'success': False, 'error': 'Tracking record not found'}, status=404)

    return Response({'success': True, 'tracking': serialize_doc(track)})


@api_view(['POST'])
@permission_classes([AllowAny])
def simulate_driver_movement_api(request, order_number):
    """
    Simulates real-world GPS driver advancement along route.
    Increments driver coordinates closer to customer destination,
    decrements ETA, and updates live order status to Delivered at Doorstep!
    """
    tracking_col = get_tracking_col()
    orders_col = get_orders_col()
    track = tracking_col.find_one({"order_number": str(order_number)})
    if not track:
        return Response({'success': False, 'error': 'Order not found'}, status=404)

    driver_coords = track.get("driver_coords", {"lat": 39.7895, "lng": -89.6450})
    dest_coords = track.get("destination_coords", {"lat": 39.7990, "lng": -89.6430})
    eta = track.get("eta_minutes", 15)
    dist = track.get("distance_km", 2.0)
    current_status = track.get("status", "out_for_delivery")

    # If already delivered at doorstep
    if current_status == "delivered" or eta <= 0 or dist <= 0.0:
        return Response({
            'success': True,
            'driver_coords': dest_coords,
            'eta_minutes': 0,
            'distance_km': 0.0,
            'current_step': 4,
            'status': 'delivered',
            'is_delivered': True,
            'status_label': 'Delivered at Doorstep',
            'steps': track.get("steps", [])
        })

    # Step driver closer (25% of remaining distance)
    d_lat = (dest_coords["lat"] - driver_coords["lat"]) * 0.28
    d_lng = (dest_coords["lng"] - driver_coords["lng"]) * 0.28

    new_lat = round(driver_coords["lat"] + d_lat, 6)
    new_lng = round(driver_coords["lng"] + d_lng, 6)
    new_eta = max(0, eta - 2)
    new_dist = max(0.0, round(dist - 0.4, 1))

    now = datetime.now(timezone.utc)
    now_str = now.strftime("%I:%M %p")

    # When driver is within 0.2km or ETA reaches 0 -> ARRIVED AT DOORSTEP & DELIVERED!
    is_delivered = (new_eta == 0 or new_dist <= 0.2)

    steps = track.get("steps", [])
    if is_delivered:
        new_lat = dest_coords["lat"]
        new_lng = dest_coords["lng"]
        new_eta = 0
        new_dist = 0.0
        new_status = "delivered"
        current_step = 4
        # Mark all steps done including Doorstep Delivery milestone
        for s in steps:
            s["done"] = True
            if s.get("title") == "Arrived at Destination" or "Doorstep" in s.get("title", ""):
                s["title"] = "Delivered at Doorstep"
                s["time"] = now_str
        # Update order in orders_col to Delivered
        orders_col.update_one({"order_number": str(order_number)}, {"$set": {"status": "Delivered"}})
    else:
        new_status = "out_for_delivery"
        current_step = 3 if new_eta > 2 else 4

    update_fields = {
        "driver_coords": {"lat": new_lat, "lng": new_lng},
        "eta_minutes": new_eta,
        "distance_km": new_dist,
        "status": new_status,
        "current_step": current_step,
        "steps": steps
    }
    tracking_col.update_one({"order_number": str(order_number)}, {"$set": update_fields})

    return Response({
        'success': True,
        'driver_coords': {"lat": new_lat, "lng": new_lng},
        'eta_minutes': new_eta,
        'distance_km': new_dist,
        'current_step': current_step,
        'status': new_status,
        'is_delivered': is_delivered,
        'status_label': 'Delivered at Doorstep' if is_delivered else 'Out for Delivery',
        'steps': steps
    })


# ==============================================================================
# AI TUTOR APIS
# ==============================================================================

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def ai_tutor_chat_api(request):
    """Processes user medical question and returns intelligent clinical guidance."""
    data = request.data or {}
    message = data.get('message', '').strip()

    if not message:
        return Response({'success': False, 'error': 'Please enter a message or medicine query.'}, status=400)

    tutor_reply = generate_tutor_response(message)
    return Response({'success': True, 'data': tutor_reply})


# ==============================================================================
# REMINDERS APIS
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def add_reminder_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}

    med_name = data.get('medicine_name', '').strip()
    dosage = data.get('dosage', '').strip()
    time_val = data.get('scheduled_time', '09:00').strip()
    instruction = data.get('instruction', 'Take with water').strip()
    category = data.get('category', 'General')
    days = data.get('days', ['Daily'])

    if not med_name:
        return Response({'success': False, 'error': 'Medicine name is required'}, status=400)

    doc = {
        "user_id": user_id,
        "medicine_name": med_name,
        "dosage": dosage or "1 tablet",
        "scheduled_time": time_val,
        "scheduled_days": days if isinstance(days, list) else [days],
        "instruction": instruction,
        "is_taken": False,
        "is_active": True,
        "category": category,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    res = get_reminders_col().insert_one(doc)

    user_reminders = list(get_reminders_col().find({"user_id": user_id}))
    taken_count = sum(1 for r in user_reminders if r.get('is_taken'))
    pending_count = len(user_reminders) - taken_count

    return Response({
        'success': True,
        'message': f"Reminder for {med_name} created at {time_val}!",
        'reminder_id': str(res.inserted_id),
        'taken_count': taken_count,
        'pending_count': pending_count
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def toggle_reminder_taken_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    rem_id = data.get('reminder_id')

    if not rem_id:
        return Response({'success': False, 'error': 'Reminder ID is required'}, status=400)

    rem_col = get_reminders_col()
    rem = find_by_id(rem_col, rem_id, extra={"user_id": user_id})
    if not rem:
        return Response({'success': False, 'error': 'Reminder not found'}, status=404)

    new_state = not rem.get('is_taken', False)
    update_by_id(rem_col, rem_id, {"$set": {"is_taken": new_state}})

    user_reminders = list(rem_col.find({"user_id": user_id}))
    taken_count = sum(1 for r in user_reminders if r.get('is_taken'))
    pending_count = len(user_reminders) - taken_count

    return Response({
        'success': True,
        'is_taken': new_state,
        'taken_count': taken_count,
        'pending_count': pending_count,
        'message': 'Medicine marked as taken! Dose recorded in adherence log.' if new_state else 'Marked as pending.'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def delete_reminder_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    rem_id = data.get('reminder_id')

    rem_col = get_reminders_col()
    delete_by_id(rem_col, rem_id, extra={"user_id": user_id})

    user_reminders = list(rem_col.find({"user_id": user_id}))
    taken_count = sum(1 for r in user_reminders if r.get('is_taken'))
    pending_count = len(user_reminders) - taken_count

    return Response({
        'success': True,
        'taken_count': taken_count,
        'pending_count': pending_count,
        'message': 'Reminder deleted successfully.'
    })


# ==============================================================================
# SUBSCRIPTIONS APIS
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def create_subscription_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}

    med_name = data.get('medicine_name', '').strip()
    freq = data.get('frequency', 'Monthly')
    qty = int(data.get('quantity', 1))

    if not med_name:
        return Response({'success': False, 'error': 'Medicine name is required'}, status=400)

    med = get_medicines_col().find_one({"name": med_name})
    price = float(med.get('price', 50.0)) * qty if med else 50.0 * qty

    days_offset = 30 if freq == 'Monthly' else (14 if freq == 'Bi-Weekly' else 7)
    next_date = (datetime.now() + timedelta(days=days_offset)).strftime("%d %b %Y")

    doc = {
        "user_id": user_id,
        "medicine_name": med_name,
        "category": med.get("category", "General") if med else "General",
        "quantity": qty,
        "frequency": freq,
        "next_delivery": next_date,
        "status": "Active",
        "price": round(price, 2),
        "payment_mode": "Auto-Refill (Saved Card)",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    res = get_subscriptions_col().insert_one(doc)

    return Response({
        'success': True,
        'message': f"Subscribed to {med_name} with {freq} deliveries!",
        'subscription_id': str(res.inserted_id)
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def toggle_subscription_status_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    sub_id = data.get('subscription_id')
    new_status = data.get('status', 'Active')

    get_subscriptions_col().update_one(
        {"_id": str(sub_id), "user_id": user_id},
        {"$set": {"status": new_status}}
    )
    return Response({'success': True, 'status': new_status, 'message': f"Subscription marked as {new_status}."})


# ==============================================================================
# ADDRESSES & PAYMENT METHODS APIS
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def save_address_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}

    label = data.get('label', 'Home').strip()
    recipient_name = data.get('recipient_name', '').strip()
    phone = data.get('phone', '').strip()
    street = data.get('street', '').strip()
    city = data.get('city', '').strip()
    state = data.get('state', '').strip()
    postal_code = data.get('postal_code', '').strip()

    addr_col = get_addresses_col()
    is_first = (addr_col.count_documents({"user_id": user_id}) == 0)

    doc = {
        "user_id": user_id,
        "label": label,
        "recipient_name": recipient_name,
        "phone": phone,
        "street": street,
        "city": city,
        "state": state,
        "postal_code": postal_code,
        "is_default": is_first or data.get('is_default', False)
    }
    res = addr_col.insert_one(doc)

    return Response({
        'success': True,
        'message': f"Address '{label}' saved successfully!",
        'address_id': str(res.inserted_id)
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def delete_address_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    addr_id = data.get('address_id')

    delete_by_id(get_addresses_col(), addr_id, extra={"user_id": user_id})
    return Response({'success': True, 'message': 'Address removed.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def save_payment_method_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}

    method_type = data.get('method_type', 'card')
    pm_col = get_payment_methods_col()

    if method_type == 'card':
        card_num = data.get('card_number', '4242')
        last_4 = card_num[-4:] if len(card_num) >= 4 else "4242"
        doc = {
            "user_id": user_id,
            "method_type": "card",
            "card_number_masked": f"•••• •••• •••• {last_4}",
            "card_brand": data.get('brand', 'Visa'),
            "holder_name": data.get('holder_name', 'Alex Morgan'),
            "expiry": data.get('expiry', '12/28'),
            "is_default": False
        }
    elif method_type == 'upi':
        doc = {
            "user_id": user_id,
            "method_type": "upi",
            "upi_id": data.get('upi_id', 'user@upi'),
            "is_default": False
        }
    else:
        doc = {
            "user_id": user_id,
            "method_type": "cod",
            "is_default": False
        }

    res = pm_col.insert_one(doc)
    return Response({'success': True, 'message': 'Payment method added securely!', 'id': str(res.inserted_id)})


@api_view(['POST'])
@permission_classes([AllowAny])
def delete_payment_method_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    pm_id = data.get('payment_method_id')

    delete_by_id(get_payment_methods_col(), pm_id, extra={"user_id": user_id})
    return Response({'success': True, 'message': 'Payment method removed.'})


# ==============================================================================
# REORDER API
# ==============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def reorder_api(request):
    user_id = get_current_user_id(request)
    data = request.data or {}
    order_id = data.get('order_id')

    orders_col = get_orders_col()
    order = orders_col.find_one({"_id": str(order_id), "user_id": user_id})
    if not order:
        order = orders_col.find_one({"order_number": str(order_id), "user_id": user_id})
    if not order:
        return Response({'success': False, 'error': 'Order not found'}, status=404)

    cart_col = get_cart_col()
    items = order.get('items', [])
    for it in items:
        existing = cart_col.find_one({"user_id": user_id, "name": it.get('name')})
        if existing:
            cart_col.update_one({"_id": str(existing["_id"])}, {"$inc": {"quantity": it.get('quantity', 1)}})
        else:
            cart_doc = {
                "user_id": user_id,
                "medicine_id": str(it.get('medicine_id', ObjectId())),
                "name": it.get('name'),
                "price": float(it.get('price', 0.0)),
                "quantity": it.get('quantity', 1),
                "manufacturing_date": it.get('manufacturing_date', '2026-03-01'),
                "expiry_date": it.get('expiry_date', '2028-03-01'),
                "contents": it.get('contents', 'Active ingredients'),
                "uses": it.get('uses', 'Therapeutic indication'),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            cart_col.insert_one(cart_doc)

    total_qty = sum(i.get('quantity', 1) for i in cart_col.find({"user_id": user_id}))
    return Response({
        'success': True,
        'message': f"Items from {order.get('order_number')} re-added to your cart!",
        'cart_count': total_qty
    })
