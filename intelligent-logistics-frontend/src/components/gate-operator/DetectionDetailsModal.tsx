import { createPortal } from 'react-dom';
import { X, AlertTriangle, Truck, Clock } from 'lucide-react';

interface DetectionDetailsProps {
    isOpen: boolean;
    detection: {
        id: string;
        decision?: 'ACCEPTED' | 'REJECTED' | 'MANUAL_REVIEW';
        licensePlate?: string;
        kemler?: string;
        kemlerDescription?: string;
        UN?: string;
        unDescription?: string;
        time?: string;
        truckId?: string;
        imageUrl?: string;
        lpCropUrl?: string;
        hzCropUrl?: string;
    } | null;
    onClose: () => void;
}

export default function DetectionDetailsModal({
    isOpen,
    detection,
    onClose,
}: DetectionDetailsProps) {
    if (!isOpen || !detection) return null;

    return createPortal(
        <div className="modal-overlay detection-details-overlay" onClick={onClose}>
            <div className="detection-details-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <Truck size={20} />
                        <span>Detection Details</span>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Decision Badge */}
                    <div className="detail-row">
                        <span className="detail-label">Decision</span>
                        <span
                            className={`decision-badge decision-${detection.decision?.toLowerCase().replace('_', '-')}`}
                            style={{ fontSize: '1rem', padding: '0.5rem 1.25rem', borderRadius: '9999px' }}
                        >
                            {detection.decision || 'UNKNOWN'}
                        </span>
                    </div>

                    {/* Time */}
                    {detection.time && (
                        <div className="detail-row">
                            <span className="detail-label">
                                <Clock size={16} style={{ marginRight: '0.5rem' }} />
                                Time
                            </span>
                            <span className="detail-value">{detection.time}</span>
                        </div>
                    )}

                    {/* License Plate */}
                    {detection.licensePlate && (
                        <div className="detail-row">
                            <span className="detail-label">License Plate</span>
                            <span className="detail-value plate-value" style={{ fontFamily: 'monospace', fontSize: '1.25rem' }}>
                                {detection.licensePlate}
                            </span>
                        </div>
                    )}

                    {/* Crops Row */}
                    {(detection.lpCropUrl || detection.hzCropUrl) && (
                        <div className="crops-row" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                            {detection.lpCropUrl && (
                                <div className="crop-container">
                                    <span className="crop-label">License Plate Crop</span>
                                    <img
                                        src={detection.lpCropUrl}
                                        alt="License plate"
                                        className="crop-image"
                                        style={{ maxHeight: '120px', borderRadius: '8px' }}
                                    />
                                </div>
                            )}
                            {detection.hzCropUrl && (
                                <div className="crop-container hazmat">
                                    <span className="crop-label">Hazmat Crop</span>
                                    <img
                                        src={detection.hzCropUrl}
                                        alt="Hazmat placard"
                                        className="crop-image"
                                        style={{ maxHeight: '120px', borderRadius: '8px' }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hazmat Info */}
                    {(detection.UN || detection.kemler) && (
                        <div className="hazmat-section">
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0', color: '#f59e0b', fontWeight: 600 }}>
                                <AlertTriangle size={18} />
                                Hazardous Materials
                            </h4>

                            {detection.UN && (
                                <div className="detail-row">
                                    <span className="detail-label">UN Number</span>
                                    <span className="detail-value">{detection.UN}</span>
                                    {detection.unDescription && (
                                        <span className="detail-description" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                            {detection.unDescription}
                                        </span>
                                    )}
                                </div>
                            )}

                            {detection.kemler && (
                                <div className="detail-row" style={{ marginTop: '0.75rem' }}>
                                    <span className="detail-label">Kemler Code</span>
                                    <span className="detail-value">{detection.kemler}</span>
                                    {detection.kemlerDescription && (
                                        <span className="detail-description" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                            {detection.kemlerDescription}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Truck ID */}
                    {detection.truckId && (
                        <div className="detail-row" style={{ marginTop: '1rem' }}>
                            <span className="detail-label">Truck ID</span>
                            <span className="detail-value" style={{ fontFamily: 'monospace' }}>{detection.truckId}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
