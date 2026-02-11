/**
 * Analytics Page
 * Detailed analysis: Grafana panels + API-driven analytics cards
 * (congestion heatmap, delay breakdown, gate throughput)
 */
import { useState, useEffect, useCallback } from "react";
import {
    RefreshCw,
    Thermometer,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import GrafanaPanel, { DASHBOARD_PANELS } from "@/components/logistics-manager/GrafanaPanel";
import {
    getVolumeData,
    getAlertsBreakdown,
    type VolumeDataPoint,
    type AlertsBreakdown,
} from "@/services/statistics";

type AnalyticsRange = "week" | "month" | "quarter" | "year";

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState<AnalyticsRange>("month");
    const [isLoading, setIsLoading] = useState(false);
    const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
    const [alertsBreakdown, setAlertsBreakdown] = useState<AlertsBreakdown[]>([]);

    const getDateRange = useCallback(() => {
        const to = new Date().toISOString().split("T")[0];
        const from = new Date();
        switch (timeRange) {
            case "week": from.setDate(from.getDate() - 7); break;
            case "month": from.setMonth(from.getMonth() - 1); break;
            case "quarter": from.setMonth(from.getMonth() - 3); break;
            case "year": from.setFullYear(from.getFullYear() - 1); break;
        }
        return { from: from.toISOString().split("T")[0], to };
    }, [timeRange]);

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);
        try {
            const { from, to } = getDateRange();
            const [vol, alerts] = await Promise.allSettled([
                getVolumeData(from, to, "day"),
                getAlertsBreakdown(from, to),
            ]);
            if (vol.status === "fulfilled") setVolumeData(vol.value);
            if (alerts.status === "fulfilled") setAlertsBreakdown(alerts.value);
        } catch (err) {
            console.error("Analytics fetch failed:", err);
        } finally {
            setIsLoading(false);
        }
    }, [getDateRange]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    // Grafana time range
    const getGrafanaTimeRange = () => {
        switch (timeRange) {
            case "week": return { from: "now-7d", to: "now" };
            case "month": return { from: "now-30d", to: "now" };
            case "quarter": return { from: "now-90d", to: "now" };
            case "year": return { from: "now-1y", to: "now" };
        }
    };
    const grafanaTime = getGrafanaTimeRange();

    const rangeLabels: Record<AnalyticsRange, string> = {
        week: "Week",
        month: "Month",
        quarter: "Quarter",
        year: "Year",
    };

    // Build congestion heatmap data (7 days × 4 time slots)
    const lastSevenDays = volumeData.slice(-7);
    const congestionLevels = lastSevenDays.map((d) => {
        const total = d.entries + d.exits;
        const level = total > 50 ? "high" : total > 25 ? "medium" : total > 0 ? "low" : "none";
        return {
            date: new Date(d.timestamp).toLocaleDateString("en-GB", { weekday: "short" }),
            total,
            level,
        };
    });

    // Delay breakdown horizontal bars
    const maxAlertCount = Math.max(...alertsBreakdown.map(a => a.count), 1);

    // Gate throughput (mock from volume data as entries/exits per day)
    const last7Volume = volumeData.slice(-7);
    const totalEntries = last7Volume.reduce((s, d) => s + d.entries, 0);
    const totalExits = last7Volume.reduce((s, d) => s + d.exits, 0);

    const alertTypeLabels: Record<string, string> = {
        safety: "Safety",
        problem: "Problem",
        operational: "Operational",
        generic: "General",
    };

    const alertTypeColors: Record<string, string> = {
        safety: "#ef4444",
        problem: "#f59e0b",
        operational: "#3b82f6",
        generic: "#8b5cf6",
    };

    return (
        <div className="analytics-page">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Analytics</h1>
                    <span className="dashboard-subtitle">
                        Detailed metrics and operational performance indicators
                    </span>
                </div>
                <div className="dashboard-filters">
                    {(["week", "month", "quarter", "year"] as AnalyticsRange[]).map((range) => (
                        <button
                            key={range}
                            className={`filter-btn ${timeRange === range ? "active" : ""}`}
                            onClick={() => setTimeRange(range)}
                        >
                            {rangeLabels[range]}
                        </button>
                    ))}
                    <button
                        className="filter-btn"
                        onClick={fetchAnalytics}
                        disabled={isLoading}
                        title="Refresh data"
                    >
                        <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
                    </button>
                </div>
            </div>

            {/* Analytics Cards Row */}
            <div className="analytics-cards-row">
                {/* Congestion Heatmap */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <Thermometer size={18} />
                        <h3>Congestion Indicator</h3>
                    </div>
                    {congestionLevels.length === 0 ? (
                        <div className="analytics-card-empty">No data available</div>
                    ) : (
                        <div className="congestion-grid">
                            {congestionLevels.map((c, i) => (
                                <div key={i} className="congestion-cell-wrapper">
                                    <div className={`congestion-cell congestion-${c.level}`} title={`${c.total} movements`} />
                                    <span className="congestion-label">{c.date}</span>
                                </div>
                            ))}
                            <div className="congestion-legend">
                                <span className="congestion-legend-item"><span className="congestion-dot congestion-low" /> Low</span>
                                <span className="congestion-legend-item"><span className="congestion-dot congestion-medium" /> Moderate</span>
                                <span className="congestion-legend-item"><span className="congestion-dot congestion-high" /> High</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delay/Alerts Breakdown */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <TrendingDown size={18} />
                        <h3>Alerts Distribution</h3>
                    </div>
                    {alertsBreakdown.length === 0 ? (
                        <div className="analytics-card-empty">No alert data</div>
                    ) : (
                        <div className="h-bars">
                            {alertsBreakdown.map((a) => (
                                <div key={a.type} className="h-bar-row">
                                    <span className="h-bar-label">{alertTypeLabels[a.type] || a.type}</span>
                                    <div className="h-bar-track">
                                        <div
                                            className="h-bar-fill"
                                            style={{
                                                width: `${(a.count / maxAlertCount) * 100}%`,
                                                background: alertTypeColors[a.type] || "#6b7280",
                                            }}
                                        />
                                    </div>
                                    <span className="h-bar-value">{a.count} <span className="h-bar-pct">({a.percentage.toFixed(0)}%)</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Gate Throughput */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <ArrowUpRight size={18} />
                        <h3>Throughput ({rangeLabels[timeRange]})</h3>
                    </div>
                    <div className="throughput-summary">
                        <div className="throughput-stat">
                            <ArrowUpRight size={20} className="throughput-icon entries" />
                            <div>
                                <span className="throughput-value">{totalEntries}</span>
                                <span className="throughput-label">Entries</span>
                            </div>
                        </div>
                        <div className="throughput-divider" />
                        <div className="throughput-stat">
                            <ArrowDownRight size={20} className="throughput-icon exits" />
                            <div>
                                <span className="throughput-value">{totalExits}</span>
                                <span className="throughput-label">Exits</span>
                            </div>
                        </div>
                        <div className="throughput-divider" />
                        <div className="throughput-stat">
                            <div>
                                <span className="throughput-value">{totalEntries + totalExits}</span>
                                <span className="throughput-label">Total Movements</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grafana deep-dive charts */}
            {!isLoading && (
                <>
                    <div className="charts-grid charts-grid-equal">
                        <GrafanaPanel
                            dashboardUid={DASHBOARD_PANELS.overview.uid}
                            panelId={DASHBOARD_PANELS.overview.volumeChart}
                            title="Volume Evolution (Entries vs Exits)"
                            height={300}
                            from={grafanaTime.from}
                            to={grafanaTime.to}
                        />
                        <GrafanaPanel
                            dashboardUid={DASHBOARD_PANELS.overview.uid}
                            panelId={DASHBOARD_PANELS.overview.avgTimeBar}
                            title="Average Time per Carrier"
                            height={300}
                            from={grafanaTime.from}
                            to={grafanaTime.to}
                        />
                    </div>

                    <div className="charts-grid charts-grid-full">
                        <GrafanaPanel
                            dashboardUid={DASHBOARD_PANELS.overview.uid}
                            panelId={DASHBOARD_PANELS.overview.alertsDonut}
                            title="Alert Distribution by Type"
                            height={280}
                            from={grafanaTime.from}
                            to={grafanaTime.to}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
