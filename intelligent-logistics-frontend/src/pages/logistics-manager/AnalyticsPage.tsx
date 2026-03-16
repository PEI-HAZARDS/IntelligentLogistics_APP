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
    MOCK_VOLUME_DATA,
    MOCK_ALERTS_BREAKDOWN,
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
            case "week":
                from.setDate(from.getDate() - 7);
                break;
            case "month":
                from.setMonth(from.getMonth() - 1);
                break;
            case "quarter":
                from.setMonth(from.getMonth() - 3);
                break;
            case "year":
                from.setFullYear(from.getFullYear() - 1);
                break;
        }

        return { from: from.toISOString().split("T")[0], to };
    }, [timeRange]);

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);

        try {
            // -----------------------------------------------------------------
            // DEMO MODE: use frontend mock data directly for presentation.
            //
            // To restore live API mode:
            // 1. Remove the mock block below
            // 2. Uncomment the API block underneath it
            // -----------------------------------------------------------------
            setVolumeData(MOCK_VOLUME_DATA);
            setAlertsBreakdown(MOCK_ALERTS_BREAKDOWN);

            /*
            const { from, to } = getDateRange();

            const [vol, alerts] = await Promise.allSettled([
                getVolumeData(from, to, "day"),
                getAlertsBreakdown(from, to),
            ]);

            if (vol.status === "fulfilled") {
                setVolumeData(vol.value);
            } else {
                console.warn("[Analytics] volume API unavailable — using mock data");
                setVolumeData(MOCK_VOLUME_DATA);
            }

            if (alerts.status === "fulfilled") {
                setAlertsBreakdown(alerts.value);
            } else {
                console.warn("[Analytics] alerts API unavailable — using mock data");
                setAlertsBreakdown(MOCK_ALERTS_BREAKDOWN);
            }
            */
        } catch (err) {
            console.error("Analytics fetch failed:", err);
            setVolumeData(MOCK_VOLUME_DATA);
            setAlertsBreakdown(MOCK_ALERTS_BREAKDOWN);
        } finally {
            setIsLoading(false);
        }
    }, [getDateRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const getGrafanaTimeRange = () => {
        switch (timeRange) {
            case "week":
                return { from: "now-7d", to: "now" };
            case "month":
                return { from: "now-30d", to: "now" };
            case "quarter":
                return { from: "now-90d", to: "now" };
            case "year":
                return { from: "now-1y", to: "now" };
        }
    };

    const grafanaTime = getGrafanaTimeRange();

    const rangeLabels: Record<AnalyticsRange, string> = {
        week: "Week",
        month: "Month",
        quarter: "Quarter",
        year: "Year",
    };

    const congestionLevels = [
        { date: "Mon", total: 28, level: "low" },
        { date: "Tue", total: 34, level: "medium" },
        { date: "Wed", total: 41, level: "medium" },
        { date: "Thu", total: 53, level: "high" },
        { date: "Fri", total: 47, level: "medium" },
        { date: "Sat", total: 22, level: "low" },
        { date: "Sun", total: 18, level: "low" },
    ];

    const maxAlertCount = Math.max(...alertsBreakdown.map((a) => a.count), 1);

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

    // Mock content for Grafana fallbacks
    const maxVolumeValue = Math.max(
        ...volumeData.map((d) => Math.max(d.entries, d.exits)),
        1
    );

    const avgEntries = volumeData.length
        ? Math.round(volumeData.reduce((sum, d) => sum + d.entries, 0) / volumeData.length)
        : 0;

    const avgExits = volumeData.length
        ? Math.round(volumeData.reduce((sum, d) => sum + d.exits, 0) / volumeData.length)
        : 0;

    const carrierMockData = [
        { name: "Atlantic Gate", minutes: 34 },
        { name: "Lusitania Cargo", minutes: 37 },
        { name: "EuroHaul", minutes: 36 },
        { name: "PortoBulk", minutes: 39 },
        { name: "North Dock", minutes: 46 },
        { name: "Tagus Heavy", minutes: 49 },
    ];

    const maxCarrierTime = Math.max(...carrierMockData.map((c) => c.minutes), 1);
    const totalAlerts = alertsBreakdown.reduce((sum, item) => sum + item.count, 0);

    const volumeFallback = (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "0.75rem",
                }}
            >
                <div
                    style={{
                        background: "rgba(59, 130, 246, 0.08)",
                        border: "1px solid rgba(59, 130, 246, 0.18)",
                        borderRadius: "12px",
                        padding: "0.75rem",
                    }}
                >
                    <div style={{ fontSize: "0.75rem", opacity: 0.75 }}>Average entries</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{avgEntries}</div>
                </div>
                <div
                    style={{
                        background: "rgba(16, 185, 129, 0.08)",
                        border: "1px solid rgba(16, 185, 129, 0.18)",
                        borderRadius: "12px",
                        padding: "0.75rem",
                    }}
                >
                    <div style={{ fontSize: "0.75rem", opacity: 0.75 }}>Average exits</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{avgExits}</div>
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "end",
                    gap: "0.5rem",
                    minHeight: 0,
                }}
            >
                {volumeData.slice(-12).map((d, i) => (
                    <div
                        key={`${d.timestamp}-${i}`}
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "end",
                            justifyContent: "center",
                            gap: "3px",
                            height: "100%",
                        }}
                    >
                        <div
                            title={`Entries: ${d.entries}`}
                            style={{
                                width: "42%",
                                height: `${(d.entries / maxVolumeValue) * 100}%`,
                                minHeight: d.entries > 0 ? "8px" : "0",
                                borderRadius: "6px 6px 0 0",
                                background: "#3b82f6",
                                opacity: 0.95,
                            }}
                        />
                        <div
                            title={`Exits: ${d.exits}`}
                            style={{
                                width: "42%",
                                height: `${(d.exits / maxVolumeValue) * 100}%`,
                                minHeight: d.exits > 0 ? "8px" : "0",
                                borderRadius: "6px 6px 0 0",
                                background: "#10b981",
                                opacity: 0.9,
                            }}
                        />
                    </div>
                ))}
            </div>

            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    fontSize: "0.78rem",
                    opacity: 0.8,
                }}
            >
                <span>Blue: Entries</span>
                <span>Green: Exits</span>
            </div>
        </div>
    );

    const avgTimeFallback = (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {carrierMockData.map((carrier) => (
                <div
                    key={carrier.name}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "140px 1fr 48px",
                        gap: "0.75rem",
                        alignItems: "center",
                    }}
                >
                    <span
                        style={{
                            fontSize: "0.8rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {carrier.name}
                    </span>
                    <div
                        style={{
                            height: "10px",
                            borderRadius: "999px",
                            background: "rgba(148, 163, 184, 0.16)",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                height: "100%",
                                width: `${(carrier.minutes / maxCarrierTime) * 100}%`,
                                borderRadius: "999px",
                                background: carrier.minutes >= 45 ? "#f59e0b" : "#3b82f6",
                            }}
                        />
                    </div>
                    <span style={{ fontSize: "0.8rem", textAlign: "right" }}>
                        {carrier.minutes}m
                    </span>
                </div>
            ))}
        </div>
    );

    const alertsFallback = (
        <div
            style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.2fr) minmax(220px, 0.8fr)",
                gap: "1rem",
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {alertsBreakdown.map((a) => (
                    <div
                        key={a.type}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "110px 1fr 60px",
                            gap: "0.75rem",
                            alignItems: "center",
                        }}
                    >
                        <span style={{ fontSize: "0.82rem" }}>
                            {alertTypeLabels[a.type] || a.type}
                        </span>
                        <div
                            style={{
                                height: "10px",
                                borderRadius: "999px",
                                background: "rgba(148, 163, 184, 0.16)",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    height: "100%",
                                    width: `${a.percentage}%`,
                                    borderRadius: "999px",
                                    background: alertTypeColors[a.type] || "#6b7280",
                                }}
                            />
                        </div>
                        <span style={{ fontSize: "0.82rem", textAlign: "right" }}>
                            {a.count}
                        </span>
                    </div>
                ))}
            </div>

            <div
                style={{
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                    borderRadius: "14px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: "0.5rem",
                    background: "rgba(255,255,255,0.02)",
                }}
            >
                <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>Total alerts in range</div>
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>{totalAlerts}</div>
                <div style={{ fontSize: "0.82rem", opacity: 0.8 }}>
                    Predominantly operational, with limited safety incidents.
                </div>
            </div>
        </div>
    );

    return (
        <div className="analytics-page">
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

            <div className="analytics-cards-row">
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
                                    <div
                                        className={`congestion-cell congestion-${c.level}`}
                                        title={`${c.total} movements`}
                                    />
                                    <span className="congestion-label">{c.date}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
                                    <span className="h-bar-label">
                                        {alertTypeLabels[a.type] || a.type}
                                    </span>
                                    <div className="h-bar-track">
                                        <div
                                            className="h-bar-fill"
                                            style={{
                                                width: `${(a.count / maxAlertCount) * 100}%`,
                                                background: alertTypeColors[a.type] || "#6b7280",
                                            }}
                                        />
                                    </div>
                                    <span className="h-bar-value">
                                        {a.count}{" "}
                                        <span className="h-bar-pct">
                                            ({a.percentage.toFixed(0)}%)
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
                            mockContent={volumeFallback}
                        />

                        <GrafanaPanel
                            dashboardUid={DASHBOARD_PANELS.overview.uid}
                            panelId={DASHBOARD_PANELS.overview.avgTimeBar}
                            title="Average Time per Carrier"
                            height={300}
                            from={grafanaTime.from}
                            to={grafanaTime.to}
                            mockContent={avgTimeFallback}
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
                            mockContent={alertsFallback}
                        />
                    </div>
                </>
            )}
        </div>
    );
}