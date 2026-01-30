/**
 * Arrivals Screen
 * Shows list of today's arrivals
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, SlideInRight, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { getMyTodayArrivals } from '../services/drivers';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import { haptics, SkeletonCard } from '../components/AnimatedComponents';
import type { Appointment } from '../types/types';

// ===== MOCK MODE - REMOVE AFTER TESTING =====
const DEV_MOCK_MODE = true;

const MOCK_ARRIVALS: Appointment[] = [
    {
        id: 1001,
        arrival_id: 'ARR-001',
        booking_reference: 'BK-2026-001',
        driver_license: 'AB-123456',
        truck_license_plate: '00-AA-00',
        terminal_id: 1,
        scheduled_start_time: new Date().toISOString(),
        status: 'in_transit',
        notes: 'Container ABC-123',
    },
    {
        id: 1002,
        arrival_id: 'ARR-002',
        booking_reference: 'BK-2026-002',
        driver_license: 'AB-123456',
        truck_license_plate: '11-BB-11',
        terminal_id: 2,
        scheduled_start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'in_process',
        notes: 'Pallets XYZ-789',
    },
    {
        id: 1003,
        arrival_id: 'ARR-003',
        booking_reference: 'BK-2026-003',
        driver_license: 'AB-123456',
        truck_license_plate: '22-CC-22',
        terminal_id: 1,
        scheduled_start_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        notes: 'Construction Materials',
    },
];
// ===== END MOCK MODE =====

function getStatusColors(status: string): { bg: string; text: string } {
    switch (status) {
        case 'completed':
            return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' };
        case 'delayed':
            return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' };
        case 'canceled':
            return { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' };
        case 'in_process':
            return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' };
        default:
            return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308' };
    }
}

function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        in_transit: 'In Transit',
        in_process: 'At Port',
        delayed: 'Delayed',
        completed: 'Completed',
        canceled: 'Canceled',
    };
    return labels[status] || status;
}

export default function ArrivalsScreen() {
    const { user } = useAuthStore();
    const driversLicense = user?.drivers_license || '';

    const [arrivals, setArrivals] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchArrivals = useCallback(async () => {
        try {
            if (DEV_MOCK_MODE) {
                await new Promise(resolve => setTimeout(resolve, 500));
                setArrivals(MOCK_ARRIVALS);
                return;
            }
            const data = await getMyTodayArrivals(driversLicense);
            setArrivals(data);
        } catch (err) {
            console.error('Failed to fetch arrivals:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [driversLicense]);

    useEffect(() => {
        fetchArrivals();
    }, [fetchArrivals]);

    const onRefresh = () => {
        setIsRefreshing(true);
        haptics.light();
        fetchArrivals();
    };

    const formatTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return '--:--';
        return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={styles.header} entering={FadeIn.duration(400)}>
                <Text style={styles.title}>Today's Arrivals</Text>
                <Text style={styles.subtitle}>{arrivals.length} scheduled</Text>
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {isLoading ? (
                    <>
                        <SkeletonCard style={styles.card} />
                        <SkeletonCard style={styles.card} />
                        <SkeletonCard style={styles.card} />
                    </>
                ) : arrivals.length === 0 ? (
                    <Animated.View style={styles.emptyState} entering={FadeInDown.duration(400)}>
                        <Ionicons name="calendar-outline" size={48} color={colors.text.muted} />
                        <Text style={styles.emptyText}>No arrivals for today</Text>
                    </Animated.View>
                ) : (
                    arrivals.map((arrival, index) => {
                        const statusColors = getStatusColors(arrival.status);
                        return (
                            <Animated.View
                                key={arrival.id}
                                style={styles.card}
                                entering={SlideInRight.delay(index * 100).duration(300)}
                                layout={Layout.springify()}
                            >
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.cardTitle}>{arrival.booking_reference}</Text>
                                        <Text style={styles.cardSubtitle}>
                                            <Ionicons name="time-outline" size={12} /> {formatTime(arrival.scheduled_start_time)}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                                            {getStatusLabel(arrival.status)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="car-outline" size={16} color={colors.text.muted} />
                                        <Text style={styles.infoText}>{arrival.truck_license_plate}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="location-outline" size={16} color={colors.text.muted} />
                                        <Text style={styles.infoText}>Terminal {arrival.terminal_id}</Text>
                                    </View>
                                    {arrival.notes && (
                                        <View style={styles.infoRow}>
                                            <Ionicons name="cube-outline" size={16} color={colors.text.muted} />
                                            <Text style={styles.infoText}>{arrival.notes}</Text>
                                        </View>
                                    )}
                                </View>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.dark,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
        marginTop: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    card: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    cardTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.text.primary,
    },
    cardSubtitle: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    statusText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
    },
    cardBody: {
        gap: spacing.xs,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    infoText: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: fontSize.md,
        color: colors.text.muted,
        marginTop: spacing.md,
    },
});
