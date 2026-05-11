/**
 * Manager Dashboard Page
 * Port logistics overview: KPIs, active alerts feed, and today's operations mini-chart.
 * All data sourced from API endpoints — no fallbacks.
 */
import { useState, type ReactNode } from "react";
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
    ShieldAlert,
    BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import KPICard from "@/components/logistics-manager/KPICard";
import GrafanaPanel from "@/components/common/GrafanaPanel";

import { useSummaryStats, useVolumeData, useActiveAlerts, useDecisionAnalytics, useTransportStats } from "@/hooks/useStatistics";
import { exportToPDF, exportToCSV } from "@/services/exportService";
import type { Alert } from "@/types/types";


const alertConfig: Record<string, { icon: ReactNode; color: string; label: string }> = {
    safety: { icon: <Shield size={16} />, color: "#ef4444", label: "Safety" },
    problem: { icon: <AlertCircle size={16} />, color: "#f59e0b", label: "Problem" },
    operational: { icon: <Activity size={16} />, color: "#3b82f6", label: "Operational" },
    generic: { icon: <AlertTriangle size={16} />, color: "#8b5cf6", label: "General" },
};


export default function ManagerDashboard() {
    const [isExporting, setIsExporting] = useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const {
        data: summary,
        isLoading: summaryLoading,
        isError: summaryError,
        dataUpdatedAt: summaryUpdatedAt,
    } = useSummaryStats();

    const {
        data: volumeData = [],
        isLoading: volumeLoading,
        isError: volumeError,
    } = useVolumeData(undefined, undefined, "hour");

    const {
        data: alerts = [],
        isLoading: alertsLoading,
        isError: alertsError,
    } = useActiveAlerts(5);

    const {
        data: decisions,
        isLoading: decisionsLoading,
    } = useDecisionAnalytics();

    const {
        data: transportStats = [],
    } = useTransportStats();

    const isLoading = summaryLoading || volumeLoading || alertsLoading || decisionsLoading;
    const hasError = summaryError || volumeError || alertsError;

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['statistics'] });
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
    };

    const handleExportPDF = async () => {
        if (!summary || isExporting) return;
        setIsExporting(true);
        try {
            await exportToPDF({ summary, decisions: decisions ?? null, transportStats, timeRange: "today", generatedAt: new Date() });
        } catch (error) { console.error("PDF export failed:", error); }
        finally { setIsExporting(false); }
    };

    const handleExportCSV = () => {
        if (!summary) return;
        exportToCSV({ summary, decisions: decisions ?? null, transportStats, timeRange: "today", generatedAt: new Date() });
    };

    const congestionRate = summary?.congestionRate ?? null;

    const chartData = volumeData.slice(-12);
    const maxVolume = Math.max(...chartData.map(d => Math.max(d.entries, d.exits)), 1);

    return (
        <div className="dashboard-page">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Dashboard</h1>
                    <span className="dashboard-subtitle">
                        Last updated: {summaryUpdatedAt ? new Date(summaryUpdatedAt).toLocaleTimeString('en-GB') : '--:--:--'}
                        {hasError && (
                            <span className="dashboard-api-error"> · API error</span>
                        )}
                    </span>
                </div>
                <div className="dashboard-filters">
                    <button className="filter-btn" onClick={handleRefresh} disabled={isLoading} title="Refresh data">
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
                    value={summary?.trucksInPort ?? "--"}
                    status={summary ? (summary.trucksInPort > 0 ? "ok" : undefined) : undefined}
                    statusLabel={summary?.trucksInPort !== undefined ? `${summary.unloadingCount} unloading` : undefined}
                    isLoading={summaryLoading}
                />
                <KPICard
                    title="In Transit"
                    value={summary?.trucksInTransit ?? "--"}
                    statusLabel={summary?.trucksInTransitDelayed ? `${summary.trucksInTransitDelayed} delayed` : undefined}
                    status={summary?.trucksInTransitDelayed ? "warning" : undefined}
                    isLoading={summaryLoading}
                />
                <KPICard
                    title="Entries Today"
                    value={summary?.entriesCount ?? "--"}
                    isLoading={summaryLoading}
                />
            </div>

            {/* Secondary KPIs */}
            <div className="kpi-grid kpi-grid-secondary">
                <KPICard
                    title="Congestion Rate"
                    value={congestionRate !== null ? congestionRate : "--"}
                    unit="%"
                    status={congestionRate !== null ? (congestionRate < 60 ? "ok" : congestionRate < 85 ? "warning" : "danger") : undefined}
                    statusLabel={congestionRate !== null ? (congestionRate < 60 ? "Normal" : congestionRate < 85 ? "Moderate" : "Congested") : undefined}
                    isLoading={summaryLoading}
                />
                <KPICard
                    title="Avg. Waiting Time"
                    value={summary ? Math.round(summary.avgWaitingMinutes) : "--"}
                    unit="min"
                    status={summary ? (summary.avgWaitingMinutes <= 15 ? "ok" : summary.avgWaitingMinutes <= 25 ? "warning" : "danger") : undefined}
                    statusLabel={summary ? (summary.avgWaitingMinutes <= 15 ? "Good" : summary.avgWaitingMinutes <= 25 ? "Acceptable" : "High") : undefined}
                    isLoading={summaryLoading}
                />
                <KPICard
                    title="Vehicles / Hour"
                    value={summary?.vehiclesPerHour ?? "--"}
                    status={summary ? (summary.vehiclesPerHour >= 5 ? "ok" : "warning") : undefined}
                    statusLabel={summary?.peakHour ? `Peak: ${summary.peakHour.hour}h (${summary.peakHour.count})` : undefined}
                    isLoading={summaryLoading}
                />
                <div
                    onClick={() => navigate("/manager/infractions")}
                    style={{ cursor: "pointer" }}
                    title="View infraction details"
                >
                    <KPICard
                        title="Infractions"
                        value={summary?.infractionCount ?? "--"}
                        status={summary ? (summary.infractionCount === 0 ? "ok" : summary.infractionCount <= 3 ? "warning" : "danger") : undefined}
                        statusLabel={summary ? (summary.infractionCount === 0 ? "Clear" : "View details →") : undefined}
                        isLoading={summaryLoading}
                    />
                </div>
                <KPICard
                    title="Acceptance Rate"
                    value={decisions ? decisions.acceptanceRate.toFixed(1) : "--"}
                    unit="%"
                    status={decisions ? (decisions.acceptanceRate >= 80 ? "ok" : decisions.acceptanceRate >= 60 ? "warning" : "danger") : undefined}
                    statusLabel={decisions ? `${decisions.totalDecisions} decisions` : undefined}
                    isLoading={decisionsLoading}
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
                    {volumeLoading ? (
                        <div className="chart-empty">
                            <RefreshCw size={28} className="spinning" />
                            <span>Loading volume data...</span>
                        </div>
                    ) : volumeError ? (
                        <div className="chart-empty">
                            <AlertCircle size={28} />
                            <span>Failed to load volume data</span>
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="chart-empty">
                            <Gauge size={28} />
                            <span>No volume data available</span>
                        </div>
                    ) : (
                        <div className="mini-bar-chart">
                            {chartData.map((d, i) => {
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
                                        <span className="bar-label">{new Date(d.timestamp).getHours()}h</span>
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
                    {alertsLoading ? (
                        <div className="alerts-empty">
                            <RefreshCw size={28} className="spinning" />
                            <span>Loading alerts...</span>
                        </div>
                    ) : alertsError ? (
                        <div className="alerts-empty">
                            <AlertCircle size={28} />
                            <span>Failed to load alerts</span>
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="alerts-empty">
                            <CheckCircle size={28} />
                            <span>No active alerts</span>
                        </div>
                    ) : (
                        <div className="alerts-feed">
                            {alerts.map((alert: Alert) => {
                                const cfg = alertConfig[alert.type] || alertConfig.generic;
                                return (
                                    <div key={alert.id} className="alert-feed-item">
                                        <div className="alert-feed-icon" style={{ color: cfg.color }}>
                                            {cfg.icon}
                                        </div>
                                        <div className="alert-feed-content">
                                            <span className="alert-feed-text">
                                                {alert.description || "Alert without description"}
                                            </span>
                                            <div className="alert-feed-meta">
                                                <span className="alert-feed-type" style={{ color: cfg.color }}>{cfg.label}</span>
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

            {/* Energy Consumption (RAN) */}
            <div className="dashboard-card energy-metrics-card">
                <div className="dashboard-card-header">
                    <div className="dashboard-card-header-left">
                        <Gauge size={18} />
                        <h3>Energy Consumption (RAN)</h3>
                    </div>
                    <span className="dashboard-subtitle">5G network metrics</span>
                </div>
                <div className="w-full h-56 md:h-72 lg:h-80">
                    <GrafanaPanel
                        dashboardId="adcptvw/new-dashboard"
                        panelId="panel-1"
                        title="Energy consumption panel"
                    />
                </div>
            </div>
        </div>
    );
}
