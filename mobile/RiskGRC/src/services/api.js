import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// For web: use expo-secure-store fallback
let SecureStore;
try {
  SecureStore = require('expo-secure-store').default;
} catch (e) {
  // Fallback for web
  SecureStore = null;
}

const ENV = {
  dev: {
    apiUrl: 'http://10.0.2.15:8000/api',
  },
  prod: {
    apiUrl: process.env.REACT_APP_API_URL || 'https://api.riskgrc.com/api',
  },
};

const API_BASE_URL =
  __DEV__ || process.env.NODE_ENV === 'development'
    ? ENV.dev.apiUrl
    : ENV.prod.apiUrl;

const TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'RiskGRC-Mobile/0.0.1',
  },
  withCredentials: false, // CORS safety
});

let retryCount = 0;

// Request interceptor with token injection
api.interceptors.request.use(
  async (config) => {
    try {
      // Prioritize secure storage for tokens
      let token = null;

      if (SecureStore) {
        try {
          token = await SecureStore.getItemAsync('access_token');
        } catch (e) {
          console.warn('Secure store read failed, falling back to AsyncStorage');
          token = await AsyncStorage.getItem('access_token');
        }
      } else {
        token = await AsyncStorage.getItem('access_token');
      }

      if (token && token.trim()) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      console.error('Request interceptor error:', error.message);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    retryCount = 0; // Reset retry count on success
    return response;
  },
  async (error) => {
    const config = error.config;

    if (!config) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - refresh token
    if (error.response?.status === 401) {
      try {
        let refreshToken = null;

        if (SecureStore) {
          try {
            refreshToken = await SecureStore.getItemAsync('refresh_token');
          } catch (e) {
            refreshToken = await AsyncStorage.getItem('refresh_token');
          }
        } else {
          refreshToken = await AsyncStorage.getItem('refresh_token');
        }

        if (refreshToken) {
          // Clear invalid tokens
          await AsyncStorage.removeItem('access_token');
          if (SecureStore) {
            try {
              await SecureStore.deleteItemAsync('access_token');
            } catch (e) {
              /* fallback handled */
            }
          }

          // Redirect to login - implement in your app
          console.warn('Token expired - user should re-authenticate');
        }
      } catch (err) {
        console.error('Token refresh failed:', err.message);
      }

      return Promise.reject(error);
    }

    // Retry logic for network errors
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.message.includes('timeout')
    ) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * retryCount));
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

// Exported API modules with input validation
export const authAPI = {
  login: (credentials) => {
    if (!credentials?.username || !credentials?.password) {
      return Promise.reject(new Error('Username and password are required'));
    }
    if (credentials.username.length < 2) {
      return Promise.reject(new Error('Invalid username format'));
    }
    return api.post('/accounts/login/', credentials);
  },
  register: (data) => {
    if (!data?.username || !data?.password || !data?.email) {
      return Promise.reject(new Error('Username, email, and password are required'));
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return Promise.reject(new Error('Invalid email format'));
    }
    if (data.password.length < 8) {
      return Promise.reject(new Error('Password must be at least 8 characters'));
    }
    return api.post('/accounts/register/', data);
  },
  getOrganizations: () => api.get('/accounts/organizations/'),
};

export const grcAPI = {
  getAssessments: () => api.get('/grc/assessments/'),
  createAssessment: (data) => {
    if (!data?.name) {
      return Promise.reject(new Error('Assessment name is required'));
    }
    return api.post('/grc/assessments/create/', data);
  },
  getAssessment: (id) => {
    if (!id) {
      return Promise.reject(new Error('Assessment ID is required'));
    }
    return api.get(`/grc/assessments/${id}/`);
  },
};

export const aiAPI = {
  getRecommendations: (id) => {
    if (!id) {
      return Promise.reject(new Error('Assessment ID is required'));
    }
    return api.get(`/ai/recommendations/${id}/`);
  },
};

export default api;
