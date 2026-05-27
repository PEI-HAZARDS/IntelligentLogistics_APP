/**
 * Reports Page
 * Export reports, preview Excel data with terminal tabs + bar charts,
 * sustainability metrics, and access reference documents.
 */
import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import {
    FileText,
    Download,
    FileSpreadsheet,
    Shield,
    Clock,
    File,
    Eye,
    Table,
    BarChart3,
    Leaf,
    Truck,
    AlertCircle,
    TrendingDown,
} from "lucide-react";
import {
    getDashboardSummary,
    getTransportStats,
} from "@/services/statistics";
import {
    useSustainabilitySummary,
    useSustainabilityTrend,
} from "@/hooks/useStatistics";
import { exportToPDF, exportToCSV } from "@/services/exportService";

const HISTORY_KEY = "report_download_history_v1";

// ───── Types ─────
interface TerminalData {
    name: string;
    months: string[];
    monthlyTotals: number[];
    dailyGrid: (number | null)[][]; // rows=days, cols=months
}

interface ExportHistoryEntry {
    id: string;
    name: string;
    format: "PDF" | "CSV";
    date: string; // ISO string
}

// ───── Excel Parser (exceljs) ─────
async function parseExcelData(buffer: ArrayBuffer): Promise<TerminalData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return workbook.worksheets.map((ws) => {
        const raw: (string | number | null)[][] = [];
        ws.eachRow({ includeEmpty: true }, (row) => {
            raw.push((row.values as (string | number | null)[]).slice(1));
        });
        const monthRow = raw.find(r => r && r.some(c => typeof c === "string" && /^jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez$/i.test(String(c))));
        const months = monthRow
            ? monthRow.slice(1, 13).map(m => String(m || "").trim())
            : ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const dataStartIdx = raw.findIndex(r => r && typeof r[0] === "number" && r[0] >= 1 && r[0] <= 31);
        const dailyGrid: (number | null)[][] = [];
        if (dataStartIdx >= 0) {
            for (let i = dataStartIdx; i < raw.length; i++) {
                const row = raw[i];
                if (!row || typeof row[0] !== "number" || row[0] < 1 || row[0] > 31) break;
                const dayValues = row.slice(1, 13).map(v =>
                    typeof v === "number" ? v : null
                );
                dailyGrid.push(dayValues);
            }
        }
        const monthlyTotals = months.map((_, mi) =>
            dailyGrid.reduce((sum, dayRow) => sum + (dayRow[mi] || 0), 0)
        );
        const friendlyName = ws.name
            .replace(/_pesados$/i, "")
            .replace(/_/g, " ")
            .replace(/^T/, "Terminal ")
            .trim();
        return { name: friendlyName, months, monthlyTotals, dailyGrid };
    });
}

// ───── CO2 Sparkline ─────
function Co2Sparkline({ data }: { data: { period: string; total_co2_kg: number }[] }) {
    if (!data || data.length < 2) return null;
    const vals = data.map(d => d.total_co2_kg);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals);
    const W = 260, H = 52, pad = 4;
    const xStep = (W - pad * 2) / (vals.length - 1);
    const yOf = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (H - pad * 2);
    const pts = vals.map((v, i) => `${pad + i * xStep},${yOf(v)}`).join(" ");
    const fillPts = `${pad},${H} ${pts} ${pad + (vals.length - 1) * xStep},${H}`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
            <defs>
                <linearGradient id="co2grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={fillPts} fill="url(#co2grad)" />
            <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {vals.map((v, i) => (
                <circle key={i} cx={pad + i * xStep} cy={yOf(v)} r="3" fill="#22c55e" />
            ))}
        </svg>
    );
}

