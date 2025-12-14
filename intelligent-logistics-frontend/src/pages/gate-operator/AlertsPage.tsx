import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Bell,
    AlertTriangle,
    CheckCircle,
    Clock,
    Loader2,
    Trash2,
    RefreshCw,
    X
} from "lucide-react";

interface Alert {
    id: string;
    type: "warning" | "info" | "danger";
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    licensePlate?: string;
    decision?: string;
}

export default function AlertsPage() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread" | "danger" | "warning" | "info">("all");

    // Load alerts from localStorage (ws_payloads)
    const loadAlerts = useCallback(() => {
        try {
            const saved = localStorage.getItem('ws_payloads');
            if (!saved) {
                setAlerts([]);
                return;
            }

            const messages = JSON.parse(saved) as Array<{ id: string; timestamp: string; data: any }>;

            const parsedAlerts: Alert[] = messages.map((msg) => {
                const payload = msg.data?.payload;
                const decision = payload?.decision || "UNKNOWN";
                const licensePlate = payload?.licensePlate || "N/A";

                let type: "warning" | "info" | "danger" = "info";
                if (decision === "REJECTED") type = "danger";
                else if (decision === "MANUAL_REVIEW") type = "warning";

                // Get alerts from payload or create message from decision
                const alertMessages = payload?.alerts || [];
                const alertText = alertMessages.length > 0
                    ? alertMessages.join(", ")
                    : `${decision}: ${licensePlate}`;

                return {
                    id: msg.id,
                    type,
                    title: `Detection - ${licensePlate}`,
                    message: alertText,
                    timestamp: new Date(msg.timestamp).toLocaleString(),
                    read: false,
                    licensePlate,
                    decision,
                };
            });

            // Sort by timestamp descending (newest first)
            parsedAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setAlerts(parsedAlerts);
        } catch (e) {
            console.error("Failed to load alerts:", e);
            setAlerts([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    const handleClearAll = () => {
        localStorage.removeItem('ws_payloads');
        setAlerts([]);
    };

    const handleMarkAllRead = () => {
        setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    };

    const handleRefresh = () => {
        setIsLoading(true);
        loadAlerts();
    };

    const handleDeleteAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
        // Also update localStorage
        try {
            const saved = localStorage.getItem('ws_payloads');
            if (saved) {
                const messages = JSON.parse(saved);
                const filtered = messages.filter((m: any) => m.id !== id);
                localStorage.setItem('ws_payloads', JSON.stringify(filtered));
            }
        } catch (e) {
            console.error("Failed to update storage:", e);
        }
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === "all") return true;
        if (filter === "unread") return !alert.read;
        return alert.type === filter;
    });

    const getAlertIcon = (type: string) => {
        switch (type) {
            case "danger": return <AlertTriangle size={20} />;
            case "warning": return <Clock size={20} />;
            default: return <CheckCircle size={20} />;
        }
    };

    return (
        <div className="alerts-page">
            {/* Header */}
            <div className="page-header">
                <button className="btn-secondary" onClick={() => navigate("/gate")}>
                    <ArrowLeft size={18} />
                    Back to Dashboard
                </button>
                <h1 className="page-title">
                    <Bell size={24} />
                    All Notifications
                </h1>
                <span style={{ color: "var(--text-muted)" }}>
                    {alerts.length} total alerts
                </span>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="filter-select"
                >
                    <option value="all">All Alerts</option>
                    <option value="unread">Unread</option>
                    <option value="danger">Critical</option>
                    <option value="warning">Warnings</option>
                    <option value="info">Info</option>
                </select>

                <button className="btn-icon-only" onClick={handleRefresh} title="Refresh" disabled={isLoading}>
                    {isLoading ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
                </button>

                <div style={{ flex: 1 }} />

                <button className="btn-secondary" onClick={handleMarkAllRead}>
                    Mark All Read
                </button>

                <button className="btn-secondary" onClick={handleClearAll} style={{ color: "var(--danger)" }}>
                    <Trash2 size={16} />
                    Clear All
                </button>
            </div>

            {/* Alerts List */}
            <div className="alerts-list">
                {isLoading ? (
                    <div className="empty-state" style={{ padding: "3rem", textAlign: "center" }}>
                        <Loader2 size={32} className="spin" />
                        <span style={{ marginLeft: "0.5rem" }}>Loading alerts...</span>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="empty-state" style={{ padding: "3rem", textAlign: "center" }}>
                        <Bell size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                        <p>No alerts found.</p>
                    </div>
                ) : (
                    filteredAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`alert-card severity-${alert.type}`}
                            style={{ opacity: alert.read ? 0.7 : 1 }}
                        >
                            <div className="alert-icon" style={{ color: alert.type === "danger" ? "var(--danger)" : alert.type === "warning" ? "var(--warning)" : "var(--success)" }}>
                                {getAlertIcon(alert.type)}
                            </div>
                            <div className="alert-content">
                                <div className="alert-header">
                                    <span className="alert-title">{alert.title}</span>
                                    <span className="alert-time">{alert.timestamp}</span>
                                </div>
                                <p className="alert-message">{alert.message}</p>
                                {alert.decision && (
                                    <span className={`decision-badge decision-${alert.decision.toLowerCase().replace("_", "-")}`} style={{ marginTop: "0.5rem", display: "inline-block" }}>
                                        {alert.decision}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="alert-delete-btn"
                                title="Delete alert"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

