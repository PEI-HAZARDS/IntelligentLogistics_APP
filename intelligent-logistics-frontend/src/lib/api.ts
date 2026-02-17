import axios, { AxiosError } from 'axios';

// API Gateway base URL (proxies to Data Module)
const API_BASE = import.meta.env.VITE_API_URL || 'http://10.255.32.70:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear stored auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');

      // Redirect to login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && currentPath !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;