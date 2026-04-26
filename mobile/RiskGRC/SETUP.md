# RiskGRC Setup Guide

This guide provides step-by-step instructions to run RiskGRC on your system (Kali Linux, Ubuntu, or any Linux distribution).

## 📋 Prerequisites

Before starting, ensure you have:

- **Git** - for cloning the repository
- **Node.js** (v22.11.0 or higher) - JavaScript runtime
- **npm** - Node package manager
- **A modern web browser** - Chrome, Firefox, or Edge
- **Backend API Server** - running on http://localhost:8000/api

### Installing Prerequisites

#### On Kali Linux / Ubuntu / Debian

```bash
# Update package manager
sudo apt update
sudo apt upgrade -y

# Install Node.js (v22.11.0+)
# Using Node Version Manager (nvm) - RECOMMENDED
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# Verify installation
node --version  # Should be v22.11.0 or higher
npm --version   # Should be v10.0.0 or higher

# Install Git (if not already installed)
sudo apt install git -y
```

#### On Other Linux Distributions

```bash
# For Red Hat / CentOS / Fedora
sudo dnf install nodejs npm git -y

# For Arch Linux
sudo pacman -S nodejs npm git

# Verify installation
node --version
npm --version
```

## 🚀 Installation Steps

### 1. Clone the Repository

```bash
cd /tmp
git clone https://github.com/GogetaDUchiha/grc.git
cd grc/mobile/RiskGRC
```

### 2. Install Dependencies

```bash
# Install all Node packages
npm install
```

**If you encounter errors**, try:

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### 3. Configure Environment

```bash
# Copy the example environment file (contains sensible defaults)
cp .env.example .env

# Edit .env to match your backend configuration
nano .env
# or
vi .env
```

**Example .env contents:**

```env
# Backend API URL (update if your backend is on a different server)
REACT_APP_API_URL=http://localhost:8000/api

# Environment mode
REACT_APP_ENV=development
NODE_ENV=development
```

**Save and exit** (nano: Ctrl+X, then Y, then Enter)

### 4. Verify Setup

```bash
# Run the verification script (optional but recommended)
chmod +x verify-setup.sh
./verify-setup.sh
```

**Expected output:**
```
🔍 RiskGRC Setup Verification
==============================

...
✓ All checks passed!
```

If any checks fail, see the **Troubleshooting** section below.

## ▶️ Running the Application

### Start the Development Server

```bash
# From the RiskGRC directory
npx expo start --web
```

**What happens:**
1. Expo dev server starts
2. Webpack bundles the React code
3. Your default browser opens automatically
4. The app runs on `http://localhost:19006` (or similar)

### Alternative: Specify Port

If port 19006 is busy:

```bash
npx expo start --web --port 3000
```

### Alternative: Clear Cache and Rebuild

```bash
npx expo start --web --clear
```

## 🌐 Accessing the Application

Once the Expo server starts, your browser should automatically open showing:

1. **Login Screen** - Enter credentials to access the dashboard
2. Use the test account (if set up on your backend):
   - **Username**: testuser
   - **Password**: testpass123

If the browser doesn't open automatically:

```bash
# Open manually in your browser
firefox http://localhost:19006
# or
chromium-browser http://localhost:19606
# or
google-chrome http://localhost:19606
```

## 🧪 Testing Features

### Test Login

1. Open the app
2. Enter credentials
3. Verify dashboard loads

### Test Registration

1. Click \"Don't have an account? Register here\"
2. Fill in the form with:
   - Username: newuser123
   - Email: user@example.com
   - Password: SecurePass123!
   - Confirm Password: SecurePass123!
3. Select an organization
4. Click Register

### Test Network Error Handling

1. Close the backend server
2. Try to login
3. Verify error message displays

## 🛠️ Troubleshooting

### Issue: \"Cannot find module 'expo'\"

```bash
# Solution: Reinstall dependencies
npm install
# or
npm install -g expo-cli
npx expo start --web
```

### Issue: \"Port 19006 is already in use\"

```bash
# Find and kill process using the port
lsof -ti:19006 | xargs kill -9

# Or use a different port
npx expo start --web --port 3000
```

### Issue: \"Blank screen on startup\"

1. Check browser console for errors: **F12** (opens DevTools)
2. Verify backend API is running
3. Check `.env` configuration:
   ```bash
   cat .env
   ```
4. Clear browser cache: **Ctrl+Shift+Delete**
5. Hard refresh: **Ctrl+F5**

### Issue: \"API connection failed\"

1. **Verify backend is running:**
   ```bash
   curl http://localhost:8000/api/
   ```
   Should return a response, not \"Connection refused\"

2. **Check .env API URL:**
   ```bash
   grep REACT_APP_API_URL .env
   ```
   Should show: `REACT_APP_API_URL=http://localhost:8000/api`

3. **If backend is on a different machine:**
   - Update `.env`: `REACT_APP_API_URL=http://BACKEND_IP:8000/api`
   - Replace `BACKEND_IP` with actual IP address
   - Restart Expo: **Ctrl+C** then `npx expo start --web`

### Issue: \"npm ERR! peer dep missing\"

```bash
# Force installation
npm install --legacy-peer-deps

# or update packages
npm update
```

### Issue: Node version mismatch

```bash
# Check current version
node --version

# Need to upgrade?
nvm install 22
nvm use 22
nvm alias default 22

# Verify
node --version  # Should be v22.x.x
```

## 📝 Development Workflow

### Making Changes

1. Edit files in `src/` directory
2. Save changes
3. Browser auto-refreshes (hot reload)
4. Test your changes

### Common Tasks

**Add a new screen:**
```bash
# Create new screen file
nano src/screens/NewScreen.js

# Import in App.tsx
# Add to navigation stack
```

**Test API calls:**
```bash
# Edit src/services/api.js
# Changes auto-reload in browser
```

**Update validation:**
```bash
# Edit src/utils/validation.js
# Changes auto-reload in browser
```

## 🔐 Security Reminders

1. **Never commit `.env` files** - they contain secrets
2. **Use `.env.example`** as a template
3. **Don't log passwords** in console
4. **Validate all inputs** before sending to API
5. **Use HTTPS** in production

## 🚀 Production Build

When ready to deploy:

```bash
# Build for web
npm run build:web

# This creates a production-optimized build
# Upload the `dist/` folder to your hosting provider
```

## 📞 Getting Help

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Read [README.md](README.md) for more details
3. Check [SECURITY.md](SECURITY.md) for security questions
4. See [Expo Docs](https://docs.expo.dev) for framework questions
5. Check browser console for error messages: **F12**

## 🔗 Useful Commands

```bash
# Start development server
npx expo start --web

# Clear cache and rebuild
npx expo start --web --clear

# Use different port
npx expo start --web --port 3000

# Run tests
npm test

# Run linter
npm run lint

# Install a new package
npm install package-name

# Update all packages
npm update

# Check for security issues
npm audit

# Fix security issues
npm audit fix
```

## ✅ Verification Checklist

After setup, verify:

- [ ] `node --version` returns v22.11.0 or higher
- [ ] `.env` file exists and contains API URL
- [ ] `npm install` completed without errors
- [ ] `npx expo start --web` starts without errors
- [ ] Browser opens to http://localhost:19006 (or assigned port)
- [ ] Login page displays
- [ ] Can enter credentials
- [ ] Backend API responds (check Network tab in DevTools)

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [RiskGRC SECURITY.md](SECURITY.md)

---

**Happy Coding! 🚀**

Last updated: April 2026
