import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// API Gateway base URL (proxies to Data Module)
// TODO: Replace hardcoded IP with env var VITE_API_URL before deployment (currently points to dev machine)
const DEFAULT_API_BASE = 'http://10.255.32.70:8000/api';
const API_BASE = import.meta.env.VITE_API_URL || DEFAULT_API_BASE;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track whether a refresh is in progress to avoid concurrent refreshes
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processRefreshQueue(error: unknown, token: string | null = null) {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  refreshQueue = [];
}

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 errors with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh for 401 errors on non-auth endpoints
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        // Another refresh is in progress — queue this request
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // No refresh token — clear auth and redirect
        clearAndRedirect();
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint directly (not via the api instance to avoid interceptor loop)
        const response = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        // Update stored tokens
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', newRefreshToken);
        localStorage.setItem('auth_token', access_token);

        // Retry the original request and process queued requests
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        processRefreshQueue(null, access_token);

        return api(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError);
        clearAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For non-401 errors or auth endpoint errors, just reject
    if (error.response?.status === 401) {
      clearAndRedirect();
    }

    return Promise.reject(error);
  }
);

function clearAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');

  const currentPath = window.location.pathname;
  if (!currentPath.includes('/login') && currentPath !== '/') {
    window.location.href = '/login';
  }
}

export default api;