// ───── Component ─────
export default function ReportsPage() {
    const [isExporting, setIsExporting] = useState(false);
    const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>([]);
    const [terminals, setTerminals] = useState<TerminalData[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [previewMode, setPreviewMode] = useState<"table" | "chart">("chart");
    const [excelError, setExcelError] = useState(false);

    // Date ranges for sustainability
    const today = new Date().toISOString().split("T")[0];
    const from30d = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })();

    const { data: sustSummary, isLoading: sustLoading } = useSustainabilitySummary(from30d, today);
    const { data: sustTrend } = useSustainabilityTrend("day", 7);

    // Load export history from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(HISTORY_KEY);
            if (stored) setExportHistory(JSON.parse(stored).slice(0, 20));
        } catch {}
    }, []);

    // Load and parse Excel on mount (exceljs)
    useEffect(() => {
        fetch("/documents/Movimento_pesados_2024_PortoAveiro.xlsx")
            .then(res => {
                if (!res.ok) throw new Error("File not found");
                return res.arrayBuffer();
            })
            .then(async (buf) => {
                try {
                    const terminals = await parseExcelData(buf);
                    setTerminals(terminals);
                } catch (err) {
                    console.error("Failed to parse Excel:", err);
                    setExcelError(true);
                }
            })
            .catch(err => {
                console.error("Failed to load Excel:", err);
                setExcelError(true);
            });
    }, []);

    const getDateRange = () => {
        const to = new Date().toISOString().split("T")[0];
        const from = new Date();
        from.setMonth(from.getMonth() - 1);
        return { from: from.toISOString().split("T")[0], to };
    };

    const addToHistory = (name: string, format: "PDF" | "CSV") => {
        const entry: ExportHistoryEntry = { id: `${Date.now()}`, name, format, date: new Date().toISOString() };
        setExportHistory(prev => {
            const next = [entry, ...prev].slice(0, 20);
            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    };

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const summary = await getDashboardSummary();
            const { from, to } = getDateRange();
            const transportStats = await getTransportStats(from, to);
            await exportToPDF({
                summary,
                transportStats,
                decisions: null,
                timeRange: "month",
                generatedAt: new Date(),
                sustainability: sustSummary ?? null,
            });
            addToHistory("Monthly Report", "PDF");
        } catch (error) { console.error("PDF export failed:", error); }
        finally { setIsExporting(false); }
    };

    const handleExportCSV = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const summary = await getDashboardSummary();
            const { from, to } = getDateRange();
            const transportStats = await getTransportStats(from, to);
            exportToCSV({
                summary,
                transportStats,
                decisions: null,
                timeRange: "month",
                generatedAt: new Date(),
                sustainability: sustSummary ?? null,
            });
            addToHistory("Monthly Data", "CSV");
        } catch (error) { console.error("CSV export failed:", error); }
        finally { setIsExporting(false); }
    };

    const currentTerminal = terminals[activeTab] || null;
    const maxMonthly = currentTerminal
        ? Math.max(...currentTerminal.monthlyTotals, 1)
        : 1;

    const delayRate = sustSummary && sustSummary.trucks_processed > 0
        ? ((sustSummary.trucks_delayed / sustSummary.trucks_processed) * 100).toFixed(1)
        : "—";

    // 7-day CO2 trend direction
    const trendDir = sustTrend && sustTrend.length >= 2
        ? sustTrend[sustTrend.length - 1].total_co2_kg - sustTrend[0].total_co2_kg
        : 0;

    return (
        <div className="reports-page">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Reports</h1>
                    <span className="dashboard-subtitle">
                        Exports, sustainability metrics, reference documents and historical movement data
                    </span>
                </div>
            </div>

            {/* Quick Export Section */}
            <div className="reports-section">
                <h2 className="section-title">Generate Report</h2>
                <div className="export-actions-grid">
                    <button className="export-action-card" onClick={handleExportPDF} disabled={isExporting}>
                        <div className="export-action-icon pdf"><FileText size={24} /></div>
                        <div className="export-action-content">
                            <span className="export-action-label">Export PDF</span>
                            <span className="export-action-desc">Full report with metrics, sustainability and tables</span>
                        </div>
                        <Download size={18} className="export-action-arrow" />
                    </button>
                    <button className="export-action-card" onClick={handleExportCSV} disabled={isExporting}>
                        <div className="export-action-icon csv"><FileSpreadsheet size={24} /></div>
                        <div className="export-action-content">
                            <span className="export-action-label">Export CSV</span>
                            <span className="export-action-desc">Raw data including sustainability section</span>
                        </div>
                        <Download size={18} className="export-action-arrow" />
                    </button>
                </div>
            </div>

            {/* Sustainability Section */}
            <div className="reports-section">
                <h2 className="section-title">
                    <Leaf size={17} style={{ verticalAlign: "middle", marginRight: "0.45rem", color: "var(--color-success)" }} />
                    Sustainability — Last 30 Days
                </h2>

                {sustLoading ? (
                    <div className="chart-empty"><Clock size={22} /><span>Loading sustainability data…</span></div>
                ) : !sustSummary ? (
                    <div className="chart-empty"><AlertCircle size={22} /><span>No sustainability data available</span></div>
                ) : (
                    <>
                        <div className="sust-kpi-grid">
                            <div className="sust-kpi-card sust-kpi-co2">
                                <span className="sust-kpi-label">Total CO₂ estimate</span>
                                <span className="sust-kpi-value">
                                    {sustSummary.total_co2_kg_estimate >= 1000
                                        ? `${(sustSummary.total_co2_kg_estimate / 1000).toFixed(2)} t`
                                        : `${Math.round(sustSummary.total_co2_kg_estimate)} kg`}
                                </span>
                                <span className="sust-kpi-sub">from idling while waiting</span>
                            </div>
                            <div className="sust-kpi-card">
                                <span className="sust-kpi-label">Avg CO₂ / truck</span>
                                <span className="sust-kpi-value">{sustSummary.avg_co2_per_truck_kg.toFixed(2)} <small>kg</small></span>
                                <span className="sust-kpi-sub">per appointment</span>
                            </div>
                            <div className="sust-kpi-card">
                                <span className="sust-kpi-label">Trucks processed</span>
                                <span className="sust-kpi-value sust-value-ok">
                                    <Truck size={16} style={{ verticalAlign: "middle" }} /> {sustSummary.trucks_processed}
                                </span>
                                <span className="sust-kpi-sub">with scheduled time</span>
                            </div>
                            <div className="sust-kpi-card">
                                <span className="sust-kpi-label">Trucks delayed</span>
                                <span className={`sust-kpi-value${sustSummary.trucks_delayed > 0 ? " sust-value-warn" : " sust-value-ok"}`}>
                                    {sustSummary.trucks_delayed}
                                    <small style={{ marginLeft: 4 }}>({delayRate}%)</small>
                                </span>
                                <span className="sust-kpi-sub">exceeded expected arrival</span>
                            </div>
                            <div className="sust-kpi-card">
                                <span className="sust-kpi-label">Avg. wait time</span>
                                <span className="sust-kpi-value">{Math.round(sustSummary.avg_waiting_minutes)} <small>min</small></span>
                                <span className="sust-kpi-sub">per truck before entry</span>
                            </div>
                            <div className="sust-kpi-card">
                                <span className="sust-kpi-label">Total waiting</span>
                                <span className="sust-kpi-value">
                                    {sustSummary.total_waiting_minutes == null
                                        ? "—"
                                        : sustSummary.total_waiting_minutes >= 60
                                            ? `${(sustSummary.total_waiting_minutes / 60).toFixed(1)} h`
                                            : `${Math.round(sustSummary.total_waiting_minutes)} min`}
                                </span>
                                <span className="sust-kpi-sub">cumulative idle time</span>
                            </div>
                        </div>

                        {/* Wait distribution */}
                        {sustSummary.wait_distribution && (
                            <div className="sust-wait-dist">
                                <p className="sust-dist-title">Wait Distribution</p>
                                <div className="sust-dist-bars">
                                    {Object.entries({
                                        "< 5 min": sustSummary.wait_distribution["0_5"],
                                        "5–15 min": sustSummary.wait_distribution["5_15"],
                                        "15–30 min": sustSummary.wait_distribution["15_30"],
                                        "> 30 min": sustSummary.wait_distribution.over_30,
                                    }).map(([label, count]) => {
                                        const total = Object.values(sustSummary.wait_distribution!).reduce((a, b) => a + b, 0) || 1;
                                        const pct = Math.round((count / total) * 100);
                                        return (
                                            <div key={label} className="sust-dist-row">
                                                <span className="sust-dist-label">{label}</span>
                                                <div className="sust-dist-bar-wrap">
                                                    <div className="sust-dist-bar" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="sust-dist-pct">{pct}%</span>
                                                <span className="sust-dist-count">({count})</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 7-day CO2 trend sparkline */}
                        {sustTrend && sustTrend.length > 1 && (
                            <div className="sust-trend-card">
                                <div className="sust-trend-header">
                                    <span className="sust-trend-title">CO₂ — Last 7 Days</span>
                                    <span className={`sust-trend-dir${trendDir > 0 ? " up" : " down"}`}>
                                        <TrendingDown size={14} style={trendDir > 0 ? { transform: "scaleY(-1)" } : {}} />
                                        {trendDir > 0 ? "+" : ""}{Math.round(Math.abs(trendDir))} kg vs 7d ago
                                    </span>
                                </div>
                                <Co2Sparkline data={sustTrend} />
                                <div className="sust-trend-labels">
                                    {sustTrend.map((d, i) => (
                                        <span key={i} className="sust-trend-label">
                                            {d.period.slice(5)} {/* MM-DD */}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Excel Data Preview */}
            <div className="reports-section">
                <div className="preview-header">
                    <h2 className="section-title">
                        <Eye size={18} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
                        Heavy Vehicle Movement 2024
                    </h2>
                    {terminals.length > 0 && (
                        <div className="preview-toggle">
                            <button
                                className={`toggle-btn ${previewMode === "chart" ? "active" : ""}`}
                                onClick={() => setPreviewMode("chart")}
                                title="Bar chart"
                            >
                                <BarChart3 size={16} />
                            </button>
                            <button
                                className={`toggle-btn ${previewMode === "table" ? "active" : ""}`}
                                onClick={() => setPreviewMode("table")}
                                title="Data table"
                            >
                                <Table size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Terminal Tabs */}
                {terminals.length > 0 && (
                    <div className="terminal-tabs">
                        {terminals.map((t, i) => (
                            <button
                                key={i}
                                className={`terminal-tab ${activeTab === i ? "active" : ""}`}
                                onClick={() => setActiveTab(i)}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>
                )}

                {excelError ? (
                    <div className="chart-empty">
                        <FileSpreadsheet size={28} />
                        <span>Excel file not available</span>
                    </div>
                ) : !currentTerminal ? (
                    <div className="chart-empty">
                        <Clock size={28} />
                        <span>Loading data...</span>
                    </div>
                ) : previewMode === "chart" ? (
                    <div className="monthly-chart">
                        <div className="monthly-bars">
                            {currentTerminal.months.map((m, i) => (
                                <div key={i} className="monthly-bar-group">
                                    <div className="monthly-bar-container">
                                        <span className="monthly-bar-value">{currentTerminal.monthlyTotals[i]}</span>
                                        <div
                                            className="monthly-bar"
                                            style={{ height: `${(currentTerminal.monthlyTotals[i] / maxMonthly) * 100}%` }}
                                        />
                                    </div>
                                    <span className="monthly-bar-label">{m.substring(0, 3)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="monthly-chart-meta">
                            Yearly total: <strong>{currentTerminal.monthlyTotals.reduce((a, b) => a + b, 0).toLocaleString("en-GB")}</strong> heavy vehicles
                        </div>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    {currentTerminal.months.map((m, i) => (
                                        <th key={i}>{m.substring(0, 3)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {currentTerminal.dailyGrid.map((row, ri) => (
                                    <tr key={ri}>
                                        <td className="table-rank">{ri + 1}</td>
                                        {row.map((val, ci) => (
                                            <td key={ci} className={val === null ? "table-null" : ""}>
                                                {val !== null ? val : "—"}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Reference Documents */}
            <div className="reports-section">
                <h2 className="section-title">Reference Documents</h2>
                <div className="documents-list">
                    <a
                        href="/documents/2024-03-15-17-20-02-NORMAS-SEG-MARTIMA-PORT-AVEIRO2021PT-reda.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-card"
                    >
                        <div className="document-icon pdf"><Shield size={20} /></div>
                        <div className="document-info">
                            <span className="document-name">Maritime Safety Standards — Porto de Aveiro 2021</span>
                            <span className="document-desc">Maritime safety regulations applicable to port operations</span>
                            <div className="document-meta">
                                <span className="document-type">PDF</span>
                                <span className="document-size">15.6 MB</span>
                            </div>
                        </div>
                        <Download size={18} className="document-download" />
                    </a>
                    <a
                        href="/documents/Movimento_pesados_2024_PortoAveiro.xlsx"
                        download
                        className="document-card"
                    >
                        <div className="document-icon xlsx"><FileSpreadsheet size={20} /></div>
                        <div className="document-info">
                            <span className="document-name">Heavy Vehicle Movement 2024 — Porto de Aveiro</span>
                            <span className="document-desc">Daily heavy vehicle movement data by terminal</span>
                            <div className="document-meta">
                                <span className="document-type">XLSX</span>
                                <span className="document-size">25.6 KB</span>
                            </div>
                        </div>
                        <Download size={18} className="document-download" />
                    </a>
                </div>
            </div>

            {/* Export History */}
            <div className="reports-section">
                <h2 className="section-title">Export History</h2>
                {exportHistory.length === 0 ? (
                    <div className="empty-history">
                        <Clock size={32} />
                        <p>No exports performed yet</p>
                        <span>Exported reports will appear here and in the header dropdown</span>
                    </div>
                ) : (
                    <div className="history-list">
                        {exportHistory.map((entry) => (
                            <div key={entry.id} className="history-item">
                                <div className="history-icon"><File size={16} /></div>
                                <div className="history-info">
                                    <span className="history-name">{entry.name}</span>
                                    <span className="history-date">{new Date(entry.date).toLocaleString("en-GB")}</span>
                                </div>
                                <span className={`status-badge ${entry.format === "PDF" ? "active" : "pending"}`}>{entry.format}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
