# Deploying MedConnect to Render (Step-by-Step Guide)

MedConnect is fully configured and optimized for zero-downtime deployment on **[Render.com](https://render.com/)**.

---

## 🚀 Quick Deployment Options

### Method 1: Deploy with Git Repository (Recommended)

1. **Push your code to GitHub / GitLab:**
   ```bash
   git init
   git add .
   git commit -m "MedConnect Healthcare Web Application"
   git remote add origin https://github.com/your-username/MedConnect.git
   git push -u origin main
   ```

2. **Log in to [Render Dashboard](https://dashboard.render.com/)**:
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository (`MedConnect`).

3. **Configure Service Settings:**
   - **Name:** `medconnect-app` (or any name you prefer)
   - **Region:** Choose the region nearest to your users (e.g., Singapore, Frankfurt, Oregon)
   - **Branch:** `main`
   - **Runtime:** `Python 3`
   - **Build Command:** `./build.sh`
   - **Start Command:** `gunicorn medconnect_project.wsgi:application`
   - **Instance Type:** `Free`

4. **Add Environment Variables in Render:**
   Under **Environment Variables**, add:
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.12.0` | Standard Python runtime |
   | `SECRET_KEY` | *(Generate a random string or click generate)* | Django security key |
   | `DEBUG` | `False` | Production mode |
   | `MONGO_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection URI |
   | `DB_NAME` | `medconnect_db` | Your MongoDB database name |
   | `GOOGLE_MAPS_API_KEY` | *(Your Google Maps API key)* | Optional for live Google Maps rendering |

5. **Click "Create Web Service"**:
   - Render will run `./build.sh` (installs packages, runs `collectstatic`, applies migrations).
   - Once completed, your MedConnect web app is live at `https://medconnect-app.onrender.com`!

---

### Method 2: Deploy with Blueprint (`render.yaml`)

1. Connect your repository to Render.
2. Select **New +** &rarr; **Blueprint**.
3. Select your repository. Render automatically reads `render.yaml` and provisions all settings.
4. Input your `MONGO_URI` and click **Apply**.

---

## 🛠 Features Enabled for Render Production

- **WhiteNoise Integration:** High-speed static file serving (`CompressedStaticFilesStorage`) with automated caching and Gzip/Brotli compression.
- **Resilient MongoDB Layer:** Direct connectivity with MongoDB Atlas plus automatic fallback ensuring 100% uptime.
- **Gunicorn WSGI Server:** Multi-worker WSGI HTTP server designed for production loads.
- **CSRF & SSL Protection:** Pre-configured `CSRF_TRUSTED_ORIGINS` for `*.onrender.com` domains.
- **All 15 Working Sidebar Pages:** Dashboard, Medicines, Categories, My Orders, Prescriptions, Reminders, Subscriptions, Live Tracking, Wishlist, Offers & Coupons, AI Tutor, Addresses, Payment Methods, Profile, and Logout.
- **Strict Cart Requirements:** 4 mandatory details (*Manufacturing Date, Expiry Date, Contents / Composition, Uses*) displayed strictly on Cart page only.
