/**
 * KPI Card Component
 * Displays a single metric with optional status badge
 * Change trend is only shown when real data is provided
 */
import { ArrowUp, ArrowDown } from "lucide-react";

interface KPICardProps {
    /** Card title */
    title: string;
    /** Main value to display */
    value: string | number;
    /** Unit suffix (optional, e.g., "min", "%") */
    unit?: string;
    /** Change percentage vs previous period (only show if provided from API) */
    change?: number;
    /** Status badge: 'ok' | 'warning' | 'danger' */
    status?: "ok" | "warning" | "danger";
    /** Status label text */
    statusLabel?: string;
    /** Loading state */
    isLoading?: boolean;
}

export default function KPICard({
    title,
    value,
    unit,
    change,
    status,
    statusLabel,
    isLoading = false,
}: KPICardProps) {
    if (isLoading) {
        return (
            <div className="kpi-card kpi-card-loading">
                <div className="kpi-header">
                    <span className="kpi-title">{title}</span>
                </div>
                <div className="kpi-value kpi-value-placeholder">--</div>
            </div>
        );
    }

    return (
        <div className="kpi-card">
            <div className="kpi-header">
                <span className="kpi-title">{title}</span>
                {status && statusLabel && (
                    <span className={`kpi-badge ${status}`}>{statusLabel}</span>
                )}
            </div>
            <div className="kpi-value">
                {value}
                {unit && <span className="kpi-unit">{unit}</span>}
            </div>
            {change !== undefined && change !== null && (
                <div className={`kpi-change ${change >= 0 ? "positive" : "negative"}`}>
                    {change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    <span>{change >= 0 ? "+" : ""}{change.toFixed(1)}% vs. período anterior</span>
                </div>
            )}
        </div>
    );
}
