/**
 * Active Arrival Screen
 * Shows current active arrival with context-aware map
 * Inspired by logistics apps like Fretefy
 * - in_transit: Route map to port
 * - in_process: Port map with dock destination
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
    Modal,
    Dimensions,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { getMyActiveArrival, claimArrival } from '../services/drivers';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import { haptics, SkeletonCard } from '../components/AnimatedComponents';
import RouteMap from '../components/RouteMap';
import PortMap from '../components/PortMap';
import type { Appointment, ClaimAppointmentResponse } from '../types/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ===== MOCK MODE - REMOVE AFTER TESTING =====
const DEV_MOCK_MODE = true;

const MOCK_ACTIVE: Appointment = {
    id: 1001,
    arrival_id: 'ARR-001',
    booking_reference: 'BK-2026-001',
    driver_license: 'AB-123456',
    truck_license_plate: '00-AA-00',
    terminal_id: 1,
    scheduled_start_time: new Date().toISOString(),
    status: 'in_process',
    notes: 'Container ABC-123 - 2.5 ton',
    gate_in_id: 1,
};

const MOCK_CLAIM_RESULT: ClaimAppointmentResponse = {
    appointment_id: 1001,
    dock_bay_number: 'A-05',
    dock_location: 'North Terminal - Sector 3',
    license_plate: '00-AA-00',
    cargo_description: 'Container ABC-123 - 2.5 tons',
    navigation_url: 'maps://',
};
// ===== END MOCK MODE =====

// Delivery states - TRIGGER: Driver action buttons
type DeliveryPhase = 'arrived' | 'in_route' | 'unloading' | 'completed';

const DELIVERY_STEPS: { id: DeliveryPhase; label: string; icon: string }[] = [
    { id: 'arrived', label: 'Arrived', icon: 'enter-outline' },
    { id: 'in_route', label: 'In Route', icon: 'navigate-outline' },
    { id: 'unloading', label: 'Unloading', icon: 'cube-outline' },
    { id: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
];

function getDeliveryPhase(status: string, isUnloading: boolean): number {
    if (status === 'completed') return 4;
    if (isUnloading) return 3;
    if (status === 'in_process') return 2;
    return 1;
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

function getStatusColors(status: string): { bg: string; text: string; accent: string } {
    switch (status) {
        case 'completed':
            return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', accent: '#22c55e' };
        case 'in_process':
            return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', accent: '#3b82f6' };
        case 'delayed':
            return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', accent: '#ef4444' };
        default:
            return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', accent: '#eab308' };
    }
}

export default function ActiveArrivalScreen() {
    const { user } = useAuthStore();
    const driversLicense = user?.drivers_license || '';
    const driverName = user?.name || 'Driver';

    const [activeArrival, setActiveArrival] = useState<Appointment | null>(null);
    const [claimResult, setClaimResult] = useState<ClaimAppointmentResponse | null>(DEV_MOCK_MODE ? MOCK_CLAIM_RESULT : null);
    const [pinCode, setPinCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isUnloading, setIsUnloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isMapExpanded, setIsMapExpanded] = useState(false);

    const fetchData = useCallback(async () => {
        setError(null);
        try {
            if (DEV_MOCK_MODE) {
                await new Promise(resolve => setTimeout(resolve, 500));
                setActiveArrival(MOCK_ACTIVE);
                setIsLoading(false);
                setIsRefreshing(false);
                return;
            }
            const active = await getMyActiveArrival(driversLicense);
            setActiveArrival(active);
        } catch (err) {
            console.error('Failed to load arrival:', err);
            setError('Failed to load data.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [driversLicense]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setIsRefreshing(true);
        haptics.light();
        fetchData();
    };

    const handleClaimArrival = async () => {
        if (!pinCode.trim()) {
            setError('Please enter the PIN code.');
            haptics.warning();
            return;
        }
        setIsClaiming(true);
        setError(null);
        try {
            if (DEV_MOCK_MODE) {
                await new Promise(resolve => setTimeout(resolve, 800));
                setClaimResult(MOCK_CLAIM_RESULT);
                setActiveArrival({ ...MOCK_ACTIVE, status: 'in_process' });
                setSuccessMessage('Arrival registered successfully!');
                setPinCode('');
                haptics.success();
                setIsClaiming(false);
                return;
            }
            const result = await claimArrival(driversLicense, { arrival_id: pinCode.trim() });
            haptics.success();
            setClaimResult(result);
            setSuccessMessage('Arrival registered!');
            setPinCode('');
            fetchData();
        } catch (err) {
            setError('Invalid PIN code.');
            haptics.error();
        } finally {
            setIsClaiming(false);
        }
    };

    // Expand map modal
    const handleExpandMap = () => {
        haptics.light();
        setIsMapExpanded(true);
    };

    const handleCloseMap = () => {
        setIsMapExpanded(false);
    };

    // Report problem
    const handleReportProblem = () => {
        haptics.medium();
        Alert.alert(
            'Report Problem',
            'What type of issue would you like to report?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Wrong Location', onPress: () => console.log('Wrong location reported') },
                { text: 'Dock Occupied', onPress: () => console.log('Dock occupied reported') },
                { text: 'Other Issue', onPress: () => console.log('Other issue reported') },
            ]
        );
    };

    // TRIGGER: Driver arrived at dock and starts unloading
    const handleStartUnloading = () => {
        haptics.medium();
        setIsUnloading(true);
        setSuccessMessage('Unloading started!');
    };

    // TRIGGER: Driver finishes unloading
    const handleFinishDelivery = () => {
        haptics.success();
        if (activeArrival) {
            setActiveArrival({ ...activeArrival, status: 'completed' });
        }
        setSuccessMessage('Delivery completed!');
    };

    const formatTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return '--:--';
        return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    const currentPhase = activeArrival ? getDeliveryPhase(activeArrival.status, isUnloading) : 0;
    const statusColors = activeArrival ? getStatusColors(activeArrival.status) : getStatusColors('');

    // Expanded Map Modal
    const renderMapModal = () => (
        <Modal
            visible={isMapExpanded}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCloseMap}
        >
            <View style={styles.modalContainer}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={handleCloseMap} style={styles.modalCloseButton}>
                        <Ionicons name="chevron-down" size={28} color={colors.text.primary} />
                    </TouchableOpacity>
                    <View style={styles.modalTitleContainer}>
                        <Text style={styles.modalTitle}>Dock {claimResult?.dock_bay_number || 'A-01'}</Text>
                        <Text style={styles.modalSubtitle}>{claimResult?.dock_location || 'Terminal A'}</Text>
                    </View>
                    <View style={{ width: 28 }} />
                </View>

                {/* Large Map */}
                <View style={styles.modalMapContainer}>
                    {activeArrival?.status === 'in_process' || isUnloading ? (
                        <PortMap
                            terminalId={activeArrival?.terminal_id}
                            dockNumber={claimResult?.dock_bay_number || 'A-01'}
                        />
                    ) : (
                        <RouteMap destinationName="Port of Aveiro" />
                    )}
                </View>

                {/* Cargo Details */}
                <View style={styles.modalInfoCard}>
                    <View style={styles.modalInfoRow}>
                        <View style={styles.modalInfoItem}>
                            <Text style={styles.modalInfoLabel}>Cargo</Text>
                            <Text style={styles.modalInfoValue}>
                                {claimResult?.cargo_description || activeArrival?.notes}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.modalInfoRow}>
                        <View style={styles.modalInfoItem}>
                            <Text style={styles.modalInfoLabel}>License Plate</Text>
                            <Text style={styles.modalInfoValue}>{activeArrival?.truck_license_plate}</Text>
                        </View>
                        <View style={styles.modalInfoItem}>
                            <Text style={styles.modalInfoLabel}>Entry Time</Text>
                            <Text style={styles.modalInfoValue}>{formatTime(activeArrival?.scheduled_start_time)}</Text>
                        </View>
                    </View>
                </View>

                {/* Report Problem Button */}
                <TouchableOpacity style={styles.reportButton} onPress={handleReportProblem}>
                    <Ionicons name="warning-outline" size={20} color="#ef4444" />
                    <Text style={styles.reportButtonText}>Report Problem</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );

    // Layout for in_process (at port)
    const renderInProcessLayout = () => (
        <View style={styles.contentContainer}>
            {/* Destination Card - Clickable to expand map */}
            <TouchableOpacity onPress={handleExpandMap} activeOpacity={0.7}>
                <Animated.View style={styles.destinationCard} entering={FadeInDown.duration(400)}>
                    <View style={styles.destinationHeader}>
                        <View style={[styles.destinationIcon, { backgroundColor: statusColors.bg }]}>
                            <Ionicons name="location" size={24} color={statusColors.accent} />
                        </View>
                        <View style={styles.destinationInfo}>
                            <Text style={styles.destinationLabel}>PROCEED TO</Text>
                            <Text style={styles.destinationTitle}>
                                Dock {claimResult?.dock_bay_number || 'A-01'}
                            </Text>
                            <Text style={styles.destinationSubtitle}>
                                {claimResult?.dock_location || 'Terminal A'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
                    </View>
                </Animated.View>
            </TouchableOpacity>

            {/* Small Map Preview - Also clickable */}
            <TouchableOpacity onPress={handleExpandMap} activeOpacity={0.9}>
                <Animated.View style={styles.mapContainer} entering={FadeInDown.delay(100).duration(400)}>
                    <PortMap
                        terminalId={activeArrival?.terminal_id}
                        dockNumber={claimResult?.dock_bay_number || 'A-01'}
                    />
                    {/* Tap to expand overlay */}
                    <View style={styles.mapOverlay}>
                        <View style={styles.mapOverlayBadge}>
                            <Ionicons name="expand-outline" size={14} color={colors.white} />
                            <Text style={styles.mapOverlayText}>Tap to expand</Text>
                        </View>
                    </View>
                </Animated.View>
            </TouchableOpacity>

            {/* Progress Timeline */}
            <Animated.View style={styles.progressCard} entering={FadeInDown.delay(200).duration(400)}>
                <Text style={styles.sectionLabel}>PROGRESS</Text>
                <View style={styles.timeline}>
                    {DELIVERY_STEPS.map((step, index) => {
                        const isCompleted = index < currentPhase;
                        const isCurrent = index === currentPhase - 1;
                        return (
                            <View key={step.id} style={styles.timelineItem}>
                                <View style={[
                                    styles.timelineDot,
                                    isCompleted && styles.timelineDotCompleted,
                                    isCurrent && styles.timelineDotCurrent,
                                ]}>
                                    <Ionicons
                                        name={step.icon as any}
                                        size={12}
                                        color={isCompleted || isCurrent ? colors.white : colors.text.muted}
                                    />
                                </View>
                                <Text style={[
                                    styles.timelineText,
                                    (isCompleted || isCurrent) && styles.timelineTextActive,
                                ]}>
                                    {step.label}
                                </Text>
                                {index < DELIVERY_STEPS.length - 1 && (
                                    <View style={[
                                        styles.timelineLine,
                                        isCompleted && styles.timelineLineCompleted,
                                    ]} />
                                )}
                            </View>
                        );
                    })}
                </View>
            </Animated.View>

            {/* Action Button */}
            <Animated.View entering={FadeInUp.delay(300).duration(400)}>
                {!isUnloading ? (
                    <TouchableOpacity style={styles.primaryButton} onPress={handleStartUnloading}>
                        <Ionicons name="cube-outline" size={20} color={colors.white} />
                        <Text style={styles.primaryButtonText}>START UNLOADING</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.primaryButton, styles.successButton]} onPress={handleFinishDelivery}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                        <Text style={styles.primaryButtonText}>COMPLETE DELIVERY</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Success message */}
            {successMessage && (
                <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.successText}>{successMessage}</Text>
                </View>
            )}
        </View>
    );

    // Layout for in_transit (on the way)
    const renderInTransitLayout = () => (
        <View style={styles.contentContainer}>
            {/* Status Card */}
            <Animated.View style={styles.statusCard} entering={FadeInDown.duration(400)}>
                <View style={styles.statusRow}>
                    <View>
                        <Text style={styles.statusTitle}>{activeArrival?.booking_reference}</Text>
                        <Text style={styles.statusSubtitle}>
                            Expected time: {formatTime(activeArrival?.scheduled_start_time)}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                            {getStatusLabel(activeArrival?.status || '')}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* Large Map */}
            <Animated.View style={styles.mapContainerLarge} entering={FadeInUp.delay(200).duration(400)}>
                <RouteMap destinationName="Port of Aveiro" />
            </Animated.View>
        </View>
    );

    // PIN Claim Form
    const renderClaimForm = () => (
        <View style={styles.contentContainer}>
            <Animated.View style={styles.claimCard} entering={FadeInDown.duration(400)}>
                <View style={styles.claimHeader}>
                    <View style={styles.claimIconContainer}>
                        <Ionicons name="qr-code" size={36} color={colors.primary} />
                    </View>
                    <Text style={styles.claimTitle}>Register Arrival</Text>
                    <Text style={styles.claimSubtitle}>
                        Enter the PIN code provided at the gate
                    </Text>
                </View>

                {error && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={16} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.pinInputContainer}>
                    <TextInput
                        style={styles.pinInput}
                        placeholder="PIN CODE"
                        placeholderTextColor={colors.text.muted}
                        value={pinCode}
                        onChangeText={setPinCode}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!isClaiming}
                        maxLength={10}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.primaryButton, isClaiming && styles.buttonDisabled]}
                    onPress={handleClaimArrival}
                    disabled={isClaiming}
                >
                    {isClaiming ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                            <Text style={styles.primaryButtonText}>CONFIRM ARRIVAL</Text>
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <Animated.View style={styles.header} entering={FadeIn.duration(400)}>
                <View>
                    <Text style={styles.greeting}>Hello, {driverName.split(' ')[0]}!</Text>
                    <Text style={styles.headerSubtitle}>
                        {activeArrival
                            ? `Delivery ${isUnloading ? 'unloading' : 'in progress'}`
                            : 'No active deliveries'}
                    </Text>
                </View>
                {activeArrival && (
                    <View style={[styles.headerBadge, { backgroundColor: statusColors.bg }]}>
                        <View style={[styles.headerBadgeDot, { backgroundColor: statusColors.accent }]} />
                        <Text style={[styles.headerBadgeText, { color: statusColors.text }]}>
                            {isUnloading ? 'Unloading' : getStatusLabel(activeArrival.status)}
                        </Text>
                    </View>
                )}
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {isLoading ? (
                    <View style={styles.contentContainer}>
                        <SkeletonCard style={{ height: 120, marginBottom: spacing.md }} />
                        <SkeletonCard style={{ height: 200, marginBottom: spacing.md }} />
                        <SkeletonCard style={{ height: 100 }} />
                    </View>
                ) : activeArrival ? (
                    activeArrival.status === 'in_process' || isUnloading
                        ? renderInProcessLayout()
                        : renderInTransitLayout()
                ) : (
                    renderClaimForm()
                )}
            </ScrollView>

            {/* Expanded Map Modal */}
            {renderMapModal()}
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
    },
    greeting: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    headerBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    headerBadgeText: {
        fontSize: fontSize.xs,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
    },
    contentContainer: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },

    // Destination Card
    destinationCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    destinationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    destinationIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    destinationInfo: {
        flex: 1,
    },
    destinationLabel: {
        fontSize: 10,
        color: colors.text.muted,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    destinationTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text.primary,
        marginTop: 2,
    },
    destinationSubtitle: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
    },

    // Map
    mapContainer: {
        height: 180,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    mapContainerLarge: {
        height: 300,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    mapOverlay: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.sm,
    },
    mapOverlayBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    mapOverlayText: {
        fontSize: 11,
        color: colors.white,
    },

    // Timeline
    progressCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.muted,
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
    },
    timeline: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timelineItem: {
        flex: 1,
        alignItems: 'center',
        position: 'relative',
    },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.background.dark,
        borderWidth: 2,
        borderColor: colors.border.medium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineDotCompleted: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    timelineDotCurrent: {
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
    },
    timelineText: {
        fontSize: 10,
        color: colors.text.muted,
        marginTop: 4,
        textAlign: 'center',
    },
    timelineTextActive: {
        color: colors.text.primary,
        fontWeight: '600',
    },
    timelineLine: {
        position: 'absolute',
        top: 13,
        left: '60%',
        right: '-40%',
        height: 2,
        backgroundColor: colors.border.medium,
        zIndex: -1,
    },
    timelineLineCompleted: {
        backgroundColor: colors.primary,
    },

    // Status Card
    statusCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
    },
    statusSubtitle: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadgeText: {
        fontSize: fontSize.xs,
        fontWeight: '600',
    },

    // Buttons
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        height: 52,
    },
    successButton: {
        backgroundColor: '#22c55e',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.white,
        letterSpacing: 0.3,
    },

    // Claim Form
    claimCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    claimHeader: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    claimIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    claimTitle: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
    },
    claimSubtitle: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    pinInputContainer: {
        marginBottom: spacing.md,
    },
    pinInput: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderWidth: 2,
        borderColor: colors.border.medium,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        fontSize: 18,
        color: colors.text.primary,
        textAlign: 'center',
        letterSpacing: 4,
        fontWeight: '600',
    },

    // Banners
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    errorText: {
        flex: 1,
        fontSize: fontSize.sm,
        color: '#ef4444',
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
    },
    successText: {
        fontSize: fontSize.sm,
        color: '#22c55e',
        fontWeight: '500',
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background.dark,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    modalCloseButton: {
        padding: spacing.xs,
    },
    modalTitleContainer: {
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    modalSubtitle: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
    },
    modalMapContainer: {
        flex: 1,
        margin: spacing.md,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    modalInfoCard: {
        backgroundColor: colors.background.card,
        margin: spacing.md,
        marginTop: 0,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    modalInfoRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    modalInfoItem: {
        flex: 1,
    },
    modalInfoLabel: {
        fontSize: 10,
        color: colors.text.muted,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    modalInfoValue: {
        fontSize: fontSize.sm,
        color: colors.text.primary,
        fontWeight: '500',
        marginTop: 2,
    },
    reportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        margin: spacing.md,
        marginTop: 0,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    reportButtonText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#ef4444',
    },
});
