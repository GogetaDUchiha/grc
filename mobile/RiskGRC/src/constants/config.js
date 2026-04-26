/**
 * Application Configuration Constants
 * Centralized configuration for the RiskGRC mobile app
 */

export const CONFIG = {
  // Environment
  ENV: __DEV__ ? 'development' : 'production',
  DEBUG: __DEV__,

  // API Configuration
  API: {
    BASE_URL: __DEV__
      ? 'http://localhost:8000/api'
      : process.env.REACT_APP_API_URL || 'https://api.riskgrc.com/api',
    TIMEOUT: 15000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },

  // Validation Rules
  VALIDATION: {
    USERNAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 150,
    },
    PASSWORD: {
      MIN_LENGTH: 8,
      CLIENT_MIN_LENGTH: 6,
      MAX_LENGTH: 255,
    },
    EMAIL: {
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },

  // Storage Keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_INFO: 'user_info',
    LAST_LOGIN: 'last_login',
  },

  // Error Messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    INVALID_CREDENTIALS: 'Invalid username or password.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.',
  },
};

export default CONFIG;
