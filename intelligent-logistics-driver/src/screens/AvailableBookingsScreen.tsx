/**
 * Available Bookings Screen
 * Shows unclaimed scheduled appointments for the driver's company.
 * Driver selects one and claims it via PIN entry.
 */
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
    ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { getAvailableBookings, claimArrival } from '../services/drivers';
import { spacing, borderRadius, fontSize, fontWeight, ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { haptics } from '../components/AnimatedComponents';
import type { Appointment } from '../types/types';

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

interface ClaimModalProps {
    appointment: Appointment;
    onClose: () => void;
    onClaimed: () => void;
}

function ClaimModal({ appointment, onClose, onClaimed }: ClaimModalProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClaim = async () => {
        if (!pin.trim()) {
            setError('Please enter the PIN code.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await claimArrival({
                arrival_id: pin.trim(),
                booking_reference: appointment.booking_reference,
            });
            haptics.success();
            onClaimed();
        } catch (err: unknown) {
            haptics.error();
            if (err && typeof err === 'object' && 'response' in err) {
                const e = err as { response?: { data?: { detail?: string } } };
                setError(e.response?.data?.detail || 'Invalid PIN or booking reference.');
            } else {
                setError('Connection error. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Claim Booking</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={22} color={colors.text.muted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.claimInfoRow}>
                        <Ionicons name="receipt-outline" size={14} color={colors.text.muted} />
                        <Text style={styles.claimInfoLabel}>Booking</Text>
                        <Text style={styles.claimInfoValue}>{appointment.booking_reference}</Text>
                    </View>
                    <View style={styles.claimInfoRow}>
                        <Ionicons name="car-outline" size={14} color={colors.text.muted} />
                        <Text style={styles.claimInfoLabel}>Truck</Text>
                        <Text style={styles.claimInfoValue}>{appointment.truck_license_plate}</Text>
                    </View>
                    <View style={styles.claimInfoRow}>
                        <Ionicons name="time-outline" size={14} color={colors.text.muted} />
                        <Text style={styles.claimInfoLabel}>Scheduled</Text>
                        <Text style={styles.claimInfoValue}>{formatDateTime(appointment.scheduled_start_time)}</Text>
                    </View>

                    <Text style={styles.pinLabel}>Enter PIN code</Text>
                    <TextInput
                        style={styles.pinInput}
                        value={pin}
                        onChangeText={setPin}
                        placeholder="e.g. 1234"
                        placeholderTextColor={colors.text.muted}
                        keyboardType="default"
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleClaim}
                    />

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <TouchableOpacity
                        style={[styles.claimBtn, loading && styles.claimBtnDisabled]}
                        onPress={handleClaim}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                <Text style={styles.claimBtnText}>Confirm Claim</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default function AvailableBookingsScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { user } = useAuthStore();
    const navigation = useNavigation<any>();

    const [bookings, setBookings] = useState<Appointment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selected, setSelected] = useState<Appointment | null>(null);
    const [claimedId, setClaimedId] = useState<number | null>(null);

    const fetchBookings = useCallback(async (p = 1) => {
        try {
            const data = await getAvailableBookings(p);
            setBookings(data.items);
            setTotal(data.total);
            setTotalPages(data.pages);
            setPage(p);
        } catch (err) {
            console.error('Failed to fetch available bookings:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchBookings(1); }, [fetchBookings]);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchBookings(1);
    }, [fetchBookings]);

    const handleClaimed = useCallback(() => {
        setClaimedId(selected?.id ?? null);
        setSelected(null);
        fetchBookings(page);
        // Confirm the claim and send the driver to the Delivery tab, where the
        // claimed booking now appears as a card with a Start Trip action.
        Alert.alert(
            'Booking claimed',
            'The booking is now assigned to you. Start the trip from the Delivery tab.',
            [
                { text: 'Stay here', style: 'cancel' },
                { text: 'Go to Delivery', onPress: () => navigation.navigate('Home') },
            ],
        );
    }, [selected, page, fetchBookings, navigation]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading available bookings…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {selected && (
                <ClaimModal
                    appointment={selected}
                    onClose={() => setSelected(null)}
                    onClaimed={handleClaimed}
                />
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.pageHeader}>
                    <View>
                        <Text style={styles.pageTitle}>Available Bookings</Text>
                        <Text style={styles.pageSubtitle}>
                            {total > 0
                                ? `${total} unassigned appointment${total !== 1 ? 's' : ''} for your company`
                                : 'No unassigned appointments'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {claimedId && (
                    <View style={styles.successBanner}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.successBannerText}>Booking claimed successfully!</Text>
                    </View>
                )}

                {bookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color={colors.text.muted} />
                        <Text style={styles.emptyTitle}>No bookings available</Text>
                        <Text style={styles.emptySubtitle}>
                            Your company has no unclaimed scheduled appointments right now.
                        </Text>
                    </View>
                ) : (
                    bookings.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.card, item.id === claimedId && styles.cardClaimed]}
                            onPress={() => {
                                haptics.light();
                                setSelected(item);
                            }}
                            activeOpacity={0.75}
                        >
                            <View style={styles.cardTop}>
                                <View style={styles.plateChip}>
                                    <Ionicons name="car-outline" size={13} color={colors.primary} />
                                    <Text style={styles.plateText}>{item.truck_license_plate}</Text>
                                </View>
                                <View style={styles.statusChip}>
                                    <Text style={styles.statusText}>Scheduled</Text>
                                </View>
                            </View>

                            <View style={styles.cardRow}>
                                <Ionicons name="receipt-outline" size={13} color={colors.text.muted} />
                                <Text style={styles.cardLabel}>Booking</Text>
                                <Text style={styles.cardValue}>{item.booking_reference}</Text>
                            </View>

                            <View style={styles.cardRow}>
                                <Ionicons name="time-outline" size={13} color={colors.text.muted} />
                                <Text style={styles.cardLabel}>Scheduled</Text>
                                <Text style={styles.cardValue}>{formatDateTime(item.scheduled_start_time)}</Text>
                            </View>

                            {item.notes && (
                                <View style={styles.cardRow}>
                                    <Ionicons name="document-text-outline" size={13} color={colors.text.muted} />
                                    <Text style={styles.cardLabel}>Notes</Text>
                                    <Text style={[styles.cardValue, styles.cardNotes]} numberOfLines={2}>
                                        {item.notes}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.claimHint}>
                                <Text style={styles.claimHintText}>Tap to claim with PIN</Text>
                                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                {totalPages > 1 && (
                    <View style={styles.pagination}>
                        <TouchableOpacity
                            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                            onPress={() => fetchBookings(page - 1)}
                            disabled={page === 1}
                        >
                            <Ionicons name="chevron-back" size={18} color={page === 1 ? colors.text.muted : colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
                        <TouchableOpacity
                            style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                            onPress={() => fetchBookings(page + 1)}
                            disabled={page === totalPages}
                        >
                            <Ionicons name="chevron-forward" size={18} color={page === totalPages ? colors.text.muted : colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.dark },
    scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: colors.text.muted, fontSize: fontSize.sm },

    pageHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    pageTitle: { color: colors.text.primary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    pageSubtitle: { color: colors.text.muted, fontSize: fontSize.sm, marginTop: 2 },
    refreshBtn: { padding: 8, borderRadius: borderRadius.md, backgroundColor: colors.background.card },

    successBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)',
        borderRadius: borderRadius.md, padding: spacing.sm,
        marginBottom: spacing.md,
    },
    successBannerText: { color: '#22c55e', fontSize: fontSize.sm, fontWeight: fontWeight.medium },

    emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, gap: 8 },
    emptyTitle: { color: colors.text.primary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
    emptySubtitle: { color: colors.text.muted, fontSize: fontSize.sm, textAlign: 'center', maxWidth: 280 },

    card: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1, borderColor: colors.border.light,
    },
    cardClaimed: { opacity: 0.5 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    plateChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(2, 119, 189, 0.1)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.sm,
    },
    plateText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
    statusChip: {
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm,
    },
    statusText: { color: colors.text.muted, fontSize: 11, fontWeight: fontWeight.medium },

    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
    cardLabel: { color: colors.text.muted, fontSize: fontSize.xs, width: 60 },
    cardValue: { color: colors.text.secondary, fontSize: fontSize.xs, flex: 1 },
    cardNotes: { fontStyle: 'italic' },

    claimHint: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 6,
    },
    claimHintText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },

    pagination: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.md, marginTop: spacing.lg,
    },
    pageBtn: { padding: 8, borderRadius: borderRadius.md, backgroundColor: colors.background.card },
    pageBtnDisabled: { opacity: 0.4 },
    pageInfo: { color: colors.text.secondary, fontSize: fontSize.sm },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: {
        backgroundColor: colors.background.card,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: spacing.lg, paddingBottom: spacing.xxl,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalTitle: { color: colors.text.primary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },

    claimInfoRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light,
    },
    claimInfoLabel: { color: colors.text.muted, fontSize: fontSize.sm, width: 70 },
    claimInfoValue: { color: colors.text.primary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },

    pinLabel: { color: colors.text.secondary, fontSize: fontSize.sm, marginTop: spacing.md, marginBottom: 8 },
    pinInput: {
        backgroundColor: colors.background.dark,
        color: colors.text.primary,
        fontSize: fontSize.lg,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md, paddingVertical: 14,
        borderWidth: 1, borderColor: colors.border.light,
        letterSpacing: 2,
    },
    errorText: { color: '#ef4444', fontSize: fontSize.sm, marginTop: 8 },

    claimBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md, paddingVertical: 16,
        marginTop: spacing.md,
    },
    claimBtnDisabled: { opacity: 0.6 },
    claimBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
