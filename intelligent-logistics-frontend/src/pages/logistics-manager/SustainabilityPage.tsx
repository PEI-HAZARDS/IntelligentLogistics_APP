import { useState, useMemo } from "react";
import {
    Leaf, Clock, AlertTriangle, Truck,
    ChevronDown, ChevronUp, RefreshCw, AlertCircle, Zap,
} from "lucide-react";
import GrafanaPanel from "@/components/common/GrafanaPanel";
import Co2TrendChart from "@/components/common/Co2TrendChart";
import { useQueryClient } from "@tanstack/react-query";
import { useSustainabilitySummary, useSustainabilityTrend } from "@/hooks/useStatistics";
import type { WaitDistribution } from "@/services/statistics";
import "./sustainability-page.css";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekStart(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    return mon.toISOString().split("T")[0];
}

function getToday(): string {
    return new Date().toISOString().split("T")[0];
}


// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ width = "100%", height = "14px", style = {} }: { width?: string; height?: string; style?: React.CSSProperties }) {
    return <span className="sus-skeleton" style={{ width, height, ...style }} />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string;
    value: string | number | null;
    unit?: string;
    sub?: string;
    icon: React.ReactNode;
    accent: "green" | "blue" | "orange" | "neutral";
    isLoading: boolean;
}

function KpiCard({ label, value, unit, sub, icon, accent, isLoading }: KpiCardProps) {
    return (
        <div className={`sus-kpi sus-kpi-${accent}`}>
            <div className="sus-kpi-header">
                <span className="sus-kpi-icon">{icon}</span>
                <span className="sus-kpi-label">{label}</span>
            </div>
            <div className="sus-kpi-value-row">
                {isLoading ? (
                    <Skeleton width="60%" height="2.2rem" />
                ) : (
                    <>
                        <span className="sus-kpi-value">{value ?? "--"}</span>
                        {unit && <span className="sus-kpi-unit">{unit}</span>}
                    </>
                )}
            </div>
            {sub && (
                <span className="sus-kpi-sub">
                    {isLoading ? <Skeleton width="50%" height="12px" /> : sub}
                </span>
            )}
        </div>
    );
}

// ── Waiting Time Histogram ────────────────────────────────────────────────────

interface HistoBucket {
    label: string;
    count: number;
    color: string;
}

