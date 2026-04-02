/**
 * Analytics Page
 * Detailed analysis with native recharts — no Grafana, no fallbacks.
 * Data sourced from: /statistics/volume, /statistics/alerts, /statistics/by-company
 */
import { useState, useMemo } from "react";
import {
    RefreshCw,
    Thermometer,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { useVolumeData, useAlertsBreakdown, useTransportStats } from "@/hooks/useStatistics";

type AnalyticsRange = "week" | "month" | "quarter" | "year";

const ALERT_TYPE_LABELS: Record<string, string> = {
    safety: "Safety",
    problem: "Problem",
    operational: "Operational",
    generic: "General",
};

const ALERT_TYPE_COLORS: Record<string, string> = {
    safety: "#ef4444",
    problem: "#f59e0b",
    operational: "#3b82f6",
    generic: "#8b5cf6",
};

function getDateRange(timeRange: AnalyticsRange) {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date();
    switch (timeRange) {
        case "week": from.setDate(from.getDate() - 7); break;
        case "month": from.setMonth(from.getMonth() - 1); break;
        case "quarter": from.setMonth(from.getMonth() - 3); break;
        case "year": from.setFullYear(from.getFullYear() - 1); break;
    }
    return { from: from.toISOString().split("T")[0], to };
}

const rangeLabels: Record<AnalyticsRange, string> = {
    week: "Week",
    month: "Month",
    quarter: "Quarter",
    year: "Year",
};

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState<AnalyticsRange>("month");
    const queryClient = useQueryClient();
    const { from, to } = getDateRange(timeRange);

    const { data: volumeData = [], isLoading: volLoading, isError: volError } = useVolumeData(from, to, "day");
    const { data: alertsBreakdown = [], isLoading: alertsLoading, isError: alertsError } = useAlertsBreakdown(from, to);
    const { data: transportStats = [], isLoading: transportLoading, isError: transportError } = useTransportStats(from, to);

    const isLoading = volLoading || alertsLoading || transportLoading;

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['statistics'] });
    };

    // Throughput totals from volume data
    const last7Volume = volumeData.slice(-7);
    const totalEntries = last7Volume.reduce((s, d) => s + d.entries, 0);
    const totalExits = last7Volume.reduce((s, d) => s + d.exits, 0);

    // Congestion trend: total movements per day from volume data
    const congestionData = useMemo(() =>
        volumeData.map(d => ({
            date: new Date(d.timestamp).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
            total: d.entries + d.exits,
        })).slice(-14),
        [volumeData]
    );

    // Volume chart data (format for recharts)
    const volumeChartData = useMemo(() =>
        volumeData.slice(-30).map(d => ({
            date: new Date(d.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
            Entries: d.entries,
            Exits: d.exits,
        })),
        [volumeData]
    );

    // Carrier avg time chart data
    const carrierChartData = useMemo(() =>
        transportStats
            .map(s => ({
                name: s.companyName.length > 18 ? s.companyName.substring(0, 16) + "..." : s.companyName,
                avgTime: s.avgUnloadingTime + s.avgWaitingTime,
                unloading: s.avgUnloadingTime,
                waiting: s.avgWaitingTime,
            }))
            .sort((a, b) => b.avgTime - a.avgTime),
        [transportStats]
    );

    // Alerts donut chart data
    const alertsChartData = useMemo(() =>
        alertsBreakdown.map(a => ({
            name: ALERT_TYPE_LABELS[a.type] || a.type,
            value: a.count,
            color: ALERT_TYPE_COLORS[a.type] || "#6b7280",
        })),
        [alertsBreakdown]
    );

    const totalAlerts = alertsBreakdown.reduce((sum, item) => sum + item.count, 0);
    const maxAlertCount = Math.max(...alertsBreakdown.map(a => a.count), 1);

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
                    <button className="filter-btn" onClick={handleRefresh} disabled={isLoading} title="Refresh data">
                        <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
                    </button>
                </div>
            </div>

            {/* Analytics Cards Row */}
            <div className="analytics-cards-row">
                {/* Congestion Indicator — derived from volume data */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <Thermometer size={18} />
                        <h3>Congestion Trend</h3>
                    </div>
                    {volLoading ? (
                        <div className="analytics-card-empty"><RefreshCw size={20} className="spinning" /> Loading...</div>
                    ) : volError ? (
                        <div className="analytics-card-empty"><AlertCircle size={20} /> Failed to load data</div>
                    ) : congestionData.length === 0 ? (
                        <div className="analytics-card-empty">No data available</div>
                    ) : (
                        <div className="congestion-grid">
                            {congestionData.slice(-7).map((c, i) => {
                                const level = c.total < 30 ? "low" : c.total < 50 ? "medium" : "high";
                                return (
                                    <div key={i} className="congestion-cell-wrapper">
                                        <div
                                            className={`congestion-cell congestion-${level}`}
                                            title={`${c.total} movements`}
                                        />
                                        <span className="congestion-label">{c.date}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Alerts Distribution */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <TrendingDown size={18} />
                        <h3>Alerts Distribution</h3>
                    </div>
                    {alertsLoading ? (
                        <div className="analytics-card-empty"><RefreshCw size={20} className="spinning" /> Loading...</div>
                    ) : alertsError ? (
                        <div className="analytics-card-empty"><AlertCircle size={20} /> Failed to load data</div>
                    ) : alertsBreakdown.length === 0 ? (
                        <div className="analytics-card-empty">No alert data</div>
                    ) : (
                        <div className="h-bars">
                            {alertsBreakdown.map((a) => (
                                <div key={a.type} className="h-bar-row">
                                    <span className="h-bar-label">{ALERT_TYPE_LABELS[a.type] || a.type}</span>
                                    <div className="h-bar-track">
                                        <div
                                            className="h-bar-fill"
                                            style={{
                                                width: `${(a.count / maxAlertCount) * 100}%`,
                                                background: ALERT_TYPE_COLORS[a.type] || "#6b7280",
                                            }}
                                        />
                                    </div>
                                    <span className="h-bar-value">
                                        {a.count} <span className="h-bar-pct">({a.percentage.toFixed(0)}%)</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Throughput */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <ArrowUpRight size={18} />
                        <h3>Throughput ({rangeLabels[timeRange]})</h3>
                    </div>
                    {volLoading ? (
                        <div className="analytics-card-empty"><RefreshCw size={20} className="spinning" /> Loading...</div>
                    ) : volError ? (
                        <div className="analytics-card-empty"><AlertCircle size={20} /> Failed to load data</div>
                    ) : (
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
                    )}
                </div>
            </div>

            {/* Charts Section */}
            {!isLoading && (
                <>
                    {/* Volume Evolution + Avg Time per Carrier */}
                    <div className="charts-grid charts-grid-equal">
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Volume Evolution (Entries vs Exits)</h3>
                            </div>
                            <div className="chart-container" style={{ height: 300 }}>
                                {volError ? (
                                    <div className="chart-empty"><AlertCircle size={28} /><span>Failed to load volume data</span></div>
                                ) : volumeChartData.length === 0 ? (
                                    <div className="chart-empty"><span>No volume data for this period</span></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={volumeChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="Entries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Exits" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Average Time per Carrier</h3>
                            </div>
                            <div className="chart-container" style={{ height: 300 }}>
                                {transportError ? (
                                    <div className="chart-empty"><AlertCircle size={28} /><span>Failed to load carrier data</span></div>
                                ) : carrierChartData.length === 0 ? (
                                    <div className="chart-empty"><span>No carrier data for this period</span></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={carrierChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} unit="m" />
                                            <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(value: number) => `${value} min`} />
                                            <Legend />
                                            <Bar dataKey="unloading" stackId="time" fill="#3b82f6" name="Unloading" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="waiting" stackId="time" fill="#f59e0b" name="Waiting" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Alert Distribution Donut + Congestion Area Chart */}
                    <div className="charts-grid charts-grid-equal">
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Alert Distribution by Type</h3>
                            </div>
                            <div className="chart-container" style={{ height: 280 }}>
                                {alertsError ? (
                                    <div className="chart-empty"><AlertCircle size={28} /><span>Failed to load alerts data</span></div>
                                ) : alertsChartData.length === 0 ? (
                                    <div className="chart-empty"><span>No alert data for this period</span></div>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
                                        <ResponsiveContainer width="60%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={alertsChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={90}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {alertsChartData.map((entry, idx) => (
                                                        <Cell key={idx} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1rem" }}>
                                            <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>Total alerts in range</div>
                                            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{totalAlerts}</div>
                                            {alertsChartData.map(a => (
                                                <div key={a.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.color }} />
                                                    <span>{a.name}: {a.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Congestion Trend (Movements/Day)</h3>
                            </div>
                            <div className="chart-container" style={{ height: 280 }}>
                                {volError ? (
                                    <div className="chart-empty"><AlertCircle size={28} /><span>Failed to load data</span></div>
                                ) : congestionData.length === 0 ? (
                                    <div className="chart-empty"><span>No congestion data for this period</span></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={congestionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Area
                                                type="monotone"
                                                dataKey="total"
                                                stroke="#8b5cf6"
                                                fill="rgba(139, 92, 246, 0.15)"
                                                strokeWidth={2}
                                                name="Total Movements"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
