/**
 * Route Map Component
 * Shows route from current location to port
 * Used when status is in_transit
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';

interface RouteMapProps {
    destinationLat?: number;
    destinationLng?: number;
    destinationName?: string;
}

// Port of Aveiro (default destination)
const DEFAULT_DESTINATION = {
    latitude: 40.6443,
    longitude: -8.7455,
    name: 'Port of Aveiro',
};

export default function RouteMap({
    destinationLat = DEFAULT_DESTINATION.latitude,
    destinationLng = DEFAULT_DESTINATION.longitude,
    destinationName = DEFAULT_DESTINATION.name,
}: RouteMapProps) {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Location permission denied');
                    setIsLoading(false);
                    return;
                }

                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
            } catch (error) {
                setErrorMsg('Failed to get location');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Getting location...</Text>
            </View>
        );
    }

    if (errorMsg) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="location-outline" size={32} color={colors.text.muted} />
                <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
        );
    }

    const initialRegion = location ? {
        latitude: (location.coords.latitude + destinationLat) / 2,
        longitude: (location.coords.longitude + destinationLng) / 2,
        latitudeDelta: Math.abs(location.coords.latitude - destinationLat) * 1.5,
        longitudeDelta: Math.abs(location.coords.longitude - destinationLng) * 1.5,
    } : {
        latitude: destinationLat,
        longitude: destinationLng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                userInterfaceStyle="dark"
            >
                {/* Destination marker */}
                <Marker
                    coordinate={{ latitude: destinationLat, longitude: destinationLng }}
                    title={destinationName}
                    description="Destination"
                    pinColor="#3b82f6"
                />
            </MapView>

            {/* Destination info overlay */}
            <View style={styles.infoOverlay}>
                <View style={styles.infoIcon}>
                    <Ionicons name="navigate" size={18} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Heading to</Text>
                    <Text style={styles.infoValue}>{destinationName}</Text>
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.text.muted,
        fontSize: fontSize.sm,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    errorText: {
        marginTop: spacing.sm,
        color: colors.text.muted,
        fontSize: fontSize.sm,
        textAlign: 'center',
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
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
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
