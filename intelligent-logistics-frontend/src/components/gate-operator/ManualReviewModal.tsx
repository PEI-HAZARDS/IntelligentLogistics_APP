import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, XCircle, Loader2, Search, Truck, Clock } from 'lucide-react';
import { getArrivals } from '@/services/arrivals';
import { submitManualReview } from '@/services/decisions';
import type { Appointment } from '@/types/types';
import type { DecisionUpdatePayload } from '@/lib/websocket';

// Props passed from Dashboard
export interface ManualReviewData {
    id: string;
    licensePlate?: string;
    lpCropUrl?: string;
    hzCropUrl?: string;
    UN?: string;
    kemler?: string;
    timestamp: string;
    truckId?: string;
    /** Full original WS payload — used to forward all fields on submission */
    originalPayload?: DecisionUpdatePayload;
}

interface ManualReviewModalProps {
    isOpen: boolean;
    reviewData: ManualReviewData | null;
    gateId?: string;
    onClose: () => void;
    onHold: (data: ManualReviewData) => void;
    onDecisionComplete: (licensePlate: string, decision: 'accepted' | 'rejected') => void;
}

export default function ManualReviewModal({
    isOpen,
    reviewData,
    gateId,
    onClose,
    onHold,
    onDecisionComplete,
}: ManualReviewModalProps) {
    const [candidates, setCandidates] = useState<Appointment[]>([]);
    const [allCandidates, setAllCandidates] = useState<Appointment[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPlate, setSearchPlate] = useState('');
    const [pendingDecision, setPendingDecision] = useState<'accepted' | 'rejected' | null>(null);
    const [infractions, setInfractions] = useState<Appointment[]>([]);
    const isInfractionCase = reviewData?.licensePlate === 'N/A' || !reviewData?.licensePlate;

    // Load candidates when modal opens or reviewData changes
    useEffect(() => {
        if (isOpen && reviewData) {
            // Reset state for new review
            setSelectedAppointment(null);
            setError(null);

            const plate = reviewData.licensePlate || '';
            setSearchPlate(plate);
            fetchAllCandidates();
        } else if (!isOpen) {
            // Reset state when closed
            setCandidates([]);
            setAllCandidates([]);
            setSelectedAppointment(null);
            setError(null);
            setSearchPlate('');
            setPendingDecision(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, reviewData?.id]);

    // Handle ESC key to close modal with auto-hold
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && reviewData) {
                e.preventDefault();
                onHold(reviewData);
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, reviewData, onHold, onClose]);

    // Filter candidates when search changes (client-side, like ArrivalsList)
    useEffect(() => {
        if (allCandidates.length > 0) {
            if (searchPlate.trim()) {
                const filtered = allCandidates.filter(apt =>
                    apt.truck_license_plate.toLowerCase().includes(searchPlate.toLowerCase())
                );
                setCandidates(filtered);
            } else {
                setCandidates(allCandidates);
            }
        }
    }, [searchPlate, allCandidates]);

    const fetchAllCandidates = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch all in_transit arrivals (like ArrivalsList does)
            const results = await getArrivals({ status: 'in_transit', limit: 100 });
            const appointments = results.items || [];
            setAllCandidates(appointments);

            // Check for infractions
            const infractions = appointments.filter(apt => apt.highway_infraction === true);
            setInfractions(infractions);

            // Apply initial filter if there's a detected plate
            const plate = reviewData?.licensePlate || '';
            if (plate && plate !== 'N/A') {
                const filtered = appointments.filter(apt =>
                    apt.truck_license_plate.toLowerCase().includes(plate.toLowerCase())
                );
                setCandidates(filtered.length > 0 ? filtered : appointments);
            } else {
                // For unknown plate (infraction case), show infractions first
                if (infractions.length > 0) {
                    setCandidates(infractions);
                    // Auto-select first infraction
                    setSelectedAppointment(infractions[0]);
                } else {
                    setCandidates(appointments);
                }
            }
        } catch (err) {
            console.error('Failed to fetch candidates:', err);
            setError('Failed to load appointments. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        // Client-side filtering is now done automatically via useEffect
        // This function just triggers the filter by making sure searchPlate is set
        // The actual filtering happens in the useEffect above
    };

    const submitDecision = async (decision: 'accepted' | 'rejected') => {
        setIsSubmitting(true);
        setError(null);
        try {
            const lp = (selectedAppointment?.truck_license_plate || reviewData?.licensePlate || '').toUpperCase();
            const orig = reviewData?.originalPayload;
            const isApprove = decision === 'accepted';
            const rejectReason = selectedAppointment
                ? `OPERATOR_REJECTED_FOR_APPOINTMENT_${selectedAppointment.id}`
                : 'OPERATOR_REJECTED';

            await submitManualReview({
                gate_id: gateId || String(orig?.gate_id || 1),
                // Preserve every field from the original agent-decision payload
                license_plate: lp,
                license_crop_url: orig?.license_crop_url || reviewData?.lpCropUrl || '',
                un: orig?.un || reviewData?.UN || '',
                kemler: orig?.kemler || reviewData?.kemler || '',
                hazard_crop_url: orig?.hazard_crop_url || reviewData?.hzCropUrl || '',
                alerts: orig?.alerts,
                route: orig?.route || '',
                truck_id: reviewData?.truckId,
                // Override only the decision fields
                decision: isApprove ? 'ACCEPTED' : 'REJECTED',
                decision_reason: isApprove
                    ? `OPERATOR_ACCEPTED_FOR_APPOINTMENT_${selectedAppointment?.id || 'UNKNOWN'}`
                    : rejectReason,
                decision_source: 'operator',
            });
            onDecisionComplete(lp, decision);
            setPendingDecision(null);
            onClose();
        } catch (err) {
            console.error('Failed to submit manual review decision:', err);
            setError('Failed to submit decision. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !reviewData) return null;

    return createPortal(
        <div className="modal-overlay manual-review-overlay" onClick={onClose}>
            <div className="manual-review-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <AlertTriangle size={20} className="warning-icon" />
                        <span>Manual Review Required</span>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Detection Info Section - Text Only OR Infraction Info */}
                    <div className="detection-info-section">
                        {isInfractionCase && infractions.length > 0 ? (
                            <div className="infraction-banner">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div style={{
                                        background: '#f59e0b',
                                        color: 'white',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                    }}>HIGHWAY INFRACTION</div>
                                </div>
                                <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                                    <strong>Wrong way with break of street rules</strong>
                                </p>
                                {selectedAppointment && (
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0' }}>
                                        <strong>License Plate:</strong> {selectedAppointment.truck_license_plate}
                                        {selectedAppointment.notes && (
                                            <>
                                                <br />
                                                <strong>Details:</strong> {selectedAppointment.notes}
                                            </>
                                        )}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="detected-data">
                                <div className="data-field">
                                    <span className="field-label">Detected Plate:</span>
                                    <span className="field-value plate-value">
                                        {reviewData.licensePlate || 'Not detected'}
                                    </span>
                                </div>
                                {reviewData.UN && (
                                    <div className="data-field">
                                        <span className="field-label">UN:</span>
                                        <span className="field-value">{reviewData.UN}</span>
                                    </div>
                                )}
                                {reviewData.kemler && (
                                    <div className="data-field">
                                        <span className="field-label">Kemler:</span>
                                        <span className="field-value">{reviewData.kemler}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Search Section - Hidden for infractions */}
                    {!isInfractionCase && (
                        <div className="search-section">
                            <div className="search-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Search by license plate..."
                                    value={searchPlate}
                                    onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="search-input"
                                />
                                <button className="search-btn" onClick={handleSearch} disabled={isLoading}>
                                    <Search size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Candidates List */}
                    <div className="candidates-section">
                        <h4 className="section-subtitle">
                            <Truck size={16} />
                            Select Appointment ({candidates.length})
                        </h4>

                        {isLoading ? (
                            <div className="loading-state">
                                <Loader2 size={20} className="spin" />
                                <span>Loading appointments...</span>
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="empty-state">
                                <span>No matching appointments found.</span>
                            </div>
                        ) : (
                            <div className="candidates-list custom-scrollbar">
                                {candidates.map((apt) => (
                                    <div
                                        key={apt.id}
                                        className={`candidate-item ${selectedAppointment?.id === apt.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedAppointment(apt)}
                                    >
                                        <div className="candidate-main">
                                            <span className="candidate-plate">{apt.truck_license_plate}</span>
                                            <span className={`status-badge status-${apt.status.replace('_', '-')}`}>
                                                {apt.status === 'in_transit' ? 'In Transit' : apt.status}
                                            </span>
                                        </div>
                                        <div className="candidate-details">
                                            <span>Booking: {apt.booking?.reference || apt.booking_reference}</span>
                                            <span>
                                                {apt.scheduled_start_time
                                                    ? new Date(apt.scheduled_start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                                    : '--:--'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>



                    {error && (
                        <div className="error-message">
                            <AlertTriangle size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        className="btn-hold"
                        onClick={() => {
                            if (reviewData) onHold(reviewData);
                            onClose();
                        }}
                        disabled={isSubmitting}
                        title="Hold and check camera feed"
                    >
                        <Clock size={16} />
                        Hold
                    </button>
                    <button
                        className="btn-reject"
                        onClick={() => setPendingDecision('rejected')}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
                        Reject
                    </button>
                    <button
                        className="btn-approve"
                        onClick={() => setPendingDecision('accepted')}
                        disabled={!selectedAppointment || isSubmitting}
                    >
                        {isSubmitting ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                        Approve
                    </button>
                </div>

                {pendingDecision && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(2, 6, 23, 0.78)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 40,
                            padding: '1rem',
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                maxWidth: '430px',
                                background: 'rgba(15, 23, 42, 0.98)',
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                borderRadius: '12px',
                                padding: '1rem',
                                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {pendingDecision === 'accepted' ? <CheckCircle size={18} color="#22c55e" /> : <XCircle size={18} color="#f87171" />}
                                <strong style={{ color: '#e2e8f0' }}>
                                    Confirm {pendingDecision === 'accepted' ? 'Approve' : 'Reject'}
                                </strong>
                            </div>

                            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.85rem' }}>
                                Plate: <strong>{(selectedAppointment?.truck_license_plate || reviewData.licensePlate || 'N/A').toUpperCase()}</strong>
                            </p>

                            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1rem' }}>
                                {pendingDecision === 'accepted'
                                    ? 'This will submit ACCEPTED and close this review.'
                                    : 'This will submit REJECTED and close this review.'}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                                <button
                                    className="btn-hold"
                                    onClick={() => setPendingDecision(null)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={pendingDecision === 'accepted' ? 'btn-approve' : 'btn-reject'}
                                    onClick={() => submitDecision(pendingDecision)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 size={16} className="spin" /> : null}
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
