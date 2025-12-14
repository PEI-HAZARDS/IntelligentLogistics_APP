import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Truck, User, Map, Navigation, QrCode, CheckCircle, Loader2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import ExternalRoute from '@/components/driver/ExternalRoute';
import InternalRoute from '@/components/driver/InternalRoute';
import Sidebar from '@/components/driver/Sidebar';
import { claimArrival, getMyActiveArrival } from '@/services/drivers';
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
    const [isExpanded, setIsExpanded] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Auto-dismiss messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

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
        setIsConfirming(true);
        setError(null);

        try {
            // TODO: Call API to confirm delivery / complete visit
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
            setSuccessMessage('Delivery confirmed successfully!');
            setActiveAppointment(null);
            setMode('external');
        } catch (err) {
            console.error('Failed to confirm delivery:', err);
            setError('Failed to confirm delivery. Please try again.');
        } finally {
            setIsConfirming(false);
        }
    }, []);

    const renderContent = () => {
        switch (mode) {
            case 'external':
                return (
                    <div className="flex flex-col h-full w-full gap-3">
                        {/* Map Container - Takes available space */}
                        <div className="flex-1 relative w-full overflow-hidden rounded-2xl border border-slate-700/50">
                            <ExternalRoute
                                destination={activeAppointment?.terminal?.name || undefined}
                                destinationLat={Number(activeAppointment?.terminal?.latitude)}
                                destinationLng={Number(activeAppointment?.terminal?.longitude)}
                            />

                            {/* PIN Overlay - Centered on Map */}
                            {!activeAppointment && (
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

                        {/* Active Appointment details (Collapsible Bottom Sheet) */}
                        {activeAppointment && (
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
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                                                        {activeAppointment.gate_in?.label?.split('-')[0]?.trim() || activeAppointment.id}
                                                    </span>
                                                    <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                                                        <CheckCircle size={10} /> REGISTERED
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
                        claimResult={null} // TODO: refactor InternalRoute to take appointment
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
        </div>
    );
};

export default DriverLayout;
