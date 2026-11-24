"""
Django settings for medconnect_project project.
MedConnect -- Smart Healthcare & Medicine Delivery Web Application
Backend: Django + Django REST Framework
Database: MongoDB (with high-reliability resilient fallback)
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-medconnect-super-secret-key-2026-teal-health')

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = ['*']

# Reverse proxy SSL headers for Render, Cloudflare, and Heroku
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
    'http://*.onrender.com',
    'https://*.render.com',
    'http://*.render.com',
    'http://127.0.0.1',
    'http://127.0.0.1:8000',
    'http://localhost',
    'http://localhost:8000',
    'http://0.0.0.0',
]

for _env_key in ('RENDER_EXTERNAL_URL', 'RENDER_EXTERNAL_HOSTNAME'):
    _val = os.getenv(_env_key)
    if _val:
        _val = _val.strip()
        if not _val.startswith(('http://', 'https://')):
            CSRF_TRUSTED_ORIGINS.extend([f"https://{_val}", f"http://{_val}"])
        else:
            CSRF_TRUSTED_ORIGINS.append(_val)

CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = False
CSRF_FAILURE_VIEW = 'medconnect_app.views.custom_csrf_failure_view'

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'medconnect_app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'medconnect_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'medconnect_app.views.global_context',
            ],
        },
    },
]

WSGI_APPLICATION = 'medconnect_project.wsgi.application'

# SQLite for internal Django session management, all app models use MongoDB
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# MongoDB Configuration
DEFAULT_MONGO_URI = "mongodb+srv://yt:PEWJaOEjqa5Nn0yw@cluster0.kumnajn.mongodb.net/?appName=Cluster0"
MONGO_URI = (os.getenv("MONGO_URI") or "").strip() or DEFAULT_MONGO_URI
DB_NAME = os.getenv("DB_NAME", "medconnect_db")

# Google Maps API Key
GOOGLE_MAPS_API_KEY = (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip() or "AIzaSyA8_MedConnect_GoogleMaps_LiveTracking2026"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 6}},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# Media files (Prescriptions, Avatars)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Session settings (Stateless, signed cookies - completely resilient on cloud/ephemeral platforms)
SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
SESSION_COOKIE_NAME = 'medconnect_session'
SESSION_COOKIE_AGE = 86400 * 30  # 30 days
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False
SESSION_SAVE_EVERY_REQUEST = True

# DRF configuration
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ]
}
