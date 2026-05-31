/**
 * App Configuration
 * Centralized configuration for the Driver app
 */

// API Configuration
export const API_CONFIG = {
    // Base URL for the API Gateway
    // TODO: Change this to your production URL for release builds
    baseUrl: process.env.EXPO_PUBLIC_API_URL,

    // WebSocket base URL (derived from baseUrl)
    wsUrl: process.env.EXPO_PUBLIC_WS_URL,

    // Request timeout in milliseconds
    timeout: 30000,
};

// App Configuration
export const APP_CONFIG = {
    // App name and version
    name: 'Intelligent Logistics Driver',
    version: '1.0.0',

    // Show the on-screen WebSocket debug panel (set EXPO_PUBLIC_DEBUG_MODE=true).
    debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',

    // Feature flags
    features: {
        gpsNavigation: true,
        pushNotifications: false, // TODO: Implement push notifications
        offlineMode: false, // TODO: Implement offline support
    },
};
