/**
 * Transport Companies Page
 * Aggregated data per transport company with KPIs and detailed table
 */
import { useState, useEffect, useCallback } from "react";
import {
    RefreshCw,
    Search,
    Truck,
    Award,
    AlertTriangle,
    Activity,
} from "lucide-react";
import {
    getTransportStats,
    type TransportStats,
} from "@/services/statistics";

type TransportRange = "week" | "month" | "quarter" | "year";

export default function TransportPage() {
    const [timeRange, setTimeRange] = useState<TransportRange>("month");
    const [transportStats, setTransportStats] = useState<TransportStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setFetchError(false);
        try {
            const { from, to } = getDateRange();
            const stats = await getTransportStats(from, to);
            setTransportStats(stats);
        } catch (error) {
            console.error("Failed to fetch transport data:", error);
            setFetchError(true);
            setTransportStats([]);
        } finally {
            setIsLoading(false);
        }
    }, [getDateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredStats = transportStats.filter((s) =>
        s.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Computed KPIs
    const totalCompanies = transportStats.length;
    const bestSla = transportStats.length > 0
        ? Math.max(...transportStats.map(s => s.slaAttendedRate))
        : 0;
    const worstSla = transportStats.length > 0
        ? Math.min(...transportStats.map(s => s.slaAttendedRate))
        : 0;
    const avgOperations = transportStats.length > 0
        ? Math.round(transportStats.reduce((acc, s) => acc + s.operationsCount, 0) / transportStats.length)
        : 0;

    const rangeLabels: Record<TransportRange, string> = {
        week: "Week",
        month: "Month",
        quarter: "Quarter",
        year: "Year",
    };

    return (
        <div className="transport-page">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Carriers</h1>
                    <span className="dashboard-subtitle">
                        Aggregated data per transport company
                        {fetchError && (
                            <span className="dashboard-api-error">· API unavailable</span>
                        )}
                    </span>
                </div>
                <div className="dashboard-filters">
                    {(["week", "month", "quarter", "year"] as TransportRange[]).map((range) => (
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
                        onClick={fetchData}
                        disabled={isLoading}
                        title="Refresh data"
                    >
                        <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
                    </button>
                </div>
            </div>

            {/* Transport KPIs */}
            <div className="kpi-grid kpi-grid-transport">
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Carriers</span>
                        <span className="kpi-icon-badge" style={{ color: "var(--accent-color)" }}>
                            <Truck size={18} />
                        </span>
                    </div>
                    <div className="kpi-value">{isLoading ? "--" : totalCompanies}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Best SLA</span>
                        <span className="kpi-icon-badge" style={{ color: "#22c55e" }}>
                            <Award size={18} />
                        </span>
                    </div>
                    <div className="kpi-value">
                        {isLoading ? "--" : `${bestSla}%`}
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Worst SLA</span>
                        <span className="kpi-icon-badge" style={{ color: "#ef4444" }}>
                            <AlertTriangle size={18} />
                        </span>
                    </div>
                    <div className="kpi-value">
                        {isLoading ? "--" : `${worstSla}%`}
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Avg. Operations</span>
                        <span className="kpi-icon-badge" style={{ color: "#f59e0b" }}>
                            <Activity size={18} />
                        </span>
                    </div>
                    <div className="kpi-value">{isLoading ? "--" : avgOperations}</div>
                </div>
            </div>

            {/* Transport Company Table */}
            <div className="data-table">
                <div className="data-table-header">
                    <h3 className="data-table-title">Carrier Details</h3>
                    <div className="table-search">
                        <Search size={16} />
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Search carrier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Carrier</th>
                                <th>Avg. Unloading Time</th>
                                <th>Avg. Waiting Time</th>
                                <th>Operations</th>
                                <th>SLA Compliance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="table-empty-state">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredStats.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="table-empty-state">
                                        {fetchError
                                            ? "Could not retrieve data from API"
                                            : searchTerm
                                                ? "No carrier found"
                                                : "No data available"}
                                    </td>
                                </tr>
                            ) : (
                                filteredStats.map((stat, index) => (
                                    <tr key={stat.companyNif}>
                                        <td className="table-rank">{index + 1}</td>
                                        <td className="table-company-name">{stat.companyName}</td>
                                        <td>{stat.avgUnloadingTime} min</td>
                                        <td>{stat.avgWaitingTime} min</td>
                                        <td>{stat.operationsCount}</td>
                                        <td>
                                            <span
                                                className={`status-badge ${stat.slaAttendedRate >= 90
                                                    ? "active"
                                                    : stat.slaAttendedRate >= 80
                                                        ? "pending"
                                                        : "inactive"
                                                    }`}
                                            >
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
    );
}
