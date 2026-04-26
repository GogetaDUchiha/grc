# Security Policy & Best Practices

## Overview

RiskGRC is built with security as a core principle. This document outlines the security measures implemented and best practices for developers and administrators.

## 🔐 Security Architecture

### 1. Authentication & Authorization

#### Token-Based Authentication
- Uses JWT (JSON Web Tokens) for stateless authentication
- Automatic token refresh mechanism
- Tokens stored securely:
  - **Mobile**: `expo-secure-store` (device keychain/credentials store)
  - **Web**: AsyncStorage with optional encryption layer

#### Token Lifecycle
```
Login → Backend returns {access_token, refresh_token}
         ↓
Store securely in AsyncStorage/SecureStore
         ↓
Include access_token in Authorization header for all API calls
         ↓
On 401 (Unauthorized) → Use refresh_token to get new access_token
         ↓
If refresh fails → Clear tokens and redirect to login
```

### 2. Input Validation & Sanitization

#### Client-Side Validation
All user inputs are validated **before** sending to the backend:

```javascript
// File: src/utils/validation.js

// Username: 2-150 alphanumeric + underscore/hyphen
validateUsername(username)

// Password: minimum 6 chars client-side, 8 chars server-side
validatePassword(password)

// Email: RFC-compliant format
validateEmail(email)

// XSS Prevention
sanitizeInput(userInput)
```

#### Validation Rules
- **Username**: 2-150 characters, alphanumeric + `_` and `-`
- **Password**: Min 8 characters (strict), uppercase, lowercase, numbers, special chars
- **Email**: Valid email format, max 254 characters
- **All Inputs**: Maximum length enforced, special characters escaped

### 3. API Security

#### Request Configuration
```javascript
// File: src/services/api.js

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,              // 15 second timeout
  withCredentials: false,       // CORS protection
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'RiskGRC-Mobile/0.0.1'
  }
});
```

#### Error Handling
- Sensitive data never logged to console
- User-friendly error messages without exposing backend details
- Network failures automatically retried (exponential backoff)
- Request timeout handling (15 seconds)

#### Retry Logic
```
Network Error → Wait 1s → Retry (max 3 attempts)
                ↓
Each retry increases delay (exponential backoff)
                ↓
After 3 failures → Display error to user
```

### 4. Secure Storage

#### Sensitive Data Storage Strategy

| Data | Storage Method | Encryption |
|------|---|---|
| Access Token | expo-secure-store (mobile), AsyncStorage (web) | Device keychain / Platform default |
| Refresh Token | expo-secure-store (mobile), AsyncStorage (web) | Device keychain / Platform default |
| User Credentials | Memory only | N/A - cleared after login |
| API Response | React state (memory) | N/A - cleared on logout |

#### Storage Cleanup
```javascript
// On Logout
await AsyncStorage.removeItem('access_token');
await AsyncStorage.removeItem('refresh_token');
setPassword('');              // Clear from memory
setUsername('');              // Clear from memory
```

### 5. Environment Configuration

#### Development Environment
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
NODE_ENV=development
```

#### Production Environment
```env
REACT_APP_API_URL=https://api.riskgrc.com/api
REACT_APP_ENV=production
NODE_ENV=production
```

**⚠️ Critical**: `.env` files MUST be in `.gitignore`

### 6. HTTPS & Transport Security

#### Requirements
- **Production**: HTTPS required (APIs must use `https://`)
- **Development**: HTTP allowed (localhost debugging)
- **Web**: Enforce HTTPS in production builds

#### Implementation
```javascript
const API_BASE_URL = 
  __DEV__ 
    ? 'http://localhost:8000/api'           // Development
    : process.env.REACT_APP_API_URL          // Production (HTTPS)
```

### 7. Error Handling & Logging

#### Safe Error Messages
```javascript
// ✅ DO: User-friendly message
\"Login failed. Please try again\"

// ❌ DON'T: Expose backend details
\"Error 401: Invalid JWT token signature\"
```

#### Logging Best Practices
```javascript
// ✅ DO: Log general info
console.log('Login attempt');
console.error('Network error:', error.message);

// ❌ DON'T: Log sensitive data
console.log('Token:', token);
console.log('Password:', password);
```

## 🛡️ Security Checklist

### Before Deployment

