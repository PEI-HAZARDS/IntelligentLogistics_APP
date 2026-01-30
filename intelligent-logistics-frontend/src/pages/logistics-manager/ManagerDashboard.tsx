/**
 * Manager Dashboard Page
 * Main dashboard for logistics manager with KPIs, Grafana charts, and transport data
 */
import { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw } from "lucide-react";
import KPICard from "@/components/logistics-manager/KPICard";
import GrafanaPanel, { DASHBOARD_PANELS } from "@/components/logistics-manager/GrafanaPanel";
import {
    getDashboardSummary,
    getTransportStats,
    MOCK_SUMMARY,
    MOCK_TRANSPORT_STATS,
    type DashboardSummary,
    type TransportStats,
} from "@/services/statistics";
import { exportToPDF, exportToCSV } from "@/services/exportService";

type TimeRange = "today" | "week" | "month" | "year";

export default function ManagerDashboard() {
    const [timeRange, setTimeRange] = useState<TimeRange>("today");
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [transportStats, setTransportStats] = useState<TransportStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [summaryData, statsData] = await Promise.all([
                getDashboardSummary().catch(() => MOCK_SUMMARY),
                getTransportStats().catch(() => MOCK_TRANSPORT_STATS),
            ]);
            setSummary(summaryData);
            setTransportStats(statsData);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            // Fallback to mock data
            setSummary(MOCK_SUMMARY);
            setTransportStats(MOCK_TRANSPORT_STATS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Get Grafana time range params
    const getGrafanaTimeRange = () => {
        switch (timeRange) {
            case "today": return { from: "now/d", to: "now" };
            case "week": return { from: "now-7d", to: "now" };
            case "month": return { from: "now-30d", to: "now" };
            case "year": return { from: "now-1y", to: "now" };
        }
    };

    const grafanaTime = getGrafanaTimeRange();

    // Export handlers
    const handleExportPDF = async () => {
        if (!summary || isExporting) return;
        setIsExporting(true);
        try {
            await exportToPDF({
                summary,
                transportStats,
                timeRange,
                generatedAt: new Date(),
            });
        } catch (error) {
            console.error("PDF export failed:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCSV = () => {
        if (!summary) return;
        exportToCSV({
            summary,
            transportStats,
            timeRange,
            generatedAt: new Date(),
        });
    };

    return (
        <div className="dashboard-page">
            {/* Header Section */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Dashboard</h1>
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                        Last update: {lastUpdate.toLocaleTimeString('pt-PT')}
                    </span>
                </div>
                <div className="dashboard-filters">
                    {/* Time Range Filters */}
                    {(["today", "week", "month", "year"] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            className={`filter-btn ${timeRange === range ? "active" : ""}`}
                            onClick={() => setTimeRange(range)}
                        >
                            {range === "today" ? "Hoje" :
                                range === "week" ? "Semana" :
                                    range === "month" ? "Mês" : "Ano"}
                        </button>
                    ))}

                    {/* Refresh Button */}
                    <button
                        className="filter-btn"
                        onClick={fetchData}
                        disabled={isLoading}
                    >
                        <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
                    </button>

                    {/* Export Dropdown */}
                    <div className="export-dropdown">
                        <button className="export-btn primary" onClick={handleExportPDF} disabled={isExporting}>
                            <Download size={16} />
                            {isExporting ? "A exportar..." : "Exportar"}
                        </button>
                        <div className="export-menu">
                            <button onClick={handleExportPDF}>PDF</button>
                            <button onClick={handleExportCSV}>CSV</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <KPICard
                    title="Total Camiões"
                    value={summary?.totalTrucks ?? "--"}
                    change={5.2}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Entradas Hoje"
                    value={summary?.entriesCount ?? "--"}
                    change={12.3}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Saídas Hoje"
                    value={summary?.exitsCount ?? "--"}
                    change={-2.1}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Tempo Médio Permanência"
                    value={summary?.avgPermanenceMinutes ?? "--"}
                    unit="min"
                    status={summary && summary.avgPermanenceMinutes <= 60 ? "ok" : "warning"}
                    statusLabel={summary && summary.avgPermanenceMinutes <= 60 ? "OK" : "Alto"}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Taxa de Atraso"
                    value={summary?.delayRate.toFixed(1) ?? "--"}
                    unit="%"
                    status={summary && summary.delayRate < 10 ? "ok" : "warning"}
                    statusLabel={summary && summary.delayRate < 10 ? "OK" : "Atenção"}
                    isLoading={isLoading}
                />
                <KPICard
                    title="SLA Cumprido"
                    value={summary?.slaCompliance.toFixed(1) ?? "--"}
                    unit="%"
                    status={summary && summary.slaCompliance >= 90 ? "ok" : "danger"}
                    statusLabel={summary && summary.slaCompliance >= 90 ? "OK" : "Crítico"}
                    isLoading={isLoading}
                />
            </div>

            {/* Charts Grid - Grafana Panels */}
            <div className="charts-grid">
                <GrafanaPanel
                    dashboardUid={DASHBOARD_PANELS.overview.uid}
                    panelId={DASHBOARD_PANELS.overview.volumeChart}
                    title="Volume de Chegadas"
                    height={280}
                    from={grafanaTime.from}
                    to={grafanaTime.to}
                />
                <GrafanaPanel
                    dashboardUid={DASHBOARD_PANELS.overview.uid}
                    panelId={DASHBOARD_PANELS.overview.alertsDonut}
                    title="Número de Alertas"
                    height={280}
                    from={grafanaTime.from}
                    to={grafanaTime.to}
                />
            </div>

            {/* Secondary Charts */}
            <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
                <GrafanaPanel
                    dashboardUid={DASHBOARD_PANELS.overview.uid}
                    panelId={DASHBOARD_PANELS.overview.avgTimeBar}
                    title="Tempo Médio por Transportadora"
                    height={300}
                    from={grafanaTime.from}
                    to={grafanaTime.to}
                />

                {/* Transport Stats Table */}
                <div className="data-table">
                    <div className="data-table-header">
                        <h3 className="data-table-title">Detalhe por Transportadora</h3>
                    </div>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Transportadora</th>
                                    <th>T. Médio Descarga</th>
                                    <th>T. Médio Espera</th>
                                    <th>Nº Operações</th>
                                    <th>SLA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                            Loading...
                                        </td>
                                    </tr>
                                ) : transportStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                            No data available
                                        </td>
                                    </tr>
                                ) : (
                                    transportStats.map((stat) => (
                                        <tr key={stat.companyNif}>
                                            <td>{stat.companyName}</td>
                                            <td>{stat.avgUnloadingTime} min</td>
                                            <td>{stat.avgWaitingTime} min</td>
                                            <td>{stat.operationsCount}</td>
                                            <td>
                                                <span className={`status-badge ${stat.slaAttendedRate >= 90 ? 'active' : stat.slaAttendedRate >= 80 ? 'pending' : 'inactive'}`}>
                                                    {stat.slaAttendedRate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
