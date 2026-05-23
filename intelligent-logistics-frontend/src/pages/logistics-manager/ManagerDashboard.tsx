import { useState, useCallback, useMemo } from "react";
import { ResponsiveGridLayout } from "react-grid-layout";
import type { Layout, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "./manager-dashboard.css";

import {
    LayoutDashboard, RefreshCw, GripVertical, RotateCcw, Save,
    Pencil, Truck, AlertCircle, Leaf, BarChart3, Users,
    Clock, ShieldAlert, TrendingUp, CheckCircle, Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { useSummaryStats, useVolumeData, useSustainabilitySummary, useSustainabilityTrend } from "@/hooks/useStatistics";
import { useInfractionArrivals } from "@/hooks/useArrivals";
import { getArrivals } from "@/services/arrivals";
import { getShifts } from "@/services/workers";
import type { Appointment, PaginatedResponse } from "@/types/types";
import type { ShiftListItem } from "@/services/workers";
import { labelForStatus } from "@/lib/statusLabel";


const STORAGE_KEY = "manager_dashboard_layout_v1";

const DEFAULT_LAYOUT: Layout[] = [
    { i: "summary_stats",       x: 0, y: 0,  w: 12, h: 4,  minW: 6, minH: 3 },
    { i: "arrivals_today",      x: 0, y: 4,  w: 5,  h: 10, minW: 3, minH: 5 },
    { i: "pending_infractions", x: 5, y: 4,  w: 4,  h: 5,  minW: 2, minH: 4 },
    { i: "performance_trend",   x: 5, y: 9,  w: 4,  h: 5,  minW: 3, minH: 4 },
    { i: "co2_today",           x: 9, y: 4,  w: 3,  h: 5,  minW: 2, minH: 4 },
    { i: "active_shifts",       x: 9, y: 9,  w: 3,  h: 5,  minW: 2, minH: 4 },
];

function loadLayout(): Layout[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_LAYOUT;
        const parsed = JSON.parse(raw) as Layout[];
        const ids = new Set(DEFAULT_LAYOUT.map(l => l.i));
        if (parsed.every(l => ids.has(l.i))) return parsed;
    } catch { /* ignore */ }
    return DEFAULT_LAYOUT;
}

function saveLayout(layout: Layout[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

// ── Shared widget card shell ──────────────────────────────────────────────────

interface WidgetCardProps {
    title: string;
    icon: React.ReactNode;
    editMode: boolean;
    children: React.ReactNode;
    className?: string;
}

function WidgetCard({ title, icon, editMode, children, className = "" }: WidgetCardProps) {
    return (
        <div className={`db-widget-card ${editMode ? "db-widget-edit" : ""} ${className}`}>
            <div className="db-widget-header">
                <div className="db-widget-title">
                    <span className="db-widget-icon">{icon}</span>
                    <span>{title}</span>
                </div>
                {editMode && (
                    <div className="db-widget-grip">
                        <GripVertical size={16} />
                    </div>
                )}
            </div>
            <div className="db-widget-body">{children}</div>
        </div>
    );
}

function WidgetSkeleton() {
    return (
        <div className="db-skeleton-wrap">
            <div className="db-skeleton db-skeleton-line" style={{ width: "60%", height: "14px" }} />
            <div className="db-skeleton db-skeleton-line" style={{ width: "40%", height: "36px", marginTop: "12px" }} />
            <div className="db-skeleton db-skeleton-line" style={{ width: "80%", height: "12px", marginTop: "10px" }} />
        </div>
    );
}

function WidgetError({ message }: { message: string }) {
    return (
        <div className="db-widget-error">
            <AlertCircle size={20} />
            <span>{message}</span>
        </div>
    );
}

// ── Widget: Summary Stats ─────────────────────────────────────────────────────

function SummaryStatsWidget({ editMode }: { editMode: boolean }) {
    const { data: summary, isLoading, isError } = useSummaryStats();

    if (isLoading) return (
        <WidgetCard title="Port Overview" icon={<LayoutDashboard size={15} />} editMode={editMode}>
            <div className="db-kpi-strip"><WidgetSkeleton /></div>
        </WidgetCard>
    );

    if (isError) return (
        <WidgetCard title="Port Overview" icon={<LayoutDashboard size={15} />} editMode={editMode}>
            <WidgetError message="Failed to load port stats" />
        </WidgetCard>
    );

    const kpis = [
        {
            label: "In Port", value: summary?.trucksInPort ?? "--",
            sub: `${summary?.unloadingCount ?? 0} unloading`,
            color: "var(--color-info)",
            icon: <Truck size={14} />,
        },
        {
            label: "In Transit", value: summary?.trucksInTransit ?? "--",
            sub: summary?.trucksInTransitDelayed ? `${summary.trucksInTransitDelayed} delayed` : "on time",
            color: summary?.trucksInTransitDelayed ? "var(--color-warning)" : "var(--color-success)",
            icon: <TrendingUp size={14} />,
        },
        {
            label: "Entries Today", value: summary?.entriesCount ?? "--",
            sub: `${summary?.exitsCount ?? 0} exits`,
            color: "var(--color-success)",
            icon: <CheckCircle size={14} />,
        },
        {
            label: "Avg Wait", value: summary ? `${Math.round(summary.avgWaitingMinutes)}` : "--",
            sub: "minutes",
            color: (summary?.avgWaitingMinutes ?? 0) > 25 ? "var(--color-danger)" : "var(--color-info)",
            icon: <Clock size={14} />,
        },
        {
            label: "Congestion", value: summary ? `${summary.congestionRate}%` : "--",
            sub: summary ? (summary.congestionRate < 60 ? "Normal" : summary.congestionRate < 85 ? "Moderate" : "High") : "--",
            color: !summary ? "var(--text-muted)" : summary.congestionRate < 60 ? "var(--color-success)" : summary.congestionRate < 85 ? "var(--color-warning)" : "var(--color-danger)",
            icon: <Zap size={14} />,
        },
        {
            label: "Infractions", value: summary?.infractionCount ?? "--",
            sub: summary?.infractionCount === 0 ? "Clear" : "View details",
            color: (summary?.infractionCount ?? 0) === 0 ? "var(--color-success)" : "var(--color-danger)",
            icon: <ShieldAlert size={14} />,
        },
    ];

    return (
        <WidgetCard title="Port Overview" icon={<LayoutDashboard size={15} />} editMode={editMode}>
            <div className="db-kpi-strip">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="db-kpi-pill">
                        <div className="db-kpi-pill-icon" style={{ color: kpi.color }}>
                            {kpi.icon}
                        </div>
                        <div className="db-kpi-pill-body">
                            <span className="db-kpi-pill-label">{kpi.label}</span>
                            <span className="db-kpi-pill-value" style={{ color: kpi.color }}>{kpi.value}</span>
                            <span className="db-kpi-pill-sub">{kpi.sub}</span>
                        </div>
                    </div>
                ))}
            </div>
        </WidgetCard>
    );
}

