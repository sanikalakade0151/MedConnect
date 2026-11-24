"""
medconnect_app/models.py
MedConnect uses MongoDB via PyMongo (medconnect_app/db.py) for all persistent collections:
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

from django.db import models

# Django ORM is bypassed in favor of native MongoDB collections via PyMongo
