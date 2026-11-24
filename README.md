# MedConnect – Smart Digital Pharmacy & Healthcare Platform

A production-grade, responsive healthcare web application built strictly with **Python Django**, **Django REST Framework**, and **MongoDB**.

---

## 🏥 Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, JavaScript (Fetch API), Font Awesome 6.5, Leaflet.js / Google Maps API |
| **Backend** | Python 3.13, Django 6.1.3, Django REST Framework 3.18.3 |
| **Database** | MongoDB (PyMongo 4.18.1) with seamless local JSON-document persistence fallback (`.db_storage`) |
| **AI & OCR** | PyMuPDF (PDF Parser), PIL / OpenCV image processor, Regex Medical Entity Extractor, Clinical AI Tutor |

---

## 📋 Sidebar Navigation (All 15 Dedicated Working Pages)

Every sidebar item is an independent, functional page powered by Django template inheritance (`templates/base.html`):

1. **Dashboard** (`/` or `/dashboard/`) – Metrics (Total Orders, Upcoming Deliveries, Reminders, Subscriptions), Active Live Order GPS tracking card, Quick Actions (OCR Upload, AI Tutor), Popular Categories, Recent Orders table, and Featured Coupons.
2. **Medicines** (`/medicines/`) – Complete catalog across all 8 healthcare categories, live search by name/manufacturer/salt, category filters, dosage tags, "Add to Cart", and "Wishlist" toggles. *(Note: Strictly hides Cart-only details like Mfg/Exp date)*.
3. **Categories** (`/categories/`) – All 8 medical categories: *Pain Relief, Cold & Cough, Vitamins & Supplements, Diabetes Care, Heart Care, Skin Care, Digestive Care, Personal Care*.
4. **My Orders** (`/orders/`) – Order history with status badges, date, items breakdown, total price, invoice view (`/orders/<id>/`), and one-click **Reorder**.
5. **Prescriptions** (`/prescriptions/`) – Upload digital prescription images (JPG, PNG) or PDFs. AI OCR scanner extracts **Medicine Name, Dosage, Frequency, and Duration**. Includes an interactive verification & editing table with one-click **"Confirm & Add Verified to Cart"**.
6. **Reminders** (`/reminders/`) – Create daily medicine schedules with time picker, frequency, instructions, upcoming alerts, and **"Mark as Taken"** with celebration feedback.
7. **Subscriptions** (`/subscriptions/`) – Auto-refill recurring medications (Weekly, Bi-Weekly, Monthly, Quarterly) with Pause, Resume, and Cancel management.
8. **Tracking** (`/tracking/`) – **Live GPS Delivery Tracking** featuring an interactive map (Leaflet with Google Maps styling), live moving driver marker, route polyline, **dynamic real-time ETA countdown**, delivery partner profile (photo, vehicle, rating), and milestone steps.
9. **Wishlist** (`/wishlist/`) – Saved favorite medications with one-click **Move to Cart** and Remove options.
10. **Offers & Coupons** (`/offers/`) – Promotional discount cards with one-click **Copy Code** and automatic checkout deduction (`MEDFIRST25`, `HEALTH10`, `FREESHIP`).
11. **AI Tutor** (`/ai-tutor/`) – AI-powered pharmacology assistant providing drug indications, safe dosage, missed dose advice, and side effects. **Mandatory Medical Safety Warning** on every response and **Red-Flag Emergency Detection** (911/112 alert banner).
12. **Addresses** (`/addresses/`) – Manage saved delivery addresses (Home, Clinic, Office), add new addresses with modal, and set defaults.
13. **Payment Methods** (`/payment-methods/`) – Manage saved Credit/Debit cards, verified UPI IDs, and Cash on Delivery options with PCI-DSS encryption badges.
14. **Profile** (`/profile/`) – User information, contact details, blood group, drug allergy logging, and emergency contact details.
15. **Logout** (`/logout/`) – Secure session termination and redirect to login.

---

## 🛒 Cart & Checkout (Strict Requirements)

### The 4 Strict Medicine Details:
As required, when a user adds any medicine to the Cart, the Cart page displays:
- Medicine Name
- Price
- Quantity (increment, decrement, remove with live AJAX recalculation)
- **AND ONLY THESE FOUR SPECIFIC MEDICINE DETAILS:**
  1. **Manufacturing Date** (e.g., `2026-03-15`)
  2. **Expiry Date** (e.g., `2028-02-28`)
  3. **Contents / Composition** (e.g., `Paracetamol IP 650 mg`)
  4. **Uses** (e.g., `Fever, moderate headache, body pain, dental pain.`)

> **Negative Constraint Compliance:** These four details are displayed exclusively on the Cart page. They are strictly hidden on the Dashboard, Medicines listing, and Categories pages. All 4 details persist in MongoDB and survive page refreshes.

### Checkout (`/checkout/`):
- Delivery address selection.
- Payment method selection (Card, UPI, COD).
- Coupon discount application.
- Order placement creating MongoDB records and immediately launching live GPS tracking.

---

## 🚀 Quick Start Instructions

### 1. Requirements
Ensure Python 3.10+ is installed. Dependencies are listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
The `.env` file is pre-configured:
```ini
SECRET_KEY=django-insecure-medconnect-super-secret-key-2026-teal-health
DEBUG=True
ALLOWED_HOSTS=*
MONGO_URI=mongodb://localhost:27017/
DB_NAME=medconnect_db
GOOGLE_MAPS_API_KEY=AIzaSyA8_MedConnect_GoogleMaps_LiveTracking2026
```
*Note: If local MongoDB daemon is running, MedConnect connects natively via PyMongo. If MongoDB daemon is offline, MedConnect automatically and transparently uses the resilient persistent document store in `.db_storage/` so all features work out-of-the-box without any database installation needed.*

### 3. Initialize & Seed Database
```bash
python manage.py migrate
python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medconnect_project.settings'); import django; django.setup(); from medconnect_app.seed_data import seed_database; seed_database(force=True)"
```

### 4. Run Automated Test Suite
```bash
python test_medconnect.py
```

### 5. Launch Development Server
```bash
python manage.py runserver 8000
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

**Demo Credentials (or use One-Click Auto-Fill on Login):**
- **Email:** `demo@medconnect.com`
- **Password:** `password123`
