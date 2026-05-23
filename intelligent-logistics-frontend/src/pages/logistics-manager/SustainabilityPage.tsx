import { useState, useMemo } from "react";
import {
    Leaf, Clock, AlertTriangle, Truck,
    ChevronDown, ChevronUp, RefreshCw, AlertCircle, Zap,
} from "lucide-react";
import GrafanaPanel from "@/components/common/GrafanaPanel";
import { useQueryClient } from "@tanstack/react-query";
import { useSustainabilitySummary, useSustainabilityTrend } from "@/hooks/useStatistics";
import type { SustainabilityTrendPoint } from "@/services/statistics";
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

function getYearStart(): string {
    return `${new Date().getFullYear()}-01-01`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

// ── CO₂ Trend SVG Chart ───────────────────────────────────────────────────────

const CHART_W = 760;
const CHART_H = 220;
const PAD_LEFT = 56;
const PAD_BOTTOM = 36;
const PAD_TOP = 16;
const PLOT_W = CHART_W - PAD_LEFT - 12;
const PLOT_H = CHART_H - PAD_BOTTOM - PAD_TOP;

function Co2TrendChart({ data, isLoading, isError }: { data: SustainabilityTrendPoint[]; isLoading: boolean; isError: boolean }) {
    const maxVal = Math.max(...data.map(d => d.total_co2_kg), 1);

    const yTicks = useMemo(() => {
        const step = maxVal <= 10 ? 2 : maxVal <= 50 ? 10 : maxVal <= 200 ? 40 : Math.ceil(maxVal / 5 / 10) * 10;
        const ticks: number[] = [];
        for (let v = 0; v <= maxVal * 1.1; v += step) ticks.push(v);
        return ticks;
    }, [maxVal]);

    if (isLoading) return (
        <div className="sus-chart-wrap sus-chart-loading">
            <RefreshCw size={22} className="sus-spin" />
            <span>A carregar tendência...</span>
        </div>
    );

    if (isError || data.length === 0) return (
        <div className="sus-chart-wrap sus-chart-empty">
            <AlertCircle size={22} />
            <span>{isError ? "Erro ao carregar dados" : "Sem dados disponíveis"}</span>
        </div>
    );

    const barW = Math.floor((PLOT_W / data.length) * 0.55);
    const slotW = PLOT_W / data.length;

    return (
        <div className="sus-chart-wrap">
            <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="sus-svg-chart"
                role="img"
                aria-label="Tendência mensal de CO₂"
            >
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity="0.7" />
                    </linearGradient>
                    <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.9" />
                    </linearGradient>
                </defs>

                {/* Y grid lines + labels */}
                {yTicks.map(tick => {
                    const y = PAD_TOP + PLOT_H - (tick / (maxVal * 1.1)) * PLOT_H;
                    if (y < PAD_TOP) return null;
                    return (
                        <g key={tick}>
                            <line
                                x1={PAD_LEFT} y1={y}
                                x2={CHART_W - 12} y2={y}
                                stroke="rgba(255,255,255,0.06)"
                                strokeWidth="1"
                            />
                            <text
                                x={PAD_LEFT - 6} y={y + 4}
                                textAnchor="end"
                                className="sus-chart-label"
                                fontSize="10"
                                fill="rgba(148,163,184,0.8)"
                            >
                                {tick}
                            </text>
                        </g>
                    );
                })}

                {/* Baseline */}
                <line
                    x1={PAD_LEFT} y1={PAD_TOP + PLOT_H}
                    x2={CHART_W - 12} y2={PAD_TOP + PLOT_H}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                />

                {/* Bars */}
                {data.map((point, i) => {
                    const barH = Math.max((point.total_co2_kg / (maxVal * 1.1)) * PLOT_H, 2);
                    const x = PAD_LEFT + i * slotW + (slotW - barW) / 2;
                    const y = PAD_TOP + PLOT_H - barH;
                    const month = PT_MONTHS[new Date(point.period).getMonth()];
                    return (
                        <g key={point.period} className="sus-chart-bar-group">
                            <title>{month}: {point.total_co2_kg.toFixed(1)} kg CO₂</title>
                            <rect
                                x={x} y={y}
                                width={barW} height={barH}
                                fill="url(#barGradient)"
                                rx="2"
                                className="sus-chart-bar"
                            />
                            <text
                                x={x + barW / 2}
                                y={PAD_TOP + PLOT_H + 18}
                                textAnchor="middle"
                                fontSize="10"
                                fill="rgba(148,163,184,0.8)"
                            >
                                {month}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <p className="sus-chart-yaxis-label">kg CO₂</p>
        </div>
    );
}

// ── Waiting Time Histogram ────────────────────────────────────────────────────

interface HistoBucket {
    label: string;
    count: number;
    approx: boolean;
    color: string;
    bg: string;
}

function WaitingHistogram({ processed, delayed, isLoading, isError }: {
    processed: number | null;
    delayed: number | null;
    isLoading: boolean;
    isError: boolean;
}) {
    const buckets: HistoBucket[] = useMemo(() => {
        if (processed == null || delayed == null) return [];
        const onTime = Math.max(processed - delayed, 0);
        return [
            { label: "0 – 5 min",   count: Math.round(onTime * 0.4),  approx: true,  color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
            { label: "5 – 15 min",  count: Math.round(onTime * 0.6),  approx: true,  color: "#29b6f6", bg: "rgba(41,182,246,0.12)" },
            { label: "15 – 30 min", count: Math.round(delayed * 0.6), approx: true,  color: "#ffa726", bg: "rgba(255,167,38,0.12)"  },
            { label: "> 30 min",    count: Math.round(delayed * 0.4), approx: true,  color: "#ef5350", bg: "rgba(239,83,80,0.12)"  },
        ];
    }, [processed, delayed]);

    const maxCount = Math.max(...buckets.map(b => b.count), 1);

    if (isLoading) return (
        <div className="sus-histo-wrap sus-chart-loading">
            <RefreshCw size={20} className="sus-spin" />
            <span>A carregar...</span>
        </div>
    );
    if (isError) return (
        <div className="sus-histo-wrap sus-chart-empty">
            <AlertCircle size={18} /><span>Erro ao carregar</span>
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
                            {b.approx ? "~" : ""}{b.count}
                        </span>
                    </div>
                );
            })}
            <p className="sus-histo-note">
                * Distribuição aproximada — baseada em trucks_delayed ({delayed ?? "--"} &gt;15 min) e trucks_processed ({processed ?? "--"} total).
            </p>
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
                    Metodologia de Cálculo
                </span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {open && (
                <div className="sus-method-body">
                    <div className="sus-method-formula">
                        CO₂ (kg) = tempo_espera (h) × 0,84 kg/h
                    </div>
                    <dl className="sus-method-dl">
                        <div>
                            <dt>Fonte</dt>
                            <dd>ICCT Heavy Duty Vehicles 2023 + EU JRC — Euro VI diesel HDV em marcha lenta</dd>
                        </div>
                        <div>
                            <dt>Tempo de espera</dt>
                            <dd>MAX(0, entry_time − scheduled_start_time) por appointment</dd>
                        </div>
                        <div>
                            <dt>Exclusões</dt>
                            <dd>Appointments sem scheduled_start_time não são incluídos no cálculo</dd>
                        </div>
                        <div>
                            <dt>Fator de emissão</dt>
                            <dd>0,84 kg CO₂/h por camião Euro VI em idle (conservador)</dd>
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
    const yearFrom = useMemo(getYearStart, []);

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
    const waitStatus = avgWaitRounded == null ? "" : avgWaitRounded <= 10 ? "Bom" : avgWaitRounded <= 20 ? "Aceitável" : "Elevado";

    return (
        <div className="sus-page">
            {/* Header */}
            <div className="sus-header">
                <div className="sus-header-left">
                    <div className="sus-header-icon">
                        <Leaf size={20} />
                    </div>
                    <div>
                        <h1 className="sus-title">Sustentabilidade</h1>
                        <p className="sus-subtitle">
                            Semana de <span>{weekFrom}</span> a <span>{today}</span>
                        </p>
                    </div>
                </div>
                <button className="sus-refresh-btn" onClick={handleRefresh} title="Atualizar dados">
                    <RefreshCw size={15} />
                </button>
            </div>

            {/* KPI row */}
            <div className="sus-kpi-row">
                <KpiCard
                    label="CO₂ Esta Semana"
                    value={weekly ? weekly.total_co2_kg_estimate.toFixed(1) : null}
                    unit="kg CO₂"
                    sub={weekly ? `${weekly.avg_co2_per_truck_kg.toFixed(2)} kg/camião` : undefined}
                    icon={<Leaf size={16} />}
                    accent="green"
                    isLoading={weeklyLoading}
                />
                <KpiCard
                    label="Espera Média"
                    value={avgWaitRounded}
                    unit="min"
                    sub={waitStatus}
                    icon={<Clock size={16} />}
                    accent="blue"
                    isLoading={weeklyLoading}
                />
                <KpiCard
                    label="Camiões c/ Atraso"
                    value={weekly?.trucks_delayed ?? null}
                    sub={weekly ? `de ${weekly.trucks_processed} processados` : undefined}
                    icon={<AlertTriangle size={16} />}
                    accent={weekly && weekly.trucks_delayed > 0 ? "orange" : "neutral"}
                    isLoading={weeklyLoading}
                />
                <KpiCard
                    label="Camiões Processados"
                    value={weekly?.trucks_processed ?? null}
                    sub="esta semana"
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
                            Tendência CO₂ — {new Date().getFullYear()}
                        </span>
                        <span className="sus-card-sub">últimos 12 meses · kg CO₂/mês</span>
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
                            Distribuição de Esperas
                        </span>
                        <span className="sus-card-sub">esta semana · nº camiões</span>
                    </div>
                    <WaitingHistogram
                        processed={weekly?.trucks_processed ?? null}
                        delayed={weekly?.trucks_delayed ?? null}
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
                        Consumo Energético RAN
                    </span>
                    <span className="sus-card-sub">métricas de energia 5G da rede portuária</span>
                </div>
                <div className="sus-ran-panel">
                    <GrafanaPanel
                        dashboardId="adcptvw/new-dashboard"
                        panelId="panel-1"
                        title="Energy consumption panel"
                    />
                </div>
            </div>

            {/* Methodology */}
            <Methodology />
        </div>
    );
}
