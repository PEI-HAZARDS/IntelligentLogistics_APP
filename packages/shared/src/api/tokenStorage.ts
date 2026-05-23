/**
 * TokenStorage interface — abstracts over localStorage (web) and
 * expo-secure-store (React Native). Both adapters are async so the
 * API client factory works identically in both environments.
 */
export interface TokenStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * localStorage adapter for the web frontend.
 * Wraps the synchronous localStorage API in promises.
 */
export const localStorageAdapter: TokenStorage = {
  get: (key) => Promise.resolve(localStorage.getItem(key)),
  set: (key, value) => { localStorage.setItem(key, value); return Promise.resolve(); },
  remove: (key) => { localStorage.removeItem(key); return Promise.resolve(); },
};
