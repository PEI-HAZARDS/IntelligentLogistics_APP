import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://<VM_IP>:8000';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('auth_token');
  if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;