/**
 * API Service Layer
 * Axios-based HTTP client for all backend requests
 */
import axios from 'axios';

import { store } from '../redux/store';
import { logout } from '../redux/authSlice';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
      window.location.href = '/login'; // Or use navigate if possible, but store doesn't have access to router easily
    }
    const message = error.response?.data?.error || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

// ===== Upload =====
export const uploadCSV = (formData, onProgress) =>
  api.post('/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total))
  });

export const getUploads = () => api.get('/uploads');
export const getSampleCSV = () =>
  axios.get('/api/sample-csv', { responseType: 'blob' });

// ===== Training =====
export const trainModels = (data = {}) => api.post('/train', data);
export const getTrainingHistory = () => api.get('/training-history');

// ===== Athletes =====
export const getAthletes = (params = {}) => api.get('/athletes', { params });
export const getStats = () => api.get('/athletes/stats');
export const deleteAthlete = id => api.delete(`/athletes/${id}`);
export const resetAthletes = () => api.delete('/athletes/reset');
export const getAnalytics = (params = {}) => api.get('/analytics', { params });

// ===== Clusters =====
export const getClusters = (params = {}) => api.get('/clusters', { params });

// ===== Multi-Target Regression =====
export const trainRegression    = ()     => api.post('/regression/train');
export const predictRegression  = (data) => api.post('/regression/predict', data);
export const getRegressionMetrics = ()   => api.get('/regression/metrics');

// ===== Smart Insights & Model Comparison =====
export const getSmartInsights  = () => api.get('/insights/smart');
export const getModelComparison = () => api.get('/insights/compare');

export default api;
