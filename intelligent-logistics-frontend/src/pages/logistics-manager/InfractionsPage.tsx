/**
 * Infractions Page
 * Audit table of appointments flagged with highway_infraction=true.
 * Allows the manager to review hazmat infractions and log contact with the carrier.
 */
import { useState, useEffect, useRef } from "react";
import {
    RefreshCw, Search, ShieldAlert, AlertCircle,
    ChevronLeft, ChevronRight, Truck, Activity, CheckCircle, ClipboardCheck,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSummaryStats } from "@/hooks/useStatistics";
import { useInfractionArrivals } from "@/hooks/useArrivals";
import type { Appointment, AppointmentStatusEnum } from "@/types/types";
import { labelForStatus } from "@/lib/statusLabel";
import InfractionReviewModal from "@/components/logistics-manager/InfractionReviewModal";

const PAGE_SIZE = 15;

// Fields returned by the infraction endpoint but not yet in the shared Appointment type
type InfractionItem = Appointment & {
    reviewed_at?: string | null;
    reviewed_by?: string | null;
    review_note?: string | null;
    primary_status?: AppointmentStatusEnum;
    is_delayed?: boolean;
    is_unloading?: boolean;
};

function statusBadgeClass(status: AppointmentStatusEnum): string {
    switch (status) {
        case "completed":
        case "in_process":  return "active";
        case "in_transit":
        case "unloading":
        case "delayed":     return "pending";
        default:            return "inactive";
    }
}

