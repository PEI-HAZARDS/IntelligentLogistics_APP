/**
 * Theme context for the Driver app
 *
 * Holds the active colour mode ('light' | 'dark'), persists the user's choice
 * in AsyncStorage, and exposes the matching palette through `useTheme()`.
 * Light is the default on a fresh install. Screens consume `colors` from the
 * hook and build their styles with `useMemo(() => createStyles(colors), [colors])`.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, ThemeColors, ThemeMode } from './colors';

const STORAGE_KEY = 'driver_theme_mode_v1';
const DEFAULT_MODE: ThemeMode = 'light';

interface ThemeContextValue {
    mode: ThemeMode;
    colors: ThemeColors;
    /** true once the persisted preference has been loaded */
    ready: boolean;
    toggle: () => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
    const [ready, setReady] = useState(false);

    // Load the saved preference once at startup.
    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved === 'light' || saved === 'dark') {
                    setModeState(saved);
                }
            } catch {
                // ignore — fall back to the default mode
            } finally {
                setReady(true);
            }
        })();
    }, []);

    const persist = (next: ThemeMode) => {
        setModeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
            // non-fatal: the choice still applies for this session
        });
    };

    const value = useMemo<ThemeContextValue>(
        () => ({
            mode,
            colors: themes[mode],
            ready,
            toggle: () => persist(mode === 'light' ? 'dark' : 'light'),
            setMode: persist,
        }),
        [mode, ready],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return ctx;
}
