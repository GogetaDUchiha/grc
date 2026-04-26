# RiskGRC - AI-Powered Cyber Governance, Risk & Compliance Platform

A mobile-first, AI-powered GRC platform designed for cybersecurity professionals and organizations in Pakistan's financial, telecom, and government sectors.

## Project Status: ✅ PRODUCTION-READY

### Version 1.0 - Complete Core Feature Set
- [x] Multi-org authentication with JWT
- [x] Sector-specific compliance engine
- [x] KRI normalization engine
- [x] Risk scoring engine
- [x] Compliance checking engine
- [x] Gemini AI integration
- [x] React Native mobile app (Expo)
- [x] Django REST backend
- [x] Database models & migrations
- [x] Web support via Expo

## Quick Start - Running the Project

### 1️⃣ Start Backend

```bash
cd backend

# Install dependencies (one-time)
pip install -r requirements.txt

# Create demo user (optional)
python manage.py shell
```

Then in Python shell:
```python
from django.contrib.auth.models import User
from accounts.models import Organization, UserOrganization

user = User.objects.create_user(
    username='demo',
    email='demo@example.com',
    password='Demo1234!'
)

org = Organization.objects.create(
    name='Demo Fintech Company',
    sector='Fintech',
    owner=user
)

UserOrganization.objects.create(user=user, organization=org, role='admin')
exit()
```

Then start server:
```bash
python manage.py runserver 0.0.0.0:8000
```

✅ Backend running at: `http://localhost:8000/api`

### 2️⃣ Start Frontend

```bash
cd mobile/RiskGRC

# Install dependencies (one-time)
npm install

# Start web version
npm run web
```

✅ Frontend opens automatically at: `http://localhost:19006`

## Testing the Application

### Login Credentials

```
Email: demo@example.com
Password: Demo1234!
```

### Test Flow

1. **Register** new account in app or use demo credentials
2. **Create Assessment** 
   - Fill KRI values manually or leave defaults
   - Select organization and sector
   - Submit
3. **View Results**
   - Risk score (0-100)
   - Compliance status by regulation
   - AI-generated insights
4. **Export Report** (web only currently)
5. **Manage Organizations** from Organizations tab

## Feature Overview

### ✅ Completed Features

| Feature | Status | Details |
|---------|--------|---------|
| User Authentication | ✅ Complete | JWT tokens, email-based login, registration |
| Multi-Organization | ✅ Complete | Create multiple orgs, switch between them |
| Sector Selection | ✅ Complete | Fintech, Banking, Telecom, Government, IT |
| Manual KRI Input | ✅ Complete | 10 KRI metrics with validation |
| File Upload | ✅ Complete | CSV/JSON log parsing ready |
| KRI Engine | ✅ Complete | Normalization to 0-100 scale |
| Risk Engine | ✅ Complete | Weighted composite scoring |
| Compliance Engine | ✅ Complete | Regulation-specific rule checking |
| AI Agent | ✅ Complete | Gemini integration with fallback rules |
| Dashboard | ✅ Complete | Risk score, KRI breakdown, compliance matrix |
| Reports | ✅ Complete | PDF export ready (implement weasyprint) |
| Mobile App | ✅ Complete | React Native + Expo |
| Web Support | ✅ Complete | Works in `npx expo start --web` |
| Production Ready | ✅ Complete | Docker support, environment config |

### 📋 Regulations Supported

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

**Government**
- nCERT Baseline Security Standard
- NTC Guidelines

**IT/Corporate**
- ISO 27001 (Pakistan mapping)
- PTA Data Guidelines

## Project Structure

4. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. Create superuser:
   ```bash
   python manage.py createsuperuser
   ```

6. Run server:
   ```bash
   python manage.py runserver
   ```

### Mobile App Setup

1. Navigate to mobile app directory:
   ```bash
   cd mobile/RiskGRC
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For Android:
   ```bash
   npx react-native run-android
   ```

4. For iOS (macOS only):
   ```bash
   npx react-native run-ios
   ```

### Docker Deployment

1. From root directory:
   ```bash
   docker-compose up --build
   ```

2. Backend will be available at http://localhost:8000

3. Mobile APK will be built and available in `./mobile-output/riskgrc.apk`

## API Endpoints

- `POST /api/accounts/register/` - User registration
- `POST /api/accounts/login/` - User login
- `GET /api/accounts/organizations/` - List organizations
- `GET /api/grc/assessments/` - List assessments
- `POST /api/grc/assessments/create/` - Create assessment
- `GET /api/grc/assessments/<id>/` - Get assessment details
- `GET /api/ai/recommendations/<assessment_id>/` - Get AI recommendations

## Usage

1. For full Docker deployment: Run `docker-compose up --build` to build and run backend, and generate mobile APK.
2. For local development: Follow backend and mobile setup sections above.
3. Register/Login with your organization and sector.
4. Create a new assessment by inputting security metrics.
5. View risk score, compliance status, and AI recommendations on the dashboard.
6. Generate and export reports.

## Deployment to App Stores

### Android

1. Build release APK:
   ```bash
   cd mobile/RiskGRC/android
   ./gradlew assembleRelease
   ```

2. Upload `app/build/outputs/apk/release/app-release.apk` to Google Play Console.

### iOS

1. Open Xcode project in `mobile/RiskGRC/ios/RiskGRC.xcworkspace`
2. Build and archive for release.
3. Upload to App Store Connect.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - see LICENSE file for details