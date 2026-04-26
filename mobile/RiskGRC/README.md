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
cd /workspaces/grc/mobile/RiskGRC
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
```

4. **Start the Expo development server**

For **Web (Kali Linux or any Linux system)**:

```bash
npx expo start --web
```

This will:
- Start the Expo dev server
- Open the app in your default web browser
- Enable hot reloading for development

The application will be available at: **http://localhost:19006** (or port Expo assigns)

### Running on Different Platforms

**iOS** (macOS only):
```bash
npx expo run:ios
```

**Android**:
```bash
npx expo run:android
```

**Web**:
```bash
npx expo start --web
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

1. Keep Node.js updated
2. Use strong environment variable secrets
3. Implement HTTPS reverse proxy
4. Monitor API rate limits
5. Regularly update dependencies: `npm audit`, `npm update`

## 🐛 Troubleshooting

### \"Cannot find module\" errors

```bash
rm -rf node_modules package-lock.json
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
   npx expo start --web
   ```
2. Check browser console for errors: `F12`
3. Verify `.env` configuration

### API connection failed

1. Verify backend URL in `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:8000/api
   ```
2. Ensure backend server is running
3. Check for CORS issues in browser console

## 🤝 Contributing

1. Follow security guidelines in `/docs/SECURITY.md`
2. Add input validation for new forms
3. Use `react-native` components (compatibility with web/mobile)
4. Test on multiple platforms

## 📄 License

See LICENSE file for details.

## 🔗 Useful Links

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Axios Documentation](https://axios-http.com)
- [React Navigation](https://reactnavigation.org)

---

**Made with ❤️ for secure risk assessment**


For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
