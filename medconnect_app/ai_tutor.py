"""
medconnect_app/ai_tutor.py
AI Medical Tutor Engine for MedConnect.
Provides intelligent, clinically-structured pharmaceutical and healthcare guidance
with mandatory medical safety warnings, brand-name alias resolution, and red-flag emergency detection.
"""

import re
from datetime import datetime, timezone
from medconnect_app.db import get_medicines_col

SAFETY_DISCLAIMER = (
    "⚠️ Medical Disclaimer: MedConnect AI Tutor provides educational medication information "
    "and general guidance only. This does not substitute for professional clinical judgment, "
    "diagnosis, or treatment from a licensed physician or pharmacist. Always consult your healthcare provider."
)

EMERGENCY_KEYWORDS = [
    "chest pain", "heart attack", "can't breathe", "cannot breathe", "shortness of breath",
    "unconscious", "stroke", "bleeding heavily", "anaphylaxis", "suicide", "poison",
    "severe allergic reaction", "overdose", "collapsed", "blue lips"
]

COMMON_BRAND_ALIASES = {
    "dolo": "Paracetamol Advance 650mg",
    "calpol": "Paracetamol Advance 650mg",
    "crocin": "Paracetamol Advance 650mg",
    "pcm": "Paracetamol Advance 650mg",
    "combiflam": "Ibuprofen & Paracetamol Gel Caps",
    "brufen": "Ibuprofen & Paracetamol Gel Caps",
    "voveran": "Diclofenac Sodium Gel 30g",
    "volini": "Diclofenac Sodium Gel 30g",
    "ascoril": "Ascoril-D Cough Syrup 100ml",
    "benadryl": "Ascoril-D Cough Syrup 100ml",
    "grilinctus": "Ascoril-D Cough Syrup 100ml",
    "allegra": "Cetirizine Hydrochloride 10mg",
    "cetzine": "Cetirizine Hydrochloride 10mg",
    "zyrtec": "Cetirizine Hydrochloride 10mg",
    "becozym": "Becozym C Forte Multivitamin Tablets",
    "supradyn": "Becozym C Forte Multivitamin Tablets",
    "shelcal": "Shelcal 500 Calcium & Vitamin D3",
    "limcee": "Limcee Vitamin C 500mg Chewable",
    "glycomet": "Glycomet 500 SR Tablet",
    "glucophage": "Glycomet 500 SR Tablet",
    "atorva": "Atorva 10 Atorvastatin Tablets",
    "lipitor": "Atorva 10 Atorvastatin Tablets",
    "telma": "Telma 40 Blood Pressure Tablets",
    "micardis": "Telma 40 Blood Pressure Tablets",
    "pantocid": "Pan 40 Pantoprazole Gastro-Resistant",
    "pan 40": "Pan 40 Pantoprazole Gastro-Resistant",
    "pantoprazole": "Pan 40 Pantoprazole Gastro-Resistant",
    "digene": "Digene Gel Mint Flavour 200ml",
    "gelusil": "Digene Gel Mint Flavour 200ml",
    "betadine": "Betadine 5% Antiseptic Ointment 20g"
}