function WaitingHistogram({ distribution, isLoading, isError }: {
    distribution: WaitDistribution | undefined;
    isLoading: boolean;
    isError: boolean;
}) {
    const buckets: HistoBucket[] = useMemo(() => {
        if (!distribution) return [];
        return [
            { label: "0 – 5 min",   count: distribution["0_5"],   color: "#4ade80" },
            { label: "5 – 15 min",  count: distribution["5_15"],  color: "#29b6f6" },
            { label: "15 – 30 min", count: distribution["15_30"], color: "#ffa726" },
            { label: "> 30 min",    count: distribution.over_30,  color: "#ef5350" },
        ];
    }, [distribution]);

    const maxCount = Math.max(...buckets.map(b => b.count), 1);

    if (isLoading) return (
        <div className="sus-histo-wrap sus-chart-loading">
            <RefreshCw size={20} className="sus-spin" />
            <span>Loading...</span>
        </div>
    );
    if (isError || !distribution) return (
        <div className="sus-histo-wrap sus-chart-empty">
            <AlertCircle size={18} /><span>No data available</span>
        </div>
    );

    return (
        <div className="sus-histo-wrap">
            {buckets.map((b) => {
                const pct = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
                return (
                    <div key={b.label} className="sus-histo-row">
                        <span className="sus-histo-label">{b.label}</span>
                        <div className="sus-histo-track">
                            <div
                                className="sus-histo-bar"
                                style={{
                                    width: `${pct}%`,
                                    background: b.color,
                                    boxShadow: `0 0 8px ${b.color}55`,
                                }}
                            />
                        </div>
                        <span className="sus-histo-count" style={{ color: b.color }}>
                            {b.count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ── Methodology Collapsible ───────────────────────────────────────────────────

function Methodology() {
    const [open, setOpen] = useState(false);
    return (
        <div className="sus-method">
            <button className="sus-method-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
                <span className="sus-method-title">
                    <Leaf size={14} />
                    Calculation Methodology
                </span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {open && (
                <div className="sus-method-body">
                    <div className="sus-method-formula">
                        CO₂ (kg) = wait_time (h) × 0.84 kg/h
                    </div>
                    <dl className="sus-method-dl">
                        <div>
                            <dt>Source</dt>
                            <dd>ICCT Heavy Duty Vehicles 2023 + EU JRC — Euro VI diesel HDV idling</dd>
                        </div>
                        <div>
                            <dt>Wait time</dt>
                            <dd>MAX(0, entry_time − scheduled_start_time) per appointment</dd>
                        </div>
                        <div>
                            <dt>Exclusions</dt>
                            <dd>Appointments without scheduled_start_time are excluded from the calculation</dd>
                        </div>
                        <div>
                            <dt>Emission factor</dt>
                            <dd>0.84 kg CO₂/h per Euro VI truck idling (conservative estimate)</dd>
                        </div>
                    </dl>
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SustainabilityPage() {
    const weekFrom = useMemo(getWeekStart, []);
    const today    = useMemo(getToday, []);
    // yearFrom reserved for future annual trend endpoint

    const queryClient = useQueryClient();

    const {
        data: weekly,
        isLoading: weeklyLoading,
        isError: weeklyError,
    } = useSustainabilitySummary(weekFrom, today);

    const {
        data: trend = [],
        isLoading: trendLoading,
        isError: trendError,
    } = useSustainabilityTrend("month", 12);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["statistics", "sustainability"] });
    };

    const avgWaitRounded = weekly ? Math.round(weekly.avg_waiting_minutes) : null;
    const waitStatus = avgWaitRounded == null ? "" : avgWaitRounded <= 10 ? "Good" : avgWaitRounded <= 20 ? "Moderate" : "High";

    return (
        <div className="sus-page">
            {/* Methodology — top of page, collapsed by default */}
            <Methodology />

            {/* Header */}
            <div className="sus-header">
                <div className="sus-header-left">
                    <div className="sus-header-icon">
                        <Leaf size={20} />
                    </div>
                    <div>
                        <h1 className="sus-title">Sustainability</h1>
                        <p className="sus-subtitle">
                            Week of <span>{weekFrom}</span> to <span>{today}</span>
                        </p>
                    </div>
                </div>
                <button className="sus-refresh-btn" onClick={handleRefresh} title="Refresh data">
                    <RefreshCw size={15} />
                </button>
            </div>

            {/* KPI row */}
            <div className="sus-kpi-row">
                <KpiCard
                    label="CO₂ This Week"
                    value={weekly ? weekly.total_co2_kg_estimate.toFixed(1) : null}
                    unit="kg CO₂"
                    sub={weekly ? `${weekly.avg_co2_per_truck_kg.toFixed(2)} kg/truck` : undefined}
                    icon={<Leaf size={16} />}
                    accent="green"
                    isLoading={weeklyLoading}
                />
                <KpiCard
                    label="Avg Wait"
                    value={avgWaitRounded}
                    unit="min"
                    sub={waitStatus}
                    icon={<Clock size={16} />}
                    accent="blue"
                    isLoading={weeklyLoading}
                />
                <KpiCard
                    label="Delayed Trucks"
                    value={weekly?.trucks_delayed ?? null}
                    sub={weekly ? `of ${weekly.trucks_processed} processed` : undefined}
                    icon={<AlertTriangle size={16} />}
                    accent={weekly && weekly.trucks_delayed > 0 ? "orange" : "neutral"}
                    isLoading={weeklyLoading}
                />
                <KpiCard
                    label="Trucks Processed"
                    value={weekly?.trucks_processed ?? null}
                    sub="this week"
                    icon={<Truck size={16} />}
                    accent="neutral"
                    isLoading={weeklyLoading}
                />
            </div>

            {/* Charts row */}
            <div className="sus-charts-row">
                {/* CO₂ Trend */}
                <div className="sus-card sus-card-wide">
                    <div className="sus-card-header">
                        <span className="sus-card-title">
                            <Leaf size={14} />
                            CO₂ Trend — {new Date().getFullYear() - 1}/{new Date().getFullYear()}
                        </span>
                        <span className="sus-card-sub">last 12 months · kg CO₂/month</span>
                    </div>
                    <Co2TrendChart
                        data={trend}
                        isLoading={trendLoading}
                        isError={trendError}
                    />
                </div>

                {/* Histogram */}
                <div className="sus-card">
                    <div className="sus-card-header">
                        <span className="sus-card-title">
                            <Clock size={14} />
                            Wait Distribution
                        </span>
                        <span className="sus-card-sub">this week · no. of trucks</span>
                    </div>
                    <WaitingHistogram
                        distribution={weekly?.wait_distribution}
                        isLoading={weeklyLoading}
                        isError={weeklyError}
                    />
                </div>
            </div>

            {/* RAN Energy Metrics */}
            <div className="sus-card">
                <div className="sus-card-header">
                    <span className="sus-card-title sus-card-title-ran">
                        <Zap size={14} />
                        RAN Energy Consumption
                    </span>
                    <span className="sus-card-sub">5G energy metrics from the port network</span>
                </div>
                <div className="sus-ran-panel">
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
