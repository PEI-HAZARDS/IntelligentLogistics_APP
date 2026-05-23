import { createApiClient, localStorageAdapter } from '@il/shared';

const DEFAULT_API_BASE = 'http://localhost:8000/api';
const API_BASE = import.meta.env.VITE_API_URL || DEFAULT_API_BASE;

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

const api = createApiClient({
  baseUrl: API_BASE,
  storage: localStorageAdapter,
  onAuthFailed: clearAndRedirect,
});

export default api;
