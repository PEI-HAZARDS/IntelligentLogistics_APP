/**
 * KPI Card Component
 * Displays a single metric with optional trend indicator
 */
import { ArrowUp, ArrowDown } from "lucide-react";

interface KPICardProps {
    /** Card title */
    title: string;
    /** Main value to display */
    value: string | number;
    /** Unit suffix (optional, e.g., "min", "%") */
    unit?: string;
    /** Change percentage (positive = increase) */
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
    const formatChange = (val: number) => {
        const sign = val >= 0 ? "+" : "";
        return `${sign}${val.toFixed(1)}%`;
    };

    if (isLoading) {
        return (
            <div className="kpi-card">
                <div className="kpi-header">
                    <span className="kpi-title">{title}</span>
                </div>
                <div className="kpi-value" style={{ opacity: 0.3 }}>--</div>
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
                {unit && <span style={{ fontSize: '0.6em', marginLeft: '0.25rem' }}>{unit}</span>}
            </div>
            {change !== undefined && (
                <div className={`kpi-change ${change >= 0 ? "positive" : "negative"}`}>
                    {change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    <span>{formatChange(change)} vs. last period</span>
                </div>
            )}
        </div>
    );
}