export default function InfractionsPage() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [reviewTarget, setReviewTarget] = useState<InfractionItem | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchTerm]);

    const { data: summary, isLoading: summaryLoading } = useSummaryStats();
    const { data: paginatedData, isLoading: tableLoading, isError: tableError } =
        useInfractionArrivals(page, PAGE_SIZE, debouncedSearch || undefined);

    const items = (paginatedData?.items ?? []) as InfractionItem[];
    const totalPages = paginatedData?.pages ?? 1;
    const totalItems = paginatedData?.total ?? 0;

    const infractionCount = summary?.infractionCount ?? 0;
    const entriesCount    = summary?.entriesCount ?? 0;
    const infractionRate  = entriesCount > 0
        ? ((infractionCount / entriesCount) * 100).toFixed(1) : "0.0";

    const reviewedCount = items.filter(i => i.reviewed_at).length;

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["arrivals", "infractions"] });
        queryClient.invalidateQueries({ queryKey: ["statistics", "summary"] });
    };

    const handleReviewed = () => {
        setReviewTarget(null);
        queryClient.invalidateQueries({ queryKey: ["arrivals", "infractions"] });
    };

    return (
        <div className="infractions-page">
            {reviewTarget && (
                <InfractionReviewModal
                    appointment={reviewTarget}
                    onClose={() => setReviewTarget(null)}
                    onReviewed={handleReviewed}
                />
            )}

            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Infractions</h1>
                    <span className="dashboard-subtitle">
                        Highway infraction audit — hazmat vehicles on restricted routes
                        {tableError && <span className="dashboard-api-error"> · API error</span>}
                    </span>
                </div>
                <div className="dashboard-filters">
                    <button className="filter-btn" onClick={handleRefresh} disabled={tableLoading} title="Refresh">
                        <RefreshCw size={16} className={tableLoading ? "spinning" : ""} />
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="kpi-grid kpi-grid-transport" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Infractions Today</span>
                        <span className="kpi-icon-badge" style={{ color: infractionCount === 0 ? "#22c55e" : infractionCount <= 3 ? "#f59e0b" : "#ef4444" }}>
                            <ShieldAlert size={18} />
                        </span>
                    </div>
                    <div className="kpi-value">{summaryLoading ? "--" : infractionCount}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Entries Today</span>
                        <span className="kpi-icon-badge" style={{ color: "var(--accent-color)" }}>
                            <Truck size={18} />
                        </span>
                    </div>
                    <div className="kpi-value">{summaryLoading ? "--" : entriesCount}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Infraction Rate</span>
                        <span className="kpi-icon-badge" style={{ color: parseFloat(infractionRate) === 0 ? "#22c55e" : "#f59e0b" }}>
                            <Activity size={18} />
                        </span>
                    </div>
                    <div className="kpi-value">{summaryLoading ? "--" : `${infractionRate}%`}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Reviewed (page)</span>
                        <span className="kpi-icon-badge" style={{ color: reviewedCount === items.length && items.length > 0 ? "#22c55e" : "#94a3b8" }}>
                            <ClipboardCheck size={18} />
                        </span>
                    </div>
                    <div className="kpi-value">{tableLoading ? "--" : `${reviewedCount} / ${items.length}`}</div>
                </div>
            </div>

            {/* Table */}
            <div className="data-table">
                <div className="data-table-header">
                    <h3 className="data-table-title">
                        Infraction Records
                        {!tableLoading && totalItems > 0 && (
                            <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                                ({totalItems} total)
                            </span>
                        )}
                    </h3>
                    <div className="table-search">
                        <Search size={16} />
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Search by plate, company..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>License Plate</th>
                                <th>Company</th>
                                <th>Date / Time</th>
                                <th>Gate</th>
                                <th>Status</th>
                                <th>Review</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableLoading ? (
                                <tr>
                                    <td colSpan={7} className="table-empty-state">
                                        <RefreshCw size={20} className="spinning" style={{ marginRight: "0.5rem", display: "inline" }} />
                                        Loading...
                                    </td>
                                </tr>
                            ) : tableError ? (
                                <tr>
                                    <td colSpan={7} className="table-empty-state">
                                        <AlertCircle size={20} style={{ marginRight: "0.5rem", display: "inline" }} />
                                        Failed to load infraction records
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="table-empty-state">
                                        {debouncedSearch ? "No infractions match your search" : "No infraction records found"}
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => {
                                    const company  = item.truck?.company?.name ?? "—";
                                    const gate     = item.gate_in?.label ?? "—";
                                    const dateTime = item.scheduled_start_time
                                        ? new Date(item.scheduled_start_time).toLocaleString("en-GB", {
                                            day: "2-digit", month: "short", year: "numeric",
                                            hour: "2-digit", minute: "2-digit",
                                        })
                                        : "—";
                                    const reviewed = !!item.reviewed_at;

                                    return (
                                        <tr key={item.id} className={`row-infraction${reviewed ? " row-infraction--reviewed" : ""}`}>
                                            <td className="table-rank">{(page - 1) * PAGE_SIZE + index + 1}</td>
                                            <td style={{ fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.05em" }}>
                                                {item.truck_license_plate}
                                            </td>
                                            <td className="table-company-name">{company}</td>
                                            <td>{dateTime}</td>
                                            <td>{gate}</td>
                                            <td>
                                                <span style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                                    <span className={`status-badge ${statusBadgeClass(item.primary_status ?? item.status)}`}>
                                                        {labelForStatus(item.primary_status ?? item.status)}
                                                    </span>
                                                    {item.is_delayed && (
                                                        <span className="status-badge status-delayed-substate">Delayed</span>
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                {reviewed ? (
                                                    <button
                                                        className="infr-reviewed-btn"
                                                        onClick={() => setReviewTarget(item)}
                                                        title={`Reviewed by ${item.reviewed_by}${item.review_note ? ` — ${item.review_note}` : ""}`}
                                                    >
                                                        <CheckCircle size={13} />
                                                        Reviewed
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="infr-review-btn"
                                                        onClick={() => setReviewTarget(item)}
                                                    >
                                                        <ClipboardCheck size={13} />
                                                        Review
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!tableLoading && totalPages > 1 && (
                    <div className="infractions-pagination">
                        <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            <ChevronLeft size={16} />
                        </button>
                        <span className="pagination-info">Page {page} of {totalPages}</span>
                        <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
