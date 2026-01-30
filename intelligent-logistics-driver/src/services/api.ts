/**
 * API Client for React Native
 * Adapted from web version to use AsyncStorage instead of localStorage
 */
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/config';

const api = axios.create({
    baseURL: API_CONFIG.baseUrl,
    withCredentials: false,
    timeout: API_CONFIG.timeout,
    headers: {
        'Content-Type': 'application/json',
    },
});


// Request interceptor - add auth token
api.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.warn('Failed to get auth token from storage:', error);
    }
    return config;
});

// Response interceptor - handle 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Clear stored auth data
            try {
                await AsyncStorage.multiRemove(['auth_token', 'user_info']);
            } catch (e) {
                console.warn('Failed to clear auth data:', e);
            }
            // Navigation to login will be handled by the auth context/store
        }
        return Promise.reject(error);
    }
);

export default api;

// Helper functions for auth storage
export const AuthStorage = {
    async getToken(): Promise<string | null> {
        return AsyncStorage.getItem('auth_token');
    },

    async setToken(token: string): Promise<void> {
        await AsyncStorage.setItem('auth_token', token);
    },

    async getUserInfo<T>(): Promise<T | null> {
        const data = await AsyncStorage.getItem('user_info');
        return data ? JSON.parse(data) : null;
    },

    async setUserInfo<T>(info: T): Promise<void> {
        await AsyncStorage.setItem('user_info', JSON.stringify(info));
    },

    async clear(): Promise<void> {
        await AsyncStorage.multiRemove(['auth_token', 'user_info']);
    },

    async isAuthenticated(): Promise<boolean> {
        const token = await AsyncStorage.getItem('auth_token');
        return !!token;
    },
};
