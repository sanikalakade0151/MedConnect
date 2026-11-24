#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status.
set -o errexit

echo "=== MedConnect Build Starting ==="

# 1. Install dependencies
echo "Installing Python dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# 2. Collect static files for WhiteNoise
echo "Collecting static assets..."
python manage.py collectstatic --no-input

# 3. Apply internal database migrations
echo "Applying migrations..."
python manage.py migrate --no-input

echo "=== MedConnect Build Completed Successfully ==="
