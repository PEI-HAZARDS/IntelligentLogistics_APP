/**
 * Auth Service — Keycloak-mediated authentication.
 * Handles login, token refresh, and logout for workers (operators/managers).
 */
import api from '@/lib/api';
import { jwtDecode } from 'jwt-decode';

export interface AuthTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user_info: {
        num_worker: string;
        name: string;
        email: string;
        role: string;
        active: boolean;
    };
}

export interface TokenRefreshResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

interface JwtPayload {
    exp: number;
    sub: string;
    realm_access?: { roles: string[] };
}

const AUTH_PREFIX = '/auth';

/**
 * Worker login (operator or manager).
 * Calls the Keycloak-mediated auth endpoint.
 */
export async function login(email: string, password: string): Promise<AuthTokenResponse> {
    const response = await api.post<AuthTokenResponse>(`${AUTH_PREFIX}/workers/login`, {
        email,
        password,
    });

    const data = response.data;

    // Store tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user_info', JSON.stringify(data.user_info));

    // Keep backward-compatible key for components that read auth_token
    localStorage.setItem('auth_token', data.access_token);

    return data;
}

/**
 * Refresh the access token using the stored refresh token.
 */
export async function refresh(): Promise<TokenRefreshResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await api.post<TokenRefreshResponse>(`${AUTH_PREFIX}/refresh`, {
        refresh_token: refreshToken,
    });

    const data = response.data;

    // Update stored tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('auth_token', data.access_token);

    return data;
}

/**
 * Logout — revokes the refresh token in Keycloak and clears local storage.
 */
export async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');

    // Best-effort server-side logout
    if (refreshToken) {
        try {
            await api.post(`${AUTH_PREFIX}/logout`, { refresh_token: refreshToken });
        } catch {
            // Ignore errors — we still clear local state
        }
    }

    clearAuthStorage();
}

/**
 * Clear all auth-related data from localStorage.
 */
export function clearAuthStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
}

/**
 * Check if the current access token is expired (or about to expire within 30s).
 */
export function isTokenExpired(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return true;

    try {
        const decoded = jwtDecode<JwtPayload>(token);
        const now = Date.now() / 1000;
        return decoded.exp < now + 30; // 30-second buffer
    } catch {
        return true;
    }
}

/**
 * Check if the user is authenticated (has a non-expired access token).
 */
export function isAuthenticated(): boolean {
    return !isTokenExpired();
}