// ── Widget: Arrivals Today ────────────────────────────────────────────────────

function ArrivalsWidget({ editMode }: { editMode: boolean }) {
    const today = new Date().toISOString().split("T")[0];
    const { data, isLoading, isError } = useQuery<PaginatedResponse<Appointment>>({
        queryKey: ["arrivals", "today", today],
        queryFn: () => getArrivals({ limit: 20, page: 1 }),
        refetchInterval: 30_000,
        staleTime: 15_000,
    });

    const items = data?.items ?? [];

    return (
        <WidgetCard title="Today's Arrivals" icon={<Truck size={15} />} editMode={editMode}>
            {isLoading ? <WidgetSkeleton /> : isError ? <WidgetError message="Failed to load arrivals" /> : (
                <div className="db-list">
                    {items.length === 0 ? (
                        <div className="db-list-empty"><CheckCircle size={18} /><span>No arrivals today</span></div>
                    ) : items.map((apt) => (
                        <div key={apt.id} className="db-list-row">
                            <div className="db-list-row-left">
                                <span className="db-list-row-id">{apt.license_plate}</span>
                                <span className="db-list-row-sub">{apt.company_name ?? apt.company_nif}</span>
                            </div>
                            <span className={`db-status-badge db-status-${apt.status}`}>
                                {labelForStatus(apt.status)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </WidgetCard>
    );
}

// ── Widget: Pending Infractions ───────────────────────────────────────────────

function InfractionsWidget({ editMode }: { editMode: boolean }) {
    const { data, isLoading, isError } = useInfractionArrivals(1, 8);
    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    return (
        <WidgetCard title="Infractions" icon={<ShieldAlert size={15} />} editMode={editMode}>
            {isLoading ? <WidgetSkeleton /> : isError ? <WidgetError message="Failed to load infractions" /> : (
                <>
                    <div className="db-big-number">
                        <span className="db-big-num" style={{ color: total === 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                            {total}
                        </span>
                        <span className="db-big-num-label">flagged</span>
                    </div>
                    <div className="db-list db-list-compact">
                        {items.length === 0 ? (
                            <div className="db-list-empty"><CheckCircle size={16} /><span>No infractions</span></div>
                        ) : items.slice(0, 5).map((apt) => (
                            <div key={apt.id} className="db-list-row">
                                <span className="db-list-row-id">{apt.license_plate}</span>
                                <span className="db-infraction-dot" />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </WidgetCard>
    );
}

// ── Widget: CO₂ Today ────────────────────────────────────────────────────────

function Co2Widget({ editMode }: { editMode: boolean }) {
    const today = new Date().toISOString().split("T")[0];
    const { data, isLoading, isError } = useSustainabilitySummary(today, today);

    return (
        <WidgetCard title="CO₂ Today" icon={<Leaf size={15} />} editMode={editMode}>
            {isLoading ? <WidgetSkeleton /> : isError ? (
                <WidgetError message="Sustainability data unavailable" />
            ) : (
                <div className="db-co2-display">
                    <div className="db-co2-value">
                        <span className="db-big-num db-big-num-green">
                            {data ? data.total_co2_kg_estimate.toFixed(1) : "--"}
                        </span>
                        <span className="db-co2-unit">kg CO₂</span>
                    </div>
                    <div className="db-co2-meta">
                        <div className="db-co2-row">
                            <Clock size={12} />
                            <span>Avg wait: {data ? `${Math.round(data.avg_waiting_minutes)} min` : "--"}</span>
                        </div>
                        <div className="db-co2-row">
                            <Truck size={12} />
                            <span>{data?.trucks_processed ?? "--"} trucks processed</span>
                        </div>
                        <div className="db-co2-row">
                            <ShieldAlert size={12} />
                            <span>{data?.trucks_delayed ?? "--"} delayed (&gt;15 min)</span>
                        </div>
                    </div>
                    <p className="db-co2-method">ICCT HDV 2023 · 0.84 kg/h</p>
                </div>
            )}
        </WidgetCard>
    );
}

// ── Widget: Performance Trend ─────────────────────────────────────────────────

function PerformanceTrendWidget({ editMode }: { editMode: boolean }) {
    const { data: trend = [], isLoading, isError } = useSustainabilityTrend("day", 7);
    const maxCo2 = Math.max(...trend.map(p => p.total_co2_kg), 1);

    return (
        <WidgetCard title="CO₂ Trend (7d)" icon={<BarChart3 size={15} />} editMode={editMode}>
            {isLoading ? <WidgetSkeleton /> : isError ? <WidgetError message="Trend data unavailable" /> : (
                <div className="db-mini-chart">
                    {trend.length === 0 ? (
                        <div className="db-list-empty"><BarChart3 size={18} /><span>No data</span></div>
                    ) : trend.map((point) => {
                        const pct = Math.max((point.total_co2_kg / maxCo2) * 100, 4);
                        const label = new Date(point.period).toLocaleDateString("pt-PT", { weekday: "short" });
                        return (
                            <div key={point.period} className="db-bar-col">
                                <span className="db-bar-val">{point.total_co2_kg.toFixed(0)}</span>
                                <div className="db-bar-track">
                                    <div className="db-bar-fill" style={{ height: `${pct}%` }} />
                                </div>
                                <span className="db-bar-label">{label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </WidgetCard>
    );
}

// ── Widget: Active Shifts ─────────────────────────────────────────────────────

function ActiveShiftsWidget({ editMode }: { editMode: boolean }) {
    const today = new Date().toISOString().split("T")[0];
    const { data: shifts = [], isLoading, isError } = useQuery<ShiftListItem[]>({
        queryKey: ["shifts", "today", today],
        queryFn: () => getShifts({ targetDate: today }),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });

    const active = shifts.filter(s => s.status === "active");

    return (
        <WidgetCard title="Active Shifts" icon={<Users size={15} />} editMode={editMode}>
            {isLoading ? <WidgetSkeleton /> : isError ? <WidgetError message="Failed to load shifts" /> : (
                <div className="db-list db-list-compact">
                    {active.length === 0 ? (
                        <div className="db-list-empty"><Users size={18} /><span>No active shifts</span></div>
                    ) : active.map((shift) => (
                        <div key={shift.id} className="db-list-row">
                            <div className="db-list-row-left">
                                <span className="db-list-row-id">{shift.gateName}</span>
                                <span className="db-list-row-sub">{shift.operatorName}</span>
                            </div>
                            <span className={`db-shift-type db-shift-${shift.shiftType.toLowerCase()}`}>
                                {shift.shiftType === "MORNING" ? "Manhã" : shift.shiftType === "AFTERNOON" ? "Tarde" : "Noite"}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </WidgetCard>
    );
}

// ── Widget registry ───────────────────────────────────────────────────────────

type WidgetId = "summary_stats" | "arrivals_today" | "pending_infractions" | "co2_today" | "performance_trend" | "active_shifts";

function Widget({ id, editMode }: { id: WidgetId; editMode: boolean }) {
    switch (id) {
        case "summary_stats":       return <SummaryStatsWidget editMode={editMode} />;
        case "arrivals_today":      return <ArrivalsWidget editMode={editMode} />;
        case "pending_infractions": return <InfractionsWidget editMode={editMode} />;
        case "co2_today":           return <Co2Widget editMode={editMode} />;
        case "performance_trend":   return <PerformanceTrendWidget editMode={editMode} />;
        case "active_shifts":       return <ActiveShiftsWidget editMode={editMode} />;
    }
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
    const [editMode, setEditMode] = useState(false);
    const [layout, setLayout] = useState<Layout[]>(loadLayout);
    const [draftLayout, setDraftLayout] = useState<Layout[]>(layout);
    const queryClient = useQueryClient();

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["statistics"] });
        queryClient.invalidateQueries({ queryKey: ["arrivals"] });
        queryClient.invalidateQueries({ queryKey: ["shifts"] });
    };

    const enterEdit = () => {
        setDraftLayout(layout);
        setEditMode(true);
    };

    const saveEdit = useCallback(() => {
        saveLayout(draftLayout);
        setLayout(draftLayout);
        setEditMode(false);
    }, [draftLayout]);

    const resetLayout = () => {
        setDraftLayout(DEFAULT_LAYOUT);
    };

    const activeLayout = editMode ? draftLayout : layout;

    const layouts: Layouts = useMemo(() => ({
        lg: activeLayout,
        md: activeLayout.map(l => ({ ...l, w: Math.min(l.w, 8) })),
        sm: activeLayout.map(l => ({ ...l, x: 0, w: 6 })),
        xs: activeLayout.map(l => ({ ...l, x: 0, w: 4 })),
        xxs: activeLayout.map(l => ({ ...l, x: 0, w: 2 })),
    }), [activeLayout]);

    return (
        <div className="db-page">
            <div className="db-header">
                <div className="db-header-left">
                    <LayoutDashboard size={20} className="db-header-icon" />
                    <div>
                        <h1 className="db-title">Dashboard</h1>
                    </div>
                </div>
                <div className="db-header-actions">
                    {editMode ? (
                        <>
                            <button className="db-btn db-btn-ghost" onClick={resetLayout} title="Reset to default layout">
                                <RotateCcw size={15} />
                                <span>Repor layout</span>
                            </button>
                            <button className="db-btn db-btn-primary" onClick={saveEdit}>
                                <Save size={15} />
                                <span>Guardar</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="db-btn db-btn-ghost" onClick={handleRefresh} title="Refresh all data">
                                <RefreshCw size={15} />
                            </button>
                            <button className="db-btn db-btn-secondary" onClick={enterEdit}>
                                <Pencil size={15} />
                                <span>Personalizar</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {editMode && (
                <div className="db-edit-banner">
                    <GripVertical size={14} />
                    <span>Modo de edição — arrasta e redimensiona os widgets. Clica em <strong>Guardar</strong> para confirmar.</span>
                </div>
            )}

            <ResponsiveGridLayout
                className="db-grid"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={40}
                margin={[12, 12]}
                isDraggable={editMode}
                isResizable={editMode}
                onLayoutChange={(_current, all) => {
                    if (editMode) setDraftLayout(all.lg ?? _current);
                }}
                draggableHandle=".db-widget-grip"
            >
                {DEFAULT_LAYOUT.map((item) => (
                    <div key={item.i}>
                        <Widget id={item.i as WidgetId} editMode={editMode} />
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
}
