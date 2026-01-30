/**
 * Theme colors for the Driver app
 * Matching the dark theme from the web version
 */

export const colors = {
    // Primary brand colors
    primary: '#0ea5e9',
    primaryDark: '#0284c7',
    primaryLight: '#38bdf8',

    // Background colors
    background: {
        dark: '#0f172a',
        medium: '#1e293b',
        light: '#334155',
        card: 'rgba(30, 41, 59, 0.5)',
    },

    // Text colors
    text: {
        primary: '#e2e8f0',
        secondary: '#94a3b8',
        muted: '#64748b',
        inverse: '#0f172a',
    },

    // Border colors
    border: {
        light: 'rgba(255, 255, 255, 0.1)',
        medium: 'rgba(255, 255, 255, 0.2)',
    },

    // Status colors
    status: {
        inTransit: '#3b82f6',
        inTransitBg: 'rgba(59, 130, 246, 0.2)',
        delayed: '#fbbf24',
        delayedBg: 'rgba(251, 191, 36, 0.2)',
        completed: '#22c55e',
        completedBg: 'rgba(34, 197, 94, 0.2)',
        canceled: '#ef4444',
        canceledBg: 'rgba(239, 68, 68, 0.2)',
        inProcess: '#a855f7',
        inProcessBg: 'rgba(168, 85, 247, 0.2)',
    },

    // Feedback colors
    success: '#22c55e',
    successBg: 'rgba(34, 197, 94, 0.15)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    warning: '#fbbf24',
    warningBg: 'rgba(251, 191, 36, 0.15)',

    // Misc
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
};

export const fontSize = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    title: 28,
};

export const fontWeight = {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};
