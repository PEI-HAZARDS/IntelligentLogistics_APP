/**
 * Route Map Component
 * Shows route from current location to port
 * Used when status is in_transit
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing, fontSize, ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface RouteMapProps {
    destinationLat?: number;
    destinationLng?: number;
    destinationName?: string;
}

// Port of Aveiro (default destination)
const DEFAULT_DESTINATION = {
    latitude: 40.6335912,
    longitude: -8.73065429999997,
    name: 'Port of Aveiro',
};

type LatLng = { latitude: number; longitude: number };

// Re-route only after the driver has moved this far from the point we last
// routed from, to avoid hammering the (free, public) OSRM server on every fix.
const REROUTE_THRESHOLD_METERS = 150;

// Rough great-circle distance in metres (haversine).
function distanceMeters(a: LatLng, b: LatLng): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

export default function RouteMap({
    destinationLat = DEFAULT_DESTINATION.latitude,
    destinationLng = DEFAULT_DESTINATION.longitude,
    destinationName = DEFAULT_DESTINATION.name,
}: RouteMapProps) {
    const { colors, mode } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
    // Origin the current route was computed from (null = not routed yet).
    const lastRoutedFromRef = React.useRef<LatLng | null>(null);

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Location permission denied');
                    setIsLoading(false);
                    return;
                }

                // Get an initial fix immediately so the map shows something fast
                const initial = await Location.getCurrentPositionAsync({});
                setLocation(initial);
                setIsLoading(false);

                // Watch for updates so the polyline tracks the driver in real time
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 20,   // update every 20 m of movement
                        timeInterval: 5000,     // or every 5 s, whichever comes first
                    },
                    (newLocation) => setLocation(newLocation),
                );
            } catch (error) {
                setErrorMsg('Failed to get location');
                setIsLoading(false);
            }
        })();

        return () => {
            subscription?.remove();
        };
    }, []);

    // Fetch a road-following route from OSRM whenever the driver moves far enough.
    // OSRM public demo server — free, no API key. On any failure we simply keep
    // the previous route (or fall back to a straight line at render time).
    useEffect(() => {
        if (!location) return;
        const origin: LatLng = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };

        const last = lastRoutedFromRef.current;
        if (last && distanceMeters(last, origin) < REROUTE_THRESHOLD_METERS && routeCoords.length > 0) {
            return; // not moved enough since the last successful route
        }

        let cancelled = false;
        (async () => {
            try {
                const url =
                    `https://router.project-osrm.org/route/v1/driving/` +
                    `${origin.longitude},${origin.latitude};${destinationLng},${destinationLat}` +
                    `?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();
                const coords: [number, number][] | undefined = data?.routes?.[0]?.geometry?.coordinates;
                if (!cancelled && Array.isArray(coords) && coords.length > 0) {
                    setRouteCoords(coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
                    lastRoutedFromRef.current = origin;
                }
            } catch {
                // keep previous route / straight-line fallback
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [location, destinationLat, destinationLng]);

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
                userInterfaceStyle={mode}
            >
                {/* Route Line — road-following path from OSRM, straight line as fallback */}
                {location && (
                    <Polyline
                        coordinates={
                            routeCoords.length > 0
                                ? routeCoords
                                : [
                                    { latitude: location.coords.latitude, longitude: location.coords.longitude },
                                    { latitude: destinationLat, longitude: destinationLng },
                                ]
                        }
                        strokeColor={colors.primary}
                        strokeWidth={4}
                    />
                )}

                {/* Destination marker */}
                <Marker
                    coordinate={{ latitude: destinationLat, longitude: destinationLng }}
                    title={destinationName}
                    description="Destination"
                    pinColor="#3b82f6"
                />
            </MapView>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
});
