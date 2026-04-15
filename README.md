# RiskGRC

AI-Powered Cyber Governance & Compliance Agent (GRC Tool)

## Features

- **Authentication & Multi-Organization Support**: Users can register/login with organization-based access.
- **Sector-Specific Compliance**: Supports Banking, Telecom, IT, and Government sectors with tailored KRIs and regulations.
- **Manual Input Mode**: Input MFA %, patch delay, encryption %, etc.
- **Simulated Logs Upload**: Support for JSON/CSV fake SIEM logs.
- **KRI Engine**: Transforms raw data into Key Risk Indicators (e.g., failed logins → suspicious activity KRI).
- **Risk Engine**: Weighted scoring system (Risk = Σ(KRI × Weight)) with levels: Low, Medium, High, Critical.
- **Compliance Engine**: Evaluates against regulations like PTA, PECA, SBP. Status: Compliant, Non-Compliant, Partial.
- **AI Governance Agent**: Provides contextual remediation guidance, risk explanations, attack impact, fix recommendations, and exploit scenarios (e.g., "No MFA: Credential stuffing").
- **Dashboard**: Overall risk score (0-100), risk level, KRI breakdown chart, compliance percentage, top 3 risks, AI insights panel.
- **Report Generator**: Export reports with organization details, risk score, KRI table, compliance matrix, AI recommendations.
- **Agentic Document Handling**: Retrieves regulations from web (e.g., nCERT, SBP circular, PTA guideline) for up-to-date analysis.

## Architecture

- **Backend**: Django REST Framework with PostgreSQL
- **Frontend**: React Native mobile app
- **AI**: Rule-based system with templates for recommendations
- **Deployment**: Dockerized with docker-compose

## Prerequisites

- Docker and Docker Compose
- Node.js and npm (for mobile development)
- Android/iOS development environment for React Native

## Installation & Setup

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

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

## API Endpoints

- `POST /api/accounts/register/` - User registration
- `POST /api/accounts/login/` - User login
- `GET /api/accounts/organizations/` - List organizations
- `GET /api/grc/assessments/` - List assessments
- `POST /api/grc/assessments/create/` - Create assessment
- `GET /api/grc/assessments/<id>/` - Get assessment details
- `GET /api/ai/recommendations/<assessment_id>/` - Get AI recommendations

## Usage

1. Register/Login with your organization and sector.
2. Create a new assessment by inputting security metrics.
3. View risk score, compliance status, and AI recommendations on the dashboard.
4. Generate and export reports.

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