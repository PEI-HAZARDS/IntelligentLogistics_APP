/**
 * Auth Store using Zustand
 * Handles authentication state for the Driver app
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserInfo } from '../types/types';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserInfo | null;
    token: string | null;

    // Actions
    login: (token: string, user: UserInfo) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,

    login: async (token: string, user: UserInfo) => {
        try {
            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('user_info', JSON.stringify(user));
            set({ isAuthenticated: true, user, token, isLoading: false });
        } catch (error) {
            console.error('Failed to save auth data:', error);
            throw error;
        }
    },

    logout: async () => {
        try {
            await AsyncStorage.multiRemove(['auth_token', 'user_info']);
            set({ isAuthenticated: false, user: null, token: null, isLoading: false });
        } catch (error) {
            console.error('Failed to clear auth data:', error);
        }
    },

    checkAuth: async () => {
        try {
            const [token, userJson] = await Promise.all([
                AsyncStorage.getItem('auth_token'),
                AsyncStorage.getItem('user_info'),
            ]);

            if (token && userJson) {
                const user = JSON.parse(userJson) as UserInfo;
                set({ isAuthenticated: true, user, token, isLoading: false });
            } else {
                set({ isAuthenticated: false, user: null, token: null, isLoading: false });
            }
        } catch (error) {
            console.error('Failed to check auth:', error);
            set({ isAuthenticated: false, user: null, token: null, isLoading: false });
        }
    },
}));
