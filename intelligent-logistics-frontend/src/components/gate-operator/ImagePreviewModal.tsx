import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';

interface ImagePreviewModalProps {
    isOpen: boolean;
    imageUrl: string | null;
    title?: string;
    onClose: () => void;
}

export default function ImagePreviewModal({
    isOpen,
    imageUrl,
    title,
    onClose,
}: ImagePreviewModalProps) {
    if (!isOpen || !imageUrl) return null;

    return createPortal(
        <div className="modal-overlay image-preview-overlay" onClick={onClose}>
            <div className="image-preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="preview-header">
                    <span className="preview-title">
                        <ZoomIn size={18} />
                        {title || 'Image Preview'}
                    </span>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="preview-body">
                    <img
                        src={imageUrl}
                        alt={title || 'Preview'}
                        className="preview-image"
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
