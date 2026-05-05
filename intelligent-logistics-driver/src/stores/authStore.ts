/**
 * Auth Store using Zustand
 * Handles authentication state for the Driver app with Keycloak tokens.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { AuthStorage } from '../services/api';
import type { UserInfo } from '../types/types';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserInfo | null;
    token: string | null;

    // Actions
    login: (accessToken: string, refreshToken: string, user: UserInfo) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,

    login: async (accessToken: string, refreshToken: string, user: UserInfo) => {
        try {
            await AuthStorage.setToken(accessToken);
            await AuthStorage.setRefreshToken(refreshToken);
            await AuthStorage.setUserInfo(user);
            set({ isAuthenticated: true, user, token: accessToken, isLoading: false });
        } catch (error) {
            console.error('Failed to save auth data:', error);
            throw error;
        }
    },

    logout: async () => {
        try {
            // Best-effort server-side logout
            const refreshToken = await AuthStorage.getRefreshToken();
            if (refreshToken) {
                try {
                    await api.post('/auth/logout', { refresh_token: refreshToken });
                } catch {
                    // Ignore — still clear local state
                }
            }
            await AuthStorage.clear();
            set({ isAuthenticated: false, user: null, token: null, isLoading: false });
        } catch (error) {
            console.error('Failed to clear auth data:', error);
        }
    },

    checkAuth: async () => {
        try {
            const [token, userJson] = await Promise.all([
                AuthStorage.getToken(),
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
