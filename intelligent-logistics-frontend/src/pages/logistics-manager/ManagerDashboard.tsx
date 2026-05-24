import { useState, useMemo, useCallback } from "react";
import "./manager-dashboard.css";
import "react-grid-layout/css/styles.css";

import { GridLayout, useContainerWidth } from "react-grid-layout";
import type { LayoutItem } from "react-grid-layout";
import {
    LayoutDashboard, RefreshCw, RotateCcw, Truck, AlertCircle,
    Leaf, BarChart3, Users, Clock,
    CheckCircle, Settings, Eye, EyeOff, X, GripVertical, Pencil, Check,
    Bell, TrendingUp, Zap, ShieldAlert,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import { useSummaryStats, useVolumeData, useSustainabilitySummary, useActiveAlerts, useSustainabilityTrend } from "@/hooks/useStatistics";
import { getArrivals } from "@/services/arrivals";
import { getShifts } from "@/services/workers";
import type { Appointment, PaginatedResponse } from "@/types/types";
import type { ShiftListItem } from "@/services/workers";
import { labelForStatus } from "@/lib/statusLabel";
import KPICard from "@/components/logistics-manager/KPICard";
import AppointmentDetailModal from "@/components/common/AppointmentDetailModal";
import Co2TrendChart from "@/components/common/Co2TrendChart";

// ── Grid setup ────────────────────────────────────────────────────────────────

type Layout = LayoutItem;

const ROW_HEIGHT = 56;
const COLS = 12;
const MARGIN: readonly [number, number] = [14, 14];

// Default-visible widgets layout
const DEFAULT_LAYOUT: Layout[] = [
    { i: "summary_stats",        x: 0, y: 0,  w: 12, h: 2 },
    { i: "arrivals_today",       x: 0, y: 2,  w: 6,  h: 11 },
    { i: "sustainability_trend", x: 6, y: 2,  w: 6,  h: 11 },
    { i: "co2_today",            x: 0, y: 13, w: 4,  h: 7 },
    { i: "performance_trend",    x: 4, y: 13, w: 4,  h: 7 },
    { i: "active_shifts",        x: 8, y: 13, w: 4,  h: 7 },
    // Optional widgets (off by default, placed below)
    { i: "recent_alerts",        x: 0, y: 20, w: 5,  h: 7 },
    { i: "sla_overview",         x: 5, y: 20, w: 4,  h: 7 },
    { i: "peak_hour",            x: 9, y: 20, w: 3,  h: 7 },
];

const LAYOUT_KEY = "manager_dashboard_layout_v6";
const PREFS_KEY  = "manager_dashboard_prefs_v2";

// ── Layout persistence ────────────────────────────────────────────────────────

function loadLayout(): Layout[] {
    try {
        const raw = localStorage.getItem(LAYOUT_KEY);
        if (!raw) return DEFAULT_LAYOUT;
        const saved = JSON.parse(raw) as Layout[];
        return DEFAULT_LAYOUT.map(def => ({
            ...def,
            ...(saved.find(s => s.i === def.i) ?? {}),
        }));
    } catch {
        return DEFAULT_LAYOUT;
    }
}

function saveLayout(l: Layout[]) {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(l));
}

// ── Visibility preferences ────────────────────────────────────────────────────

type WidgetId =
    | "summary_stats"
    | "arrivals_today"
    | "sustainability_trend"
    | "co2_today"
    | "performance_trend"
    | "active_shifts"
    | "recent_alerts"
    | "sla_overview"
    | "peak_hour";

type Prefs = Record<WidgetId, boolean>;

const DEFAULT_PREFS: Prefs = {
    summary_stats: true,
    arrivals_today: true,
    sustainability_trend: true,
    co2_today: true,
    performance_trend: true,
    active_shifts: true,
    // Optional — off by default
    recent_alerts: false,
    sla_overview: false,
    peak_hour: false,
};

function loadPrefs(): Prefs {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (!raw) return DEFAULT_PREFS;
        return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
    } catch {
        return DEFAULT_PREFS;
    }
}

function savePrefs(p: Prefs) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }

// ── Date helpers ──────────────────────────────────────────────────────────────

function getToday()    { return new Date().toISOString().split("T")[0]; }
function getWeekStart() {
    const d = new Date(), day = d.getDay(), mon = new Date(d);
    mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    return mon.toISOString().split("T")[0];
}
function get24hAgo() { return new Date(Date.now() - 86_400_000).toISOString().split("T")[0]; }

