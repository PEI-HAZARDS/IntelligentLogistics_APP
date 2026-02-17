/**
 * App Configuration
 * Centralized configuration for the Driver app
 */

// API Configuration
export const API_CONFIG = {
    // Base URL for the API Gateway
    // TODO: Change this to your production URL for release builds
    baseUrl: 'http://10.255.32.70:8000/api',

    // Request timeout in milliseconds
    timeout: 30000,
};

// App Configuration
export const APP_CONFIG = {
    // App name and version
    name: 'Intelligent Logistics Driver',
    version: '1.0.0',

    // Feature flags
    features: {
        gpsNavigation: true,
        pushNotifications: false, // TODO: Implement push notifications
        offlineMode: false, // TODO: Implement offline support
    },
};
