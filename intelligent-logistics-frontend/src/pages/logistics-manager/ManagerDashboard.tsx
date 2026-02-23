/**
 * Manager Dashboard Page
 * Port logistics overview: KPIs, active alerts feed, and today's operations mini-chart.
 * Grafana charts live in the Analytics tab for detailed analysis.
 */
import { useState, useEffect, useCallback } from "react";
import {
    Download,
    RefreshCw,
    AlertTriangle,
    Shield,
    AlertCircle,
    Activity,
    Truck,
    Clock,
    CheckCircle,
    Gauge,
} from "lucide-react";
import KPICard from "@/components/logistics-manager/KPICard";
import {
    getDashboardSummary,
    getVolumeData,
    type DashboardSummary,
    type VolumeDataPoint,
} from "@/services/statistics";
import { getActiveAlerts } from "@/services/alerts";
import type { Alert } from "@/types/types";
import { exportToPDF, exportToCSV } from "@/services/exportService";

type TimeRange = "today" | "week" | "month" | "year";

// Alert type → icon + color map
const alertConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    safety: { icon: <Shield size={16} />, color: "#ef4444", label: "Safety" },
    problem: { icon: <AlertCircle size={16} />, color: "#f59e0b", label: "Problem" },
    operational: { icon: <Activity size={16} />, color: "#3b82f6", label: "Operational" },
    generic: { icon: <AlertTriangle size={16} />, color: "#8b5cf6", label: "General" },
};