def generate_tutor_response(user_query, chat_history=None):
    """Generates an intelligent pharmaceutical & healthcare educational response."""
    if not user_query or not user_query.strip():
        user_query = "Hello"
    query_lower = user_query.strip().lower()

    # 1. Emergency Red-Flag Check
    for kw in EMERGENCY_KEYWORDS:
        if kw in query_lower:
            return {
                "is_emergency": True,
                "title": "🚨 Urgent Medical Warning",
                "response": (
                    "**Potential Medical Emergency Detected:** Your symptoms may indicate a critical, time-sensitive "
                    "medical condition requiring immediate emergency care.\n\n"
                    "• **Action Required:** Please dial emergency medical services (911 / 112) or proceed to the nearest hospital emergency room immediately.\n"
                    "• **Do not wait:** Do not attempt self-medication or rely on online advice for acute chest pain, severe breathlessness, or sudden neurological weakness."
                ),
                "disclaimer": SAFETY_DISCLAIMER,
                "timestamp": datetime.now(timezone.utc).strftime("%I:%M %p")
            }

    # 2. Conversational Greetings & Help
    if any(q == query_lower or query_lower.startswith(q + " ") for q in ["hi", "hello", "hey", "greetings", "good morning", "good evening", "good afternoon"]):
        return {
            "is_emergency": False,
            "title": "Welcome to MedConnect AI Tutor",
            "response": (
                "👋 **Hello! I am your MedConnect AI Medical Tutor & Pharmacology Assistant.**\n\n"
                "I am here 24/7 to provide clinical insights on approved medicines, proper dosages, active salts, potential side effects, and safe home management.\n\n"
                "**What you can ask me:**\n"
                "• **Medicine Details:** *'Tell me about Paracetamol 650mg'*, *'Uses of Pan 40'*, *'What is Metformin for?'*\n"
                "• **Brand Equivalents:** *'Is Dolo same as Paracetamol?'*, *'What is Combiflam?'*\n"
                "• **Symptoms Guidance:** *'How to manage acid reflux at home?'*, *'Cold and fever treatment'* \n"
                "• **Safe Medication Use:** *'What if I missed a dose?'*, *'Can I take vitamins on an empty stomach?'*"
            ),
            "disclaimer": SAFETY_DISCLAIMER,
            "timestamp": datetime.now(timezone.utc).strftime("%I:%M %p")
        }

    # 3. Check for Brand Aliases or Direct Database Matches
    matched_med_name = None
    for brand_key, full_name in COMMON_BRAND_ALIASES.items():
        if brand_key in query_lower:
            matched_med_name = full_name
            break

    medicines = list(get_medicines_col().find({}))
    matched_med = None

    if matched_med_name:
        for med in medicines:
            if med.get("name", "").lower() == matched_med_name.lower():
                matched_med = med
                break

    if not matched_med:
        for med in medicines:
            med_name = med.get("name", "").lower()
            for word in re.split(r'[\s\-,]+', med_name):
                if len(word) >= 4 and word in query_lower:
                    matched_med = med
                    break
            if matched_med:
                break

    if matched_med:
        response_text = (
            f"### 💊 **{matched_med.get('name')}** - Clinical Pharmacology Guidance\n\n"
            f"**Primary Indication & Uses:**\n{matched_med.get('uses')}\n\n"
            f"**Composition & Active Salt:**\n`{matched_med.get('contents')}`\n\n"
            f"**Standard Prescribed Dosage:**\n{matched_med.get('dosage')}\n\n"
            f"**Clinical Precautions & Best Practices:**\n"
            f"• Follow the exact schedule prescribed by your physician.\n"
            f"• Take with a full glass of water. If gastrointestinal irritation occurs, take with or after meals.\n"
            f"• Do not consume alcohol while on this medication without consulting your doctor.\n"
            f"• Store in a cool, dry place away from moisture and direct sunlight (<25°C).\n\n"
            f"**Manufacturer:** {matched_med.get('manufacturer')} &bull; **Therapeutic Category:** {matched_med.get('category')}"
        )
        return {
            "is_emergency": False,
            "title": f"Guidance: {matched_med.get('name')}",
            "response": response_text,
            "disclaimer": SAFETY_DISCLAIMER,
            "timestamp": datetime.now(timezone.utc).strftime("%I:%M %p"),
            "medicine_card": {
                "id": str(matched_med.get("_id")),
                "name": matched_med.get("name"),
                "price": matched_med.get("price"),
                "dosage": matched_med.get("dosage"),
                "category": matched_med.get("category"),
                "manufacturer": matched_med.get("manufacturer")
            }
        }

    # 4. Pattern-based Clinical Answers
    if any(k in query_lower for k in ["headache", "fever", "body pain", "temperature", "bodyache"]):
        response_text = (
            "### 🌡️ **Management of Mild Fever & Tension Headache**\n\n"
            "**General Over-The-Counter Options:**\n"
            "• **Paracetamol (650mg / 500mg):** Typically taken every 4-6 hours as needed for fever and pain reduction (maximum 4000mg per 24 hours in adults).\n"
            "• **Hydration & Rest:** Drink plenty of fluids (electrolytes, clear soups, warm water) and rest in a well-ventilated, quiet room.\n"
            "• **Cold Compress:** Apply a cool, damp cloth to forehead and neck.\n\n"
            "**When to Consult a Physician Immediately:**\n"
            "• Fever exceeding 103°F (39.4°C) or lasting longer than 3 consecutive days.\n"
            "• Headache accompanied by stiff neck, confusion, vomiting, or vision changes."
        )
    elif any(k in query_lower for k in ["acidity", "gas", "gerd", "heartburn", "indigestion", "reflux", "stomach burn"]):
        response_text = (
            "### 🫧 **Acidity, GERD & Acid Reflux Guidance**\n\n"
            "**Common Relief Options:**\n"
            "• **Proton Pump Inhibitors (e.g., Pantoprazole 40mg):** Best taken 30-45 minutes before morning breakfast on an empty stomach.\n"
            "• **Antacids (e.g., Digene or Gelusil):** Provide rapid neutralization of stomach acid after spicy or heavy meals.\n\n"
            "**Lifestyle Modifications:**\n"
            "• Avoid lying down flat within 2-3 hours after eating.\n"
            "• Reduce intake of caffeine, deep-fried foods, citrus fruits, and carbonated beverages.\n"
            "• Elevate the head of your bed by 6 inches if experiencing nocturnal reflux."
        )
    elif any(k in query_lower for k in ["diabetes", "sugar", "glucose", "insulin", "hba1c"]):
        response_text = (
            "### 🩸 **Diabetes Care & Medication Adherence**\n\n"
            "**Key Best Practices:**\n"
            "• **Consistent Timing:** Oral hypoglycemic agents (like Metformin SR) should be taken consistently with meals to reduce stomach discomfort and stabilize blood sugar.\n"
            "• **Regular Monitoring:** Keep a log of your Fasting Blood Sugar (FBS < 100 mg/dL normal, 80-130 target for diabetics) and Post-Prandial (PPBS < 180 mg/dL).\n"
            "• **Hypoglycemia Awareness:** If you feel sudden tremors, sweating, or lightheadedness, consume 15g of fast-acting glucose (fruit juice or candy) immediately."
        )
    elif any(k in query_lower for k in ["cold", "cough", "runny nose", "sore throat", "sneezing", "congestion"]):
        response_text = (
            "### 🤧 **Cold, Cough & Flu Management**\n\n"
            "**Symptom Relief:**\n"
            "• **Antihistamines (e.g., Cetirizine 10mg):** Helpful for excessive sneezing, itchy throat, and watery eyes.\n"
            "• **Cough Syrups:** Dextromethorphan-based syrups for dry coughs; Ambroxol/Guaifenesin for productive chesty coughs.\n"
            "• **Steam Inhalation:** Inhale warm steam with menthol or eucalyptus 2-3 times daily.\n"
            "• **Warm Salt Water Gargle:** Relieves throat inflammation and reduces viral load in the pharynx."
        )
    elif any(k in query_lower for k in ["bp", "blood pressure", "hypertension"]):
        response_text = (
            "### 🫀 **Blood Pressure & Hypertension Guidance**\n\n"
            "**Management Principles:**\n"
            "• **Never stop antihypertensives abruptly:** Medicines like Telmisartan (Telma 40) or Amlodipine must be taken daily at the same time to prevent rebound hypertension.\n"
            "• **Dietary Sodium:** Limit table salt intake to less than 1 level teaspoon (under 2,000 mg sodium) per day.\n"
            "• **Target Range:** Ideal resting blood pressure is generally <120/80 mmHg; stage 1 hypertension begins at 130/80 mmHg.\n"
            "• **Emergency:** Seek immediate care if systolic BP exceeds 180 mmHg or diastolic exceeds 120 mmHg."
        )
    elif any(k in query_lower for k in ["cholesterol", "statin", "lipid", "triglycerides"]):
        response_text = (
            "### 🫀 **Cholesterol & Statin Therapy (Atorvastatin)**\n\n"
            "**Key Points:**\n"
            "• **Bedtime Dosing:** Statins like Atorvastatin work on liver cholesterol synthesis, which peaks at night, making bedtime the optimal administration time.\n"
            "• **Muscle Pain Monitoring:** Report unexplained muscle soreness or tenderness to your doctor, as this may indicate statin myopathy.\n"
            "• **Heart-Healthy Diet:** Increase soluble fiber (oats, legumes) and replace saturated fats with healthy polyunsaturated fats (olive oil, nuts)."
        )
    elif any(k in query_lower for k in ["side effect", "reaction", "allergy"]):
        response_text = (
            "### ⚠️ **Medication Side Effects Guidance**\n\n"
            "Every medication can have potential side effects ranging from mild to severe:\n\n"
            "• **Mild Effects:** Nausea, drowsiness, mild headache, or dry mouth often subside as your body adjusts.\n"
            "• **Allergic Reactions:** Immediate hives, itching, lip/facial swelling, or breathing difficulty requires immediate emergency medical care.\n"
            "• **Action Plan:** If you suspect an adverse drug reaction, stop the medication and consult your prescribing doctor or pharmacist."
        )
    elif any(k in query_lower for k in ["missed dose", "forgot to take", "skip dose"]):
        response_text = (
            "### ⏰ **What To Do If You Miss a Dose**\n\n"
            "1. Take the missed dose as soon as you remember.\n"
            "2. If it is almost time for your next scheduled dose, skip the missed dose and resume your regular dosing schedule.\n"
            "3. **Never double up:** Do not take two doses at once to make up for a missed dose, as this increases toxicity risk."
        )
    elif any(k in query_lower for k in ["vitamin", "supplement", "calcium", "b12", "vitamin c", "vitamin d"]):
        response_text = (
            "### 💊 **Vitamins & Nutritional Supplements Guidance**\n\n"
            "• **Fat-Soluble Vitamins (A, D, E, K):** Should be taken with meals containing healthy fats for optimal absorption.\n"
            "• **Water-Soluble Vitamins (B-Complex, Vitamin C):** Can be taken in the morning with water; excess is excreted naturally in urine.\n"
            "• **Calcium & Iron Spacing:** Never take Calcium and Iron supplements at the exact same hour, as Calcium blocks Iron absorption. Space them at least 2-3 hours apart."
        )
    else:
        response_text = (
            f"### 🩺 **MedConnect AI Clinical Guidance**\n\n"
            f"Regarding your query on **\"{user_query}\"**:\n\n"
            "**General Pharmacological Best Practices:**\n"
            "• Always follow the exact prescription directions and duration provided by your doctor.\n"
            "• Check manufacturing and expiry dates on all medicine packages before consumption.\n"
            "• Store medications in a secure, moisture-free cabinet away from children and pets.\n"
            "• Avoid combining over-the-counter painkillers (e.g. Paracetamol + Ibuprofen) without verifying active ingredients to prevent accidental duplication.\n\n"
            "💡 *Tip: You can ask me about specific drugs (e.g., 'Paracetamol 650mg', 'Pan 40', 'Metformin'), brand equivalents (e.g. 'Dolo', 'Combiflam'), or common symptoms (e.g. 'fever', 'acidity', 'headache').*"
        )

    return {
        "is_emergency": False,
        "title": "Medical & Pharmacology Guidance",
        "response": response_text,
        "disclaimer": SAFETY_DISCLAIMER,
        "timestamp": datetime.now(timezone.utc).strftime("%I:%M %p")
    }

