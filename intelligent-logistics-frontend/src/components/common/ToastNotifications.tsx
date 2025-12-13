/**
 * Toast notification system for real-time alerts
 */
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, X, Bell } from 'lucide-react';
import './ToastNotifications.css';

export interface Toast {
    id: string;
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    imageUrl?: string;
    autoClose?: boolean;
}

interface ToastNotificationsProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

export function ToastNotifications({ toasts, onDismiss }: ToastNotificationsProps) {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    useEffect(() => {
        if (toast.autoClose !== false) {
            const timer = setTimeout(() => {
                onDismiss(toast.id);
            }, 8000); // Auto-dismiss after 8 seconds

            return () => clearTimeout(timer);
        }
    }, [toast.id, toast.autoClose, onDismiss]);

    const Icon = {
        success: CheckCircle,
        warning: AlertTriangle,
        danger: AlertTriangle,
        info: Info,
    }[toast.type];

    return (
        <div className={`toast-item toast-${toast.type}`}>
            <div className="toast-icon">
                <Icon size={20} />
            </div>
            <div className="toast-content">
                <div className="toast-header">
                    <span className="toast-title">{toast.title}</span>
                    <span className="toast-time">
                        {toast.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <p className="toast-message">{toast.message}</p>
                {toast.imageUrl && (
                    <div className="toast-image">
                        <img src={toast.imageUrl} alt="Detection" />
                    </div>
                )}
            </div>
            <button className="toast-close" onClick={() => onDismiss(toast.id)}>
                <X size={16} />
            </button>
        </div>
    );
}

// Hook to manage toasts
export function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id' | 'timestamp'>) => {
        const newToast: Toast = {
            ...toast,
            id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
        };
        setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Max 5 toasts
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setToasts([]);
    }, []);

    return { toasts, addToast, dismissToast, clearAll };
}

export default ToastNotifications;
