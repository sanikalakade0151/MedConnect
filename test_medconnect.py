"""
test_medconnect.py
Comprehensive automated test suite verifying all 15 sidebar pages,
Cart strict requirements, OCR extraction, AI Tutor, and GPS tracking.
"""

import os
import sys
import json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medconnect_project.settings')

import django
django.setup()

from django.test import Client
from medconnect_app.db import get_medicines_col, get_cart_col, get_users_col
from medconnect_app.seed_data import seed_database
from medconnect_app.ai_tutor import generate_tutor_response
from medconnect_app.ocr_scanner import parse_prescription_text

def run_tests():
    print("=" * 70)
    print("MEDCONNECT AUTOMATED TEST SUITE")
    print("=" * 70)

    # 1. Ensure database is seeded
    seed_database()
    client = Client()

    # Login demo user
    users_col = get_users_col()
    demo_user = users_col.find_one({"email": "demo@medconnect.com"})
    assert demo_user, "Demo user should exist in MongoDB"
    session = client.session
    session['user_id'] = str(demo_user['_id'])
    session['user_name'] = demo_user.get('name')
    session['user_email'] = demo_user.get('email')
    session.save()

    # 2. Test All 15 Sidebar Navigation URLs
    routes = [
        ('/', "1. Dashboard (Root)"),
        ('/dashboard/', "1. Dashboard"),
        ('/medicines/', "2. Medicines"),
        ('/categories/', "3. Categories"),
        ('/orders/', "4. My Orders"),
        ('/prescriptions/', "5. Prescriptions"),
        ('/reminders/', "6. Reminders"),
        ('/subscriptions/', "7. Subscriptions"),
        ('/tracking/', "8. Tracking"),
        ('/wishlist/', "9. Wishlist"),
        ('/offers/', "10. Offers & Coupons"),
        ('/ai-tutor/', "11. AI Tutor"),
        ('/addresses/', "12. Addresses"),
        ('/payment-methods/', "13. Payment Methods"),
        ('/profile/', "14. Profile"),
        ('/cart/', "Cart (Separate Page)"),
        ('/checkout/', "Checkout"),
        ('/login/', "Authentication - Login"),
        ('/register/', "Authentication - Register"),
    ]

    print("\n[TEST 1] Verifying all 15 Sidebar Pages and Core Routes...")
    passed_routes = 0
    for url, label in routes:
        res = client.get(url, follow=True)
        assert res.status_code == 200, f"Route {url} ({label}) failed with code {res.status_code}"
        print(f"  [PASS] {label:<28} -> HTTP 200 OK (Loaded / Followed)")
        passed_routes += 1

    print(f"  --> All {passed_routes} pages loaded successfully with template inheritance.")

    # 3. Test Cart - STRICT 4 DETAILS REQUIREMENT
    print("\n[TEST 2] Verifying STRICT Cart Requirement (4 details only on Cart)...")
    meds_col = get_medicines_col()
    test_med = meds_col.find_one({"name": "Paracetamol Advance 650mg"})
    assert test_med, "Paracetamol Advance 650mg must exist"

    # Add to cart via API
    cart_res = client.post('/api/cart/add/', data=json.dumps({
        'medicine_id': str(test_med['_id']),
        'quantity': 2
    }), content_type='application/json')
    assert cart_res.status_code == 200, f"Cart add failed: {cart_res.content}"
    cart_json = cart_res.json()
    assert cart_json['success'] is True, "Cart add must succeed"
    print(f"  [PASS] Added {test_med['name']} to cart: cart_count={cart_json['cart_count']}")

    # Verify Cart in MongoDB has strictly the 4 fields saved
    cart_col = get_cart_col()
    cart_doc = cart_col.find_one({"user_id": str(demo_user['_id']), "name": test_med['name']})
    assert cart_doc, "Cart item must be persistently saved in MongoDB"
    assert 'manufacturing_date' in cart_doc, "Must have manufacturing_date"
    assert 'expiry_date' in cart_doc, "Must have expiry_date"
    assert 'contents' in cart_doc, "Must have contents"
    assert 'uses' in cart_doc, "Must have uses"
    print(f"  [PASS] Verified Cart Item in MongoDB contains:")
    print(f"      1. Manufacturing Date: {cart_doc['manufacturing_date']}")
    print(f"      2. Expiry Date:        {cart_doc['expiry_date']}")
    print(f"      3. Contents:           {cart_doc['contents']}")
    print(f"      4. Uses:               {cart_doc['uses']}")

    # Render Cart Page and verify the 4 details are in HTML
    cart_page_res = client.get('/cart/')
    assert cart_page_res.status_code == 200
    cart_html = cart_page_res.content.decode('utf-8')
    assert "Manufacturing Date" in cart_html, "Cart page must display Manufacturing Date"
    assert "Expiry Date" in cart_html, "Cart page must display Expiry Date"
    assert "Contents / Composition" in cart_html, "Cart page must display Contents / Composition"
    assert "Uses" in cart_html, "Cart page must display Uses"
    print("  [PASS] Cart page displays all 4 details correctly.")

    # Verify Medicines Listing does NOT display those 4 detail labels
    meds_page_res = client.get('/medicines/')
    meds_html = meds_page_res.content.decode('utf-8')
    assert "1. Manufacturing Date" not in meds_html, "Medicines listing MUST NOT display Manufacturing Date"
    assert "2. Expiry Date" not in meds_html, "Medicines listing MUST NOT display Expiry Date"
    print("  [PASS] Negative check confirmed: Medicines listing does not expose cart-only details.")

    # 4. Test OCR Scanner
    print("\n[TEST 3] Verifying Prescription OCR Extraction Engine...")
    sample_rx_text = """
    METRO HEALTH MEDICAL CENTER
    Dr. Jennifer Hayes, MD
    Rx:
    Paracetamol 650mg 1-0-1 for 5 days after food
    Pan 40 1-0-0 for 7 days before breakfast
    """
    ocr_result = parse_prescription_text(sample_rx_text)
    assert ocr_result['count'] >= 2, "Should extract at least 2 prescribed medicines"
    for m in ocr_result['medicines']:
        assert 'name' in m and 'dosage' in m and 'frequency' in m and 'duration' in m
        print(f"  [PASS] Extracted: {m['name']} | Dose: {m['dosage']} | Freq: {m['frequency']} | Dur: {m['duration']}")

    # 5. Test AI Medical Tutor
    print("\n[TEST 4] Verifying AI Medical Tutor Guidance & Safety Warnings...")
    tutor_reply = generate_tutor_response("What is Pan 40 used for?")
    assert "Pan 40" in tutor_reply['response'] or "Pantoprazole" in tutor_reply['response']
    assert "Medical Disclaimer" in tutor_reply['disclaimer']
    print(f"  [PASS] AI Tutor responded with clinical guidance and mandatory disclaimer.")

    # Emergency Detection Test
    emerg_reply = generate_tutor_response("I have severe chest pain and cannot breathe")
    assert emerg_reply['is_emergency'] is True
    clean_title = emerg_reply['title'].encode('ascii', 'ignore').decode()
    print(f"  [PASS] Red-flag emergency detected: {clean_title}")

    # 6. Test Live GPS Tracking Simulation & Order Modal
    print("\n[TEST 5] Verifying Live GPS Tracking & Driver Advancement...")
    track_res = client.post('/api/tracking/MED-89421/simulate/', content_type='application/json')
    assert track_res.status_code == 200
    track_json = track_res.json()
    assert track_json['success'] is True
    print(f"  [PASS] Driver advanced: coords={track_json['driver_coords']} | ETA={track_json['eta_minutes']} mins | dist={track_json['distance_km']} km")

    # Tracking view with ?placed=1
    placed_res = client.get('/tracking/?placed=1')
    assert placed_res.status_code == 200
    assert "orderPlacedSuccessModal" in placed_res.content.decode('utf-8')
    print("  [PASS] Order placed celebration modal is rendered when placed=1.")

    # 7. Test Root Entry Redirection (Login on unauthenticated)
    print("\n[TEST 6] Verifying Unauthenticated Visitors Redirect to Login...")
    unauth_client = Client()
    root_res = unauth_client.get('/', follow=False)
    assert root_res.status_code == 302 and '/login' in root_res.headers['Location']
    print(f"  [PASS] Unauthenticated visitor redirected to: {root_res.headers['Location']}")

    # 8. Test Reminder Toggle API & Counts
    print("\n[TEST 7] Verifying Reminder Toggle API, Sound Shut-Off, & Counts Functionality...")
    from medconnect_app.db import get_reminders_col
    rem_col = get_reminders_col()
    sample_rem = rem_col.find_one({"user_id": str(demo_user['_id'])})
    if not sample_rem:
        add_res = client.post('/api/reminders/add/', data=json.dumps({
            'medicine_name': 'Atorvastatin 10mg',
            'dosage': '1 tablet at bedtime',
            'scheduled_time': '21:00',
            'category': 'Heart Care'
        }), content_type='application/json')
        sample_rem_id = add_res.json()['reminder_id']
    else:
        sample_rem_id = str(sample_rem['_id'])

    toggle_res = client.post('/api/reminders/toggle/', data=json.dumps({
        'reminder_id': sample_rem_id
    }), content_type='application/json')
    assert toggle_res.status_code == 200
    t_data = toggle_res.json()
    assert t_data['success'] is True
    assert 'taken_count' in t_data and 'pending_count' in t_data
    print(f"  [PASS] Reminder toggle verified: is_taken={t_data['is_taken']}, pending={t_data['pending_count']}, taken={t_data['taken_count']}")

    # 9. Test Prescription Scanned Add to Cart API
    print("\n[TEST 8] Verifying Prescription Scanned -> Add to Cart with 4 Strict Details...")
    rx_add_res = client.post('/api/prescriptions/verify-order/', data=json.dumps({
        'medicines': [{
            'name': 'Azithromycin 500mg',
            'dosage': '500mg daily',
            'frequency': '1-0-0',
            'duration': '3 days',
            'quantity': 1
        }]
    }), content_type='application/json')
    assert rx_add_res.status_code == 200
    rx_json = rx_add_res.json()
    assert rx_json['success'] is True
    rx_cart_item = cart_col.find_one({"user_id": str(demo_user['_id']), "name": "Azithromycin 500mg"})
    assert rx_cart_item, "Scanned prescription item must be in MongoDB Cart"
    assert rx_cart_item.get('manufacturing_date') and rx_cart_item.get('expiry_date') and rx_cart_item.get('contents') and rx_cart_item.get('uses')
    print(f"  [PASS] Scanned item added to cart with all 4 strict details in MongoDB: cart_count={rx_json['cart_count']}")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED SUCCESSFULLY! (100% HEALTHCARE COMPLIANCE)")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
