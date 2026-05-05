/**
 * API Client for React Native
 * Uses expo-secure-store for token persistence and supports Keycloak token refresh.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../config/config';

const api = axios.create({
    baseURL: API_CONFIG.baseUrl,
    withCredentials: false,
    timeout: API_CONFIG.timeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Track whether a refresh is in progress
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
api.interceptors.request.use(async (config) => {
    try {
        const token = await AuthStorage.getToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.warn('Failed to get auth token from storage:', error);
    }
    return config;
});

// Response interceptor - handle 401 errors with token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/')
        ) {
            if (isRefreshing) {
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

            try {
                const refreshToken = await AuthStorage.getRefreshToken();
                if (!refreshToken) {
                    await AuthStorage.clear();
                    return Promise.reject(error);
                }

                // Call refresh endpoint directly to avoid interceptor loop
                const response = await axios.post(`${API_CONFIG.baseUrl}/auth/refresh`, {
                    refresh_token: refreshToken,
                });

                const { access_token, refresh_token: newRefreshToken } = response.data;

                await AuthStorage.setToken(access_token);
                await AuthStorage.setRefreshToken(newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                processRefreshQueue(null, access_token);

                return api(originalRequest);
            } catch (refreshError) {
                processRefreshQueue(refreshError);
                await AuthStorage.clear();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        if (error.response?.status === 401) {
            await AuthStorage.clear();
        }

        return Promise.reject(error);
    }
);

export default api;

// Helper functions for auth storage — tokens in SecureStore, user_info in AsyncStorage
export const AuthStorage = {
    async getToken(): Promise<string | null> {
        const token = await SecureStore.getItemAsync('access_token');
        if (token !== null) return token;
        // One-time migration: move legacy AsyncStorage token to SecureStore
        const legacy = await AsyncStorage.getItem('auth_token');
        if (legacy) {
            await SecureStore.setItemAsync('access_token', legacy);
            await AsyncStorage.multiRemove(['auth_token', 'access_token']);
        }
        return legacy;
    },

    async setToken(token: string): Promise<void> {
        await SecureStore.setItemAsync('access_token', token);
    },

    async getRefreshToken(): Promise<string | null> {
        return SecureStore.getItemAsync('refresh_token');
    },

    async setRefreshToken(token: string): Promise<void> {
        await SecureStore.setItemAsync('refresh_token', token);
    },

    async getUserInfo<T>(): Promise<T | null> {
        const data = await AsyncStorage.getItem('user_info');
        return data ? JSON.parse(data) : null;
    },

    async setUserInfo<T>(info: T): Promise<void> {
        await AsyncStorage.setItem('user_info', JSON.stringify(info));
    },

    async clear(): Promise<void> {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await AsyncStorage.multiRemove(['auth_token', 'access_token', 'user_info']);
    },

    async isAuthenticated(): Promise<boolean> {
        const token = await SecureStore.getItemAsync('access_token');
        return !!token;
    },
};
