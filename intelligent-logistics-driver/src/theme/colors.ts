/**
 * Theme colors for the Driver app
 *
 * Two palettes with an identical key structure so every screen/StyleSheet can
 * flip between them at runtime via the ThemeProvider (see ./ThemeContext):
 *   - `lightColors` — the default, aligned with the web app's `.light-mode`.
 *   - `darkColors`  — the maritime dark theme (canvas #0f172a, cards #1e293b),
 *     aligned with the web app's default dark `theme-base.css`.
 *
 * `white`/`black` stay literal because they are only ever used as foregrounds
 * on the blue primary, regardless of theme.
 */

export const lightColors = {
    // Primary brand colors (port blue — white text reads on these)
    primary: '#0277BD',
    primaryDark: '#01579B',
    primaryLight: '#0288D1',

    // Background colors (canvas → cards → elevated)
    background: {
        dark: '#F2F3F5',   // app canvas (was the darkest surface)
        medium: '#FFFFFF', // cards / headers
        light: '#E3E8EF',  // inputs / chips / elevated fills
        card: '#FFFFFF',   // card surface
    },

    // Text colors
    text: {
        primary: '#1E293B',
        secondary: '#475569',
        muted: '#64748B',
        inverse: '#FFFFFF', // text on dark/coloured fills
    },

    // Border colors (subtle dark hairlines on light)
    border: {
        light: 'rgba(15, 23, 42, 0.10)',
        medium: 'rgba(15, 23, 42, 0.18)',
    },

    // Status colors — dark text + solid light tint backgrounds
    status: {
        inTransit: '#1D4ED8',
        inTransitBg: '#DBEAFE',
        delayed: '#B45309',
        delayedBg: '#FEF3C7',
        completed: '#15803D',
        completedBg: '#DCFCE7',
        canceled: '#B91C1C',
        canceledBg: '#FEE2E2',
        inProcess: '#7C3AED',
        inProcessBg: '#EDE9FE',
    },

    // Feedback colors
    success: '#15803D',
    successBg: '#DCFCE7',
    error: '#B91C1C',
    errorBg: '#FEE2E2',
    warning: '#B45309',
    warningBg: '#FEF3C7',

    // Misc
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
    // Primary brand colors (slightly brighter blue for contrast on dark)
    primary: '#0288D1',
    primaryDark: '#0277BD',
    primaryLight: '#38BDF8',

    // Background colors (canvas → cards → elevated)
    background: {
        dark: '#0F172A',   // app canvas
        medium: '#1E293B', // cards / headers
        light: '#334155',  // inputs / chips / elevated fills
        card: '#1E293B',   // card surface
    },

    // Text colors
    text: {
        primary: '#F1F5F9',
        secondary: '#CBD5E1',
        muted: '#94A3B8',
        inverse: '#0F172A', // text on light/coloured fills
    },

    // Border colors (subtle light hairlines on dark)
    border: {
        light: 'rgba(148, 163, 184, 0.18)',
        medium: 'rgba(148, 163, 184, 0.30)',
    },

    // Status colors — light text + translucent dark tint backgrounds
    status: {
        inTransit: '#60A5FA',
        inTransitBg: 'rgba(59, 130, 246, 0.18)',
        delayed: '#FBBF24',
        delayedBg: 'rgba(245, 158, 11, 0.18)',
        completed: '#4ADE80',
        completedBg: 'rgba(34, 197, 94, 0.18)',
        canceled: '#F87171',
        canceledBg: 'rgba(239, 68, 68, 0.18)',
        inProcess: '#A78BFA',
        inProcessBg: 'rgba(139, 92, 246, 0.18)',
    },

    // Feedback colors
    success: '#22C55E',
    successBg: 'rgba(34, 197, 94, 0.18)',
    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.18)',
    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.18)',

    // Misc
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
};

export const themes = {
    light: lightColors,
    dark: darkColors,
};

export type ThemeMode = keyof typeof themes;

/**
 * Default static export kept for backward compatibility and non-reactive
 * call-sites. Prefer `useTheme()` from ./ThemeContext for runtime switching.
 */
export const colors = lightColors;

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
