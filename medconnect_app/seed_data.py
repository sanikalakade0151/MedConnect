"""
medconnect_app/seed_data.py
Database Seeder for MedConnect.
Populates realistic healthcare data across all 8 required categories,
rich medicines with manufacturing date, expiry date, composition, uses,
sample orders, active tracking, reminders, subscriptions, coupons, and addresses.
"""

import os
from datetime import datetime, timedelta, timezone
import bcrypt
from medconnect_app.db import (
    get_users_col, get_medicines_col, get_categories_col,
    get_orders_col, get_reminders_col, get_subscriptions_col,
    get_offers_col, get_addresses_col, get_payment_methods_col,
    get_tracking_col, get_wishlist_col
)


def hash_password(plain_text):
    return bcrypt.hashpw(plain_text.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def seed_database(force=False):
    users_col = get_users_col()
    medicines_col = get_medicines_col()
    categories_col = get_categories_col()
    offers_col = get_offers_col()

    if not force and medicines_col.count_documents({}) > 0:
        print("[MedConnect Seeder] Database already populated. Skipping seed.")
        return

    print("[MedConnect Seeder] Populating database with realistic healthcare catalog...")

    # 1. Seed Categories (8 Strict Required Categories)
    categories = [
        {
            "id": "pain-relief",
            "name": "Pain Relief",
            "slug": "pain-relief",
            "description": "Fast-acting relief from headaches, body ache, joint and muscle pain.",
            "icon": "fa-pills",
            "bg_color": "#e0f2fe",
            "color": "#0284c7"
        },
        {
            "id": "cold-cough",
            "name": "Cold & Cough",
            "slug": "cold-cough",
            "description": "Syrups, lozenges and decongestants for flu and chest congestion.",
            "icon": "fa-head-side-cough",
            "bg_color": "#fef3c7",
            "color": "#d97706"
        },
        {
            "id": "vitamins-supplements",
            "name": "Vitamins & Supplements",
            "slug": "vitamins-supplements",
            "description": "Essential multivitamins, calcium, minerals and daily immunity boosters.",
            "icon": "fa-capsules",
            "bg_color": "#dcfce7",
            "color": "#16a34a"
        },
        {
            "id": "diabetes-care",
            "name": "Diabetes Care",
            "slug": "diabetes-care",
            "description": "Blood glucose regulation tablets, test strips, meters and insulin accessories.",
            "icon": "fa-droplet",
            "bg_color": "#fee2e2",
            "color": "#dc2626"
        },
        {
            "id": "heart-care",
            "name": "Heart Care",
            "slug": "heart-care",
            "description": "Cardiovascular wellness, BP management and cholesterol control tablets.",
            "icon": "fa-heart-pulse",
            "bg_color": "#fce7f3",
            "color": "#db2777"
        },
        {
            "id": "skin-care",
            "name": "Skin Care",
            "slug": "skin-care",
            "description": "Dermatological ointments, antiseptic creams and therapeutic lotions.",
            "icon": "fa-hand-sparkles",
            "bg_color": "#ede9fe",
            "color": "#7c3aed"
        },
        {
            "id": "digestive-care",
            "name": "Digestive Care",
            "slug": "digestive-care",
            "description": "Antacids, enzymes, probiotics and remedies for acidity and indigestion.",
            "icon": "fa-shield-virus",
            "bg_color": "#ccfbf1",
            "color": "#0d9488"
        },
        {
            "id": "personal-care",
            "name": "Personal Care",
            "slug": "personal-care",
            "description": "Hygiene essentials, daily wellness, oral care and sanitizers.",
            "icon": "fa-pump-medical",
            "bg_color": "#e0e7ff",
            "color": "#4f46e5"
        }
    ]

    for cat in categories:
        categories_col.update_one({"id": cat["id"]}, {"$set": cat}, upsert=True)

    # 2. Seed Medicines (with manufacturing date, expiry date, contents/composition, uses)
    medicines = [
        # Pain Relief
        {
            "name": "Paracetamol Advance 650mg",
            "category": "Pain Relief",
            "category_slug": "pain-relief",
            "price": 32.50,
            "mrp": 40.00,
            "manufacturer": "GlaxoSmithKline Pharmaceuticals",
            "dosage": "650mg tablet (1-2 times daily after food)",
            "manufacturing_date": "2026-03-15",
            "expiry_date": "2028-02-28",
            "contents": "Paracetamol IP 650 mg",
            "uses": "Fever, moderate headache, body pain, dental pain, and post-vaccination discomfort.",
            "stock": 140,
            "rating": 4.8,
            "reviews_count": 312,
            "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Ibuprofen & Paracetamol Gel Caps",
            "category": "Pain Relief",
            "category_slug": "pain-relief",
            "price": 68.00,
            "mrp": 85.00,
            "manufacturer": "Abbott Healthcare",
            "dosage": "400mg + 325mg capsule",
            "manufacturing_date": "2026-02-10",
            "expiry_date": "2027-12-31",
            "contents": "Ibuprofen 400 mg, Paracetamol 325 mg",
            "uses": "Severe muscular pain, inflammation, backache, arthritic flare-ups, and sprains.",
            "stock": 85,
            "rating": 4.7,
            "reviews_count": 180,
            "image": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },
        {
            "name": "Diclofenac Sodium Gel 30g",
            "category": "Pain Relief",
            "category_slug": "pain-relief",
            "price": 95.00,
            "mrp": 120.00,
            "manufacturer": "Novartis India",
            "dosage": "Apply 3-4 times daily externally on affected area",
            "manufacturing_date": "2026-01-20",
            "expiry_date": "2028-01-15",
            "contents": "Diclofenac Diethylamine 1.16% w/w, Linseed Oil 3%, Methyl Salicylate 10%",
            "uses": "Topical relief for joint stiffness, neck strain, sports injuries, and knee pain.",
            "stock": 110,
            "rating": 4.9,
            "reviews_count": 225,
            "image": "https://images.unsplash.com/photo-1550572017-ed200f5e58b9?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },

        # Cold & Cough
        {
            "name": "Ascoril-D Cough Syrup 100ml",
            "category": "Cold & Cough",
            "category_slug": "cold-cough",
            "price": 115.00,
            "mrp": 135.00,
            "manufacturer": "Glenmark Pharmaceuticals",
            "dosage": "10ml twice daily with warm water",
            "manufacturing_date": "2026-04-01",
            "expiry_date": "2027-10-30",
            "contents": "Dextromethorphan HBr 10 mg, Phenylephrine HCl 5 mg, Chlorpheniramine Maleate 2 mg",
            "uses": "Dry irritating cough, throat tickle, nasal allergy, watery eyes, and runny nose.",
            "stock": 90,
            "rating": 4.6,
            "reviews_count": 145,
            "image": "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Cetirizine Hydrochloride 10mg",
            "category": "Cold & Cough",
            "category_slug": "cold-cough",
            "price": 28.00,
            "mrp": 38.00,
            "manufacturer": "Cipla Ltd",
            "dosage": "10mg tablet once daily at bedtime",
            "manufacturing_date": "2026-03-05",
            "expiry_date": "2028-05-15",
            "contents": "Cetirizine Dihydrochloride IP 10 mg",
            "uses": "Seasonal allergic rhinitis, sneezing, hay fever, and hives.",
            "stock": 200,
            "rating": 4.8,
            "reviews_count": 420,
            "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },
        {
            "name": "Vicks Vaporizing Inhaler & Rub 50g",
            "category": "Cold & Cough",
            "category_slug": "cold-cough",
            "price": 140.00,
            "mrp": 160.00,
            "manufacturer": "Procter & Gamble",
            "dosage": "Apply gently to chest, neck and back before bed",
            "manufacturing_date": "2026-02-15",
            "expiry_date": "2028-08-30",
            "contents": "Camphor 5.26%, Menthol 2.82%, Eucalyptus Oil 1.33%",
            "uses": "Clears nasal congestion, eases labored breathing and calms nighttime coughing.",
            "stock": 130,
            "rating": 4.9,
            "reviews_count": 510,
            "image": "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },

        # Vitamins & Supplements
        {
            "name": "Becozym C Forte Multivitamin Tablets",
            "category": "Vitamins & Supplements",
            "category_slug": "vitamins-supplements",
            "price": 54.00,
            "mrp": 65.00,
            "manufacturer": "Bayer Consumer Care",
            "dosage": "1 tablet daily after breakfast",
            "manufacturing_date": "2026-01-10",
            "expiry_date": "2027-11-20",
            "contents": "Vitamin B-Complex (B1, B2, B6, B12, Niacinamide, Calcium Pantothenate) + Vitamin C 150 mg",
            "uses": "Mouth ulcers, energy restoration, tissue repair, nervous system maintenance, and immunity.",
            "stock": 160,
            "rating": 4.8,
            "reviews_count": 390,
            "image": "https://images.unsplash.com/photo-1550572017-4fcdbb590e5b?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Shelcal 500 Calcium & Vitamin D3",
            "category": "Vitamins & Supplements",
            "category_slug": "vitamins-supplements",
            "price": 128.00,
            "mrp": 145.00,
            "manufacturer": "Torrent Pharmaceuticals",
            "dosage": "1 tablet daily after main meal",
            "manufacturing_date": "2026-03-22",
            "expiry_date": "2028-04-10",
            "contents": "Elemental Calcium 500 mg, Vitamin D3 (Cholecalciferol) 250 IU",
            "uses": "Osteoporosis prevention, bone mineral density, dental strength, and joint cartilage support.",
            "stock": 115,
            "rating": 4.9,
            "reviews_count": 275,
            "image": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },
        {
            "name": "Limcee Vitamin C 500mg Chewable",
            "category": "Vitamins & Supplements",
            "category_slug": "vitamins-supplements",
            "price": 24.00,
            "mrp": 30.00,
            "manufacturer": "Abbott India Ltd",
            "dosage": "1 chewable tablet daily",
            "manufacturing_date": "2026-04-12",
            "expiry_date": "2028-09-30",
            "contents": "Ascorbic Acid IP 100 mg, Sodium Ascorbate IP 450 mg (Eq. Vitamin C 500 mg)",
            "uses": "Potent antioxidant protection, collagen synthesis, wound healing, and infection resistance.",
            "stock": 250,
            "rating": 4.8,
            "reviews_count": 620,
            "image": "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },

        # Diabetes Care
        {
            "name": "Glycomet 500 SR Tablet",
            "category": "Diabetes Care",
            "category_slug": "diabetes-care",
            "price": 42.00,
            "mrp": 50.00,
            "manufacturer": "USV Private Limited",
            "dosage": "500mg sustained release with evening meal",
            "manufacturing_date": "2026-02-28",
            "expiry_date": "2028-03-15",
            "contents": "Metformin Hydrochloride IP 500 mg (Sustained Release)",
            "uses": "Type 2 diabetes glycemic control, insulin sensitivity, and hepatic glucose moderation.",
            "stock": 175,
            "rating": 4.7,
            "reviews_count": 330,
            "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Accu-Chek Active 50 Glucose Test Strips",
            "category": "Diabetes Care",
            "category_slug": "diabetes-care",
            "price": 890.00,
            "mrp": 1050.00,
            "manufacturer": "Roche Diagnostics",
            "dosage": "Use 1 strip per capillary blood glucose test",
            "manufacturing_date": "2026-03-01",
            "expiry_date": "2027-09-30",
            "contents": "Mutarotase, GDH-FAD reagent coated electro-chemical test strips",
            "uses": "Accurate quantitative self-monitoring of blood glucose levels for diabetic patients.",
            "stock": 60,
            "rating": 4.9,
            "reviews_count": 480,
            "image": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },
        {
            "name": "Januvia 100mg Sitagliptin Tablets",
            "category": "Diabetes Care",
            "category_slug": "diabetes-care",
            "price": 380.00,
            "mrp": 420.00,
            "manufacturer": "MSD Pharmaceuticals",
            "dosage": "100mg once daily with or without food",
            "manufacturing_date": "2026-01-15",
            "expiry_date": "2028-02-10",
            "contents": "Sitagliptin Phosphate Monohydrate 100 mg",
            "uses": "DPP-4 inhibition to naturally stimulate post-prandial insulin secretion in Type 2 diabetes.",
            "stock": 45,
            "rating": 4.8,
            "reviews_count": 95,
            "image": "https://images.unsplash.com/photo-1550572017-ed200f5e58b9?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },

        # Heart Care
        {
            "name": "Atorva 10 Atorvastatin Tablets",
            "category": "Heart Care",
            "category_slug": "heart-care",
            "price": 78.00,
            "mrp": 92.00,
            "manufacturer": "Zydus Cadila",
            "dosage": "10mg tablet once daily at bedtime",
            "manufacturing_date": "2026-02-10",
            "expiry_date": "2028-06-25",
            "contents": "Atorvastatin Calcium IP eq. to Atorvastatin 10 mg",
            "uses": "Lowers LDL cholesterol and triglycerides, raises HDL, reduces risk of heart attack and stroke.",
            "stock": 120,
            "rating": 4.9,
            "reviews_count": 290,
            "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Telma 40 Blood Pressure Tablets",
            "category": "Heart Care",
            "category_slug": "heart-care",
            "price": 105.00,
            "mrp": 125.00,
            "manufacturer": "Glenmark Pharma",
            "dosage": "40mg tablet once in the morning",
            "manufacturing_date": "2026-03-18",
            "expiry_date": "2028-07-31",
            "contents": "Telmisartan IP 40 mg",
            "uses": "Essential hypertension management, vascular wall protection, and kidney health in hypertensive patients.",
            "stock": 95,
            "rating": 4.8,
            "reviews_count": 210,
            "image": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },
        {
            "name": "Ecosprin 75 Cardioprotective Tablets",
            "category": "Heart Care",
            "category_slug": "heart-care",
            "price": 9.50,
            "mrp": 12.00,
            "manufacturer": "USV Private Limited",
            "dosage": "75mg tablet daily after lunch",
            "manufacturing_date": "2026-04-05",
            "expiry_date": "2028-11-20",
            "contents": "Aspirin (Acetylsalicylic Acid) Gastro-resistant IP 75 mg",
            "uses": "Inhibits blood clot formation in arteries, secondary prevention of stroke and angina.",
            "stock": 300,
            "rating": 4.9,
            "reviews_count": 750,
            "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },

        # Skin Care
        {
            "name": "Betadine 5% Antiseptic Ointment 20g",
            "category": "Skin Care",
            "category_slug": "skin-care",
            "price": 62.00,
            "mrp": 75.00,
            "manufacturer": "Win-Medicare Ltd",
            "dosage": "Apply thin layer to cleaned wound 2-3 times daily",
            "manufacturing_date": "2026-01-30",
            "expiry_date": "2028-12-15",
            "contents": "Povidone-Iodine IP 5% w/w (available iodine 0.5%)",
            "uses": "Prevention of skin infections in minor burns, lacerations, abrasions, and surgical cuts.",
            "stock": 140,
            "rating": 4.9,
            "reviews_count": 380,
            "image": "https://images.unsplash.com/photo-1550572017-ed200f5e58b9?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Candid Cream Clotrimazole 30g",
            "category": "Skin Care",
            "category_slug": "skin-care",
            "price": 110.00,
            "mrp": 130.00,
            "manufacturer": "Glenmark Pharma",
            "dosage": "Apply gently to affected area twice daily for 2 weeks",
            "manufacturing_date": "2026-02-12",
            "expiry_date": "2028-05-18",
            "contents": "Clotrimazole IP 1% w/w",
            "uses": "Broad-spectrum antifungal treatment for athlete's foot, ringworm, jock itch, and candidiasis.",
            "stock": 90,
            "rating": 4.7,
            "reviews_count": 165,
            "image": "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },
        {
            "name": "Moiz Cleansing Lotion 200ml",
            "category": "Skin Care",
            "category_slug": "skin-care",
            "price": 240.00,
            "mrp": 275.00,
            "manufacturer": "Glowderma Labs",
            "dosage": "Massage on wet face & rinse or wipe with cotton",
            "manufacturing_date": "2026-03-10",
            "expiry_date": "2028-02-28",
            "contents": "Cetyl Alcohol, Stearyl Alcohol, Aloe Vera, Vitamin E",
            "uses": "Non-comedogenic, soap-free cleansing for eczema-prone, sensitized and dry facial skin.",
            "stock": 70,
            "rating": 4.8,
            "reviews_count": 195,
            "image": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },

        # Digestive Care
        {
            "name": "Pan 40 Pantoprazole Gastro-Resistant",
            "category": "Digestive Care",
            "category_slug": "digestive-care",
            "price": 92.00,
            "mrp": 110.00,
            "manufacturer": "Alkem Laboratories",
            "dosage": "40mg tablet 30 minutes before morning breakfast",
            "manufacturing_date": "2026-03-25",
            "expiry_date": "2028-04-30",
            "contents": "Pantoprazole Sodium IP eq. to Pantoprazole 40 mg",
            "uses": "GERD, severe acid reflux, gastric ulcers, and prevention of NSAID-induced ulcers.",
            "stock": 180,
            "rating": 4.9,
            "reviews_count": 460,
            "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Digene Gel Mint Flavour 200ml",
            "category": "Digestive Care",
            "category_slug": "digestive-care",
            "price": 135.00,
            "mrp": 155.00,
            "manufacturer": "Abbott India Ltd",
            "dosage": "10ml after meals and at bedtime",
            "manufacturing_date": "2026-04-02",
            "expiry_date": "2028-01-20",
            "contents": "Dried Aluminium Hydroxide Gel 300 mg, Magnesium Hydroxide 25 mg, Simethicone 25 mg",
            "uses": "Quick neutralization of stomach acid, soothing bloating, gas release, and heartburn relief.",
            "stock": 130,
            "rating": 4.8,
            "reviews_count": 340,
            "image": "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Sporlac DS Probiotic Lactic Acid Bacillus",
            "category": "Digestive Care",
            "category_slug": "digestive-care",
            "price": 84.00,
            "mrp": 98.00,
            "manufacturer": "Sanzyme Biogenics",
            "dosage": "1 tablet twice daily with water",
            "manufacturing_date": "2026-02-18",
            "expiry_date": "2027-12-10",
            "contents": "Lactic Acid Bacillus (Bacillus coagulans) 120 Million Spores",
            "uses": "Restores gut flora after antibiotic treatment, curbs acute diarrhea, irritable bowel, and indigestion.",
            "stock": 105,
            "rating": 4.7,
            "reviews_count": 185,
            "image": "https://images.unsplash.com/photo-1550572017-4fcdbb590e5b?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },

        # Personal Care
        {
            "name": "Dettol Antiseptic Liquid 250ml",
            "category": "Personal Care",
            "category_slug": "personal-care",
            "price": 145.00,
            "mrp": 165.00,
            "manufacturer": "Reckitt Benckiser",
            "dosage": "Dilute 1 capful in 250ml clean water for topical first-aid",
            "manufacturing_date": "2026-01-15",
            "expiry_date": "2029-01-10",
            "contents": "Chloroxylenol 4.8% w/v, Terpineol 9.0% v/v, Alcohol Denatured",
            "uses": "Hospital-grade skin disinfection, minor cut cleaning, laundering, and personal hygiene.",
            "stock": 150,
            "rating": 4.9,
            "reviews_count": 890,
            "image": "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        },
        {
            "name": "Sensodyne Rapid Relief Toothpaste 80g",
            "category": "Personal Care",
            "category_slug": "personal-care",
            "price": 185.00,
            "mrp": 210.00,
            "manufacturer": "Haleon Consumer Healthcare",
            "dosage": "Brush thoroughly twice daily with soft bristle brush",
            "manufacturing_date": "2026-03-01",
            "expiry_date": "2028-08-15",
            "contents": "Strontium Acetate 8% w/w, Sodium Fluoride 0.23% w/w",
            "uses": "Creates rapid mineral protective barrier over exposed dentine tubules against hot and cold sensitivity.",
            "stock": 85,
            "rating": 4.8,
            "reviews_count": 315,
            "image": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=60",
            "is_featured": False
        },
        {
            "name": "Purell Advanced Hand Sanitizer 500ml",
            "category": "Personal Care",
            "category_slug": "personal-care",
            "price": 199.00,
            "mrp": 250.00,
            "manufacturer": "GOJO Industries",
            "dosage": "Apply thumbnail size to palm and rub hands until dry",
            "manufacturing_date": "2026-02-05",
            "expiry_date": "2028-11-30",
            "contents": "Ethyl Alcohol 70% v/v, Glycerin, Aloe Leaf Juice, Tocopheryl Acetate",
            "uses": "Kills 99.99% of common pathogenic germs in 15 seconds without drying out skin.",
            "stock": 120,
            "rating": 4.9,
            "reviews_count": 420,
            "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
            "is_featured": True
        }
    ]

    for med in medicines:
        medicines_col.update_one({"name": med["name"]}, {"$set": med}, upsert=True)

    # 3. Seed Default Demo User
    demo_email = "demo@medconnect.com"
    existing_user = users_col.find_one({"email": demo_email})
    user_id = None
    if not existing_user:
        user_doc = {
            "name": "Dr. Alex Morgan",
            "email": demo_email,
            "password": hash_password("password123"),
            "phone": "+1 (555) 349-2810",
            "blood_group": "O+",
            "allergies": "Penicillin (Mild)",
            "emergency_contact": "+1 (555) 912-3847 (Sarah Morgan - Spouse)",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        res = users_col.insert_one(user_doc)
        user_id = str(res.inserted_id)
    else:
        user_id = str(existing_user["_id"])

    # 4. Seed Addresses for User
    addresses_col = get_addresses_col()
    if addresses_col.count_documents({"user_id": user_id}) == 0:
        sample_addresses = [
            {
                "user_id": user_id,
                "label": "Home",
                "recipient_name": "Dr. Alex Morgan",
                "phone": "+1 (555) 349-2810",
                "street": "742 Evergreen Terrace, Apt 4B",
                "city": "Springfield",
                "state": "IL",
                "postal_code": "62704",
                "is_default": True
            },
            {
                "user_id": user_id,
                "label": "Medical Clinic / Office",
                "recipient_name": "Dr. Alex Morgan (Consultant)",
                "phone": "+1 (555) 882-9901",
                "street": "100 Medical Center Way, Suite 305",
                "city": "Springfield",
                "state": "IL",
                "postal_code": "62701",
                "is_default": False
            }
        ]
        for addr in sample_addresses:
            addresses_col.insert_one(addr)

    # 5. Seed Payment Methods
    pm_col = get_payment_methods_col()
    if pm_col.count_documents({"user_id": user_id}) == 0:
        sample_pms = [
            {
                "user_id": user_id,
                "method_type": "card",
                "card_number_masked": "•••• •••• •••• 4242",
                "card_brand": "Visa",
                "holder_name": "Alex Morgan",
                "expiry": "08/29",
                "is_default": True
            },
            {
                "user_id": user_id,
                "method_type": "upi",
                "upi_id": "alexmorgan@okhdfcbank",
                "is_default": False
            },
            {
                "user_id": user_id,
                "method_type": "cod",
                "is_default": False
            }
        ]
        for pm in sample_pms:
            pm_col.insert_one(pm)

    # 6. Seed Offers & Coupons
    offers = [
        {
            "code": "MEDFIRST25",
            "title": "Welcome Discount",
            "discount_percentage": 25,
            "max_discount": 150.00,
            "min_order": 200.00,
            "description": "Get 25% OFF up to $150 on your first prescription and medicine order.",
            "valid_until": "2027-12-31"
        },
        {
            "code": "HEALTH10",
            "title": "Care Plus 10%",
            "discount_percentage": 10,
            "max_discount": 80.00,
            "min_order": 150.00,
            "description": "Flat 10% discount on all chronic health & daily wellness essentials.",
            "valid_until": "2027-06-30"
        },
        {
            "code": "FREESHIP",
            "title": "Free Express Delivery",
            "discount_percentage": 0,
            "free_shipping": True,
            "min_order": 99.00,
            "description": "Zero delivery charges on all express deliveries above $99.",
            "valid_until": "2027-12-31"
        }
    ]
    for off in offers:
        offers_col.update_one({"code": off["code"]}, {"$set": off}, upsert=True)

    # 7. Seed Sample Orders and Live Tracking
    orders_col = get_orders_col()
    tracking_col = get_tracking_col()

    if orders_col.count_documents({"user_id": user_id}) == 0:
        now = datetime.now(timezone.utc)
        order_1 = {
            "order_number": "MED-89421",
            "user_id": user_id,
            "user_name": "Dr. Alex Morgan",
            "user_phone": "+1 (555) 349-2810",
            "created_at": (now - timedelta(minutes=24)).isoformat(),
            "status": "Out for Delivery",
            "delivery_address": "742 Evergreen Terrace, Apt 4B, Springfield, IL 62704",
            "payment_method": "Visa Card (•••• 4242)",
            "items": [
                {
                    "name": "Pan 40 Pantoprazole Gastro-Resistant",
                    "price": 92.00,
                    "quantity": 2,
                    "manufacturing_date": "2026-03-25",
                    "expiry_date": "2028-04-30",
                    "contents": "Pantoprazole Sodium IP eq. to Pantoprazole 40 mg",
                    "uses": "GERD, severe acid reflux, gastric ulcers."
                },
                {
                    "name": "Becozym C Forte Multivitamin Tablets",
                    "price": 54.00,
                    "quantity": 1,
                    "manufacturing_date": "2026-01-10",
                    "expiry_date": "2027-11-20",
                    "contents": "Vitamin B-Complex + Vitamin C 150 mg",
                    "uses": "Mouth ulcers, energy restoration, tissue repair, immunity."
                }
            ],
            "subtotal": 238.00,
            "discount": 25.00,
            "delivery_fee": 0.00,
            "total_amount": 213.00,
            "estimated_delivery": (now + timedelta(minutes=16)).strftime("%I:%M %p"),
            "delivery_partner": {
                "name": "David Miller",
                "phone": "+1 (555) 789-4321",
                "vehicle": "Hero Electric / DL-04-AB-9123",
                "rating": 4.9,
                "current_location": "En route - 2.1 miles away"
            }
        }
        res1 = orders_col.insert_one(order_1)

        # Seed Live Tracking for MED-89421
        tracking_doc = {
            "order_id": str(res1.inserted_id),
            "order_number": "MED-89421",
            "status": "out_for_delivery",
            "current_step": 3,
            "steps": [
                {"title": "Order Placed & Confirmed", "time": (now - timedelta(minutes=24)).strftime("%I:%M %p"), "done": True},
                {"title": "Prescription Verified & Packed", "time": (now - timedelta(minutes=15)).strftime("%I:%M %p"), "done": True},
                {"title": "Out for Delivery with Agent", "time": (now - timedelta(minutes=8)).strftime("%I:%M %p"), "done": True},
                {"title": "Arrived at Destination", "time": "Pending", "done": False}
            ],
            "driver": {
                "name": "David Miller",
                "phone": "+1 (555) 789-4321",
                "vehicle": "Hero Electric DL-04-AB-9123",
                "rating": "4.9 ★",
                "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
            },
            "eta_minutes": 14,
            "distance_km": 2.4,
            "start_coords": {"lat": 39.7817, "lng": -89.6501},
            "driver_coords": {"lat": 39.7895, "lng": -89.6450},
            "destination_coords": {"lat": 39.7990, "lng": -89.6430},
            "destination_address": "742 Evergreen Terrace, Apt 4B, Springfield"
        }
        tracking_col.update_one({"order_number": "MED-89421"}, {"$set": tracking_doc}, upsert=True)

        # Past Completed Order
        order_2 = {
            "order_number": "MED-74319",
            "user_id": user_id,
            "user_name": "Dr. Alex Morgan",
            "user_phone": "+1 (555) 349-2810",
            "created_at": (now - timedelta(days=5)).isoformat(),
            "status": "Delivered",
            "delivery_address": "742 Evergreen Terrace, Apt 4B, Springfield, IL 62704",
            "payment_method": "UPI (alexmorgan@okhdfcbank)",
            "items": [
                {
                    "name": "Paracetamol Advance 650mg",
                    "price": 32.50,
                    "quantity": 3,
                    "manufacturing_date": "2026-03-15",
                    "expiry_date": "2028-02-28",
                    "contents": "Paracetamol IP 650 mg",
                    "uses": "Fever, moderate headache, body pain."
                }
            ],
            "subtotal": 97.50,
            "discount": 0.00,
            "delivery_fee": 15.00,
            "total_amount": 112.50,
            "estimated_delivery": (now - timedelta(days=5)).strftime("%I:%M %p"),
            "delivery_partner": {
                "name": "Sarah Jenkins",
                "phone": "+1 (555) 654-9870",
                "vehicle": "Honda Activa",
                "rating": 5.0,
                "current_location": "Delivered"
            }
        }
        orders_col.insert_one(order_2)

    # 8. Seed Reminders
    reminders_col = get_reminders_col()
    if reminders_col.count_documents({"user_id": user_id}) == 0:
        sample_reminders = [
            {
                "user_id": user_id,
                "medicine_name": "Metformin 500 SR",
                "dosage": "1 tablet (500mg)",
                "scheduled_time": "08:30",
                "scheduled_days": ["Daily"],
                "instruction": "Take with breakfast",
                "is_taken": False,
                "is_active": True,
                "category": "Diabetes Care"
            },
            {
                "user_id": user_id,
                "medicine_name": "Atorva 10 (Atorvastatin)",
                "dosage": "1 tablet (10mg)",
                "scheduled_time": "21:00",
                "scheduled_days": ["Daily"],
                "instruction": "Take at night before bed",
                "is_taken": True,
                "is_active": True,
                "category": "Heart Care"
            },
            {
                "user_id": user_id,
                "medicine_name": "Shelcal 500 Calcium",
                "dosage": "1 tablet",
                "scheduled_time": "13:30",
                "scheduled_days": ["Mon", "Wed", "Fri"],
                "instruction": "After lunch with a glass of water",
                "is_taken": False,
                "is_active": True,
                "category": "Vitamins & Supplements"
            }
        ]
        for rem in sample_reminders:
            reminders_col.insert_one(rem)

    # 9. Seed Subscriptions
    subs_col = get_subscriptions_col()
    if subs_col.count_documents({"user_id": user_id}) == 0:
        sample_subs = [
            {
                "user_id": user_id,
                "medicine_name": "Glycomet 500 SR Tablet",
                "category": "Diabetes Care",
                "quantity": 2,
                "frequency": "Monthly",
                "next_delivery": (datetime.now() + timedelta(days=12)).strftime("%d %b %Y"),
                "status": "Active",
                "price": 84.00,
                "payment_mode": "Auto-Debit (Visa •••• 4242)"
            },
            {
                "user_id": user_id,
                "medicine_name": "Becozym C Forte Multivitamin",
                "category": "Vitamins & Supplements",
                "quantity": 1,
                "frequency": "Bi-Weekly",
                "next_delivery": (datetime.now() + timedelta(days=5)).strftime("%d %b %Y"),
                "status": "Active",
                "price": 54.00,
                "payment_mode": "UPI AutoPay"
            }
        ]
        for sub in sample_subs:
            subs_col.insert_one(sub)

    # 10. Seed Wishlist
    wishlist_col = get_wishlist_col()
    if wishlist_col.count_documents({"user_id": user_id}) == 0:
        med_item = medicines_col.find_one({"name": "Sensodyne Rapid Relief Toothpaste 80g"})
        if med_item:
            wishlist_col.insert_one({
                "user_id": user_id,
                "medicine_id": str(med_item["_id"]),
                "name": med_item["name"],
                "price": med_item["price"],
                "category": med_item["category"],
                "manufacturer": med_item["manufacturer"],
                "dosage": med_item["dosage"],
                "image": med_item.get("image", "")
            })

    print("[MedConnect Seeder] Complete catalog and demo data seeded successfully!")


if __name__ == "__main__":
    seed_database(force=True)