// ── Status badge helper ───────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
    switch (status) {
        case "completed":    return "db-badge db-badge-success";
        case "in_process":
        case "leaving_port": return "db-badge db-badge-info";
        case "in_transit":   return "db-badge db-badge-warning";
        case "scheduled":    return "db-badge db-badge-accent";
        default:             return "db-badge db-badge-neutral";
    }
}

function alertTypeLabel(type: string): string {
    switch (type) {
        case "HAZMAT":         return "Hazmat";
        case "HIGHWAY_INFRACTION": return "Infraction";
        case "SPEEDING":       return "Speeding";
        case "UNAUTHORIZED":   return "Unauthorized";
        default:               return type.replace(/_/g, " ");
    }
}

function alertTypeClass(type: string): string {
    switch (type) {
        case "HAZMAT":         return "db-badge db-badge-danger-strong";
        case "HIGHWAY_INFRACTION": return "db-badge db-badge-warning";
        default:               return "db-badge db-badge-neutral";
    }
}

// ── Shared states ─────────────────────────────────────────────────────────────

function CardLoading() {
    return (
        <div className="db-loading-rows">
            {[0, 1, 2, 3].map(i => <div key={i} className="db-skel-row"><div className="db-skel" /></div>)}
        </div>
    );
}

function CardError({ msg }: { msg: string }) {
    return (
        <div className="db-err-state">
            <AlertCircle size={16} />
            <span>{msg}</span>
        </div>
    );
}

function CardEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="db-empty-state">
            {icon}
            <span>{text}</span>
        </div>
    );
}

const CHART_TOOLTIP = {
    contentStyle: {
        background: "#1e293b",
        border: "1px solid rgba(148,163,184,0.15)",
        borderRadius: "8px",
        fontSize: "12px",
        color: "#f1f5f9",
    },
    labelStyle: { color: "#94a3b8", marginBottom: "4px" },
    itemStyle: { color: "#f1f5f9" },
};

// ── Widget: Summary Stats ─────────────────────────────────────────────────────

function SummaryStatsWidget() {
    const { data: s, isLoading, isError } = useSummaryStats();
    if (isError) return <CardError msg="Failed to load port statistics" />;
    // trucksInTransit from backend = on-time in_transit only
    // trucksInTransitDelayed = delayed (in_transit + scheduled past cutoff)
    const transitTotal = (s?.trucksInTransit ?? 0) + (s?.trucksInTransitDelayed ?? 0);
    return (
        <div className="kpi-grid db-kpi-six-col">
            <KPICard
                title="In Port"
                value={s?.trucksInPort ?? "--"}
                statusLabel={s ? `${s.unloadingCount} unloading` : undefined}
                isLoading={isLoading}
            />
            <KPICard
                title="In Transit"
                value={isLoading ? "--" : transitTotal}
                status={s?.trucksInTransitDelayed ? "warning" : "ok"}
                statusLabel={s?.trucksInTransitDelayed
                    ? `${s.trucksInTransitDelayed} delayed`
                    : s ? "all on time" : undefined}
                isLoading={isLoading}
            />
            <KPICard
                title="Entries Today"
                value={s?.entriesCount ?? "--"}
                statusLabel={s ? `${s.exitsCount} exits` : undefined}
                isLoading={isLoading}
            />
            <KPICard
                title="Avg Wait"
                value={s ? Math.round(s.avgWaitingMinutes) : "--"}
                unit="min"
                status={s ? (s.avgWaitingMinutes <= 15 ? "ok" : s.avgWaitingMinutes <= 30 ? "warning" : "danger") : undefined}
                statusLabel={s ? (s.avgWaitingMinutes <= 15 ? "Good" : s.avgWaitingMinutes <= 30 ? "Moderate" : "Critical") : undefined}
                isLoading={isLoading}
            />
            <KPICard
                title="Congestion"
                value={s ? `${s.congestionRate}%` : "--"}
                status={s ? (s.congestionRate < 60 ? "ok" : s.congestionRate < 85 ? "warning" : "danger") : undefined}
                statusLabel={s ? (s.congestionRate < 60 ? "Normal" : s.congestionRate < 85 ? "Moderate" : "High") : undefined}
                isLoading={isLoading}
            />
            <KPICard
                title="Infractions"
                value={s?.infractionCount ?? "--"}
                status={s ? (s.infractionCount === 0 ? "ok" : "danger") : undefined}
                statusLabel={s ? (s.infractionCount === 0 ? "None" : "Review required") : undefined}
                isLoading={isLoading}
            />
        </div>
    );
}

