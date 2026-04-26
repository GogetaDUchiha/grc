# RiskGRC Mobile Application

A secure, cross-platform mobile application for risk and governance assessment built with Expo and React Native.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 22.11.0
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone and navigate to the project**

```bash
cd mobile/RiskGRC
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Create environment configuration**

```bash
cp .env.example .env
```

Edit `.env` to configure your backend API:

```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
NODE_ENV=development
REACT_APP_GEMINI_API_KEY=your-gemini-api-key
```

4. **Start the Expo development server**

For **Web (Linux, macOS, Windows)**:

```bash
npm run web
```

This will:
- Start the Expo dev server
- Open the app in your default web browser
- Enable hot reloading for development

The application will be available at: **http://localhost:19006** (or port Expo assigns)

### Running on Different Platforms

**iOS** (macOS only):
```bash
npm run ios
```

**Android**:
```bash
npm run android
```

**Web**:
```bash
npm run web
```

## 🔒 Security Features

This application implements industry-standard security practices:

### Authentication & Token Management
- JWT token-based authentication
- Automatic token refresh on expiration
- Secure token storage with **expo-secure-store** (device-native encryption)
- Fallback to async storage for web compatibility

### Input Validation
- Comprehensive client-side validation
- Email format validation
- Password strength requirements
- XSS prevention through input sanitization
- Request timeout and retry logic

### API Communication
- HTTPS enforcement in production
- CORS protection (withCredentials: false)
- Request timeout (15 seconds)
- Automatic retry with exponential backoff
- Error response sanitization

### Environment Configuration
- Secure environment variable management
- `.env` file excluded from version control
- Separate dev/production configurations

## 📁 Project Structure

```
src/
├── screens/           # Screen components
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── DashboardScreen.js
│   ├── NewAssessmentScreen.js
│   └── AssessmentDetailScreen.js
├── services/          # API and external services
│   └── api.js         # Axios API client with interceptors
├── utils/             # Utility functions
│   └── validation.js  # Input validation helpers
└── constants/         # Application constants
    └── config.js      # Configuration and constants

App.tsx               # Main app navigation
index.js              # Expo entry point
app.json              # Expo configuration
```

## 🛠️ Development

### Code Standards

- **Input Validation**: Always validate user input before sending to backend
- **Error Handling**: Provide user-friendly error messages
- **Loading States**: Show loading indicators during API calls
- **Security**: Never log sensitive data (tokens, passwords)

### Adding New Screens

1. Create new screen file in `src/screens/`
2. Import utilities: `import { validateUsername } from '../utils/validation'`
3. Use existing patterns from `LoginScreen.js` and `RegisterScreen.js`
4. Add screen to navigation in `App.tsx`

### Making API Calls

```javascript
import { authAPI, grcAPI } from '../services/api';

// Automatic token injection and error handling
const response = await grcAPI.getAssessments();
```

The API client automatically:
- Injects authentication token
- Handles 401 token expiration
- Retries network failures
- Validates input parameters

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
# Development Backend URL
REACT_APP_API_URL=http://localhost:8000/api

# Gemini API Key for AI features
REACT_APP_GEMINI_API_KEY=your-gemini-api-key

# Environment (development or production)
REACT_APP_ENV=development
NODE_ENV=development
```

**⚠️ IMPORTANT**: Never commit `.env` files to version control!

## 🧪 Testing

```bash
# Run tests
npm test

# Run linter
npm run lint

# Verify setup
npm run verify
```

## 📦 Building for Production

### Web Build

```bash
npm run build:web
```

### Native Build (Requires Expo Account)

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for Web
eas build --platform web
```

## ⚠️ Security Best Practices

### For Developers

1. **Never expose secrets**
   - API keys should be in environment variables
   - Use `.env.example` as template without secrets

2. **Input validation**
   - Always validate before sending to backend
   - Sanitize user input to prevent XSS

3. **Token management**
   - Never log tokens in console
   - Use secure storage for sensitive data
   - Implement proper logout clearing all tokens

4. **HTTPS in production**
   - Ensure `REACT_APP_API_URL` uses HTTPS
   - Set `NODE_ENV=production` in production

### For System Administrators

1. Keep Node.js updated (requires >= 22.11.0)
2. Use strong environment variable secrets
3. Implement HTTPS reverse proxy
4. Monitor API rate limits
5. Regularly update dependencies: `npm audit`, `npm update`

## 🐛 Troubleshooting

### "Cannot find module" errors

```bash
npm run clean
npm install
```

### Port already in use

```bash
# Find and kill process on port 19006
lsof -ti:19006 | xargs kill -9
```

### Blank screen on startup

1. Enable Expo development server:
   ```bash
   npm run web
   ```
2. Check browser console for errors: `F12`
3. Verify `.env` configuration
4. Ensure backend is running at `REACT_APP_API_URL`

### API connection failed

1. Verify backend URL in `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:8000/api
   ```
2. Ensure backend server is running
3. Check for CORS issues in browser console
4. Verify `REACT_APP_GEMINI_API_KEY` is set for AI features

## 🤝 Contributing

1. Follow security guidelines in `/docs/SECURITY.md`
2. Add input validation for new forms
3. Use `react-native` components (compatibility with web/mobile)
4. Test on multiple platforms
5. Run linting before committing: `npm run lint`

## 📄 License

See LICENSE file for details.

## 🔗 Useful Links

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Axios Documentation](https://axios-http.com)
- [React Navigation](https://reactnavigation.org)
- [Google Gemini API](https://ai.google.dev)

---

**Made with ❤️ for secure risk assessment**
