/**
 * Port Map Component
 * Shows port interior with route to dock
 * Used when status is in_process
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';

interface PortMapProps {
    terminalId?: number;
    dockNumber?: string;
    gateId?: number;
}

// Port of Aveiro - main coordinates
const PORT_CENTER = {
    latitude: 40.6443,
    longitude: -8.7455,
};

// Terminal locations (mock)
const TERMINALS: Record<number, { latitude: number; longitude: number; name: string }> = {
    1: { latitude: 40.6450, longitude: -8.7440, name: 'Terminal A' },
    2: { latitude: 40.6435, longitude: -8.7465, name: 'Terminal B' },
    3: { latitude: 40.6440, longitude: -8.7480, name: 'Terminal C' },
};

// Port boundary (simplified polygon)
const PORT_BOUNDARY = [
    { latitude: 40.6460, longitude: -8.7420 },
    { latitude: 40.6460, longitude: -8.7490 },
    { latitude: 40.6425, longitude: -8.7490 },
    { latitude: 40.6425, longitude: -8.7420 },
];

export default function PortMap({ terminalId = 1, dockNumber = 'A-01' }: PortMapProps) {
    const terminal = TERMINALS[terminalId] || TERMINALS[1];

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{
                    ...PORT_CENTER,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                userInterfaceStyle="dark"
            >
                {/* Port boundary */}
                <Polygon
                    coordinates={PORT_BOUNDARY}
                    strokeColor="rgba(59, 130, 246, 0.8)"
                    fillColor="rgba(59, 130, 246, 0.1)"
                    strokeWidth={2}
                />

                {/* Destination marker (dock) - simple marker without animation */}
                <Marker
                    coordinate={{ latitude: terminal.latitude, longitude: terminal.longitude }}
                    title={`Dock ${dockNumber}`}
                    description={terminal.name}
                    pinColor="#22c55e"
                />
            </MapView>

            {/* Destination info overlay */}
            <View style={styles.infoOverlay}>
                <View style={styles.infoIcon}>
                    <Ionicons name="location" size={18} color="#22c55e" />
                </View>
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Destination</Text>
                    <Text style={styles.infoValue}>{terminal.name} • Dock {dockNumber}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    infoOverlay: {
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        right: spacing.sm,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    infoIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: fontSize.xs,
        color: colors.text.muted,
    },
    infoValue: {
        fontSize: fontSize.sm,
        color: colors.text.primary,
        fontWeight: fontWeight.semibold,
    },
});
