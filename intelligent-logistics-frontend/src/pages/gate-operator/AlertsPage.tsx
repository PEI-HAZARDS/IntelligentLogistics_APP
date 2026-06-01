import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    messageType?: string;
}

export default function AlertsPage() {
    const navigate = useNavigate();
    const { gateId } = useParams<{ gateId: string }>();
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

            const parsedAlerts: Alert[] = messages
                .map((msg): Alert | null => {
                    // Data is stored flat — no extra .payload wrapper
                    const d = msg.data;
                    if (!d) return null;

                    const msgType: string = d.message_type || "unknown";
                    const plate: string | undefined = d.license_plate || undefined;

                    // ── decision_results ────────────────────────────────────
                    if (msgType === "decision_results" || msgType === "plate_decision") {
                        const decision: string = (d.decision as string)?.toUpperCase() || "–";
                        let type: "warning" | "info" | "danger" = "info";
                        if (decision === "REJECTED") type = "danger";
                        else if (decision === "MANUAL_REVIEW") type = "warning";

                        const alertMessages: string[] = Array.isArray(d.alerts) ? d.alerts : [];
                        const message = alertMessages.length > 0
                            ? alertMessages.join(", ")
                            : d.decision_reason || `Decision: ${decision}`;

                        return {
                            id: msg.id,
                            type,
                            title: `Detection — ${plate ?? "N/A"}`,
                            message,
                            timestamp: new Date(msg.timestamp).toLocaleString("en-GB"),
                            read: false,
                            licensePlate: plate,
                            decision,
                            messageType: msgType,
                        };
                    }

                    // ── infraction_decision ──────────────────────────────────
                    if (msgType === "infraction_decision") {
                        const alertMessages: string[] = Array.isArray(d.alerts) ? d.alerts : [];
                        const message = alertMessages.length > 0
                            ? alertMessages.join(", ")
                            : d.decision_reason || "Infraction recorded";

                        return {
                            id: msg.id,
                            type: "danger",
                            title: `Infraction — ${plate ?? "N/A"}`,
                            message,
                            timestamp: new Date(msg.timestamp).toLocaleString("en-GB"),
                            read: false,
                            licensePlate: plate,
                            messageType: msgType,
                        };
                    }

                    // ── fallback: skip internal/infra messages ───────────────
                    // status_changed is intentionally not surfaced as a notification.
                    if (["status_changed", "scale_network", "ping", "heartbeat"].includes(msgType)) return null;

                    // ── generic fallback for any other message type ───────────
                    const alertMessages: string[] = Array.isArray(d.alerts) ? d.alerts : [];
                    return {
                        id: msg.id,
                        type: "info",
                        title: msgType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                        message: alertMessages.join(", ") || d.decision_reason || "–",
                        timestamp: new Date(msg.timestamp).toLocaleString("en-GB"),
                        read: false,
                        licensePlate: plate,
                        messageType: msgType,
                    };
                })
                .filter((a): a is Alert => a !== null);

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
                <button className="btn-secondary" onClick={() => navigate(`/gate/${gateId || "1"}`)}>
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
                    <div className="empty-state">
                        <Loader2 size={32} className="spin" />
                        <span>Loading alerts...</span>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="empty-state">
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
                                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                                {alert.decision && alert.decision !== "–" && (
                                    <span className={`decision-badge decision-${alert.decision.toLowerCase().replace("_", "-")}`}>
                                        {alert.decision.replace(/_/g, " ")}
                                    </span>
                                )}
                                {alert.messageType && (
                                    <span style={{
                                        fontSize: "0.68rem",
                                        padding: "0.15rem 0.45rem",
                                        borderRadius: "4px",
                                        background: "var(--bg-hover)",
                                        color: "var(--text-muted)",
                                        border: "1px solid var(--border-color)",
                                        fontFamily: "ui-monospace, monospace",
                                    }}>
                                        {alert.messageType}
                                    </span>
                                )}
                                </div>
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