- [ ] All API endpoints use HTTPS
- [ ] Environment variables set correctly
- [ ] `.env` files added to `.gitignore`
- [ ] No hardcoded secrets in code
- [ ] API credentials rotated
- [ ] CORS properly configured on backend
- [ ] Rate limiting implemented on backend
- [ ] All dependencies up-to-date (`npm audit`)

### During Development

- [ ] Always validate user input
- [ ] Use HTTPS in Axios requests (production)
- [ ] Clear sensitive data from state on logout
- [ ] Test with invalid input
- [ ] Never commit `.env` files
- [ ] Use `.env.example` as template
- [ ] Review API calls for injection vulnerabilities

### On Test/Production Servers

- [ ] Use strong, unique API credentials
- [ ] Implement rate limiting
- [ ] Monitor for suspicious activity
- [ ] Regular security patches for Node.js and dependencies
- [ ] HTTPS with valid certificates
- [ ] Firewall rules limiting API access
- [ ] Regular backups

## 🔍 Common Security Issues & Solutions

### Issue: Token Leaked in Browser Console

**Problem**: Tokens visible in React DevTools or Network tab

**Solution**:
1. Use `expo-secure-store` instead of localStorage
2. Never log tokens
3. Set `withCredentials: false` for CORS safety
4. Use HttpOnly cookies on backend (if applicable)

```javascript
// ❌ Bad
console.log('Token:', token);
localStorage.setItem('token', token);

// ✅ Good
try {
  await SecureStore.setItemAsync('access_token', token);
} catch (e) {
  // Fallback to AsyncStorage for web
}
```

### Issue: Unvalidated User Input

**Problem**: XSS or injection attacks possible

**Solution**:
```javascript
// ✅ Always validate
const result = validateEmail(email);
if (!result.valid) {
  setErrors({ email: result.error });
  return;
}

// ✅ Sanitize if needed
const safe = sanitizeInput(userInput);
```

### Issue: Hardcoded API URLs

**Problem**: Backend URL changes require code recompilation

**Solution**:
```javascript
// ✅ Use environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL;

// .env files:
# Development
REACT_APP_API_URL=http://localhost:8000/api

# Production
REACT_APP_API_URL=https://api.riskgrc.com/api
```

### Issue: Lost Refresh Token

**Problem**: User stuck in logged-out state

**Solution**:
```javascript
// Automatic refresh token rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (refreshToken) {
        // Backend refreshes token
        // User stays logged in
      } else {
        // Redirect to login
      }
    }
    return Promise.reject(error);
  }
);
```

## 📋 API Security Contract

### Request Headers
```
Content-Type: application/json
Authorization: Bearer {access_token}
User-Agent: RiskGRC-Mobile/0.0.1
```

### Backend Responsibilities
1. **Validate all inputs** server-side
2. **Rate limit** API endpoints
3. **Use HTTPS** exclusively
4. **Return safe error messages**
5. **Implement CORS** correctly
6. **Sign/encrypt** sensitive responses
7. **Rotate secrets** regularly

### Frontend Responsibilities
1. **Validate inputs** before sending
2. **Store tokens** securely
3. **Include authentication** headers
4. **Handle 401** (token expired)
5. **Clear data** on logout
6. **Use HTTPS** in production
7. **Don't log** sensitive data

## 🚨 Incident Response

If a security incident occurs:

1. **Immediate Actions**
   - Revoke all active tokens
   - Force re-authentication for all users
   - Audit access logs
   - Change API credentials

2. **Investigation**
   - Determine scope of exposure
   - Identify compromised data
   - Review access patterns
   - Check for unauthorized access

3. **Resolution**
   - Patch vulnerability
   - Update dependencies
   - Redeploy fixed version
   - Notify affected users

4. **Prevention**
   - Add regression tests
   - Code review checklist
   - Security training
   - Monitoring alerts

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Native Security](https://reactnative.dev/docs/security)
- [Expo Security Best Practices](https://docs.expo.dev/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [Axios Security](https://axios-http.com/docs/safety)

## 📞 Security Issues

If you discover a security vulnerability, please email: **security@riskgrc.com**

Do NOT open a public GitHub issue for security vulnerabilities.

---

**Last Updated**: April 2026  
**Version**: 1.0  
**Status**: Active
