import { useMemo } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import type { SustainabilityTrendPoint } from "@/services/statistics";
import "./Co2TrendChart.css";

const EN_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CHART_W   = 760;
const CHART_H   = 220;
const PAD_LEFT  = 56;
const PAD_BOT   = 36;
const PAD_TOP   = 16;
const PLOT_W    = CHART_W - PAD_LEFT - 12;
const PLOT_H    = CHART_H - PAD_BOT - PAD_TOP;

interface Props {
    data: SustainabilityTrendPoint[];
    isLoading: boolean;
    isError: boolean;
}

export default function Co2TrendChart({ data, isLoading, isError }: Props) {
    const maxVal = Math.max(...data.map(d => d.total_co2_kg), 1);

    const yTicks = useMemo(() => {
        const step = maxVal <= 10 ? 2 : maxVal <= 50 ? 10 : maxVal <= 200 ? 40 : Math.ceil(maxVal / 5 / 10) * 10;
        const ticks: number[] = [];
        for (let v = 0; v <= maxVal * 1.1; v += step) ticks.push(v);
        return ticks;
    }, [maxVal]);

    if (isLoading) return (
        <div className="co2chart-wrap co2chart-loading">
            <RefreshCw size={22} className="co2chart-spin" />
            <span>Loading trend…</span>
        </div>
    );

    if (isError || data.length === 0) return (
        <div className="co2chart-wrap co2chart-empty">
            <AlertCircle size={22} />
            <span>{isError ? "Failed to load data" : "No data available"}</span>
        </div>
    );

    const slotW = PLOT_W / data.length;
    const barW  = Math.floor(slotW * 0.55);

    return (
        <div className="co2chart-wrap">
            <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="co2chart-svg"
                role="img"
                aria-label="Monthly CO₂ trend"
            >
                <defs>
                    <linearGradient id="co2-bar-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity="0.7" />
                    </linearGradient>
                    <linearGradient id="co2-bar-grad-hover" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#86efac" stopOpacity="1"   />
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
                                stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                            />
                            <text
                                x={PAD_LEFT - 6} y={y + 4}
                                textAnchor="end" fontSize="10"
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
                    stroke="rgba(255,255,255,0.15)" strokeWidth="1"
                />

                {/* Bars */}
                {data.map((point, i) => {
                    const barH = Math.max((point.total_co2_kg / (maxVal * 1.1)) * PLOT_H, 2);
                    const x    = PAD_LEFT + i * slotW + (slotW - barW) / 2;
                    const y    = PAD_TOP + PLOT_H - barH;
                    const mon  = EN_MONTHS[new Date(point.period).getMonth()];
                    return (
                        <g key={point.period} className="co2chart-bar-group">
                            <title>{mon}: {point.total_co2_kg.toFixed(1)} kg CO₂</title>
                            <rect
                                x={x} y={y} width={barW} height={barH}
                                fill="url(#co2-bar-grad)" rx="2"
                                className="co2chart-bar"
                                style={{ animationDelay: `${i * 0.045}s` }}
                            />
                            <text
                                x={x + barW / 2} y={PAD_TOP + PLOT_H + 18}
                                textAnchor="middle" fontSize="10"
                                fill="rgba(148,163,184,0.8)"
                            >
                                {mon}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <p className="co2chart-yaxis-label">kg CO₂</p>
        </div>
    );
}
