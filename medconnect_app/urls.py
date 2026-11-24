"""
medconnect_app/urls.py
URL routing for MedConnect
Maps all 15 Sidebar items, Cart, Checkout, Auth, and REST APIs.
"""

from django.urls import path
from medconnect_app import views, api_views

urlpatterns = [
    # 1. Dashboard & Starting Entry Point
    path('', views.root_entry_view, name='home'),
    path('dashboard/', views.dashboard_view, name='dashboard'),

    # 2. Medicines
    path('medicines/', views.medicines_view, name='medicines'),
    path('medicines/<str:med_id>/', views.medicine_detail_view, name='medicine_detail'),

    # 3. Categories
    path('categories/', views.categories_view, name='categories'),

    # 4. My Orders
    path('orders/', views.orders_view, name='orders'),
    path('orders/<str:order_id>/', views.order_detail_view, name='order_detail'),

    # 5. Prescriptions
    path('prescriptions/', views.prescriptions_view, name='prescriptions'),

    # 6. Reminders
    path('reminders/', views.reminders_view, name='reminders'),

    # 7. Subscriptions
    path('subscriptions/', views.subscriptions_view, name='subscriptions'),

    # 8. Tracking
    path('tracking/', views.tracking_view, name='tracking'),

    # 9. Wishlist
    path('wishlist/', views.wishlist_view, name='wishlist'),

    # 10. Offers & Coupons
    path('offers/', views.offers_view, name='offers'),

    # 11. AI Tutor
    path('ai-tutor/', views.ai_tutor_view, name='ai_tutor'),

    # 12. Addresses
    path('addresses/', views.addresses_view, name='addresses'),

    # 13. Payment Methods
    path('payment-methods/', views.payment_methods_view, name='payment_methods'),

    # 14. Profile
    path('profile/', views.profile_view, name='profile'),

    # 15. Logout
    path('logout/', views.logout_view, name='logout'),

    # Cart & Checkout
    path('cart/', views.cart_view, name='cart'),
    path('checkout/', views.checkout_view, name='checkout'),

    # Authentication
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),

    # Asynchronous REST APIs
    path('api/cart/add/', api_views.add_to_cart_api, name='api_add_to_cart'),
    path('api/cart/update/', api_views.update_cart_quantity_api, name='api_update_cart'),
    path('api/cart/remove/', api_views.remove_from_cart_api, name='api_remove_cart'),

    path('api/wishlist/toggle/', api_views.toggle_wishlist_api, name='api_toggle_wishlist'),
    path('api/wishlist/move-to-cart/', api_views.wishlist_to_cart_api, name='api_wishlist_to_cart'),

    path('api/prescriptions/upload-ocr/', api_views.upload_prescription_ocr_api, name='api_prescription_ocr'),
    path('api/prescriptions/verify-order/', api_views.verify_and_add_to_cart_api, name='api_verify_order'),

    path('api/tracking/<str:order_number>/', api_views.tracking_data_api, name='api_tracking_data'),
    path('api/tracking/<str:order_number>/simulate/', api_views.simulate_driver_movement_api, name='api_simulate_driver'),

    path('api/ai-tutor/chat/', api_views.ai_tutor_chat_api, name='api_ai_tutor_chat'),

    path('api/reminders/add/', api_views.add_reminder_api, name='api_add_reminder'),
    path('api/reminders/toggle/', api_views.toggle_reminder_taken_api, name='api_toggle_reminder'),
    path('api/reminders/delete/', api_views.delete_reminder_api, name='api_delete_reminder'),

    path('api/subscriptions/create/', api_views.create_subscription_api, name='api_create_subscription'),
    path('api/subscriptions/status/', api_views.toggle_subscription_status_api, name='api_toggle_sub_status'),

    path('api/addresses/save/', api_views.save_address_api, name='api_save_address'),
    path('api/addresses/delete/', api_views.delete_address_api, name='api_delete_address'),

    path('api/payment-methods/save/', api_views.save_payment_method_api, name='api_save_payment_method'),
    path('api/payment-methods/delete/', api_views.delete_payment_method_api, name='api_delete_payment_method'),

    path('api/orders/reorder/', api_views.reorder_api, name='api_reorder'),
]
