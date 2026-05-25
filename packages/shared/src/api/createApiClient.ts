import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { TokenStorage } from './tokenStorage';

export interface ApiClientOptions {
  baseUrl: string;
  storage: TokenStorage;
  /** Called after a failed token refresh — use to clear local state and redirect. */
  onAuthFailed?: () => void;
  timeoutMs?: number;
}

/**
 * Factory that creates a configured Axios instance with:
 *   - Bearer token injection (reads from storage)
 *   - Automatic 401 → token refresh with request queue
 *   - Calls onAuthFailed when refresh fails or no refresh token is available
 */
export function createApiClient({
  baseUrl,
  storage,
  onAuthFailed,
  timeoutMs = 30_000,
}: ApiClientOptions): AxiosInstance {
  const api = axios.create({
    baseURL: baseUrl,
    withCredentials: false,
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  });

  let isRefreshing = false;
  let refreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  function drainQueue(error: unknown, token: string | null = null) {
    refreshQueue.forEach((p) => {
      if (error) p.reject(error);
      else if (token) p.resolve(token);
    });
    refreshQueue = [];
  }

  // Inject Bearer token before every request
  api.interceptors.request.use(async (config) => {
    const token = await storage.get('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // 401 → try refresh, queue concurrent requests, call onAuthFailed on failure
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (
        error.response?.status === 401 &&
        original &&
        !original._retry &&
        !original.url?.includes('/auth/')
      ) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push({
              resolve: (token) => {
                original.headers.Authorization = `Bearer ${token}`;
                resolve(api(original));
              },
              reject,
            });
          });
        }

        original._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await storage.get('refresh_token');
          if (!refreshToken) {
            onAuthFailed?.();
            return Promise.reject(error);
          }

          const { data } = await axios.post<{
            access_token: string;
            refresh_token: string;
          }>(`${baseUrl}/auth/refresh`, { refresh_token: refreshToken });

          await storage.set('access_token', data.access_token);
          await storage.set('refresh_token', data.refresh_token);

          original.headers.Authorization = `Bearer ${data.access_token}`;
          drainQueue(null, data.access_token);
          return api(original);
        } catch (refreshError) {
          drainQueue(refreshError);
          onAuthFailed?.();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (error.response?.status === 401) {
        onAuthFailed?.();
      }

      return Promise.reject(error);
    },
  );

  return api;
}
