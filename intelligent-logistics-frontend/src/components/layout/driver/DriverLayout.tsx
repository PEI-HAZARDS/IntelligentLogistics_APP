import { useState, useCallback, useEffect } from 'react';
import { Menu, Truck, User, Map, Navigation, QrCode, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import ExternalRoute from '@/components/driver/ExternalRoute';
import InternalRoute from '@/components/driver/InternalRoute';
import Sidebar from '@/components/driver/Sidebar';
import { claimArrival } from '@/services/drivers';
import type { ClaimAppointmentResponse } from '@/types/types';
import './driver-layout.css';

type DriverMode = 'claim' | 'external' | 'internal';

const DriverLayout = () => {
    const [mode, setMode] = useState<DriverMode>('claim');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // User info from localStorage
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const driversLicense = userInfo.drivers_license;
    const driverName = userInfo.name || 'Driver';

    // Claim state
    const [pinCode, setPinCode] = useState('');
    const [claimResult, setClaimResult] = useState<ClaimAppointmentResponse | null>(null);
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

    // Handle PIN claim
    const handleClaimArrival = useCallback(async () => {
        if (!pinCode.trim() || !driversLicense) {
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

            // Auto-switch to internal navigation after claim
            setMode('internal');
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
            setClaimResult(null);
            setMode('claim');
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
                return <ExternalRoute />;
            case 'internal':
                return (
                    <InternalRoute
                        claimResult={claimResult}
                        onConfirmDelivery={handleConfirmDelivery}
                        isConfirming={isConfirming}
                    />
                );
            case 'claim':
            default:
                return (
                    <div className="flex flex-col gap-4 h-full">
                        {/* PIN Claim Section */}
                        <div className="claim-section">
                            <div className="claim-header">
                                <QrCode size={20} />
                                <h2>Register Arrival</h2>
                            </div>
                            <div className="claim-form">
                                <input
                                    type="text"
                                    placeholder="PIN Code / Arrival ID"
                                    value={pinCode}
                                    onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                                    className="pin-input"
                                    disabled={isClaiming}
                                    onKeyDown={(e) => e.key === 'Enter' && handleClaimArrival()}
                                />
                                <button
                                    className="claim-btn"
                                    onClick={handleClaimArrival}
                                    disabled={isClaiming || !pinCode.trim()}
                                >
                                    {isClaiming ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Registering...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={18} />
                                            Register
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Info Card */}
                        {claimResult ? (
                            <div className="driver-card flex-1 flex flex-col gap-3">
                                <h3 className="font-bold text-lg text-green-400">✓ Arrival Registered</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">License Plate</span>
                                        <span className="font-semibold">{claimResult.license_plate}</span>
                                    </div>
                                    {claimResult.dock_bay_number && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Dock</span>
                                            <span className="font-bold text-blue-400 text-lg">{claimResult.dock_bay_number}</span>
                                        </div>
                                    )}
                                    {claimResult.dock_location && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Location</span>
                                            <span>{claimResult.dock_location}</span>
                                        </div>
                                    )}
                                    {claimResult.cargo_description && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Cargo</span>
                                            <span>{claimResult.cargo_description}</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 mt-4">
                                    Use the tabs below to navigate to the port and then to the dock.
                                </p>
                            </div>
                        ) : (
                            <div className="driver-card flex-1 flex flex-col items-center justify-center text-center">
                                <QrCode size={48} className="text-slate-500 mb-4" />
                                <h3 className="font-bold text-lg mb-2">Welcome, {driverName}</h3>
                                <p className="text-sm text-slate-400">
                                    Enter the PIN code provided to register your arrival and receive navigation instructions.
                                </p>
                            </div>
                        )}
                    </div>
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
                    onClick={() => setMode('claim')}
                    className={`nav-button ${mode === 'claim' ? 'active yellow' : ''}`}
                >
                    <QrCode size={24} />
                    <span>Register</span>
                </button>

                <div className="nav-divider" />

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
