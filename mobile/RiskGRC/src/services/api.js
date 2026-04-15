import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ ? 'http://localhost:8000/api' : (process.env.BACKEND_URL || 'http://backend:8000/api'); // Change to your backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/accounts/login/', data),
  register: (data) => api.post('/accounts/register/', data),
  getOrganizations: () => api.get('/accounts/organizations/'),
};

export const grcAPI = {
  getAssessments: () => api.get('/grc/assessments/'),
  createAssessment: (data) => api.post('/grc/assessments/create/', data),
  getAssessment: (id) => api.get(`/grc/assessments/${id}/`),
};

export const aiAPI = {
  getRecommendations: (id) => api.get(`/ai/recommendations/${id}/`),
};

export default api;