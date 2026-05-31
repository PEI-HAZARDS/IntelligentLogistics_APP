/**
 * Active Arrival Screen
 * Shows current active arrival with context-aware map
 * Inspired by logistics apps like Fretefy
 * - in_transit: Route map to port
 * - in_process: Port map with dock destination
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    TouchableWithoutFeedback,
    Keyboard,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    FadeIn, FadeInDown, FadeInUp, ZoomIn,
    useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/authStore';
import { getMyActiveArrival, getMyTodayArrivals, claimArrival, updateArrivalStatus, startTrip, startUnloading, completeUnloading, completeAppointment, reportProblem, type ProblemCategory } from '../services/drivers';
import { spacing, borderRadius, fontSize, fontWeight, ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { haptics, SkeletonCard } from '../components/AnimatedComponents';
import RouteMap from '../components/RouteMap';
import PortMap from '../components/PortMap';
import type { Appointment, ClaimAppointmentResponse } from '../types/types';
import { API_CONFIG, APP_CONFIG } from '../config/config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ===== MOCK MODE - REMOVE AFTER TESTING =====
const DEV_MOCK_MODE = false;

const MOCK_ACTIVE: Appointment = {
    id: 1001,
    arrival_id: 'ARR-001',
    booking_reference: 'BK-2026-001',
    driver_license: 'AB-123456',
    truck_license_plate: '00-AA-00',
    terminal_id: 1,
    scheduled_start_time: new Date().toISOString(),
    status: 'in_process',
    notes: 'Container ABC-123',
    gate_in_id: 1,
};

const MOCK_CLAIM_RESULT: ClaimAppointmentResponse = {
    appointment_id: 1001,
    dock_bay_number: 'A-05',
    dock_location: 'North Terminal - Sector 3',
    license_plate: '00-AA-00',
    cargo_description: 'Container ABC-123',
    navigation_url: 'maps://',
};

const MOCK_ASSIGNED_DELIVERIES: Appointment[] = [
    {
        id: 1001,
        arrival_id: 'ARR-001',
        booking_reference: 'BK-2026-001',
        driver_license: 'AB-123456',
        truck_license_plate: '00-AA-00',
        terminal_id: 1,
        scheduled_start_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        status: 'scheduled',
        notes: 'Container ABC-123',
        gate_in_id: 1,
    },
    {
        id: 1002,
        arrival_id: 'ARR-002',
        booking_reference: 'BK-2026-005',
        driver_license: 'AB-123456',
        truck_license_plate: '00-AA-00',
        terminal_id: 2,
        scheduled_start_time: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
        status: 'scheduled',
        notes: 'Steel Pallets',
        gate_in_id: 2,
    },
    {
        id: 1003,
        arrival_id: 'ARR-003',
        booking_reference: 'BK-2026-012',
        driver_license: 'AB-123456',
        truck_license_plate: '00-AA-00',
        terminal_id: 1,
        scheduled_start_time: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
        status: 'scheduled',
        notes: 'General Cargo',
        gate_in_id: 1,
    },
];
// ===== END MOCK MODE =====

// Port of Aveiro — same destination the RouteMap routes to. Used to show the
// live straight-line (great-circle) distance from the driver to the port.
const PORT_DESTINATION = { latitude: 40.6335912, longitude: -8.73065429999997 };
const AVG_APPROACH_SPEED_KMH = 40; // for a rough ETA from the remaining distance

function haversineKm(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
): number {
    const R = 6371; // Earth radius in km
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Delivery states - TRIGGER: Driver action buttons
// Aligned with backend state machine:
//   in_transit → (gate) → in_port → unloading → leaving_port → completed
//   leaving_port = visit.done but appointment still in_process (truck driving to exit gate)
//   In a future version, the exit confirmation becomes automatic (like the entry AI detection)
type DeliveryPhase = 'idle' | 'in_transit' | 'gate_opening' | 'in_port' | 'unloading' | 'leaving_port' | 'completed';

const DELIVERY_STEPS: { id: DeliveryPhase; label: string; icon: string }[] = [
    { id: 'in_transit', label: 'In Transit', icon: 'navigate-outline' },
    { id: 'gate_opening', label: 'Gate', icon: 'enter-outline' },
    { id: 'in_port', label: 'Port Nav', icon: 'map-outline' },
    { id: 'unloading', label: 'Unloading', icon: 'cube-outline' },
    { id: 'leaving_port', label: 'Leaving', icon: 'exit-outline' },
    { id: 'completed', label: 'Departed', icon: 'checkmark-circle-outline' },
];

// Problem types a driver can report from the road. `suggestsLocation` triggers
// an automatic GPS capture so the manager sees "near <place>".
const PROBLEM_CATEGORIES: {
    id: ProblemCategory;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    suggestsLocation?: boolean;
}[] = [
    { id: 'breakdown', label: 'Breakdown', icon: 'construct-outline' },
    { id: 'lost', label: 'Lost near location', icon: 'navigate-circle-outline', suggestsLocation: true },
    { id: 'delay', label: 'Traffic delay', icon: 'time-outline' },
    { id: 'accident', label: 'Accident', icon: 'alert-circle-outline', suggestsLocation: true },
    { id: 'cargo', label: 'Cargo / container', icon: 'cube-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

function getDeliveryPhaseIndex(phase: DeliveryPhase): number {
    switch (phase) {
        case 'completed':     return 6;
        case 'leaving_port':  return 5;
        case 'unloading':     return 4;
        case 'in_port':       return 3;
        case 'gate_opening':  return 2;
        case 'in_transit':    return 1;
        default:              return 0;
    }
}

function getStatusLabel(phase: DeliveryPhase): string {
    const labels: Record<DeliveryPhase, string> = {
        idle: 'Not Started',
        in_transit: 'In Transit',
        gate_opening: 'At Gate',
        in_port: 'At Port',
        unloading: 'Unloading',
        leaving_port: 'Leaving Port',
        completed: 'Departed',
    };
    return labels[phase] || phase;
}

function getStatusColors(phase: DeliveryPhase): { bg: string; text: string; accent: string } {
    switch (phase) {
        case 'completed':
        case 'leaving_port':
            return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', accent: '#22c55e' };
        case 'unloading':
        case 'in_port':
            return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', accent: '#3b82f6' };
        case 'gate_opening':
            return { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', accent: '#a855f7' };
        default:
            return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', accent: '#eab308' };
    }
}

export default function ActiveArrivalScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { user, token } = useAuthStore();
    const driversLicense = user?.drivers_license || '';
    const driverName = user?.name || 'Driver';

    const [activeArrival, setActiveArrival] = useState<Appointment | null>(null);
    const [assignedDeliveries, setAssignedDeliveries] = useState<Appointment[]>([]);
    const [selectedForPin, setSelectedForPin] = useState<Appointment | null>(null);
    const [claimResult, setClaimResult] = useState<ClaimAppointmentResponse | null>(null);
    const [pinCode, setPinCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    
    // Simulation State
    const [deliveryPhase, setDeliveryPhase] = useState<DeliveryPhase>('idle');
    const [showGatePopup, setShowGatePopup] = useState(false);
    const [showInfractionPopup, setShowInfractionPopup] = useState(false);

    // Report-a-problem modal
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportCategory, setReportCategory] = useState<ProblemCategory | null>(null);
    const [reportNote, setReportNote] = useState('');
    const [reportLocation, setReportLocation] = useState<{ label: string; latitude: number; longitude: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    // Live straight-line distance (km) from the driver to the port while in transit.
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportSuccess, setReportSuccess] = useState(false);
    const infractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const infractionFlash = useSharedValue(1);

    useEffect(() => {
        if (showInfractionPopup) {
            infractionFlash.value = withRepeat(
                withSequence(
                    withTiming(0.3, { duration: 400 }),
                    withTiming(1, { duration: 400 }),
                ),
                -1,
                true,
            );
        } else {
            cancelAnimation(infractionFlash);
            infractionFlash.value = 1;
        }
    }, [showInfractionPopup]);

    const infractionFlashStyle = useAnimatedStyle(() => ({
        opacity: infractionFlash.value,
    }));

    // WebSocket Debug Panel
    const [showDebug, setShowDebug] = useState(false);
    const [debugMessages, setDebugMessages] = useState<Array<{ id: string; timestamp: string; type: string; data: unknown }>>([]);
    const [isWsConnected, setIsWsConnected] = useState(false);
    const debugMsgIdRef = useRef(0);

    const fetchData = useCallback(async () => {
        setError(null);
        try {
            if (DEV_MOCK_MODE) {
                await new Promise(resolve => setTimeout(resolve, 500));
                setAssignedDeliveries(MOCK_ASSIGNED_DELIVERIES);
                if (deliveryPhase === 'idle') {
                    setActiveArrival(null);
                }
                setIsLoading(false);
                setIsRefreshing(false);
                return;
            }

            // Fetch active arrival and today's schedule in parallel
            const [active, todayArrivals] = await Promise.all([
                getMyActiveArrival(),
                getMyTodayArrivals().catch(() => []),
            ]);

            // Show pending/upcoming deliveries on the dashboard
            // 'delayed' and 'unloading' are computed display_status values, not persisted statuses
            const pending = (todayArrivals || []).filter(
                (a) => a.status === 'scheduled' || a.status === 'in_transit' || a.status === 'in_process'
            );
            setAssignedDeliveries(pending);

            if (active && deliveryPhase === 'idle') {
                setActiveArrival(active);
                // Derive UI phase from backend sub-state flags (is_visit_done > is_unloading > is_in_port)
                if (active.status === 'in_process' && active.is_visit_done) setDeliveryPhase('leaving_port');
                else if (active.is_unloading) setDeliveryPhase('unloading');
                else if (active.status === 'in_process') setDeliveryPhase('in_port');
                else if (active.status === 'completed') setDeliveryPhase('completed');
                else setDeliveryPhase('in_transit');
            } else if (!active && deliveryPhase === 'idle') {
                setActiveArrival(null);
            }
        } catch (err) {
            console.error('Failed to load arrival:', err);
            setError('Failed to load data.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [driversLicense, deliveryPhase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const deliveryPhaseRef = useRef(deliveryPhase);
    useEffect(() => {
        deliveryPhaseRef.current = deliveryPhase;
    }, [deliveryPhase]);

    // Live distance to the port — watch GPS while in transit and compute the
    // great-circle distance to the port (replaces the old hard-coded value).
    useEffect(() => {
        if (deliveryPhase !== 'in_transit') {
            setDistanceKm(null);
            return;
        }
        let cancelled = false;
        let sub: Location.LocationSubscription | null = null;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted' || cancelled) return;
                // Seed once immediately so the value isn't blank until the first move.
                const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (!cancelled) {
                    setDistanceKm(haversineKm(
                        { latitude: first.coords.latitude, longitude: first.coords.longitude },
                        PORT_DESTINATION,
                    ));
                }
                sub = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 15000 },
                    (pos) => {
                        setDistanceKm(haversineKm(
                            { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
                            PORT_DESTINATION,
                        ));
                    },
                );
            } catch {
                // Location unavailable — leave distance as null ("—").
            }
        })();
        return () => { cancelled = true; sub?.remove(); };
    }, [deliveryPhase]);

    // Keep a ref to activeArrival so WS handlers always read fresh state
    // without being listed as effect dependencies (which would cause reconnects).
    const activeArrivalRef = useRef(activeArrival);
    useEffect(() => {
        activeArrivalRef.current = activeArrival;
    }, [activeArrival]);

    const isActivePhase = deliveryPhase !== 'idle' && deliveryPhase !== 'completed';

    // Clear infraction timer on unmount to avoid setState on an unmounted component
    useEffect(() => {
        return () => {
            if (infractionTimerRef.current) clearTimeout(infractionTimerRef.current);
        };
    }, []);

    // WebSocket: listen for gate approval, status changes, and infractions.
    // Uses a ref so the socket survives re-renders without reconnecting.
    // Reconnects automatically with exponential backoff if the connection drops.
    const wsRef = useRef<WebSocket | null>(null);
    const wsReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wsReconnectDelay = useRef(1000);

    useEffect(() => {
        if (!isActivePhase || !driversLicense || !token) {
            setIsWsConnected(false);
            wsRef.current?.close();
            return;
        }

        const connect = () => {
            if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

            const ws = new WebSocket(
                `${API_CONFIG.wsUrl}/ws/driver/${driversLicense}?token=${encodeURIComponent(token)}`,
            );
            wsRef.current = ws;

            ws.onopen = async () => {
                setIsWsConnected(true);
                wsReconnectDelay.current = 1000; // reset backoff on successful connect
                // Race guard: fetch current status in case transition happened while offline
                try {
                    const current = await getMyActiveArrival();
                    if (current?.id === activeArrivalRef.current?.id && current?.status === 'in_process') {
                        if (deliveryPhaseRef.current === 'in_transit') {
                            handleArriveAtGate(true);
                        }
                    }
                } catch {}
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setDebugMessages(prev => [
                        {
                            id: String(++debugMsgIdRef.current),
                            timestamp: new Date().toISOString(),
                            type: (data.message_type as string) || 'unknown',
                            data,
                        },
                        ...prev.slice(0, 49),
                    ]);
                    if (
                        data.message_type === 'status_changed' &&
                        data.appointment_id === activeArrivalRef.current?.id &&
                        data.new_status === 'in_process'
                    ) {
                        if (deliveryPhaseRef.current === 'in_transit') {
                            handleArriveAtGate(true);
                        }
                    }
                    if (data.message_type === 'infraction_warning') {
                        haptics.error();
                        setShowInfractionPopup(true);
                        if (infractionTimerRef.current) clearTimeout(infractionTimerRef.current);
                        infractionTimerRef.current = setTimeout(() => setShowInfractionPopup(false), 10000);
                    }
                } catch {}
            };

            ws.onerror = (e) => console.warn('Driver WS error:', e);

            ws.onclose = () => {
                setIsWsConnected(false);
                // Reconnect with exponential backoff (max 30 s)
                const delay = wsReconnectDelay.current;
                wsReconnectDelay.current = Math.min(delay * 2, 30000);
                wsReconnectTimerRef.current = setTimeout(connect, delay);
            };
        };

        connect();

        return () => {
            if (wsReconnectTimerRef.current) clearTimeout(wsReconnectTimerRef.current);
            wsRef.current?.close();
            wsRef.current = null;
        };
    // Only reconnect when the active session itself changes, not on every render.
    // activeArrival changes are handled via activeArrivalRef.
    }, [isActivePhase, driversLicense, token]);

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
                setActiveArrival(MOCK_ACTIVE);
                setDeliveryPhase('in_transit');
                setSuccessMessage('Arrival registered! Ready to drive.');
                setPinCode('');
                setSelectedForPin(null);
                haptics.success();
                return;
            }
            const result = await claimArrival({ arrival_id: pinCode.trim(), booking_reference: selectedForPin?.booking_reference ?? '' });
            // Transition from scheduled → in_transit
            if (result.appointment_id) {
                try {
                    await startTrip(result.appointment_id);
                } catch (err) {
                    console.warn('Failed to update status to in_transit:', err);
                }
            }
            haptics.success();
            setClaimResult(result);
            setSuccessMessage('Arrival registered!');
            // Transition immediately using the appointment we already have.
            // Do NOT call fetchData() here — it runs with a stale deliveryPhase='idle'
            // closure and would overwrite activeArrival with null.
            setActiveArrival(selectedForPin);
            setDeliveryPhase('in_transit');
            setPinCode('');
            setSelectedForPin(null);
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

    // Arrive at Gate — update backend status to in_process
    const handleArriveAtGate = async (skipBackendUpdate = false) => {
        // Prevent calling if we already transitioned
        if (deliveryPhase !== 'in_transit' && deliveryPhase !== 'idle') {
            return;
        }
        haptics.medium();
        setDeliveryPhase('gate_opening');
        setShowGatePopup(true);

        // Notify backend that truck arrived at gate
        if (!skipBackendUpdate && activeArrival?.id) {
            try {
                await updateArrivalStatus(activeArrival.id, 'in_process');
            } catch (err) {
                console.warn('Failed to update status to in_process:', err);
            }
        }

        // Auto close popup and move to internal navigation after 3 seconds
        setTimeout(() => {
            setShowGatePopup(false);
            setDeliveryPhase('in_port');
            haptics.success();
        }, 3500);
    };

    // TRIGGER: Driver arrived at dock and starts unloading
    const handleStartUnloading = () => {
        Alert.alert(
            'Start Unloading',
            'Are you positioned at the dock and ready to start unloading?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start',
                    onPress: async () => {
                        haptics.medium();
                        // Notify backend of unloading state transition
                        if (activeArrival?.id) {
                            try {
                                await startUnloading(activeArrival.id);
                            } catch (err) {
                                console.warn('Failed to update status to unloading:', err);
                            }
                        }
                        setDeliveryPhase('unloading');
                        setSuccessMessage('Unloading started!');
                    }
                }
            ]
        );
    };

    // Step 1 of 2: mark visit as done → backend computes leaving_port sub-state
    const handleFinishUnloading = () => {
        Alert.alert(
            'Unloading Complete',
            'Confirm all cargo has been unloaded.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        if (activeArrival?.id) {
                            try {
                                await completeUnloading(activeArrival.id);
                            } catch (err) {
                                console.warn('Failed to complete unloading:', err);
                            }
                        }
                        haptics.medium();
                        setDeliveryPhase('leaving_port');
                        setSuccessMessage('Proceed to the exit gate.');
                    }
                }
            ]
        );
    };

    // Step 2 of 2: mark appointment as completed
    const handleCompleteDelivery = () => {
        Alert.alert(
            'Complete & Exit Port',
            'Confirm you are leaving the port terminal.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete & Exit',
                    style: 'destructive',
                    onPress: async () => {
                        if (activeArrival?.id) {
                            try {
                                await completeAppointment(activeArrival.id);
                            } catch (err) {
                                console.warn('Failed to complete appointment:', err);
                            }
                        }
                        haptics.success();
                        setDeliveryPhase('completed');
                        setSuccessMessage('Delivery completed! Safe travels.');
                        setTimeout(() => {
                            setDeliveryPhase('idle');
                            setActiveArrival(null);
                            setSelectedForPin(null);
                            setClaimResult(null);
                            setSuccessMessage(null);
                            setPinCode('');
                        }, 3500);
                    }
                }
            ]
        );
    };

    // kept for type-safety (no longer shown as a button)
    const handleConfirmExit = handleCompleteDelivery;

    // RESET Simulation
    const handleReset = () => {
        Alert.alert(
            'Leave Port',
            'Confirm you are finished and leaving the terminal area?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Finish', 
                    onPress: () => {
                        haptics.medium();
                        setDeliveryPhase('idle');
                        setActiveArrival(null);
                        setSelectedForPin(null);
                        setClaimResult(null);
                        setSuccessMessage(null);
                        setPinCode('');
                    }
                }
            ]
        );
    };

    const formatTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return '--:--';
        return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    const currentPhaseIndex = getDeliveryPhaseIndex(deliveryPhase);
    const statusColors = getStatusColors(deliveryPhase);

    // Gate Accepted Popup
    // ===== Report a problem =====
    const openReportModal = () => {
        haptics.medium();
        setReportCategory(null);
        setReportNote('');
        setReportLocation(null);
        setReportError(null);
        setReportSuccess(false);
        setShowReportModal(true);
    };

    const closeReportModal = () => {
        if (isSubmittingReport) return;
        Keyboard.dismiss();
        setShowReportModal(false);
    };

    const captureReportLocation = useCallback(async () => {
        setReportError(null);
        setIsLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setReportError('Location permission denied — you can still send the report without it.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = pos.coords;
            let label = '';
            try {
                const places = await Location.reverseGeocodeAsync({ latitude, longitude });
                const p = places[0];
                if (p) {
                    label = [p.street || p.name, p.city || p.subregion || p.region].filter(Boolean).join(', ');
                }
            } catch {
                // reverse geocoding is best-effort; fall back to raw coordinates
            }
            if (!label) label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            setReportLocation({ label, latitude, longitude });
            haptics.light();
        } catch {
            setReportError('Could not get your location. Try again or send without it.');
        } finally {
            setIsLocating(false);
        }
    }, []);

    const handleSelectReportCategory = (cat: typeof PROBLEM_CATEGORIES[number]) => {
        haptics.medium();
        setReportCategory(cat.id);
        setReportError(null);
        if (cat.suggestsLocation && !reportLocation && !isLocating) {
            captureReportLocation();
        }
    };

    const handleSubmitReport = async () => {
        if (!reportCategory) {
            setReportError('Please choose a problem type.');
            return;
        }
        Keyboard.dismiss();
        setReportError(null);
        setIsSubmittingReport(true);
        try {
            await reportProblem({
                category: reportCategory,
                note: reportNote.trim() || undefined,
                location_label: reportLocation?.label,
                latitude: reportLocation?.latitude,
                longitude: reportLocation?.longitude,
                arrival_id: activeArrival?.arrival_id,
                appointment_id: activeArrival?.id,
                license_plate: activeArrival?.truck_license_plate,
            });
            haptics.success();
            setReportSuccess(true);
            setTimeout(() => {
                setShowReportModal(false);
                setReportSuccess(false);
            }, 1400);
        } catch {
            haptics.error();
            setReportError('Could not send the report. Check your connection and try again.');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const renderReportModal = () => (
        <Modal
            visible={showReportModal}
            transparent
            animationType="fade"
            onRequestClose={closeReportModal}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.gatePopupOverlay}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <Animated.View entering={ZoomIn.duration(300)} style={styles.reportModalContent}>
                            <TouchableOpacity style={styles.modalCloseIcon} onPress={closeReportModal}>
                                <Ionicons name="close" size={24} color={colors.text.muted} />
                            </TouchableOpacity>

                            <View style={styles.reportModalHeader}>
                                <Ionicons name="warning" size={28} color="#ef4444" />
                                <Text style={styles.reportModalTitle}>Report a Problem</Text>
                            </View>
                            <Text style={styles.reportModalSubtitle}>
                                What's happening? The logistics manager will be notified.
                            </Text>

                            {reportSuccess ? (
                                <Animated.View entering={FadeIn.duration(250)} style={styles.reportSentBox}>
                                    <Ionicons name="checkmark-circle" size={44} color="#22c55e" />
                                    <Text style={styles.reportSentText}>Report sent to the manager</Text>
                                </Animated.View>
                            ) : (
                                <>
                                    {/* Category grid */}
                                    <View style={styles.reportCategoryGrid}>
                                        {PROBLEM_CATEGORIES.map((cat) => {
                                            const selected = reportCategory === cat.id;
                                            return (
                                                <TouchableOpacity
                                                    key={cat.id}
                                                    style={[styles.reportCategoryChip, selected && styles.reportCategoryChipActive]}
                                                    onPress={() => handleSelectReportCategory(cat)}
                                                    disabled={isSubmittingReport}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons
                                                        name={cat.icon}
                                                        size={22}
                                                        color={selected ? colors.primary : colors.text.secondary}
                                                    />
                                                    <Text style={[styles.reportCategoryText, selected && styles.reportCategoryTextActive]}>
                                                        {cat.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Location row */}
                                    <TouchableOpacity
                                        style={styles.reportLocationRow}
                                        onPress={captureReportLocation}
                                        disabled={isLocating || isSubmittingReport}
                                        activeOpacity={0.8}
                                    >
                                        {isLocating ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        ) : (
                                            <Ionicons
                                                name={reportLocation ? 'location' : 'location-outline'}
                                                size={20}
                                                color={reportLocation ? colors.primary : colors.text.secondary}
                                            />
                                        )}
                                        <Text style={styles.reportLocationText} numberOfLines={1}>
                                            {isLocating
                                                ? 'Getting your location…'
                                                : reportLocation
                                                    ? `Near ${reportLocation.label}`
                                                    : 'Attach my current location'}
                                        </Text>
                                        {reportLocation && !isLocating && (
                                            <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                                        )}
                                    </TouchableOpacity>

                                    {/* Optional note */}
                                    <TextInput
                                        style={styles.reportNoteInput}
                                        placeholder="Add a note (optional)…"
                                        placeholderTextColor={colors.text.muted}
                                        value={reportNote}
                                        onChangeText={setReportNote}
                                        multiline
                                        maxLength={300}
                                        editable={!isSubmittingReport}
                                    />

                                    {reportError && (
                                        <View style={[styles.errorBanner, { width: '100%', marginBottom: 0, marginTop: spacing.sm }]}>
                                            <Ionicons name="alert-circle" size={16} color="#ef4444" />
                                            <Text style={styles.errorText}>{reportError}</Text>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.reportSubmitButton, (isSubmittingReport || !reportCategory) && styles.buttonDisabled]}
                                        onPress={handleSubmitReport}
                                        disabled={isSubmittingReport || !reportCategory}
                                        activeOpacity={0.85}
                                    >
                                        {isSubmittingReport ? (
                                            <ActivityIndicator size="small" color={colors.white} />
                                        ) : (
                                            <>
                                                <Ionicons name="send" size={18} color={colors.white} />
                                                <Text style={styles.reportSubmitText}>Send to Manager</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const renderGatePopup = () => (
        <Modal
            visible={showGatePopup}
            transparent
            animationType="fade"
        >
            <View style={styles.gatePopupOverlay}>
                <Animated.View 
                    entering={ZoomIn.duration(400)} 
                    style={styles.gatePopupContent}
                >
                    <View style={styles.gatePopupIcon}>
                        <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
                    </View>
                    <Text style={styles.gatePopupTitle}>ACCEPTED</Text>
                    <Text style={styles.gatePopupSubtitle}>Gate is opening...</Text>
                    <Text style={styles.gatePopupInstructions}>Proceed to Dock {claimResult?.dock_bay_number || 'A-05'}</Text>
                    
                    <ActivityIndicator 
                        size="large" 
                        color={colors.primary} 
                        style={{ marginTop: spacing.xl }} 
                    />
                </Animated.View>
            </View>
        </Modal>
    );

    // Infraction Warning Popup
    const renderInfractionPopup = () => (
        <Modal
            visible={showInfractionPopup}
            transparent
            animationType="fade"
        >
            <View style={styles.gatePopupOverlay}>
                <Animated.View
                    entering={ZoomIn.duration(400)}
                    style={styles.gatePopupContent}
                >
                    <TouchableOpacity
                        style={styles.infractionCloseBtn}
                        onPress={() => {
                            if (infractionTimerRef.current) clearTimeout(infractionTimerRef.current);
                            setShowInfractionPopup(false);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <Animated.View style={[styles.gatePopupIcon, infractionFlashStyle]}>
                        <Ionicons name="warning" size={80} color="#ef4444" />
                    </Animated.View>
                    <Animated.Text style={[styles.gatePopupTitle, { color: '#ef4444' }, infractionFlashStyle]}>INFRACTION</Animated.Text>
                    <Text style={styles.gatePopupSubtitle}>
                        Possible hazard violation detected
                    </Text>
                    <Text style={styles.gatePopupInstructions}>
                        Please return to the highway. Continuing may result in a fine.
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );

    // Shared Progress Timeline component
    const renderProgressTimeline = () => (
        <Animated.View style={styles.progressCard} entering={FadeInDown.delay(100).duration(400)}>
            <Text style={styles.sectionLabel}>DELIVERY PROGRESS</Text>
            <View style={styles.timeline}>
                {DELIVERY_STEPS.map((step, index) => {
                    const stepIndex = index + 1;
                    const isCompleted = stepIndex < currentPhaseIndex;
                    const isCurrent = stepIndex === currentPhaseIndex;
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
    );

    // Layout for in_port or unloading
    const renderInPortLayout = () => {
        const isMapVisible = deliveryPhase === 'in_port';

        return (
            <View style={styles.contentContainer}>
                {/* 1. Map OR Unified Task Focus Area */}
                {isMapVisible ? (
                    <TouchableOpacity onPress={handleExpandMap} activeOpacity={0.9}>
                        <Animated.View style={styles.mapContainerExtraLarge} entering={FadeInUp.delay(100).duration(400)}>
                            {/* key forces remount when terminal changes so stale props never linger */}
                            <PortMap
                                key={`${activeArrival?.terminal_id ?? 'default'}-${deliveryPhase}`}
                                terminalId={activeArrival?.terminal_id}
                                dockNumber={claimResult?.dock_bay_number || 'A-05'}
                            />
                            
                            {/* Floating Overlay (Visible ONLY during navigation) */}
                            <View style={styles.floatingStatsCard}>
                                <View style={styles.statsHeader}>
                                    <View style={[styles.gateIndicator, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                                        <Ionicons name="cube" size={16} color="#a855f7" />
                                        <Text style={[styles.gateText, { color: '#a855f7' }]}>DOCK {claimResult?.dock_bay_number || 'A-05'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.destinationName}>{claimResult?.dock_location || 'North Terminal'}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                        <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                                            {getStatusLabel(deliveryPhase)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.statsDivider} />
                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>CARGO</Text>
                                        <Text style={styles.statValue} numberOfLines={1}>
                                            {claimResult?.cargo_description || 'General Cargo'}
                                        </Text>
                                    </View>
                                    <View style={styles.statVerticalDivider} />
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>LICENSE</Text>
                                        <Text style={styles.statValue}>{activeArrival?.truck_license_plate || '00-AA-00'}</Text>
                                    </View>
                                    <View style={styles.statVerticalDivider} />
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>ENTRY</Text>
                                        <Text style={styles.statValue}>{formatTime(activeArrival?.scheduled_start_time)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.mapOverlay}>
                                <View style={styles.mapOverlayBadge}>
                                    <Ionicons name="expand-outline" size={14} color={colors.white} />
                                    <Text style={styles.mapOverlayText}>Full Screen</Text>
                                </View>
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                ) : (
                    <Animated.View style={styles.taskFocusCard} entering={FadeIn.duration(600)}>
                        {/* Integrated Header inside the card */}
                        <View style={styles.taskFocusHeader}>
                            <View style={styles.statsHeader}>
                                <View style={[styles.gateIndicator, { backgroundColor: (deliveryPhase === 'completed' || deliveryPhase === 'leaving_port') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(168, 85, 247, 0.15)' }]}>
                                    <Ionicons
                                        name={deliveryPhase === 'completed' ? "checkmark-circle" : deliveryPhase === 'leaving_port' ? "exit-outline" : "cube"}
                                        size={16}
                                        color={(deliveryPhase === 'completed' || deliveryPhase === 'leaving_port') ? colors.status.completed : "#a855f7"}
                                    />
                                    <Text style={[styles.gateText, { color: (deliveryPhase === 'completed' || deliveryPhase === 'leaving_port') ? colors.status.completed : "#a855f7" }]}>
                                        {deliveryPhase === 'leaving_port' ? 'EXIT GATE' : `DOCK ${claimResult?.dock_bay_number || 'A-05'}`}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.destinationName}>{claimResult?.dock_location || 'North Terminal'}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                    <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                                        {getStatusLabel(deliveryPhase)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.statsDivider} />
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>CARGO</Text>
                                    <Text style={styles.statValue} numberOfLines={1}>
                                        {claimResult?.cargo_description || 'General Cargo'}
                                    </Text>
                                </View>
                                <View style={styles.statVerticalDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>LICENSE</Text>
                                    <Text style={styles.statValue}>{activeArrival?.truck_license_plate || '00-AA-00'}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.taskDivider} />

                        {/* Main Body */}
                        <View style={styles.taskFocusBody}>
                            <View style={styles.taskIconContainer}>
                                <Ionicons
                                    name={deliveryPhase === 'completed' ? "checkmark-circle" : deliveryPhase === 'leaving_port' ? "exit-outline" : "sync"}
                                    size={80}
                                    color={deliveryPhase === 'completed' || deliveryPhase === 'leaving_port' ? colors.status.completed : colors.primary}
                                />
                            </View>
                            <Text style={styles.taskTitle}>
                                {deliveryPhase === 'completed' ? 'Delivery Successful' : deliveryPhase === 'leaving_port' ? 'Heading to Exit Gate' : 'Unloading in Progress'}
                            </Text>
                            <Text style={styles.taskSubtitle}>
                                {deliveryPhase === 'completed'
                                    ? 'You may now leave the port terminal.'
                                    : deliveryPhase === 'leaving_port'
                                    ? 'Drive to the exit gate and confirm your departure.'
                                    : 'Please wait at the dock while the cargo is being processed.'}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {renderProgressTimeline()}

                <Animated.View entering={FadeInUp.delay(300).duration(400)}>
                    {deliveryPhase === 'in_port' ? (
                        <TouchableOpacity style={styles.primaryButton} onPress={handleStartUnloading}>
                            <Ionicons name="cube-outline" size={20} color={colors.white} />
                            <Text style={styles.primaryButtonText}>START UNLOADING</Text>
                        </TouchableOpacity>
                    ) : deliveryPhase === 'unloading' ? (
                        <TouchableOpacity style={[styles.primaryButton, styles.warningButton]} onPress={handleFinishUnloading}>
                            <Ionicons name="checkmark-done-outline" size={20} color={colors.white} />
                            <Text style={styles.primaryButtonText}>FINISHED UNLOADING</Text>
                        </TouchableOpacity>
                    ) : deliveryPhase === 'leaving_port' ? (
                        <View style={{ gap: 12 }}>
                            {activeArrival?.highway_infraction && (
                                <View style={styles.infractionWarningBanner}>
                                    <Ionicons name="warning-outline" size={18} color="#ef4444" />
                                    <Text style={styles.infractionWarningText}>Highway infraction flagged on this delivery</Text>
                                </View>
                            )}
                            <TouchableOpacity style={[styles.primaryButton, styles.successButton]} onPress={handleCompleteDelivery}>
                                <Ionicons name="exit-outline" size={20} color={colors.white} />
                                <Text style={styles.primaryButtonText}>COMPLETE & EXIT PORT</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </Animated.View>
            </View>
        );
    };

    // Layout for in_transit (on the way)
    const renderInTransitLayout = () => (
        <View style={styles.contentContainer}>
            {/* Extra Large Map with Floating Stats Overlay */}
            <TouchableOpacity onPress={handleExpandMap} activeOpacity={0.9}>
                <Animated.View style={styles.mapContainerExtraLarge} entering={FadeInUp.delay(100).duration(400)}>
                    <RouteMap destinationName="Port of Aveiro" />
                    
                    {/* Floating Stats Overlay (Modern Navigation Look) */}
                    <View style={styles.floatingStatsCard}>
                        <View style={styles.statsHeader}>
                            <View style={styles.gateIndicator}>
                                <Ionicons name="log-in" size={16} color={colors.primary} />
                                <Text style={styles.gateText}>GATE {activeArrival?.gate_in_id || '01'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.destinationName}>Port of Aveiro</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                                    {getStatusLabel(deliveryPhase)}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.statsDivider} />
                        
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>DISTANCE</Text>
                                <Text style={styles.statValue}>
                                    {distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}
                                </Text>
                            </View>
                            <View style={styles.statVerticalDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>ETA</Text>
                                <Text style={styles.statValue}>
                                    {distanceKm != null
                                        ? formatTime(new Date(Date.now() + (distanceKm / AVG_APPROACH_SPEED_KMH) * 3600 * 1000).toISOString())
                                        : '—'}
                                </Text>
                            </View>
                            <View style={styles.statVerticalDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>SCHEDULED</Text>
                                <Text style={[styles.statValue, { color: colors.status.delayed }]}>
                                    {formatTime(activeArrival?.scheduled_start_time)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Simulation Overlay */}
                    <View style={styles.simulationOverlay}>
                        <ActivityIndicator size="small" color={colors.white} />
                        <Text style={styles.simulationOverlayText}>Simulating drive...</Text>
                    </View>
                </Animated.View>
            </TouchableOpacity>

            {/* Progress Timeline */}
            <View style={{ marginTop: spacing.md }}>
                {renderProgressTimeline()}
            </View>
        </View>
    );

    // PIN Entry Modal
    const renderPinModal = () => (
        <Modal
            visible={!!selectedForPin}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedForPin(null)}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.gatePopupOverlay}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                    <Animated.View
                        entering={ZoomIn.duration(400)}
                        style={styles.gatePopupContent}
                    >
                        <TouchableOpacity 
                            style={styles.modalCloseIcon} 
                            onPress={() => {
                                setSelectedForPin(null);
                                setPinCode('');
                                setError(null);
                            }}
                        >
                            <Ionicons name="close" size={24} color={colors.text.muted} />
                        </TouchableOpacity>

                        <View style={styles.gatePopupIcon}>
                            <Ionicons name="keypad" size={60} color={colors.primary} />
                        </View>
                        
                        <Text style={styles.gatePopupTitle}>VERIFY</Text>
                        <Text style={styles.gatePopupSubtitle}>Enter Delivery PIN</Text>
                        <Text style={styles.gatePopupInstructions}>
                            For booking: {selectedForPin?.booking_reference}
                        </Text>

                        {error && (
                            <View style={[styles.errorBanner, { width: '100%', marginTop: spacing.md }]}>
                                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <View style={[styles.pinInputContainer, { width: '100%', marginTop: spacing.xl }]}>
                            <TextInput
                                style={styles.pinInput}
                                placeholder="----"
                                placeholderTextColor={colors.text.muted}
                                value={pinCode}
                                onChangeText={setPinCode}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                editable={!isClaiming}
                                maxLength={10}
                                autoFocus={Platform.OS === 'web'}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, { width: '100%', marginTop: spacing.lg }, isClaiming && styles.buttonDisabled]}
                            onPress={handleClaimArrival}
                            disabled={isClaiming}
                        >
                            {isClaiming ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                                    <Text style={styles.primaryButtonText}>CONFIRM & START</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    // PIN Claim Form (Dashboard)
    const renderClaimForm = () => {
        const nextDelivery = assignedDeliveries[0];
        const otherDeliveries = assignedDeliveries.slice(1);

        return (
            <View style={styles.contentContainer}>
                {/* Dashboard Welcome */}
                <Animated.View entering={FadeIn.duration(600)} style={styles.dashboardHeader}>
                    <View>
                        <Text style={styles.dashboardGreeting}>Ready to roll, {driverName.split(' ')[0]}?</Text>
                        <Text style={styles.dashboardSub}>You have {assignedDeliveries.length} deliveries scheduled for today.</Text>
                    </View>
                </Animated.View>

                {/* Daily Summary Row */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={styles.summaryText}>Next: {nextDelivery ? formatTime(nextDelivery.scheduled_start_time) : '--:--'}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Ionicons name="cube-outline" size={16} color={colors.primary} />
                        <Text style={styles.summaryText}>{assignedDeliveries.length} Total</Text>
                    </View>
                </Animated.View>

                {/* Priority Hero Card */}
                <Text style={styles.sectionTitle}>PRIORITY TASK</Text>
                {nextDelivery ? (
                    <TouchableOpacity 
                        onPress={() => { haptics.light(); setSelectedForPin(nextDelivery); }}
                        activeOpacity={0.9}
                    >
                        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.heroCard}>
                            <View style={styles.heroCardHeader}>
                                <View style={styles.heroBadge}>
                                    <Text style={styles.heroBadgeText}>NEXT UP</Text>
                                </View>
                                <Text style={styles.heroTime}>{formatTime(nextDelivery.scheduled_start_time)}</Text>
                            </View>
                            
                            <Text style={styles.heroRef}>{nextDelivery.booking_reference}</Text>
                            <Text style={styles.heroNotes}>{nextDelivery.notes}</Text>
                            
                            <View style={styles.heroFooter}>
                                <View style={styles.heroTag}>
                                    <Ionicons name="location" size={14} color={colors.white} />
                                    <Text style={styles.heroTagText}>Gate {nextDelivery.gate_in_id}</Text>
                                </View>
                                <View style={styles.heroAction}>
                                    <Text style={styles.heroActionText}>START NOW</Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.white} />
                                </View>
                            </View>
                            
                            {/* Visual Decor */}
                            <View style={styles.heroDecor}>
                                <Ionicons name="car-sport" size={100} color="rgba(255, 255, 255, 0.05)" />
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.emptyListText}>No pending deliveries</Text>
                )}

                {/* Other Deliveries List */}
                {otherDeliveries.length > 0 && (
                    <View style={{ marginTop: spacing.lg }}>
                        <Text style={styles.sectionTitle}>UPCOMING SCHEDULE</Text>
                        {otherDeliveries.map((delivery, idx) => (
                            <Animated.View 
                                key={delivery.id} 
                                entering={FadeInDown.delay(300 + (idx * 100)).duration(400)}
                            >
                                <TouchableOpacity 
                                    style={styles.deliveryListItem}
                                    onPress={() => { haptics.light(); setSelectedForPin(delivery); }}
                                >
                                    <View style={styles.deliveryListInfo}>
                                        <View style={styles.deliveryListHeader}>
                                            <Text style={styles.deliveryListRef}>{delivery.booking_reference}</Text>
                                            <Text style={styles.deliveryListTimeSmall}>{formatTime(delivery.scheduled_start_time)}</Text>
                                        </View>
                                        <Text style={styles.deliveryListNotes}>{delivery.notes}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

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
                        <Text style={styles.modalTitle}>Dock {claimResult?.dock_bay_number || 'A-05'}</Text>
                        <Text style={styles.modalSubtitle}>{claimResult?.dock_location || 'North Terminal'}</Text>
                    </View>
                    <View style={{ width: 28 }} />
                </View>

                {/* Large Map */}
                <View style={styles.modalMapContainer}>
                    {deliveryPhase === 'in_port' || deliveryPhase === 'unloading' || deliveryPhase === 'leaving_port' ? (
                        <PortMap
                            key={`modal-${activeArrival?.terminal_id ?? 'default'}`}
                            terminalId={activeArrival?.terminal_id}
                            dockNumber={claimResult?.dock_bay_number || 'A-05'}
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
                                {claimResult?.cargo_description || activeArrival?.notes || 'General Cargo'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.modalInfoRow}>
                        <View style={styles.modalInfoItem}>
                            <Text style={styles.modalInfoLabel}>License Plate</Text>
                            <Text style={styles.modalInfoValue}>{activeArrival?.truck_license_plate || '00-AA-00'}</Text>
                        </View>
                        <View style={styles.modalInfoItem}>
                            <Text style={styles.modalInfoLabel}>Entry Time</Text>
                            <Text style={styles.modalInfoValue}>{formatTime(activeArrival?.scheduled_start_time)}</Text>
                        </View>
                    </View>
                </View>

                {/* Report Problem Button */}
                <TouchableOpacity style={styles.reportButton} onPress={openReportModal}>
                    <Ionicons name="warning-outline" size={20} color="#ef4444" />
                    <Text style={styles.reportButtonText}>Report Problem</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );

    const renderDebugPanel = () => (
        <View style={styles.debugPanelWrapper} pointerEvents="box-none">
            {/* Toggle button */}
            <TouchableOpacity
                style={[styles.debugToggleBtn, isWsConnected && styles.debugToggleBtnActive]}
                onPress={() => setShowDebug(v => !v)}
                activeOpacity={0.8}
            >
                <Ionicons name="bug-outline" size={14} color={isWsConnected ? '#000' : '#fff'} />
                <Text style={[styles.debugToggleBtnText, isWsConnected && { color: '#000' }]}>
                    WS Debug ({debugMessages.length})
                </Text>
                <Ionicons name={showDebug ? 'chevron-down' : 'chevron-up'} size={13} color={isWsConnected ? '#000' : '#fff'} />
            </TouchableOpacity>

            {/* Panel */}
            {showDebug && (
                <View style={styles.debugPanel}>
                    {/* Header row */}
                    <View style={styles.debugHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="wifi" size={14} color={isWsConnected ? '#4ade80' : '#ef4444'} />
                            <Text style={styles.debugHeaderText}>
                                Gate {activeArrival?.gate_in_id ?? '—'} | {isWsConnected ? 'Connected' : 'Disconnected'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setDebugMessages([])}
                            style={styles.debugClearBtn}
                        >
                            <Text style={styles.debugClearBtnText}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Messages */}
                    <ScrollView style={styles.debugScrollView} nestedScrollEnabled>
                        {debugMessages.length === 0 ? (
                            <Text style={styles.debugEmpty}>No WebSocket messages received yet...</Text>
                        ) : (
                            debugMessages.map(msg => (
                                <View key={msg.id} style={styles.debugMessage}>
                                    <Text style={styles.debugMessageMeta}>
                                        {new Date(msg.timestamp).toLocaleTimeString()} — {msg.type}
                                    </Text>
                                    <Text style={styles.debugMessageBody}>
                                        {JSON.stringify(msg.data, null, 2)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
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
                    deliveryPhase === 'in_transit' || deliveryPhase === 'gate_opening'
                        ? renderInTransitLayout()
                        : renderInPortLayout()
                ) : (
                    renderClaimForm()
                )}
            </ScrollView>

            {/* Expanded Map Modal */}
            {renderMapModal()}

            {/* PIN Entry simulated popup */}
            {renderPinModal()}

            {/* Gate opening simulated popup */}
            {renderGatePopup()}

            {/* Infraction warning popup */}
            {renderInfractionPopup()}

            {/* Report a problem to the manager */}
            {renderReportModal()}

            {/* WebSocket Debug Panel (only when EXPO_PUBLIC_DEBUG_MODE=true) */}
            {APP_CONFIG.debugMode && renderDebugPanel()}
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
        paddingTop: spacing.md,
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
        position: 'relative',
    },
    mapContainerExtraLarge: {
        height: 480,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    floatingStatsCard: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        right: spacing.md,
        backgroundColor: colors.background.medium,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 8,
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    gateIndicator: {
        backgroundColor: 'rgba(14, 165, 233, 0.15)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    gateText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
    },
    destinationName: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.text.primary,
    },
    statusBadgeTextSmall: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.text.muted,
        marginTop: 1,
    },
    statsDivider: {
        height: 1,
        backgroundColor: colors.border.light,
        marginBottom: spacing.sm,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 8,
        fontWeight: '600',
        color: colors.text.muted,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    statValue: {
        fontSize: fontSize.sm,
        fontWeight: '700',
        color: colors.text.primary,
    },
    statVerticalDivider: {
        width: 1,
        height: 20,
        backgroundColor: colors.border.light,
    },
    simulationOverlay: {
        position: 'absolute',
        bottom: spacing.md,
        left: spacing.md,
        right: spacing.md,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    simulationOverlayText: {
        color: colors.white,
        fontSize: fontSize.xs,
        fontWeight: '600',
    },
    taskFocusCard: {
        height: 520,
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
        overflow: 'hidden',
    },
    taskFocusHeader: {
        padding: spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    taskFocusBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    taskDivider: {
        height: 1,
        backgroundColor: colors.border.light,
    },
    taskIconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    taskTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text.primary,
        textAlign: 'center',
    },
    taskSubtitle: {
        fontSize: fontSize.md,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 22,
    },
    simulationHint: {
        marginTop: spacing.xs,
        alignItems: 'center',
    },
    simulationHintText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.2)',
        fontStyle: 'italic',
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
    warningButton: {
        backgroundColor: colors.primary,
    },
    infractionWarningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.35)',
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    infractionWarningText: {
        flex: 1,
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: '#ef4444',
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

    // Dashboard Styles
    dashboardHeader: {
        marginBottom: spacing.lg,
    },
    dashboardGreeting: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text.primary,
    },
    dashboardSub: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
        marginTop: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.medium,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    summaryText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text.primary,
    },
    summaryDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border.light,
    },
    heroCard: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    heroCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    heroBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    heroBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: 1,
    },
    heroTime: {
        fontSize: fontSize.lg,
        fontWeight: '800',
        color: colors.white,
    },
    heroRef: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.white,
        marginBottom: 4,
    },
    heroNotes: {
        fontSize: fontSize.md,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        marginBottom: spacing.xl,
    },
    heroFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    heroTagText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.white,
    },
    heroAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    heroActionText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.white,
    },
    heroDecor: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        opacity: 0.5,
    },

    // Delivery Selection List
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.text.muted,
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    deliveryListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    deliveryListInfo: {
        flex: 1,
    },
    deliveryListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    deliveryListRef: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.text.primary,
    },
    deliveryListTimeSmall: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        color: colors.primary,
    },
    deliveryListNotes: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
    },
    emptyListText: {
        color: colors.text.muted,
        fontSize: fontSize.sm,
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: spacing.xl,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: spacing.md,
    },
    backButtonText: {
        fontSize: fontSize.sm,
        color: colors.text.muted,
        fontWeight: '600',
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
        backgroundColor: colors.background.light,
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

    // Gate Popup
    gatePopupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    gatePopupContent: {
        backgroundColor: colors.background.medium,
        borderRadius: borderRadius.xl,
        padding: spacing.xxl,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border.light,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    gatePopupIcon: {
        marginBottom: spacing.lg,
    },
    gatePopupTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.success,
        letterSpacing: 2,
    },
    gatePopupSubtitle: {
        fontSize: fontSize.xl,
        color: colors.text.primary,
        marginTop: spacing.sm,
        fontWeight: '600',
    },
    gatePopupInstructions: {
        fontSize: fontSize.md,
        color: colors.text.secondary,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    // Infraction Popup
    infractionCloseBtn: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        zIndex: 10,
        padding: 4,
    },

    modalCloseIcon: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        padding: 4,
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

    // Report Problem modal
    reportModalContent: {
        backgroundColor: colors.background.medium,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border.light,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    reportModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    reportModalTitle: {
        fontSize: fontSize.xl,
        fontWeight: '800',
        color: colors.text.primary,
    },
    reportModalSubtitle: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
    },
    reportSentBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.md,
    },
    reportSentText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    reportCategoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    reportCategoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
        backgroundColor: colors.background.light,
        flexGrow: 1,
        flexBasis: '46%',
    },
    reportCategoryChipActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(2, 119, 189, 0.12)',
    },
    reportCategoryText: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        flexShrink: 1,
    },
    reportCategoryTextActive: {
        color: colors.text.primary,
    },
    reportLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
        backgroundColor: colors.background.light,
        marginBottom: spacing.md,
    },
    reportLocationText: {
        flex: 1,
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.text.secondary,
    },
    reportNoteInput: {
        minHeight: 72,
        maxHeight: 120,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
        backgroundColor: colors.background.light,
        padding: spacing.md,
        fontSize: fontSize.md,
        color: colors.text.primary,
        textAlignVertical: 'top',
    },
    reportSubmitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        marginTop: spacing.lg,
    },
    reportSubmitText: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.white,
    },

    // WebSocket Debug Panel
    debugPanelWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    debugToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-end',
        backgroundColor: '#374151',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        marginRight: 16,
    },
    debugToggleBtnActive: {
        backgroundColor: '#4ade80',
    },
    debugToggleBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },
    debugPanel: {
        backgroundColor: 'rgba(15, 20, 35, 0.97)',
        borderTopWidth: 2,
        borderTopColor: '#4ade80',
        height: 260,
        flexDirection: 'column',
    },
    debugHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    debugHeaderText: {
        fontSize: 11,
        color: '#9ca3af',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    debugClearBtn: {
        backgroundColor: '#374151',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    debugClearBtnText: {
        fontSize: 10,
        color: '#fff',
    },
    debugScrollView: {
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 6,
    },
    debugEmpty: {
        color: '#6b7280',
        fontSize: 11,
        textAlign: 'center',
        paddingVertical: 20,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    debugMessage: {
        backgroundColor: 'rgba(55, 65, 81, 0.5)',
        borderRadius: 6,
        padding: 8,
        marginBottom: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#4ade80',
    },
    debugMessageMeta: {
        fontSize: 10,
        color: '#9ca3af',
        marginBottom: 3,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    debugMessageBody: {
        fontSize: 10,
        color: '#e5e7eb',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
});
