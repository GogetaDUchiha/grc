# 🎉 RiskGRC Project - Quick Reference Guide

## ⚡ Start Here - 30 Second Setup

```bash
# Navigate to project
cd /workspaces/grc/mobile/RiskGRC

# Install dependencies (if not already done)
npm install

# Copy environment file
cp .env.example .env

# Start the app!
npm run web
```

**That's it!** Your app opens automatically at http://localhost:19606

---

## 📋 What's Included

### ✅ Expo-Ready Project
- [x] `index.js` - Updated to use `registerRootComponent` (Expo standard)
- [x] `app.json` - Full Expo configuration
- [x] `babel.config.js` - Expo Babel preset
- [x] `metro.config.js` - Expo Metro config
- [x] Latest Expo v51 dependencies

### ✅ Security Features
- [x] JWT token authentication
- [x] Secure token storage (expo-secure-store + AsyncStorage fallback)
- [x] Input validation for all forms
- [x] XSS prevention
- [x] API request timeout & retry logic
- [x] HTTPS enforcement in production
- [x] Safe error messages

### ✅ Complete Screens
- [x] **LoginScreen** - With validation & error handling
- [x] **RegisterScreen** - With password confirmation & validation
- [x] **DashboardScreen** - Assessment list view
- [x] **NewAssessmentScreen** - Create assessment form
- [x] **AssessmentDetailScreen** - View assessment details

### ✅ Development Tools
- [x] ESLint configuration for code quality
- [x] Auto-reload on file changes
- [x] Browser DevTools support (F12)
- [x] Verification script
- [x] npm scripts for common tasks

### ✅ Documentation
- [x] `README.md` - Complete project guide
- [x] `SETUP.md` - Step-by-step setup (especially for Kali Linux)
- [x] `SECURITY.md` - Security best practices
- [x] `INSTALLATION_COMPLETE.md` - Completion checklist

---

## 🚀 Common Commands

```bash
# Development
npm run web              # Start web development server
npm test                 # Run tests
npm run lint             # Fix code style issues

# Building
npm run build:web        # Build production web version

# Native (iOS/Android)
npm run ios              # Run on iOS simulator
npm run android          # Run on Android device

# Maintenance
npm run clean            # Clean install (reinstall node_modules)
npm run verify           # Run setup verification
npm audit                # Check for security vulnerabilities
npm audit fix            # Fix vulnerable dependencies
```

---

## 💻 Using on Kali Linux / Ubuntu / Any Linux

### Prerequisites
```bash
# Install Node.js (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# Verify
node --version   # Should show v22.11.0+
npm --version    # Should show v10.0.0+
```

### Run the App
```bash
cd /workspaces/grc/mobile/RiskGRC
npm install
cp .env.example .env
npm run web
```

**Browser opens automatically!** 🌐

---

## 📱 Running on Different Platforms

| Platform | Command | How It Works |
|----------|---------|-------------|
| **Web/Kali** | `npm run web` | Runs in browser using Metro bundler |
| **iOS** | `npm run ios` | Needs macOS with Xcode |
| **Android** | `npm run android` | Needs Android SDK/emulator |

---

## 🔐 Environment Configuration

### Development (Default)
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
NODE_ENV=development
```

### Production
```env
REACT_APP_API_URL=https://api.riskgrc.com/api
REACT_APP_ENV=production
NODE_ENV=production
```

---

## 🔍 Troubleshooting

| Problem | Fix |
|---------|-----|
| **Port in use** | `npx expo start --web --port 3000` |
| **Blank screen** | Press F12 → check console, hard refresh (Ctrl+F5) |
| **API error** | Check backend running: `curl http://localhost:8000/api/` |
| **Module error** | `npm run clean` then `npm install` |

---

## 🎯 Quick Access

- 📖 **Full Setup Guide**: See `SETUP.md`
- 🔒 **Security Best Practices**: See `SECURITY.md`
- 📚 **Project Documentation**: See `README.md`
- ✅ **Installation Checklist**: See `INSTALLATION_COMPLETE.md`

---

## ✨ Key Features

✅ Expo-ready (use `npm run web` on Kali/Linux)  
✅ Secure authentication with JWT tokens  
✅ Input validation on all forms  
✅ Works on web, iOS, and Android  
✅ Production-ready code  
✅ Comprehensive documentation  

---

## 🚀 Start Here

```bash
cd /workspaces/grc/mobile/RiskGRC
npm install
npm run web
```

**That's all you need!** 🎉

---

**Last updated:** April 2026 | **Status:** ✅ Ready to Use