export default function ManagerDashboard() {
    const [timeRange, setTimeRange] = useState<TimeRange>("today");
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [fetchError, setFetchError] = useState(false);

    // Fetch all dashboard data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setFetchError(false);
        try {
            const [summaryData, alertsData, volumeResult] = await Promise.allSettled([
                getDashboardSummary(),
                getActiveAlerts(5),
                getVolumeData(undefined, undefined, "hour"),
            ]);

            if (summaryData.status === "fulfilled") setSummary(summaryData.value);
            else { setFetchError(true); setSummary(null); }

            if (alertsData.status === "fulfilled") setAlerts(alertsData.value);
            else setAlerts([]);

            if (volumeResult.status === "fulfilled") setVolumeData(volumeResult.value);
            else setVolumeData([]);

            setLastUpdate(new Date());
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            setFetchError(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Export handlers
    const handleExportPDF = async () => {
        if (!summary || isExporting) return;
        setIsExporting(true);
        try {
            await exportToPDF({ summary, transportStats: [], timeRange, generatedAt: new Date() });
        } catch (error) { console.error("PDF export failed:", error); }
        finally { setIsExporting(false); }
    };

    const handleExportCSV = () => {
        if (!summary) return;
        exportToCSV({ summary, transportStats: [], timeRange, generatedAt: new Date() });
    };

    // Compute congestion estimate (vehicles in-port as % of capacity)
    const portCapacity = 120; // estimated max concurrent trucks
    const congestionRate = summary
        ? Math.min(100, Math.round((summary.totalTrucks / portCapacity) * 100))
        : null;

    // Mini chart: last 12 hours of volume data
    const chartData = volumeData.slice(-12);
    const maxVolume = Math.max(...chartData.map(d => Math.max(d.entries, d.exits)), 1);

    return (
        <div className="dashboard-page">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Dashboard</h1>
                    <span className="dashboard-subtitle">
                        Last updated: {lastUpdate.toLocaleTimeString('en-GB')}
                        {fetchError && (
                            <span className="dashboard-api-error">· API unavailable</span>
                        )}
                    </span>
                </div>
                <div className="dashboard-filters">
                    {(["today", "week", "month", "year"] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            className={`filter-btn ${timeRange === range ? "active" : ""}`}
                            onClick={() => setTimeRange(range)}
                        >
                            {range === "today" ? "Today" :
                                range === "week" ? "Week" :
                                    range === "month" ? "Month" : "Year"}
                        </button>
                    ))}
                    <button className="filter-btn" onClick={fetchData} disabled={isLoading} title="Refresh data">
                        <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
                    </button>
                    <div className="export-dropdown">
                        <button className="export-btn primary" disabled={isExporting || !summary}>
                            <Download size={16} />
                            {isExporting ? "Exporting..." : "Export"}
                        </button>
                        <div className="export-menu">
                            <button onClick={handleExportPDF}>PDF</button>
                            <button onClick={handleExportCSV}>CSV</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Primary KPIs */}
            <div className="kpi-grid kpi-grid-primary">
                <KPICard
                    title="Trucks in Port"
                    value={summary?.totalTrucks ?? "--"}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Entries Today"
                    value={summary?.entriesCount ?? "--"}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Exits Today"
                    value={summary?.exitsCount ?? "--"}
                    isLoading={isLoading}
                />
            </div>

            {/* Secondary KPIs — port-specific */}
            <div className="kpi-grid kpi-grid-secondary">
                <KPICard
                    title="Congestion Rate"
                    value={congestionRate !== null ? congestionRate : "--"}
                    unit="%"
                    status={congestionRate !== null ? (congestionRate < 60 ? "ok" : congestionRate < 85 ? "warning" : "danger") : undefined}
                    statusLabel={congestionRate !== null ? (congestionRate < 60 ? "Normal" : congestionRate < 85 ? "Moderate" : "Congested") : undefined}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Delay Index"
                    value={summary ? summary.delayRate.toFixed(1) : "--"}
                    unit="%"
                    status={summary ? (summary.delayRate < 10 ? "ok" : summary.delayRate < 20 ? "warning" : "danger") : undefined}
                    statusLabel={summary ? (summary.delayRate < 10 ? "Good" : summary.delayRate < 20 ? "Attention" : "Critical") : undefined}
                    isLoading={isLoading}
                />
                <KPICard
                    title="SLA Compliance"
                    value={summary ? summary.slaCompliance.toFixed(1) : "--"}
                    unit="%"
                    status={summary ? (summary.slaCompliance >= 90 ? "ok" : "danger") : undefined}
                    statusLabel={summary ? (summary.slaCompliance >= 90 ? "OK" : "Critical") : undefined}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Avg. Turnaround"
                    value={summary?.avgPermanenceMinutes ?? "--"}
                    unit="min"
                    status={summary ? (summary.avgPermanenceMinutes <= 45 ? "ok" : summary.avgPermanenceMinutes <= 75 ? "warning" : "danger") : undefined}
                    statusLabel={summary ? (summary.avgPermanenceMinutes <= 45 ? "Efficient" : summary.avgPermanenceMinutes <= 75 ? "Normal" : "Slow") : undefined}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Avg. Waiting Time"
                    value={summary ? Math.round(summary.avgPermanenceMinutes * 0.35) : "--"}
                    unit="min"
                    status={summary ? (summary.avgPermanenceMinutes * 0.35 <= 15 ? "ok" : summary.avgPermanenceMinutes * 0.35 <= 25 ? "warning" : "danger") : undefined}
                    statusLabel={summary ? (summary.avgPermanenceMinutes * 0.35 <= 15 ? "Good" : summary.avgPermanenceMinutes * 0.35 <= 25 ? "Acceptable" : "High") : undefined}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Vehicles / Hour"
                    value={summary ? Math.round((summary.entriesCount + summary.exitsCount) / Math.max(new Date().getHours(), 1)) : "--"}
                    status={summary ? ((summary.entriesCount + summary.exitsCount) / Math.max(new Date().getHours(), 1) >= 5 ? "ok" : "warning") : undefined}
                    statusLabel={summary ? ((summary.entriesCount + summary.exitsCount) / Math.max(new Date().getHours(), 1) >= 5 ? "Normal" : "Low") : undefined}
                    isLoading={isLoading}
                />
            </div>

            {/* Two-column: Operations Chart + Alerts Feed */}
            <div className="dashboard-two-col">
                {/* Mini Operations Chart */}
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div className="dashboard-card-header-left">
                            <Truck size={18} />
                            <h3>Today's Operations</h3>
                        </div>
                        <div className="chart-legend">
                            <span className="legend-entry"><span className="legend-dot entries" /> Entries</span>
                            <span className="legend-entry"><span className="legend-dot exits" /> Exits</span>
                        </div>
                    </div>
                    {chartData.length === 0 ? (
                        <div className="chart-empty">
                            <Gauge size={28} />
                            <span>No volume data available</span>
                        </div>
                    ) : (
                        <div className="mini-bar-chart">
                            {chartData.map((d, i) => {
                                const hour = new Date(d.timestamp).getHours();
                                return (
                                    <div key={i} className="bar-group">
                                        <div className="bar-container">
                                            <div
                                                className="bar bar-entries"
                                                style={{ height: `${(d.entries / maxVolume) * 100}%` }}
                                                title={`${d.entries} entries`}
                                            />
                                            <div
                                                className="bar bar-exits"
                                                style={{ height: `${(d.exits / maxVolume) * 100}%` }}
                                                title={`${d.exits} exits`}
                                            />
                                        </div>
                                        <span className="bar-label">{hour}h</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Active Alerts Feed */}
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div className="dashboard-card-header-left">
                            <AlertTriangle size={18} />
                            <h3>Recent Alerts</h3>
                        </div>
                        {alerts.length > 0 && (
                            <span className="alerts-count">{alerts.length}</span>
                        )}
                    </div>
                    {alerts.length === 0 ? (
                        <div className="alerts-empty">
                            <CheckCircle size={28} />
                            <span>No active alerts</span>
                        </div>
                    ) : (
                        <div className="alerts-feed">
                            {alerts.map((alert) => {
                                const config = alertConfig[alert.type] || alertConfig.generic;
                                return (
                                    <div key={alert.id} className="alert-feed-item">
                                        <div className="alert-feed-icon" style={{ color: config.color }}>
                                            {config.icon}
                                        </div>
                                        <div className="alert-feed-content">
                                            <span className="alert-feed-text">
                                                {alert.description || "Alert without description"}
                                            </span>
                                            <div className="alert-feed-meta">
                                                <span className="alert-feed-type" style={{ color: config.color }}>{config.label}</span>
                                                <span className="alert-feed-time">
                                                    <Clock size={12} />
                                                    {new Date(alert.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
