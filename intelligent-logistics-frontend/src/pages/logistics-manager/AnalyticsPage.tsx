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
    Grid3x3,
    Activity,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine,
} from "recharts";
import { useVolumeData, useAlertsBreakdown, useTransportStats, useSummaryStats, useDecisionAnalytics } from "@/hooks/useStatistics";
import KPICard from "@/components/logistics-manager/KPICard";

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

const HEATMAP_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Green → amber → red interpolation for a 0..1 congestion ratio (empty = surface tint). */
function heatColor(ratio: number): string {
    const stops = [
        { r: 30, g: 41, b: 59 },     // empty
        { r: 34, g: 197, b: 94 },    // low
        { r: 245, g: 158, b: 11 },   // medium
        { r: 239, g: 68, b: 68 },    // high
    ];
    if (ratio <= 0) return `rgb(${stops[0].r}, ${stops[0].g}, ${stops[0].b})`;
    const t = Math.min(1, ratio) * (stops.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    const a = stops[i];
    const b = stops[Math.min(i + 1, stops.length - 1)];
    const mix = (x: number, y: number) => Math.round(x + (y - x) * f);
    return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState<AnalyticsRange>("month");
    const queryClient = useQueryClient();
    const { from, to } = getDateRange(timeRange);

    const volInterval = (timeRange === "quarter" || timeRange === "year") ? "week" : "day";
    const { data: volumeData = [], isLoading: volLoading, isError: volError } = useVolumeData(from, to, volInterval);
    const { data: alertsBreakdown = [], isLoading: alertsLoading, isError: alertsError } = useAlertsBreakdown(from, to);
    const { data: transportStats = [], isLoading: transportLoading, isError: transportError } = useTransportStats(from, to);
    // Period-scoped KPIs: pass the selected range so the cards reflect
    // week/month/quarter/year (not just today).
    const { data: summary, isLoading: summaryLoading } = useSummaryStats(undefined, from, to);
    // Live (today) summary — for "current" anchors like in-port occupancy/capacity.
    const { data: liveSummary } = useSummaryStats();
    const { data: decisions, isLoading: decisionsLoading } = useDecisionAnalytics();

    // Weekly hourly volume — feeds the congestion heatmap and the occupancy-vs-capacity
    // curve. Independent of the page range: both views are about the recurring weekly
    // pattern, so we always pull the last 7 days at hourly granularity.
    const { from: weekFromHour } = getDateRange("week");
    const { data: hourlyVolume = [] } = useVolumeData(weekFromHour, to, "hour");

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

    // ── Congestion heatmap: weekday (rows) × hour-of-day (cols); value = total movements.
    const heatmap = useMemo(() => {
        const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
        for (const p of hourlyVolume) {
            const d = new Date(p.timestamp);
            const wd = (d.getDay() + 6) % 7;       // shift to Monday-first index
            grid[wd][d.getHours()] += p.entries + p.exits;
        }
        const max = Math.max(1, ...grid.flat());
        return { grid, max };
    }, [hourlyVolume]);

    // ── Estimated in-port occupancy vs capacity.
    // The series only carries flow (entries/exits), not an absolute count — but we DO know
    // the current in-port count (summary.trucksInPort). Anchor the curve to that value and
    // walk the hourly net flow backwards to reconstruct occupancy over the week.
    const occupancyData = useMemo(() => {
        if (!hourlyVolume.length || !liveSummary) return [];
        const occ = new Array(hourlyVolume.length).fill(0);
        let running = liveSummary.trucksInPort;
        for (let i = hourlyVolume.length - 1; i >= 0; i--) {
            occ[i] = Math.max(0, Math.round(running));
            running -= hourlyVolume[i].entries - hourlyVolume[i].exits;
        }
        return hourlyVolume.map((p, i) => ({
            label: new Date(p.timestamp).toLocaleString("en-GB", { weekday: "short", hour: "2-digit" }),
            occupancy: occ[i],
        }));
    }, [hourlyVolume, liveSummary]);

    const capacity = liveSummary?.portCapacity ?? 0;
    const peakOccupancy = occupancyData.reduce((m, d) => Math.max(m, d.occupancy), 0);

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

            {/* Performance KPIs */}
            <div className="kpi-grid kpi-grid-transport" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                <KPICard
                    title="Delay Index"
                    value={summary ? summary.delayRate.toFixed(1) : "--"}
                    unit="%"
                    status={summary ? (summary.delayRate < 10 ? "ok" : summary.delayRate < 20 ? "warning" : "danger") : undefined}
                    statusLabel={summary ? (summary.delayRate < 10 ? "Good" : summary.delayRate < 20 ? "Attention" : "Critical") : undefined}
                    isLoading={summaryLoading}
                />
                <KPICard
                    title="SLA Compliance"
                    value={summary ? summary.slaCompliance.toFixed(1) : "--"}
                    unit="%"
                    status={summary ? (summary.slaCompliance >= 90 ? "ok" : "danger") : undefined}
                    statusLabel={summary ? (summary.slaCompliance >= 90 ? "OK" : "Critical") : undefined}
                    isLoading={summaryLoading}
                />
                <KPICard
                    title="Avg. Turnaround"
                    value={summary?.avgPermanenceMinutes ?? "--"}
                    unit="min"
                    status={summary ? (summary.avgPermanenceMinutes <= 45 ? "ok" : summary.avgPermanenceMinutes <= 75 ? "warning" : "danger") : undefined}
                    statusLabel={summary ? (summary.avgPermanenceMinutes <= 45 ? "Efficient" : summary.avgPermanenceMinutes <= 75 ? "Normal" : "Slow") : undefined}
                    isLoading={summaryLoading}
                />
                <KPICard
                    title="Completed"
                    value={summary?.completedCount ?? "--"}
                    statusLabel={summary?.scheduledCount !== undefined ? `${summary.scheduledCount} scheduled` : undefined}
                    isLoading={summaryLoading}
                />
                <KPICard
                    title="Acceptance Rate"
                    value={decisions ? decisions.acceptanceRate.toFixed(1) : "--"}
                    unit="%"
                    status={decisions ? (decisions.acceptanceRate >= 80 ? "ok" : decisions.acceptanceRate >= 60 ? "warning" : "danger") : undefined}
                    statusLabel={decisions ? `${decisions.totalDecisions} decisions` : undefined}
                    isLoading={decisionsLoading}
                />
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
                                            <Tooltip formatter={(value) => typeof value === 'number' ? `${value} min` : String(value)} />
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
                                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
                    {/* Weekly Congestion Heatmap — weekday × hour-of-day */}
                    <div className="charts-grid charts-grid-full">
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title"><Grid3x3 size={16} /> Weekly Congestion Heatmap</h3>
                                <span className="chart-subtitle">total movements (entries + exits) · last 7 days</span>
                            </div>
                            {hourlyVolume.length === 0 ? (
                                <div className="chart-empty"><span>No hourly volume for this week</span></div>
                            ) : (
                                <div className="heatmap">
                                    <div className="heatmap-hours">
                                        <span className="heatmap-corner" />
                                        {Array.from({ length: 24 }, (_, h) => (
                                            <span key={h} className="heatmap-hour-label">{h % 3 === 0 ? `${h}h` : ""}</span>
                                        ))}
                                    </div>
                                    {heatmap.grid.map((row, wd) => (
                                        <div key={wd} className="heatmap-row">
                                            <span className="heatmap-day-label">{HEATMAP_WEEKDAYS[wd]}</span>
                                            {row.map((v, h) => (
                                                <div
                                                    key={h}
                                                    className="heatmap-cell"
                                                    style={{ background: heatColor(v / heatmap.max) }}
                                                    title={`${HEATMAP_WEEKDAYS[wd]} ${String(h).padStart(2, "0")}:00 — ${v} movements`}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                    <div className="heatmap-legend">
                                        <span>Quieter</span>
                                        <span className="heatmap-legend-bar" />
                                        <span>Busier</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Estimated Occupancy vs Capacity */}
                    <div className="charts-grid charts-grid-full">
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title"><Activity size={16} /> Estimated Occupancy vs Capacity</h3>
                                <span className="chart-subtitle">
                                    anchored to current in-port count ({liveSummary?.trucksInPort ?? "--"}) · peak {peakOccupancy}{capacity ? ` / ${capacity}` : ""}
                                </span>
                            </div>
                            <div className="chart-container" style={{ height: 300 }}>
                                {occupancyData.length === 0 ? (
                                    <div className="chart-empty"><span>No occupancy data available</span></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={occupancyData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 10 }}
                                                interval={Math.max(0, Math.floor(occupancyData.length / 8))}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11 }}
                                                domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, capacity * 1.1))]}
                                            />
                                            <Tooltip
                                                formatter={(value) => [
                                                    `${value} trucks${capacity ? ` (${Math.round((Number(value) / capacity) * 100)}% cap.)` : ""}`,
                                                    "In port",
                                                ]}
                                            />
                                            <Area type="monotone" dataKey="occupancy" stroke="#0277BD" fill="rgba(2,119,189,0.18)" strokeWidth={2} name="In port" />
                                            {capacity > 0 && (
                                                <ReferenceLine y={capacity} stroke="#ef4444" strokeDasharray="6 4"
                                                    label={{ value: `Capacity ${capacity}`, fill: "#ef4444", fontSize: 11, position: "insideTopRight" }} />
                                            )}
                                            {capacity > 0 && (
                                                <ReferenceLine y={capacity * 0.8} stroke="#f59e0b" strokeDasharray="3 3"
                                                    label={{ value: "80%", fill: "#f59e0b", fontSize: 10, position: "insideBottomRight" }} />
                                            )}
                                        </ComposedChart>
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
