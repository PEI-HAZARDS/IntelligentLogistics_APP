/**
 * Port Map Component
 * Shows port interior with route to dock
 * Used when status is in_process
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';

interface PortMapProps {
    terminalId?: number;
    dockNumber?: string;
    gateId?: number;
}

// Port of Aveiro - main coordinates
const PORT_CENTER = {
    latitude: 40.6335912,
    longitude: -8.73065429999997,
};

// Gate entrance location (mock)
const GATE_LOCATION = {
    latitude: 40.6345,
    longitude: -8.7290,
};

// Terminal locations (mock - centered around the new point)
const TERMINALS: Record<number, { latitude: number; longitude: number; name: string }> = {
    1: { latitude: 40.6338, longitude: -8.7308, name: 'Terminal A' },
    2: { latitude: 40.6332, longitude: -8.7304, name: 'Terminal B' },
    3: { latitude: 40.6335, longitude: -8.7312, name: 'Terminal C' },
};

// Port boundary (refined to land-only industrial area)
const PORT_BOUNDARY = [
    { latitude: 40.6365, longitude: -8.7305 }, // North inner
    { latitude: 40.6365, longitude: -8.7320 }, // North waterfront edge
    { latitude: 40.6345, longitude: -8.7325 }, // Mid waterfront edge
    { latitude: 40.6315, longitude: -8.7325 }, // South waterfront edge
    { latitude: 40.6295, longitude: -8.7315 }, // South corner
    { latitude: 40.6295, longitude: -8.7285 }, // South east land
    { latitude: 40.6325, longitude: -8.7280 }, // East land
    { latitude: 40.6345, longitude: -8.7280 }, // Entrance
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

                {/* Internal Port Route */}
                <Polyline
                    coordinates={[
                        GATE_LOCATION,
                        { latitude: terminal.latitude, longitude: terminal.longitude }
                    ]}
                    strokeColor="#a855f7"
                    strokeWidth={4}
                    lineDashPattern={[5, 5]}
                />

                {/* Gate Marker */}
                <Marker
                    coordinate={GATE_LOCATION}
                    title="Port Entrance"
                    description="Main Gate"
                >
                    <View style={styles.gateMarker}>
                        <Ionicons name="log-in" size={16} color={colors.white} />
                    </View>
                </Marker>

                {/* Destination marker (dock) - simple marker without animation */}
                <Marker
                    coordinate={{ latitude: terminal.latitude, longitude: terminal.longitude }}
                    title={`Dock ${dockNumber}`}
                    description={terminal.name}
                    pinColor="#22c55e"
                />
            </MapView>
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
    gateMarker: {
        backgroundColor: colors.primary,
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.white,
    },
});
