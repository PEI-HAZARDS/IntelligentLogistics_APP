import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, AlertTriangle, CheckCircle, Truck, LogOut } from 'lucide-react';
import { getArrivals, getArrivalsStats } from '@/services/arrivals';
import type { Appointment } from '@/types/types';

interface ShiftHandoverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmLogout: () => void;
    shiftName: string;
    shiftEndTime: string;
}

// Map API status to display label
function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        in_transit: 'In Transit',
        delayed: 'Delayed',
        completed: 'Completed',
        canceled: 'Canceled',
    };
    return map[status] || status;
}

export default function ShiftHandoverModal({
    isOpen,
    onClose,
    onConfirmLogout,
    shiftName,
    shiftEndTime,
}: ShiftHandoverModalProps) {
    const [pendingArrivals, setPendingArrivals] = useState<Appointment[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [arrivals, statsData] = await Promise.all([
                getArrivals({ status: 'delayed' }),
                getArrivalsStats(),
            ]);

            // Also get in_transit arrivals
            const inTransit = await getArrivals({ status: 'in_transit' });

            setPendingArrivals([...arrivals, ...inTransit]);
            setStats(statsData);
        } catch (err) {
            console.error('Failed to fetch handover data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const completedCount = stats.completed || 0;
    const delayedCount = pendingArrivals.filter(a => a.status === 'delayed').length;
    const inTransitCount = pendingArrivals.filter(a => a.status === 'in_transit').length;

    // Use portal to render outside of header
    return createPortal(
        <div className="modal-overlay handover-overlay" onClick={onClose}>
            <div className="handover-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <Clock size={20} />
                        <span>Shift Handover</span>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Shift Info */}
                    <div className="shift-info-card">
                        <div className="shift-label">{shiftName}</div>
                        <div className="shift-end">Ends at {shiftEndTime}</div>
                    </div>

                    {/* Stats Summary */}
                    <div className="handover-stats">
                        <div className="stat-item completed">
                            <CheckCircle size={18} />
                            <span className="stat-value">{completedCount}</span>
                            <span className="stat-label">Completed</span>
                        </div>
                        <div className="stat-item delayed">
                            <AlertTriangle size={18} />
                            <span className="stat-value">{delayedCount}</span>
                            <span className="stat-label">Delayed</span>
                        </div>
                        <div className="stat-item transit">
                            <Truck size={18} />
                            <span className="stat-value">{inTransitCount}</span>
                            <span className="stat-label">In Transit</span>
                        </div>
                    </div>

                    {/* Pending Arrivals List */}
                    <div className="pending-section">
                        <h4 className="section-title">
                            <AlertTriangle size={16} />
                            Pending Arrivals ({pendingArrivals.length})
                        </h4>

                        {isLoading ? (
                            <div className="loading-state">Loading...</div>
                        ) : pendingArrivals.length === 0 ? (
                            <div className="empty-state">
                                <CheckCircle size={24} />
                                <span>All arrivals handled! No pending tasks.</span>
                            </div>
                        ) : (
                            <div className="pending-list">
                                {pendingArrivals.map((arrival) => (
                                    <div key={arrival.id} className="pending-item">
                                        <div className="pending-plate">{arrival.truck_license_plate}</div>
                                        <div className="pending-info">
                                            <span className={`status-badge status-${arrival.status.replace('_', '-')}`}>
                                                {getStatusLabel(arrival.status)}
                                            </span>
                                            <span className="pending-time">
                                                {arrival.scheduled_start_time
                                                    ? new Date(arrival.scheduled_start_time).toLocaleTimeString('en-GB', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                    : '--:--'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {pendingArrivals.length > 0 && (
                        <div className="handover-notice">
                            <AlertTriangle size={16} />
                            <span>These arrivals will be transferred to the next shift.</span>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-primary btn-logout" onClick={onConfirmLogout}>
                        <LogOut size={16} />
                        Confirm & Log Out
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
