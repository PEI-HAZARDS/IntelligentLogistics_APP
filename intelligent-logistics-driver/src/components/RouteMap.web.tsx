/**
 * Route Map Component — web stub
 * react-native-maps is native-only; this placeholder is used when bundling for web.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize, ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface RouteMapProps {
    destinationLat?: number;
    destinationLng?: number;
    destinationName?: string;
}

export default function RouteMap({ destinationName = 'Port of Aveiro' }: RouteMapProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Map unavailable on web</Text>
            <Text style={styles.sub}>Destination: {destinationName}</Text>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.background?.card ?? '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
    },
    label: {
        color: colors.text?.muted ?? '#94a3b8',
        fontSize: fontSize.md,
        marginBottom: spacing.xs,
    },
    sub: {
        color: colors.text?.muted ?? '#f1f5f9',
        fontSize: fontSize.sm,
    },
});
