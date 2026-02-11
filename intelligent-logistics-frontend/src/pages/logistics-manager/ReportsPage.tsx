/**
 * Reports Page
 * Export reports, preview Excel data with terminal tabs + bar charts,
 * and access reference documents.
 */
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
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
} from "lucide-react";
import {
    getDashboardSummary,
    getTransportStats,
} from "@/services/statistics";
import { exportToPDF, exportToCSV } from "@/services/exportService";

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
    date: Date;
}

// ───── Excel Parser ─────
function parseExcelData(workbook: XLSX.WorkBook): TerminalData[] {
    return workbook.SheetNames.map((sheetName) => {
        const ws = workbook.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as (string | number | null)[][];

        // Header row with months is typically row index 4 (jan..dez)
        const monthRow = raw.find(r => r && r.some(c => typeof c === "string" && /^jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez$/i.test(String(c))));
        const months = monthRow
            ? monthRow.slice(1, 13).map(m => String(m || "").trim())
            : ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

        // Data rows start after the header (index ~6 onwards), where col 0 = day number
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

        // Monthly totals
        const monthlyTotals = months.map((_, mi) =>
            dailyGrid.reduce((sum, dayRow) => sum + (dayRow[mi] || 0), 0)
        );

        // Friendly terminal name
        const friendlyName = sheetName
            .replace(/_pesados$/i, "")
            .replace(/_/g, " ")
            .replace(/^T/, "Terminal ")
            .trim();

        return { name: friendlyName, months, monthlyTotals, dailyGrid };
    });
}

// ───── Component ─────
export default function ReportsPage() {
    const [isExporting, setIsExporting] = useState(false);
    const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>([]);
    const [terminals, setTerminals] = useState<TerminalData[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [previewMode, setPreviewMode] = useState<"table" | "chart">("chart");
    const [excelError, setExcelError] = useState(false);

    // Load and parse Excel on mount
    useEffect(() => {
        fetch("/documents/Movimento_pesados_2024_PortoAveiro.xlsx")
            .then(res => {
                if (!res.ok) throw new Error("File not found");
                return res.arrayBuffer();
            })
            .then(buf => {
                const wb = XLSX.read(buf, { type: "array" });
                setTerminals(parseExcelData(wb));
            })
            .catch(err => {
                console.error("Failed to load Excel:", err);
                setExcelError(true);
            });
    }, []);

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const summary = await getDashboardSummary();
            const { from, to } = getDateRange();
            const transportStats = await getTransportStats(from, to);
            await exportToPDF({ summary, transportStats, timeRange: "month", generatedAt: new Date() });
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
            exportToCSV({ summary, transportStats, timeRange: "month", generatedAt: new Date() });
            addToHistory("Monthly Data", "CSV");
        } catch (error) { console.error("CSV export failed:", error); }
        finally { setIsExporting(false); }
    };

    const getDateRange = () => {
        const to = new Date().toISOString().split("T")[0];
        const from = new Date();
        from.setMonth(from.getMonth() - 1);
        return { from: from.toISOString().split("T")[0], to };
    };

    const addToHistory = (name: string, format: "PDF" | "CSV") => {
        setExportHistory(prev => [
            { id: `${Date.now()}`, name, format, date: new Date() },
            ...prev,
        ]);
    };

    const currentTerminal = terminals[activeTab] || null;
    const maxMonthly = currentTerminal
        ? Math.max(...currentTerminal.monthlyTotals, 1)
        : 1;

    return (
        <div className="reports-page">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Reports</h1>
                    <span className="dashboard-subtitle">
                        Exports, reference documents and historical movement data
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
                            <span className="export-action-desc">Full report with metrics and tables</span>
                        </div>
                        <Download size={18} className="export-action-arrow" />
                    </button>
                    <button className="export-action-card" onClick={handleExportCSV} disabled={isExporting}>
                        <div className="export-action-icon csv"><FileSpreadsheet size={24} /></div>
                        <div className="export-action-content">
                            <span className="export-action-label">Export CSV</span>
                            <span className="export-action-desc">Raw data for spreadsheet analysis</span>
                        </div>
                        <Download size={18} className="export-action-arrow" />
                    </button>
                </div>
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
                    /* Monthly Totals Bar Chart */
                    <div className="monthly-chart">
                        <div className="monthly-bars">
                            {currentTerminal.months.map((m, i) => (
                                <div key={i} className="monthly-bar-group">
                                    <div className="monthly-bar-container">
                                        <span className="monthly-bar-value">{currentTerminal.monthlyTotals[i]}</span>
                                        <div
                                            className="monthly-bar"
                                            style={{
                                                height: `${(currentTerminal.monthlyTotals[i] / maxMonthly) * 100}%`,
                                            }}
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
                    /* Data Table Preview */
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
                        <p>No exports performed in this session</p>
                        <span>Exported reports will appear here</span>
                    </div>
                ) : (
                    <div className="history-list">
                        {exportHistory.map((entry) => (
                            <div key={entry.id} className="history-item">
                                <div className="history-icon"><File size={16} /></div>
                                <div className="history-info">
                                    <span className="history-name">{entry.name}</span>
                                    <span className="history-date">{entry.date.toLocaleString("en-GB")}</span>
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
