# RiskGRC - AI-Powered Cyber Governance, Risk & Compliance Platform

A mobile-first, AI-powered GRC platform designed for cybersecurity professionals and organizations in Pakistan's financial, telecom, and government sectors.

## Project Status: ✅ PRODUCTION-READY

### Version 1.0 - Complete Core Feature Set
- [x] Multi-org authentication with JWT
- [x] Sector-specific compliance framework evaluations
- [x] Automated CSV & JSON File Parsing for Log ingestion
- [x] KRI normalization engine
- [x] Risk scoring engine
- [x] Gemini AI insights integration
- [x] React Native app (Expo) with fully responsive Web UI
- [x] Django REST backend
- [x] Database models & dynamic API routing

---

## 🚀 Quick Start - Exact Setup Guide

Follow these exact steps from your root directory to launch the Backend API and the frontend Web platform.

### 1️⃣ Start the Backend (Django API)

Open your terminal and run these commands to isolate and boot your python server:

```bash
# 1. Navigate into the backend repository
cd backend/

# 2. Create the Python Virtual Environment (venv)
python3 -m venv venv

# 3. Activate the virtual environment
# For Linux/macOS:
source venv/bin/activate
# For Windows (Command Prompt):
# venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Apply Database Migrations
python manage.py makemigrations
python manage.py migrate

# 6. Start the Django Server
python manage.py runserver 0.0.0.0:8000
```

✅ Your Backend API is now running successfully at: `http://localhost:8000/api`
*(Note: Leave this terminal tab running and open a new tab for Step 2)*

---

### 2️⃣ Start the Frontend (React Native + Expo Web)

Open a **NEW** terminal and run these commands to start the User Interface:

```bash
# 1. Navigate into the frontend repository
cd mobile/RiskGRC/

# 2. Make sure your environment mappings exist
# (This ensures the frontend targets your local Django server)
echo "EXPO_PUBLIC_API_URL=http://localhost:8000/api" > .env

# 3. Install all Javascript/NPM dependencies
npm install

# 4. Start the Expo Web App
npx expo start --web
```

✅ Your browser will automatically pop open hosting the RiskGRC Web portal (typically at `http://localhost:8081`). 

---

## 🔍 How to Test the Product Features

1. **Register** a brand new account under the `Sign Up` screen.
2. Ensure you select a **Sector** (e.g., Fintech, Banking) to bind your regulatory frameworks.
3. Once logged into the empty **Dashboard**, click the big blue **"New Assessment"** button.
4. **Log Analysis Engine:**
   - Go to the **Upload Logs** tab.
   - Attach our test files located in `sample_files/fintech_sample_kris.csv` or `.json`.
   - Click "Calculate Risk Score From File" to submit the parsed payload to the Django server.
5. **View Results Dashboard:** You will instantly see your dynamic sector compliance (e.g., passing/failing SBP or SECP frameworks based on your specific uploaded data), your KRI breakdown, and generated AI Agent threat mitigation strategies.

---

## 📋 Regulations Evaluated

**Fintech**
- SBP Regulatory Sandbox Guidelines
- SECP FinTech Regulations
- PTA Data Protection Guidelines

**Banking**
- SBP Cybersecurity Framework
- PECA 2016

**Telecom**
- PTA Cybersecurity Regulations
- nCERT Baseline Security Standard

## 📦 Production Deployment Preparation

When you are ready to publish:
- Create an `.env.production` inside the `RiskGRC` frontend directory and point `EXPO_PUBLIC_API_URL` to your live domain alias.
- Inside Django `settings.py`, convert `DEBUG = False`, allow-list your live hosts under `ALLOWED_HOSTS`, and boot with your choice of `WSGI` servers (like Gunicorn) instead of `runserver`.
