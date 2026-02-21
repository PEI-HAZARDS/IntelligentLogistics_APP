import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, XCircle, Loader2, Search, Truck, Clock } from 'lucide-react';
import { getArrivals } from '@/services/arrivals';
import { submitManualReview } from '@/services/decisions';
import type { Appointment } from '@/types/types';

// Props passed from Dashboard
export interface ManualReviewData {
    id: string;
    licensePlate?: string;
    lpCropUrl?: string;
    hzCropUrl?: string;
    UN?: string;
    kemler?: string;
    timestamp: string;
}

interface ManualReviewModalProps {
    isOpen: boolean;
    reviewData: ManualReviewData | null;
    onClose: () => void;
    onHold: (data: ManualReviewData) => void;
    onDecisionComplete: (licensePlate: string, decision: 'approved' | 'rejected') => void;
}

export default function ManualReviewModal({
    isOpen,
    reviewData,
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, reviewData?.id]);

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

            // Apply initial filter if there's a detected plate
            const plate = reviewData?.licensePlate || '';
            if (plate && plate !== 'N/A') {
                const filtered = appointments.filter(apt =>
                    apt.truck_license_plate.toLowerCase().includes(plate.toLowerCase())
                );
                setCandidates(filtered.length > 0 ? filtered : appointments);
            } else {
                setCandidates(appointments);
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

    const handleApprove = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const lp = selectedAppointment?.truck_license_plate || reviewData?.licensePlate || '';

            if (!lp) {
                setError('No license plate detected or manually associated.');
                setIsSubmitting(false);
                return;
            }

            await submitManualReview({
                license_plate: lp,
                decision: 'approved',
                decision_reason: selectedAppointment
                    ? `Operator approved for appointment ${selectedAppointment.id}`
                    : 'Operator approved manually without appointment matching',
                decision_source: 'operator',
                license_crop_url: reviewData?.lpCropUrl || '',
                un: reviewData?.UN || '',
                kemler: reviewData?.kemler || '',
                hazard_crop_url: reviewData?.hzCropUrl || '',
            });
            onDecisionComplete(lp, 'approved');
            onClose();
        } catch (err) {
            console.error('Failed to approve:', err);
            setError('Failed to submit decision. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const lp = selectedAppointment?.truck_license_plate || reviewData?.licensePlate || '';
            const reason = selectedAppointment
                ? `Operator rejected for appointment ${selectedAppointment.id}`
                : 'Entry denied by operator';

            await submitManualReview({
                license_plate: lp,
                decision: 'rejected',
                decision_reason: reason,
                decision_source: 'operator',
                license_crop_url: reviewData?.lpCropUrl || '',
                un: reviewData?.UN || '',
                kemler: reviewData?.kemler || '',
                hazard_crop_url: reviewData?.hzCropUrl || '',
            });
            onDecisionComplete(lp, 'rejected');
            onClose();
        } catch (err) {
            console.error('Failed to reject:', err);
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
                    {/* Detection Info Section - Text Only */}
                    <div className="detection-info-section">
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
                    </div>

                    {/* Search Section */}
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
                        className="btn-reject"
                        onClick={handleReject}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
                        Reject
                    </button>
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
                        className="btn-approve"
                        onClick={handleApprove}
                        disabled={!selectedAppointment || isSubmitting}
                    >
                        {isSubmitting ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                        Approve
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
