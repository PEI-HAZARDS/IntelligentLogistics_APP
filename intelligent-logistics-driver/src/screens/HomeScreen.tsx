/**
 * Home Screen for Driver App
 * Adapted from web version DriverHome.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { getMyActiveArrival, getMyTodayArrivals, claimArrival } from '../services/drivers';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import type { Appointment, ClaimAppointmentResponse } from '../types/types';
import { SafeAreaView } from 'react-native-safe-area-context';

// Map status to English
function mapStatusToLabel(status: string): string {
    const statusMap: Record<string, string> = {
        in_transit: 'In Transit',
        in_process: 'In Process',
        delayed: 'Delayed',
        completed: 'Completed',
        canceled: 'Canceled',
    };
    return statusMap[status] || status;
}

// Get status colors
function getStatusColors(status: string): { bg: string; text: string } {
    switch (status) {
        case 'completed':
            return { bg: colors.status.completedBg, text: colors.status.completed };
        case 'delayed':
            return { bg: colors.status.delayedBg, text: colors.status.delayed };
        case 'canceled':
            return { bg: colors.status.canceledBg, text: colors.status.canceled };
        case 'in_process':
            return { bg: colors.status.inProcessBg, text: colors.status.inProcess };
        default:
            return { bg: colors.status.inTransitBg, text: colors.status.inTransit };
    }
}

export default function HomeScreen() {
    const { user, logout } = useAuthStore();
    const driversLicense = user?.drivers_license || '';
    const driverName = user?.name || 'Driver';

    // State
    const [activeArrival, setActiveArrival] = useState<Appointment | null>(null);
    const [todayArrivals, setTodayArrivals] = useState<Appointment[]>([]);
    const [claimResult, setClaimResult] = useState<ClaimAppointmentResponse | null>(null);
    const [pinCode, setPinCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!driversLicense) {
            setError('Session expired. Please log in again.');
            setIsLoading(false);
            return;
        }

        setError(null);
        try {
            const [active, today] = await Promise.all([
                getMyActiveArrival(driversLicense),
                getMyTodayArrivals(driversLicense),
            ]);

            setActiveArrival(active);
            setTodayArrivals(today);
        } catch (err) {
            console.error('Failed to fetch driver data:', err);
            setError('Failed to load data. Pull to refresh.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [driversLicense]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle pull-to-refresh
    const onRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    // Handle PIN claim
    const handleClaimArrival = async () => {
        if (!pinCode.trim()) {
            setError('Please enter the PIN code.');
            return;
        }

        setIsClaiming(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await claimArrival(driversLicense, {
                arrival_id: pinCode.trim(),
            });

            setClaimResult(result);
            setSuccessMessage('Arrival registered successfully!');
            setPinCode('');

            // Refresh data
            await fetchData();
        } catch (err: unknown) {
            console.error('Failed to claim arrival:', err);
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
                if (axiosError.response?.status === 404) {
                    setError('PIN code not found. Please check the code.');
                } else if (axiosError.response?.status === 400) {
                    setError(axiosError.response?.data?.detail || 'Invalid PIN code.');
                } else {
                    setError('Failed to register arrival. Please try again.');
                }
            } else {
                setError('Connection error. Please check your network.');
            }
        } finally {
            setIsClaiming(false);
        }
    };

    // Open GPS navigation
    const openNavigation = (url: string) => {
        Linking.openURL(url).catch((err) => {
            console.error('Failed to open navigation:', err);
            setError('Failed to open navigation app.');
        });
    };

    // Format time
    const formatTime = (dateStr?: string | null) => {
        if (!dateStr) return '--:--';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="car" size={28} color={colors.primary} />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Intelligent Logistics</Text>
                        <Text style={styles.driverName}>Hello, {driverName}</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={onRefresh}
                        disabled={isLoading || isRefreshing}
                    >
                        {isLoading || isRefreshing ? (
                            <ActivityIndicator size="small" color={colors.text.primary} />
                        ) : (
                            <Ionicons name="refresh" size={20} color={colors.text.primary} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, styles.logoutButton]} onPress={logout}>
                        <Ionicons name="log-out-outline" size={20} color="#f87171" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.main}
                contentContainerStyle={styles.mainContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Error Alert */}
                {error && (
                    <View style={styles.alertError}>
                        <Ionicons name="alert-circle" size={18} color="#fca5a5" />
                        <Text style={styles.alertErrorText}>{error}</Text>
                    </View>
                )}

                {/* Success Alert */}
                {successMessage && (
                    <View style={styles.alertSuccess}>
                        <Ionicons name="checkmark-circle" size={18} color="#86efac" />
                        <Text style={styles.alertSuccessText}>{successMessage}</Text>
                    </View>
                )}

                {/* PIN Claim Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="qr-code" size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Register Arrival</Text>
                    </View>
                    <View style={styles.claimForm}>
                        <TextInput
                            style={styles.pinInput}
                            placeholder="PIN Code / Arrival ID"
                            placeholderTextColor={colors.text.muted}
                            value={pinCode}
                            onChangeText={(text) => setPinCode(text.toUpperCase())}
                            autoCapitalize="characters"
                            editable={!isClaiming}
                        />
                        <TouchableOpacity
                            style={[styles.claimButton, (!pinCode.trim() || isClaiming) && styles.buttonDisabled]}
                            onPress={handleClaimArrival}
                            disabled={isClaiming || !pinCode.trim()}
                        >
                            {isClaiming ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                                    <Text style={styles.claimButtonText}>Register</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Navigation Result */}
                {claimResult && (
                    <View style={[styles.section, styles.navigationSection]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="navigate" size={20} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Navigation Instructions</Text>
                        </View>
                        <View style={styles.navigationContent}>
                            <View style={styles.navRow}>
                                <Text style={styles.navLabel}>License Plate:</Text>
                                <Text style={styles.navValue}>{claimResult.license_plate}</Text>
                            </View>
                            {claimResult.dock_bay_number && (
                                <View style={styles.navRow}>
                                    <Text style={styles.navLabel}>Dock:</Text>
                                    <Text style={[styles.navValue, styles.navValueHighlight]}>
                                        {claimResult.dock_bay_number}
                                    </Text>
                                </View>
                            )}
                            {claimResult.dock_location && (
                                <View style={styles.navRow}>
                                    <Text style={styles.navLabel}>Location:</Text>
                                    <Text style={styles.navValue}>{claimResult.dock_location}</Text>
                                </View>
                            )}
                            {claimResult.cargo_description && (
                                <View style={styles.navRow}>
                                    <Text style={styles.navLabel}>Cargo:</Text>
                                    <Text style={styles.navValue}>{claimResult.cargo_description}</Text>
                                </View>
                            )}
                            {claimResult.navigation_url && (
                                <TouchableOpacity
                                    style={styles.navigationLink}
                                    onPress={() => openNavigation(claimResult.navigation_url!)}
                                >
                                    <Ionicons name="location" size={18} color={colors.white} />
                                    <Text style={styles.navigationLinkText}>Open GPS Navigation</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Active Arrival */}
                {activeArrival && (
                    <View style={[styles.section, styles.activeSection]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="warning" size={20} color={colors.status.delayed} />
                            <Text style={[styles.sectionTitle, { color: colors.status.delayed }]}>
                                Active Arrival
                            </Text>
                        </View>
                        <View style={[styles.arrivalCard, styles.arrivalCardActive]}>
                            <View style={styles.arrivalRow}>
                                <Ionicons name="car" size={18} color={colors.text.primary} />
                                <Text style={styles.plate}>{activeArrival.truck_license_plate}</Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColors(activeArrival.status).bg },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusBadgeText,
                                            { color: getStatusColors(activeArrival.status).text },
                                        ]}
                                    >
                                        {mapStatusToLabel(activeArrival.status)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.arrivalDetails}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                                    <Text style={styles.detailText}>
                                        {formatTime(activeArrival.scheduled_start_time)}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
                                    <Text style={styles.detailText}>{activeArrival.gate_in?.label || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Ionicons name="cube-outline" size={16} color={colors.text.secondary} />
                                    <Text style={styles.detailText}>
                                        {activeArrival.booking?.reference || 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Today's Arrivals */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Today's Arrivals</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{todayArrivals.length}</Text>
                        </View>
                    </View>

                    {isLoading && todayArrivals.length === 0 ? (
                        <View style={styles.emptyState}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.emptyStateText}>Loading arrivals...</Text>
                        </View>
                    ) : todayArrivals.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="cube-outline" size={32} color={colors.text.muted} />
                            <Text style={styles.emptyStateText}>No arrivals scheduled for today.</Text>
                        </View>
                    ) : (
                        <View style={styles.arrivalsList}>
                            {todayArrivals.map((arrival) => (
                                <View key={arrival.id} style={styles.arrivalCard}>
                                    <View style={styles.arrivalRow}>
                                        <Text style={styles.plate}>{arrival.truck_license_plate}</Text>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                { backgroundColor: getStatusColors(arrival.status).bg },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusBadgeText,
                                                    { color: getStatusColors(arrival.status).text },
                                                ]}
                                            >
                                                {mapStatusToLabel(arrival.status)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.arrivalDetails}>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                                            <Text style={styles.detailText}>
                                                {formatTime(arrival.scheduled_start_time)}
                                            </Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                                            <Text style={styles.detailText}>{arrival.gate_in?.label || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="cube-outline" size={14} color={colors.text.secondary} />
                                            <Text style={styles.detailText}>{arrival.booking?.reference || 'N/A'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.chevron}>
                                        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    headerText: {
        gap: 2,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.text.primary,
    },
    driverName: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    iconButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.md,
        padding: spacing.sm,
    },
    logoutButton: {},
    main: {
        flex: 1,
    },
    mainContent: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
    alertError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },
    alertErrorText: {
        flex: 1,
        color: '#fca5a5',
        fontSize: fontSize.sm,
    },
    alertSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.successBg,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },
    alertSuccessText: {
        flex: 1,
        color: '#86efac',
        fontSize: fontSize.sm,
    },
    section: {
        backgroundColor: colors.background.card,
        borderWidth: 1,
        borderColor: colors.border.light,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.text.primary,
        flex: 1,
    },
    claimForm: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    pinInput: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderWidth: 1,
        borderColor: colors.border.medium,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        color: colors.text.primary,
        fontSize: fontSize.lg,
    },
    claimButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    claimButtonText: {
        color: colors.white,
        fontWeight: fontWeight.semibold,
    },
    navigationSection: {
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderColor: 'rgba(14, 165, 233, 0.3)',
    },
    navigationContent: {
        gap: spacing.sm,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    navLabel: {
        color: colors.text.secondary,
        fontSize: fontSize.sm,
    },
    navValue: {
        color: colors.text.primary,
        fontWeight: fontWeight.medium,
        fontSize: fontSize.sm,
    },
    navValueHighlight: {
        color: colors.primary,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
    },
    navigationLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    navigationLinkText: {
        color: colors.white,
        fontWeight: fontWeight.semibold,
    },
    activeSection: {},
    arrivalCard: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        position: 'relative',
    },
    arrivalCardActive: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    arrivalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    plate: {
        flex: 1,
        fontWeight: fontWeight.semibold,
        color: colors.text.primary,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    statusBadgeText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
    },
    arrivalDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: fontSize.xs,
        color: colors.text.secondary,
    },
    arrivalsList: {
        gap: spacing.sm,
    },
    chevron: {
        position: 'absolute',
        right: spacing.md,
        top: '50%',
    },
    countBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    countBadgeText: {
        color: colors.white,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xxl,
        gap: spacing.sm,
    },
    emptyStateText: {
        color: colors.text.muted,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
});
