import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Truck, User, Map, Navigation, QrCode, CheckCircle, Loader2, AlertCircle, ChevronUp, ChevronDown, Bug, Wifi } from 'lucide-react';
import ExternalRoute from '@/components/driver/ExternalRoute';
import InternalRoute from '@/components/driver/InternalRoute';
import Sidebar from '@/components/driver/Sidebar';
import { claimArrival, getMyActiveArrival, completeAppointment } from '@/services/drivers';
import { getGateWebSocket, type DecisionUpdatePayload } from '@/lib/websocket';
import type { Appointment } from '@/types/types';
import './driver-layout.css';

type DriverMode = 'external' | 'internal';

const DriverLayout = () => {
    const [mode, setMode] = useState<DriverMode>('external');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

    // User info from localStorage
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const driversLicense = userInfo.drivers_license;
    const driverName = userInfo.name || 'Driver';

    // Claim state
    const [pinCode, setPinCode] = useState('');
    const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
    // Local confirmation state to enforce PIN entry even if API returns active
    const [confirmedArrivalId, setConfirmedArrivalId] = useState<number | null>(() => {
        const saved = localStorage.getItem('confirmed_arrival_id');
        return saved ? parseInt(saved) : null;
    });
    const [isExpanded, setIsExpanded] = useState(true);
    const [showDebug, setShowDebug] = useState(false);
    const [isWsConnected, setIsWsConnected] = useState(false);
    const [debugMessages, setDebugMessages] = useState<Array<{ id: string, timestamp: string, data: any }>>(() => {
        try {
            const saved = localStorage.getItem('ws_payloads');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isClaiming, setIsClaiming] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Decision notification from WebSocket
    const [decisionNotification, setDecisionNotification] = useState<{
        type: 'ACCEPTED' | 'REJECTED';
        licensePlate: string;
        timestamp: string;
    } | null>(null);

    // Auto-dismiss messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Auto-dismiss decision notification
    useEffect(() => {
        if (decisionNotification) {
            const timer = setTimeout(() => setDecisionNotification(null), 10000);
            return () => clearTimeout(timer);
        }
    }, [decisionNotification]);

    // Fetch active appointment
    const fetchActiveAppointment = useCallback(async () => {
        if (!driversLicense) return;
        try {
            const appointment = await getMyActiveArrival(driversLicense);
            setActiveAppointment(appointment);
        } catch (err) {
            console.error('Failed to fetch active appointment:', err);
        }
    }, [driversLicense]);

    // Check auth and fetch data on mount
    useEffect(() => {
        if (!driversLicense) {
            navigate('/login');
        } else {
            fetchActiveAppointment();
        }
    }, [driversLicense, navigate, fetchActiveAppointment]);

    // WebSocket Setup - Use gate from active appointment or default to 1
    useEffect(() => {
        const gateId = activeAppointment?.gate_in?.id || 1;
        const ws = getGateWebSocket(gateId);

        const unsubMessage = ws.onMessage((data: DecisionUpdatePayload) => {
            // Save to localStorage to sync with other tabs/components
            try {
                const saved = localStorage.getItem('ws_payloads');
                const existing = saved ? JSON.parse(saved) : [];
                const newMessages = [{
                    id: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString(),
                    data: data
                }, ...existing].slice(0, 10);

                localStorage.setItem('ws_payloads', JSON.stringify(newMessages));
                window.dispatchEvent(new Event('ws_payload_updated'));
            } catch (e) {
                console.warn('Failed to save payload:', e);
            }

            // Check if this decision is for the driver's active appointment
            const driverPlate = activeAppointment?.truck_license_plate?.toUpperCase();
            const msgPlate = data.payload?.licensePlate?.toUpperCase();
            const decision = data.payload?.decision;

            if (driverPlate && msgPlate && driverPlate === msgPlate) {
                if (decision === 'ACCEPTED' || decision === 'REJECTED') {
                    setDecisionNotification({
                        type: decision,
                        licensePlate: msgPlate,
                        timestamp: new Date().toLocaleTimeString()
                    });
                    // Auto-switch to internal view if accepted
                    if (decision === 'ACCEPTED') {
                        setMode('internal');
                        // Ideally refresh appointment to get updated status
                        fetchActiveAppointment();
                    }
                }
            }
        });

        const unsubConnect = ws.onConnect(() => setIsWsConnected(true));
        const unsubDisconnect = ws.onDisconnect(() => setIsWsConnected(false));

        ws.connect();

        return () => {
            unsubMessage();
            unsubConnect();
            unsubDisconnect();
        };
    }, [activeAppointment?.truck_license_plate, activeAppointment?.gate_in?.id]);

    // Listen for debug message updates
    useEffect(() => {
        const updateMessages = () => {
            try {
                const saved = localStorage.getItem('ws_payloads');
                if (saved) setDebugMessages(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing debug messages:', e);
            }
        };

        window.addEventListener('storage', updateMessages);
        window.addEventListener('ws_payload_updated', updateMessages);

        return () => {
            window.removeEventListener('storage', updateMessages);
            window.removeEventListener('ws_payload_updated', updateMessages);
        };
    }, []);

    // Handle PIN claim
    const handleClaimArrival = useCallback(async () => {
        if (!driversLicense) {
            setError('Session expired. Please log in again.');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }

        if (!pinCode.trim()) {
            setError('Please enter the PIN code.');
            return;
        }

        setIsClaiming(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await claimArrival(driversLicense, {
                arrival_id: pinCode.trim(),
            });

            await fetchActiveAppointment(); // Refresh full details

            // Set local confirmation
            // We need to get the ID from the response or wait for the fetch. 
            // Better to wait for fetch or optimistic update. 
            // Since we await fetchActiveAppointment directly below, let's assume it updates state? 
            // Actually fetchActiveAppointment sets state, but we don't have the new value immediately here in closure.
            // Let's use the result from claim if available, but claim returns ClaimAppointmentResponse which has appointment_id

            // Re-fetch to be safe and use that
            const updated = await getMyActiveArrival(driversLicense);
            setActiveAppointment(updated);

            if (updated && updated.id) {
                setConfirmedArrivalId(updated.id);
                localStorage.setItem('confirmed_arrival_id', updated.id.toString());
                // Auto-switch to internal if authorized
                if (updated.status === 'in_process') {
                    setMode('internal');
                }
            }

            setSuccessMessage('Arrival registered successfully!');
            setPinCode('');
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
    }, [pinCode, driversLicense]);

    // Handle confirm delivery
    const handleConfirmDelivery = useCallback(async () => {
        if (!activeAppointment?.id) return;

        setIsConfirming(true);
        setError(null);

        try {
            await completeAppointment(activeAppointment.id);
            setSuccessMessage('Delivery confirmed successfully!');
            setActiveAppointment(null);
            setConfirmedArrivalId(null);
            localStorage.removeItem('confirmed_arrival_id');
            setMode('external');
        } catch (err) {
            console.error('Failed to confirm delivery:', err);
            setError('Failed to confirm delivery. Please try again.');
        } finally {
            setIsConfirming(false);
        }
    }, [activeAppointment]);

    const renderContent = () => {
        switch (mode) {
            case 'external':
                return (
                    <div className="flex flex-col h-full w-full gap-3">
                        {/* Map Container - Takes available space */}
                        <div className="flex-1 relative w-full overflow-hidden rounded-2xl border border-slate-700/50">
                            <ExternalRoute
                                destination={activeAppointment?.terminal?.name || 'Terminal'}
                                destinationLat={activeAppointment?.terminal?.latitude ? Number(activeAppointment.terminal.latitude) : undefined}
                                destinationLng={activeAppointment?.terminal?.longitude ? Number(activeAppointment.terminal.longitude) : undefined}
                            />

                            {/* PIN Overlay - Centered on Map */}
                            {/* Show if NO active appointment OR (active appointment exists BUT local confirmation mismatch) */}
                            {(!activeAppointment || (activeAppointment && confirmedArrivalId !== activeAppointment.id)) && (
                                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
                                    <div className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl">
                                        <div className="flex flex-col items-center gap-4 mb-6 text-center">
                                            <div className="p-3 bg-blue-500/10 rounded-full">
                                                <QrCode size={32} className="text-blue-500" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Register Arrival</h2>
                                                <p className="text-sm text-slate-400 mt-1">Hello, {driverName}. Enter your PIN to start.</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <input
                                                type="text"
                                                placeholder="Ex: PIN-123"
                                                value={pinCode}
                                                onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-wider focus:outline-none focus:border-blue-500 transition-colors text-white"
                                                disabled={isClaiming}
                                                onKeyDown={(e) => e.key === 'Enter' && handleClaimArrival()}
                                            />
                                            <button
                                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                onClick={handleClaimArrival}
                                                disabled={isClaiming || !pinCode.trim()}
                                            >
                                                {isClaiming ? (
                                                    <>
                                                        <Loader2 size={20} className="animate-spin" />
                                                        <span>Checking...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle size={20} />
                                                        <span>Start Navigation</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Active Appointment details (Collapsible Bottom Sheet) - Only show if confirmed */}
                        {activeAppointment && confirmedArrivalId === activeAppointment.id && (
                            <div className="bg-slate-900 border border-slate-700/50 shadow-xl z-40 transition-all duration-300 ease-in-out rounded-2xl overflow-hidden shrink-0 mb-4">
                                <div className="p-4 flex flex-col gap-4">
                                    {/* Header: Terminal & Toggle */}
                                    <div
                                        className="flex justify-between items-start cursor-pointer"
                                        onClick={() => setIsExpanded(!isExpanded)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <Map size={24} className="text-blue-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg leading-tight">
                                                    {activeAppointment.terminal?.name || 'Port Terminal'}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                                                        {['in_transit', 'delayed'].includes(activeAppointment.status)
                                                            ? 'Gate: Wait for Decision'
                                                            : (activeAppointment.gate_in?.label?.split('-')[0]?.trim() || activeAppointment.id)}
                                                    </span>
                                                    {/* Status Badge */}
                                                    <span className={`text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded ${activeAppointment.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' :
                                                        activeAppointment.status === 'delayed' ? 'bg-amber-500/20 text-amber-400' :
                                                            activeAppointment.status === 'in_process' ? 'bg-green-500/20 text-green-400' :
                                                                activeAppointment.status === 'completed' ? 'bg-slate-500/20 text-slate-400' :
                                                                    'bg-slate-500/20 text-slate-400'
                                                        }`}>
                                                        {activeAppointment.status === 'in_transit' ? '🚛 In Transit' :
                                                            activeAppointment.status === 'delayed' ? '⚠️ Delayed' :
                                                                activeAppointment.status === 'in_process' ? '✅ In Process' :
                                                                    activeAppointment.status === 'completed' ? '✓ Completed' :
                                                                        activeAppointment.status?.toUpperCase() || 'PENDING'}
                                                    </span>
                                                    {/* Arrival Time */}
                                                    <span className="text-xs text-white font-mono bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                                        🕐 {activeAppointment.scheduled_start_time
                                                            ? new Date(activeAppointment.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : '--:--'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                            {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                                        </button>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="h-px bg-slate-800 w-full" />

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Cargo</span>
                                                    <p className="text-sm text-slate-300 font-medium line-clamp-2">
                                                        {activeAppointment.booking?.cargos?.[0]?.description || 'General Cargo'}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Plate</span>
                                                    <p className="text-sm text-white font-mono font-bold tracking-wide">
                                                        {activeAppointment.truck_license_plate}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Arrival Time</span>
                                                    <p className="text-sm text-white font-mono">
                                                        {activeAppointment.scheduled_start_time ? new Date(activeAppointment.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Ref ID</span>
                                                    <p className="text-sm text-slate-400 font-mono">
                                                        {activeAppointment.arrival_id || activeAppointment.id}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'internal':
                return (
                    <InternalRoute
                        appointment={activeAppointment}
                        onConfirmDelivery={handleConfirmDelivery}
                        isConfirming={isConfirming}
                    />
                );
        }
    };

    return (
        <div className="driver-layout">
            {/* Header */}
            <header className="driver-header">
                <div className="header-left">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors text-[var(--icon-color)]"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="logo-section">
                        <Truck className="logo-icon text-blue-500" />
                        <span className="logo-text">Driver App</span>
                    </div>
                </div>
                <div className="header-right">
                    <div className="user-avatar flex items-center justify-center">
                        <User size={18} className="text-white" />
                    </div>
                </div>
            </header>

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                driverName={driverName}
            />

            {/* Alerts */}
            <div className="px-4 pt-2 space-y-2">
                {error && (
                    <div className="alert alert-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="alert alert-success">
                        <CheckCircle size={18} />
                        <span>{successMessage}</span>
                    </div>
                )}
                {/* Decision Notification from Backend */}
                {decisionNotification && (
                    <div
                        className={`decision-notification ${decisionNotification.type === 'ACCEPTED' ? 'accepted' : 'rejected'}`}
                        onClick={() => setDecisionNotification(null)}
                    >
                        <div className="notification-icon">
                            {decisionNotification.type === 'ACCEPTED' ? (
                                <CheckCircle size={32} />
                            ) : (
                                <AlertCircle size={32} />
                            )}
                        </div>
                        <div className="notification-content">
                            <div className="notification-title">
                                {decisionNotification.type === 'ACCEPTED' ? 'Entry Approved!' : 'Entry Rejected'}
                            </div>
                            <div className="notification-details">
                                <span className="plate">{decisionNotification.licensePlate}</span>
                                <span className="time">{decisionNotification.timestamp}</span>
                            </div>
                            <div className="notification-hint">
                                {decisionNotification.type === 'ACCEPTED'
                                    ? 'You may proceed to the terminal'
                                    : 'Please contact the gate operator'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main className="driver-main">
                {renderContent()}
            </main>

            {/* Bottom Navigation Toggle */}
            <div className="bottom-nav">
                <button
                    onClick={() => setMode('external')}
                    className={`nav-button ${mode === 'external' ? 'active' : ''}`}
                >
                    <Map size={24} />
                    <span>To Port</span>
                </button>

                <div className="nav-divider" />

                <button
                    onClick={() => setMode('internal')}
                    className={`nav-button ${mode === 'internal' ? 'active green' : ''}`}
                >
                    <Navigation size={24} />
                    <span>Inside Port</span>
                </button>
            </div>
            {/* Debug Menu */}
            <div style={{
                position: 'fixed',
                bottom: showDebug ? '0' : '-300px',
                left: '0',
                right: '0',
                height: '300px',
                background: 'rgba(15, 20, 35, 0.95)',
                borderTop: '2px solid #4ade80',
                transition: 'bottom 0.3s ease',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
            }}>
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    style={{
                        position: 'absolute',
                        top: '-36px',
                        left: '20px', // Left side to avoid bottom card toggle if it were centered
                        background: showDebug ? '#4ade80' : '#374151',
                        color: showDebug ? '#000' : '#fff',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)'
                    }}
                >
                    <Bug size={16} />
                    Debug ({debugMessages.length})
                    {showDebug ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>

                <div style={{ padding: '12px', overflowY: 'auto', flex: 1, fontFamily: 'monospace', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#9ca3af' }}>
                        <span>
                            <Wifi size={14} style={{ marginRight: '6px', color: isWsConnected ? '#4ade80' : '#ef4444', verticalAlign: 'text-bottom' }} />
                            Gate 1 | {isWsConnected ? 'Connected' : 'Disconnected'}
                        </span>
                        <button
                            onClick={() => { localStorage.removeItem('ws_payloads'); setDebugMessages([]); }}
                            style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px' }}
                        >
                            Clear
                        </button>
                    </div>
                    {debugMessages.map((msg) => (
                        <div key={msg.id} style={{
                            background: 'rgba(55, 65, 81, 0.5)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            marginBottom: '8px',
                            borderLeft: '3px solid #4ade80',
                        }}>
                            <div style={{ color: '#9ca3af', marginBottom: '4px' }}>
                                {new Date(msg.timestamp).toLocaleTimeString()} — {msg.data?.type || 'unknown'}
                            </div>
                            <pre style={{ color: '#e5e7eb', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {JSON.stringify(msg.data?.payload || msg.data, null, 2)}
                            </pre>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DriverLayout;