// ── Widget: Arrivals Today ────────────────────────────────────────────────────

function ArrivalsWidget() {
    const today = useMemo(getToday, []);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const { data, isLoading, isError } = useQuery<PaginatedResponse<Appointment>>({
        queryKey: ["arrivals", "today", today],
        queryFn: () => getArrivals({ scheduled_date: today, limit: 50, page: 1 }),
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
    const items = data?.items ?? [];

    return (
        <>
            <div className="data-table db-fill-card">
                <div className="data-table-header">
                    <div className="db-widget-title">
                        <Truck size={15} />
                        <span className="data-table-title">Today's Arrivals</span>
                        {data && <span className="db-count-badge">{data.total}</span>}
                    </div>
                    <span className="db-live-dot" title="Auto-updating" />
                </div>

                {isLoading ? (
                    <div style={{ padding: "1rem 1.25rem" }}><CardLoading /></div>
                ) : isError ? (
                    <div style={{ padding: "1rem 1.25rem" }}><CardError msg="Failed to load arrivals" /></div>
                ) : items.length === 0 ? (
                    <div style={{ padding: "2rem 1.25rem" }}><CardEmpty icon={<CheckCircle size={24} />} text="No arrivals registered today" /></div>
                ) : (
                    <div className="table-responsive db-table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Plate</th>
                                    <th>Carrier</th>
                                    <th>Status</th>
                                    <th>Scheduled</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(apt => (
                                    <tr
                                        key={apt.id}
                                        className="db-row-clickable"
                                        onClick={() => setSelectedId(apt.id)}
                                        title="Click for details"
                                    >
                                        <td><span className="db-plate-cell">{apt.truck_license_plate}</span></td>
                                        <td className="db-company-cell">{apt.truck?.company?.name ?? apt.truck?.company_nif ?? "—"}</td>
                                        <td><span className={statusBadgeClass(apt.status)}>{labelForStatus(apt.status)}</span></td>
                                        <td className="db-time-cell">
                                            {apt.scheduled_start_time
                                                ? new Date(apt.scheduled_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <AppointmentDetailModal
                appointmentId={selectedId}
                onClose={() => setSelectedId(null)}
            />
        </>
    );
}

// ── Widget: Sustainability Trend ──────────────────────────────────────────────

function SustainabilityTrendWidget() {
    const today    = useMemo(getToday, []);
    const weekFrom = useMemo(getWeekStart, []);

    const { data: weekly } = useSustainabilitySummary(weekFrom, today);
    const { data: trend = [], isLoading, isError } = useSustainabilityTrend("month", 6);

    const trendDir = trend.length >= 2
        ? trend[trend.length - 1].total_co2_kg - trend[trend.length - 2].total_co2_kg
        : 0;

    return (
        <div className="chart-card db-fill-card">
            <div className="chart-header">
                <div className="db-widget-title">
                    <Leaf size={15} />
                    <h3 className="chart-title">Sustainability</h3>
                </div>
            </div>
            <div className="db-card-body db-sus-body">
                {/* KPI row — 4 metrics */}
                <div className="db-sus-kpis">
                    <div className="db-sus-kpi">
                        <span className="db-sus-kpi-label">CO₂ This Week</span>
                        <span className="db-sus-kpi-val" style={{ color: "var(--color-success)" }}>
                            {weekly ? weekly.total_co2_kg_estimate.toFixed(1) : "--"}
                            <span className="db-sus-kpi-unit">kg</span>
                        </span>
                    </div>
                    <div className="db-sus-kpi">
                        <span className="db-sus-kpi-label">Avg Wait</span>
                        <span className="db-sus-kpi-val">
                            {weekly ? Math.round(weekly.avg_waiting_minutes) : "--"}
                            <span className="db-sus-kpi-unit">min</span>
                        </span>
                    </div>
                    <div className="db-sus-kpi">
                        <span className="db-sus-kpi-label">Delayed</span>
                        <span className="db-sus-kpi-val" style={{
                            color: weekly?.trucks_delayed ? "var(--color-warning)" : "var(--color-success)"
                        }}>
                            {weekly?.trucks_delayed ?? "--"}
                        </span>
                    </div>
                    <div className="db-sus-kpi">
                        <span className="db-sus-kpi-label">kg / truck</span>
                        <span className="db-sus-kpi-val">
                            {weekly ? weekly.avg_co2_per_truck_kg.toFixed(2) : "--"}
                        </span>
                    </div>
                </div>

                {/* CO₂ trend chart */}
                <div className="db-sus-chart-label">
                    CO₂ last 6 months · kg/month
                    {trend.length >= 2 && (
                        <span style={{ marginLeft: "0.5rem", color: trendDir <= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                            {trendDir <= 0 ? "↓" : "↑"} vs prev
                        </span>
                    )}
                </div>
                <Co2TrendChart data={trend} isLoading={isLoading} isError={isError} />

                {/* Wait distribution mini-histogram */}
                {weekly?.wait_distribution && (
                    <>
                        <div className="db-sus-chart-label" style={{ marginTop: "0.5rem" }}>
                            Wait distribution · this week
                        </div>
                        <div className="db-sus-waitdist">
                            {(
                                [
                                    { label: "0 – 5 min",   count: weekly.wait_distribution["0_5"],   color: "#4ade80" },
                                    { label: "5 – 15 min",  count: weekly.wait_distribution["5_15"],  color: "#29b6f6" },
                                    { label: "15 – 30 min", count: weekly.wait_distribution["15_30"], color: "#ffa726" },
                                    { label: "> 30 min",    count: weekly.wait_distribution.over_30,  color: "#ef5350" },
                                ] as const
                            ).map(b => {
                                const maxCount = Math.max(
                                    weekly.wait_distribution!["0_5"],
                                    weekly.wait_distribution!["5_15"],
                                    weekly.wait_distribution!["15_30"],
                                    weekly.wait_distribution!.over_30,
                                    1,
                                );
                                const pct = (b.count / maxCount) * 100;
                                return (
                                    <div key={b.label} className="db-sus-waitrow">
                                        <span className="db-sus-waitlabel">{b.label}</span>
                                        <div className="db-sus-waittrack">
                                            <div className="db-sus-waitbar" style={{ width: `${pct}%`, background: b.color }} />
                                        </div>
                                        <span className="db-sus-waitcount" style={{ color: b.color }}>{b.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <span className="db-co2-method">ICCT HDV 2023 · 0.84 kg CO₂/h idling</span>
            </div>
        </div>
    );
}

// ── Widget: CO₂ This Week ─────────────────────────────────────────────────────

function Co2Widget() {
    const today    = useMemo(getToday, []);
    const weekFrom = useMemo(getWeekStart, []);
    const { data, isLoading, isError } = useSustainabilitySummary(weekFrom, today);

    return (
        <div className="chart-card db-fill-card">
            <div className="chart-header">
                <div className="db-widget-title">
                    <Leaf size={15} />
                    <h3 className="chart-title">CO₂ This Week</h3>
                </div>
            </div>
            <div className="db-card-body">
                {isLoading ? <CardLoading /> : isError ? <CardError msg="Data unavailable" /> : (
                    <div className="db-co2-body">
                        <div className="db-big-metric">
                            <span className="db-big-num" style={{ color: "var(--color-success)" }}>
                                {data ? data.total_co2_kg_estimate.toFixed(1) : "--"}
                            </span>
                            <span className="db-big-label">kg CO₂ estimated</span>
                        </div>
                        <div className="db-co2-stats">
                            <div className="db-co2-stat">
                                <Clock size={13} />
                                <span>Avg wait</span>
                                <strong>{data ? `${Math.round(data.avg_waiting_minutes)} min` : "--"}</strong>
                            </div>
                            <div className="db-co2-stat">
                                <Truck size={13} />
                                <span>Processed</span>
                                <strong>{data?.trucks_processed ?? "--"}</strong>
                            </div>
                            <div className="db-co2-stat">
                                <ShieldAlert size={13} />
                                <span>&gt;15 min delay</span>
                                <strong>{data?.trucks_delayed ?? "--"}</strong>
                            </div>
                        </div>
                        <span className="db-co2-method">ICCT HDV 2023 · 0.84 kg CO₂/h</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Widget: Traffic Trend ─────────────────────────────────────────────────────

function TrendWidget() {
    const today   = useMemo(getToday, []);
    const from24h = useMemo(get24hAgo, []);
    const { data: volume = [], isLoading, isError } = useVolumeData(from24h, today, "hour");

    const chartData = useMemo(() =>
        volume.map(d => ({
            hour: `${new Date(d.timestamp).getHours()}h`,
            Entries: d.entries,
            Exits: d.exits,
        })), [volume]);

    const totalIn  = volume.reduce((s, d) => s + d.entries, 0);
    const totalOut = volume.reduce((s, d) => s + d.exits, 0);

    return (
        <div className="chart-card db-fill-card">
            <div className="chart-header">
                <div className="db-widget-title">
                    <BarChart3 size={15} />
                    <h3 className="chart-title">Traffic (24h)</h3>
                </div>
                <div className="db-trend-totals">
                    <span style={{ color: "#38bdf8" }}>↑ {totalIn}</span>
                    <span style={{ color: "#22c55e" }}>↓ {totalOut}</span>
                </div>
            </div>
            <div className="db-card-body db-chart-body">
                {isLoading ? (
                    <div className="db-chart-placeholder"><RefreshCw size={20} style={{ opacity: 0.3 }} /></div>
                ) : isError ? (
                    <CardError msg="Traffic data unavailable" />
                ) : chartData.length === 0 ? (
                    <CardEmpty icon={<BarChart3 size={22} />} text="No data in the last 24h" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="g-entries" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="g-exits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#64748b" }} interval={3} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <Tooltip {...CHART_TOOLTIP} />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            <Area type="monotone" dataKey="Entries" stroke="#38bdf8" strokeWidth={1.5} fill="url(#g-entries)" dot={false} />
                            <Area type="monotone" dataKey="Exits"   stroke="#22c55e" strokeWidth={1.5} fill="url(#g-exits)"   dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

// ── Widget: Active Shifts ─────────────────────────────────────────────────────

function ShiftsWidget() {
    const today = useMemo(getToday, []);
    const { data: shifts = [], isLoading, isError } = useQuery<ShiftListItem[]>({
        queryKey: ["shifts", "today", today],
        queryFn: () => getShifts({ targetDate: today }),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
    const active = shifts.filter(s => s.status === "active");

    const shiftLabel = (t: string) => t === "MORNING" ? "Morning" : t === "AFTERNOON" ? "Afternoon" : "Night";
    const shiftColor = (t: string) => t === "MORNING" ? "#f59e0b" : t === "NIGHT" ? "#38bdf8" : "#0277BD";

    return (
        <div className="chart-card db-fill-card">
            <div className="chart-header">
                <div className="db-widget-title">
                    <Users size={15} />
                    <h3 className="chart-title">Active Shifts</h3>
                    {active.length > 0 && <span className="db-count-badge">{active.length}</span>}
                </div>
            </div>
            <div className="db-card-body">
                {isLoading ? <CardLoading /> : isError ? <CardError msg="Failed to load shifts" /> : active.length === 0 ? (
                    <CardEmpty icon={<Users size={22} />} text="No active shifts" />
                ) : (
                    <div className="db-shift-list">
                        {active.map(shift => (
                            <div key={shift.id} className="db-shift-row">
                                <div className="db-shift-info">
                                    <span className="db-plate-cell">{shift.gateName}</span>
                                    <span className="db-company-cell">{shift.operatorName}</span>
                                </div>
                                <span className="db-shift-chip" style={{ color: shiftColor(shift.shiftType), borderColor: shiftColor(shift.shiftType) }}>
                                    {shiftLabel(shift.shiftType)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Widget: Recent Alerts (optional) ─────────────────────────────────────────

function RecentAlertsWidget() {
    const { data: alerts = [], isLoading, isError } = useActiveAlerts(12);

    return (
        <div className="chart-card db-fill-card">
            <div className="chart-header">
                <div className="db-widget-title">
                    <Bell size={15} />
                    <h3 className="chart-title">Recent Alerts</h3>
                    {alerts.length > 0 && <span className="db-count-badge db-count-badge--warn">{alerts.length}</span>}
                </div>
                <span className="db-live-dot" />
            </div>
            <div className="db-card-body">
                {isLoading ? <CardLoading /> : isError ? <CardError msg="Failed to load alerts" /> : alerts.length === 0 ? (
                    <CardEmpty icon={<CheckCircle size={22} />} text="No active alerts" />
                ) : (
                    <div className="db-alert-list">
                        {alerts.map(alert => (
                            <div key={alert.id} className="db-alert-row">
                                <div className="db-alert-row-top">
                                    <span className={alertTypeClass(alert.type)}>{alertTypeLabel(alert.type)}</span>
                                    <span className="db-time-cell">
                                        {new Date(alert.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                {alert.description && (
                                    <p className="db-alert-desc">{alert.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Widget: SLA Overview (optional) ──────────────────────────────────────────

function SlaOverviewWidget() {
    const { data: s, isLoading, isError } = useSummaryStats();

    return (
        <div className="chart-card db-fill-card">
            <div className="chart-header">
                <div className="db-widget-title">
                    <TrendingUp size={15} />
                    <h3 className="chart-title">SLA Overview</h3>
                </div>
            </div>
            <div className="db-card-body">
                {isLoading ? <CardLoading /> : isError ? <CardError msg="Data unavailable" /> : (
                    <div className="db-sla-body">
                        <div className="db-sla-metric">
                            <span className="db-sla-label">SLA Compliance</span>
                            <span className="db-sla-value" style={{
                                color: !s ? undefined : s.slaCompliance >= 90 ? "var(--color-success)" : s.slaCompliance >= 70 ? "var(--color-warning)" : "var(--color-danger)"
                            }}>
                                {s ? `${s.slaCompliance}%` : "--"}
                            </span>
                        </div>
                        <div className="db-sla-metric">
                            <span className="db-sla-label">Delay Rate</span>
                            <span className="db-sla-value" style={{
                                color: !s ? undefined : s.delayRate < 10 ? "var(--color-success)" : s.delayRate < 25 ? "var(--color-warning)" : "var(--color-danger)"
                            }}>
                                {s ? `${s.delayRate}%` : "--"}
                            </span>
                        </div>
                        <div className="db-sla-metric">
                            <span className="db-sla-label">Avg Permanence</span>
                            <span className="db-sla-value">{s ? `${Math.round(s.avgPermanenceMinutes)} min` : "--"}</span>
                        </div>
                        <div className="db-sla-metric">
                            <span className="db-sla-label">Throughput</span>
                            <span className="db-sla-value">{s ? `${s.vehiclesPerHour.toFixed(1)}/h` : "--"}</span>
                        </div>
                        <div className="db-sla-metric">
                            <span className="db-sla-label">Port Capacity</span>
                            <span className="db-sla-value">{s ? `${s.portCapacity} slots` : "--"}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Widget: Peak Hour (optional) ──────────────────────────────────────────────

function PeakHourWidget() {
    const { data: s, isLoading, isError } = useSummaryStats();

    return (
        <div className="chart-card db-fill-card">
            <div className="chart-header">
                <div className="db-widget-title">
                    <Zap size={15} />
                    <h3 className="chart-title">Peak Hour</h3>
                </div>
            </div>
            <div className="db-card-body">
                {isLoading ? <CardLoading /> : isError ? <CardError msg="Data unavailable" /> : (
                    <div className="db-peak-body">
                        {s?.peakHour ? (
                            <>
                                <div className="db-big-metric">
                                    <span className="db-big-num" style={{ color: "var(--color-warning)" }}>
                                        {String(s.peakHour.hour).padStart(2, "0")}:00
                                    </span>
                                    <span className="db-big-label">{s.peakHour.count} entries</span>
                                </div>
                                <div className="db-peak-extra">
                                    <div className="db-sla-metric">
                                        <span className="db-sla-label">Vehicles/hour</span>
                                        <span className="db-sla-value">{s.vehiclesPerHour.toFixed(1)}</span>
                                    </div>
                                    <div className="db-sla-metric">
                                        <span className="db-sla-label">Scheduled</span>
                                        <span className="db-sla-value">{s.scheduledCount}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <CardEmpty icon={<Zap size={22} />} text="No peak hour data yet" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Widget registry ───────────────────────────────────────────────────────────

const WIDGET_META: { id: WidgetId; label: string; desc: string; icon: React.ReactNode; isDefault: boolean }[] = [
    { id: "summary_stats",        label: "Port KPIs",          desc: "6 real-time operational metrics",        icon: <LayoutDashboard size={14} />, isDefault: true },
    { id: "arrivals_today",       label: "Today's Arrivals",   desc: "Arrivals table with status",             icon: <Truck size={14} />,           isDefault: true },
    { id: "sustainability_trend", label: "Sustainability",      desc: "CO₂ trend (6 months) + week KPIs",      icon: <Leaf size={14} />,            isDefault: true },
    { id: "co2_today",            label: "CO₂ This Week",      desc: "Estimated CO₂ emissions summary",        icon: <Leaf size={14} />,            isDefault: true },
    { id: "performance_trend",    label: "Traffic (24h)",      desc: "Entries and exits chart by hour",        icon: <BarChart3 size={14} />,       isDefault: true },
    { id: "active_shifts",        label: "Active Shifts",      desc: "Shifts in progress by gate",             icon: <Users size={14} />,           isDefault: true },
    { id: "recent_alerts",        label: "Recent Alerts",      desc: "Live alert feed (hazmat, infractions…)", icon: <Bell size={14} />,            isDefault: false },
    { id: "sla_overview",         label: "SLA Overview",       desc: "SLA compliance, delay rate, throughput", icon: <TrendingUp size={14} />,      isDefault: false },
    { id: "peak_hour",            label: "Peak Hour",          desc: "Busiest hour of the day",                icon: <Zap size={14} />,             isDefault: false },
];

function renderWidget(id: WidgetId): React.ReactNode {
    switch (id) {
        case "summary_stats":        return <SummaryStatsWidget />;
        case "arrivals_today":       return <ArrivalsWidget />;
        case "sustainability_trend": return <SustainabilityTrendWidget />;
        case "co2_today":            return <Co2Widget />;
        case "performance_trend":    return <TrendWidget />;
        case "active_shifts":        return <ShiftsWidget />;
        case "recent_alerts":        return <RecentAlertsWidget />;
        case "sla_overview":         return <SlaOverviewWidget />;
        case "peak_hour":            return <PeakHourWidget />;
    }
}

// ── Customization Panel ───────────────────────────────────────────────────────

interface PanelProps {
    prefs: Prefs;
    onToggle: (id: WidgetId) => void;
    onReset: () => void;
    onClose: () => void;
}

function CustomizePanel({ prefs, onToggle, onReset, onClose }: PanelProps) {
    const defaultWidgets  = WIDGET_META.filter(w => w.isDefault);
    const optionalWidgets = WIDGET_META.filter(w => !w.isDefault);

    return (
        <>
            <div className="db-panel-backdrop" onClick={onClose} />
            <div className="db-panel">
                <div className="db-panel-hd">
                    <div className="db-panel-hd-title">
                        <Settings size={14} />
                        <span>Visible Widgets</span>
                    </div>
                    <button className="db-panel-close" onClick={onClose}><X size={16} /></button>
                </div>
                <p className="db-panel-hint">Toggle widgets on or off. Use "Edit Layout" to drag and resize.</p>

                <p className="db-panel-section-label">Default</p>
                <div className="db-panel-list">
                    {defaultWidgets.map(w => (
                        <div key={w.id} className="db-panel-row">
                            <div className="db-panel-row-info">
                                <span className="db-panel-row-icon">{w.icon}</span>
                                <div>
                                    <span className="db-panel-row-label">{w.label}</span>
                                    <span className="db-panel-row-desc">{w.desc}</span>
                                </div>
                            </div>
                            <button
                                className={`db-panel-toggle ${prefs[w.id] ? "on" : ""}`}
                                onClick={() => onToggle(w.id)}
                                title={prefs[w.id] ? "Hide" : "Show"}
                            >
                                {prefs[w.id] ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                        </div>
                    ))}
                </div>

                <p className="db-panel-section-label">Optional</p>
                <div className="db-panel-list">
                    {optionalWidgets.map(w => (
                        <div key={w.id} className="db-panel-row">
                            <div className="db-panel-row-info">
                                <span className="db-panel-row-icon">{w.icon}</span>
                                <div>
                                    <span className="db-panel-row-label">{w.label}</span>
                                    <span className="db-panel-row-desc">{w.desc}</span>
                                </div>
                            </div>
                            <button
                                className={`db-panel-toggle ${prefs[w.id] ? "on" : ""}`}
                                onClick={() => onToggle(w.id)}
                                title={prefs[w.id] ? "Hide" : "Show"}
                            >
                                {prefs[w.id] ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="db-panel-ft">
                    <button className="db-btn db-btn-ghost db-btn-sm" onClick={onReset}>
                        <RotateCcw size={13} /> Reset
                    </button>
                    <button className="db-btn db-btn-primary db-btn-sm" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
    const [prefs,     setPrefs]     = useState<Prefs>(loadPrefs);
    const [layout,    setLayout]    = useState<Layout[]>(loadLayout);
    const [editMode,  setEditMode]  = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const queryClient = useQueryClient();
    const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["statistics"] });
        queryClient.invalidateQueries({ queryKey: ["arrivals"] });
        queryClient.invalidateQueries({ queryKey: ["shifts"] });
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
    };

    const toggleWidget = (id: WidgetId) => {
        setPrefs(prev => {
            const next = { ...prev, [id]: !prev[id] };
            savePrefs(next);
            return next;
        });
    };

    const resetAll = () => {
        savePrefs(DEFAULT_PREFS);
        saveLayout(DEFAULT_LAYOUT);
        setPrefs(DEFAULT_PREFS);
        setLayout(DEFAULT_LAYOUT);
    };

    const handleLayoutChange = useCallback((newLayout: readonly Layout[]) => {
        setLayout(prev => {
            const updated = prev.map(item => {
                const change = newLayout.find(n => n.i === item.i);
                return change ? { ...item, x: change.x, y: change.y, w: change.w, h: change.h } : item;
            });
            saveLayout(updated);
            return updated;
        });
    }, []);

    const visibleLayout = layout.filter(item => prefs[item.i as WidgetId]);
    const anyVisible = visibleLayout.length > 0;

    return (
        <>
            <div className="db-page">
                {/* ── Header ── */}
                <div className="db-header">
                    <div className="db-header-left">
                        <LayoutDashboard size={18} className="db-header-icon" />
                        <div>
                            <h1 className="db-title">Dashboard</h1>
                            <span className="db-subtitle">Real-time port operations overview</span>
                        </div>
                    </div>
                    <div className="db-header-actions">
                        {editMode ? (
                            <>
                                <span className="db-edit-hint">Drag headers to reposition · Resize from corner</span>
                                <button className="db-btn db-btn-ghost db-btn-sm" onClick={resetAll} title="Reset layout and visibility">
                                    <RotateCcw size={13} /> Reset
                                </button>
                                <button className="db-btn db-btn-primary" onClick={() => setEditMode(false)}>
                                    <Check size={14} /> Done
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="db-btn db-btn-ghost db-btn-icon" onClick={handleRefresh} title="Refresh data">
                                    <RefreshCw size={15} />
                                </button>
                                <button className="db-btn db-btn-secondary" onClick={() => setPanelOpen(true)}>
                                    <Eye size={14} />
                                    <span>Widgets</span>
                                </button>
                                <button className="db-btn db-btn-secondary" onClick={() => setEditMode(true)}>
                                    <Pencil size={14} />
                                    <span>Edit Layout</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Edit mode banner ── */}
                {editMode && (
                    <div className="db-edit-banner">
                        <GripVertical size={14} />
                        <span>Edit mode — drag by the card handle to reposition, resize from the bottom-right corner.</span>
                    </div>
                )}

                {/* ── Grid ── */}
                <div className="db-grid-outer" ref={containerRef}>
                    {!anyVisible ? (
                        <div className="db-all-hidden">
                            <EyeOff size={32} style={{ opacity: 0.4 }} />
                            <p>All widgets are hidden.</p>
                            <button className="db-btn db-btn-secondary" onClick={resetAll}>
                                <RotateCcw size={14} /> Restore defaults
                            </button>
                        </div>
                    ) : mounted ? (
                        <GridLayout
                            layout={visibleLayout}
                            width={width}
                            gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: MARGIN }}
                            dragConfig={{ enabled: editMode, handle: ".db-drag-handle" }}
                            resizeConfig={{ enabled: editMode }}
                            onLayoutChange={handleLayoutChange}
                        >
                            {visibleLayout.map(item => (
                                <div key={item.i} className={`db-grid-item${editMode ? " db-grid-item--edit" : ""}`}>
                                    {editMode && (
                                        <div className="db-drag-handle">
                                            <GripVertical size={13} />
                                            <span>{WIDGET_META.find(w => w.id === item.i)?.label ?? item.i}</span>
                                        </div>
                                    )}
                                    <div className={`db-grid-content${editMode ? " db-grid-content--edit" : ""}`}>
                                        {renderWidget(item.i as WidgetId)}
                                    </div>
                                </div>
                            ))}
                        </GridLayout>
                    ) : null}
                </div>
            </div>

            {panelOpen && (
                <CustomizePanel
                    prefs={prefs}
                    onToggle={toggleWidget}
                    onReset={resetAll}
                    onClose={() => setPanelOpen(false)}
                />
            )}
        </>
    );
}
