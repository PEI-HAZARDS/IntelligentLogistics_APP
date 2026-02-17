/**
 * Application Configuration
 * Centralized config for branding and customization
 * Edit this file to customize for different port installations
 */

export interface AppConfig {
    /** Port/Terminal name displayed in header */
    portName: string;
    /** Organization subtitle */
    subtitle: string;
    /** Logo file path (relative to public folder) */
    logoPath: string;
    /** Contact email for support */
    supportEmail: string;
    /** Grafana base URL for embedding panels */
    grafanaUrl: string;
    /** API base URL */
    apiBaseUrl: string;
    /** WebSocket base URL */
    wsBaseUrl: string;
}

// Default configuration - customize per installation
const config: AppConfig = {
    portName: import.meta.env.VITE_PORT_NAME || 'Porto de Aveiro',
    subtitle: import.meta.env.VITE_SUBTITLE || 'Intelligent Logistics',
    logoPath: import.meta.env.VITE_LOGO_PATH || '/logo.png',
    supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@intelligentlogistics.com',
    grafanaUrl: import.meta.env.VITE_GRAFANA_URL || 'http://10.255.32.70:3000',
    apiBaseUrl: import.meta.env.VITE_API_URL || 'http://10.255.32.70:8000/api',
    wsBaseUrl: import.meta.env.VITE_WS_URL || 'ws://10.255.32.70:8000/ws',
};

export default config;

// Type-safe environment variable declarations
declare global {
    interface ImportMetaEnv {
        VITE_PORT_NAME?: string;
        VITE_SUBTITLE?: string;
        VITE_LOGO_PATH?: string;
        VITE_SUPPORT_EMAIL?: string;
        VITE_GRAFANA_URL?: string;
        VITE_API_URL?: string;
        VITE_WS_URL?: string;
    }
}
