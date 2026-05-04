/**
 * API Service Layer (Cleaned for Python Backend)
 */
import axios from 'axios';
import { store } from '../redux/store';
import { logout } from '../redux/authSlice';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
      window.location.href = '/login';
    }
    return Promise.reject(new Error(error.response?.data?.detail || error.message));
  }
);

// ===== Auth =====
export const login = data => api.post('/auth/login', data);
export const register = data => api.post('/auth/register', data);

// ===== Data Management =====
export const uploadCSV = (formData, onProgress) =>
  api.post('/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total))
  });
export const getUploads = () => api.get('/uploads');
export const getSampleCSV = () => axios.get('/api/sample-csv', { responseType: 'blob' });

// ===== ML & Prediction =====
export const trainModels = () => api.post('/ml/train');
export const trainRegression = () => api.post('/regression/train');
export const predict = data => api.post('/predict', data);
export const predictRegression = data => api.post('/regression/predict', data);
export const getTrainingHistory = () => api.get('/training-history');
export const getRegressionMetrics = () => api.get('/regression/metrics');

// ===== Statistics & Visualization =====
export const getAthletes = params => api.get('/athletes', { params });
export const getStats = () => api.get('/athletes/stats');
export const getClusters = params => api.get('/clusters', { params });
export const getAnalytics = params => api.get('/analytics', { params });
export const deleteAthlete = id => api.delete(`/athletes/${id}`);
export const resetAthletes = () => api.delete('/athletes/reset');

export default api;
