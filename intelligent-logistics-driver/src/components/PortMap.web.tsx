/**
 * Port Map Component — web stub
 * react-native-maps is native-only; this placeholder is used when bundling for web.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../theme/colors';

interface PortMapProps {
    terminalId?: number;
    dockNumber?: string;
    gateId?: number;
}

export default function PortMap({ terminalId = 1, dockNumber = 'A-01' }: PortMapProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Map unavailable on web</Text>
            <Text style={styles.sub}>Dock {dockNumber} · Terminal {terminalId}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.background.medium,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
    },
    label: {
        color: colors.text.secondary,
        fontSize: fontSize.md ?? 14,
        marginBottom: spacing.xs,
    },
    sub: {
        color: colors.text.primary,
        fontSize: fontSize.sm ?? 12,
    },
});
