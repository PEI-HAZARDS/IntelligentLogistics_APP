import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, XCircle, Loader2, Search, Truck, Clock } from 'lucide-react';
import { queryArrivalsByLicensePlate, getArrivals } from '@/services/arrivals';
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
    gateId?: number;
}

interface ManualReviewModalProps {
    isOpen: boolean;
    reviewData: ManualReviewData | null;
    onClose: () => void;
    onHold: (data: ManualReviewData) => void;
    onDecisionComplete: (appointmentId: number, decision: 'approved' | 'rejected') => void;
}

export default function ManualReviewModal({
    isOpen,
    reviewData,
    onClose,
    onHold,
    onDecisionComplete,
}: ManualReviewModalProps) {
    const [candidates, setCandidates] = useState<Appointment[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPlate, setSearchPlate] = useState('');

    // Load candidates when modal opens or reviewData changes
    useEffect(() => {
        if (isOpen && reviewData) {
            // Reset state for new review
            setSelectedAppointment(null);
            setNotes('');
            setError(null);

            const plate = reviewData.licensePlate || '';
            setSearchPlate(plate);
            fetchCandidates(plate);
        } else if (!isOpen) {
            // Reset state when closed
            setCandidates([]);
            setSelectedAppointment(null);
            setNotes('');
            setError(null);
            setSearchPlate('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, reviewData?.id]);

    const fetchCandidates = async (plate: string) => {
        setIsLoading(true);
        setError(null);
        try {
            let results: Appointment[] = [];

            if (plate && plate !== 'N/A') {
                // Search by license plate
                results = await queryArrivalsByLicensePlate(plate);
            }

            // If no results or no plate, get today's pending arrivals
            if (results.length === 0) {
                const pending = await getArrivals({ status: 'in_transit', limit: 20 });
                const delayed = await getArrivals({ status: 'delayed', limit: 20 });
                results = [...pending, ...delayed];
            }

            setCandidates(results);
        } catch (err) {
            console.error('Failed to fetch candidates:', err);
            setError('Failed to load appointments. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        if (searchPlate.trim()) {
            fetchCandidates(searchPlate.trim());
        } else {
            fetchCandidates('');
        }
    };

    const handleApprove = async () => {
        if (!selectedAppointment) {
            setError('Please select an appointment first.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            // Get gate ID from reviewData or from localStorage user info
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            const gateId = reviewData?.gateId || userInfo.gate_id || undefined;

            await submitManualReview(selectedAppointment.id, 'approved', notes || undefined, gateId);
            onDecisionComplete(selectedAppointment.id, 'approved');
            onClose();
        } catch (err) {
            console.error('Failed to approve:', err);
            setError('Failed to submit decision. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedAppointment) {
            setError('Please select an appointment first.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await submitManualReview(selectedAppointment.id, 'rejected', notes || undefined);
            onDecisionComplete(selectedAppointment.id, 'rejected');
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
                    {/* Detection Info Section */}
                    <div className="detection-info-section">
                        {/* Crops Row */}
                        <div className="crops-row">
                            {reviewData.lpCropUrl && (
                                <div className="crop-container">
                                    <span className="crop-label">License Plate</span>
                                    <img
                                        src={reviewData.lpCropUrl}
                                        alt="License plate crop"
                                        className="crop-image"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                            {reviewData.hzCropUrl && (
                                <div className="crop-container hazmat">
                                    <span className="crop-label">Hazmat</span>
                                    <img
                                        src={reviewData.hzCropUrl}
                                        alt="Hazmat crop"
                                        className="crop-image"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Detected Data */}
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

                    {/* Notes */}
                    <div className="notes-section">
                        <label className="notes-label">Notes (optional)</label>
                        <textarea
                            className="notes-input"
                            placeholder="Add notes about this decision..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
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
                        disabled={!selectedAppointment || isSubmitting}
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
