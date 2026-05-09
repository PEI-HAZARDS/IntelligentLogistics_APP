/**
 * Infractions Page
 * Audit table of appointments flagged with highway_infraction=true.
 * Allows the manager to review hazmat infractions and take action.
 */
import { useState, useEffect, useRef } from "react";
import {
    RefreshCw,
    Search,
    ShieldAlert,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Truck,
    Activity,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSummaryStats } from "@/hooks/useStatistics";
import { useInfractionArrivals } from "@/hooks/useArrivals";
import type { AppointmentStatusEnum } from "@/types/types";

const PAGE_SIZE = 15;

function statusBadgeClass(status: AppointmentStatusEnum): string {
    switch (status) {
        case "completed":
        case "in_process":
            return "active";
        case "in_transit":
        case "unloading":
        case "delayed":
            return "pending";
        case "scheduled":
        case "canceled":
        default:
            return "inactive";
    }
}

function statusLabel(status: AppointmentStatusEnum): string {
    const labels: Record<AppointmentStatusEnum, string> = {
        scheduled: "Scheduled",
        in_transit: "In Transit",
        in_process: "In Process",
        unloading: "Unloading",
        canceled: "Canceled",
        delayed: "Delayed",
        completed: "Completed",
    };
    return labels[status] ?? status;
}

export default function InfractionsPage() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const queryClient = useQueryClient();

    // Debounce search input
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchTerm]);

    const { data: summary, isLoading: summaryLoading } = useSummaryStats();
    const {
        data: paginatedData,
        isLoading: tableLoading,
        isError: tableError,
    } = useInfractionArrivals(page, PAGE_SIZE, debouncedSearch || undefined);

    const items = paginatedData?.items ?? [];
    const totalPages = paginatedData?.pages ?? 1;
    const totalItems = paginatedData?.total ?? 0;

    const isLoading = tableLoading;

    const infractionCount = summary?.infractionCount ?? 0;
    const entriesCount = summary?.entriesCount ?? 0;
    const infractionRate = entriesCount > 0
        ? ((infractionCount / entriesCount) * 100).toFixed(1)
        : "0.0";

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['arrivals', 'infractions'] });
        queryClient.invalidateQueries({ queryKey: ['statistics', 'summary'] });
    };

    return (
        <div className="infractions-page">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Infractions</h1>
                    <span className="dashboard-subtitle">
                        Highway infraction audit — hazmat vehicles on restricted routes
                        {tableError && (
                            <span className="dashboard-api-error"> · API error</span>
                        )}
                    </span>
                </div>
                <div className="dashboard-filters">
                    <button
                        className="filter-btn"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        title="Refresh data"
                    >
                        <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="kpi-grid kpi-grid-transport" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
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
            </div>

            {/* Table */}
            <div className="data-table">
                <div className="data-table-header">
                    <h3 className="data-table-title">
                        Infraction Records
                        {!isLoading && totalItems > 0 && (
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
                            placeholder="Search by plate, driver..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
                                <th>Driver</th>
                                <th>Date / Time</th>
                                <th>Gate</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
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
                                    const company =
                                        item.driver?.company?.name ??
                                        item.truck?.company?.name ??
                                        "—";
                                    const driver = item.driver?.name ?? "—";
                                    const gate = item.gate_in?.label ?? "—";
                                    const dateTime = item.scheduled_start_time
                                        ? new Date(item.scheduled_start_time).toLocaleString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })
                                        : "—";
                                    return (
                                        <tr key={item.id} className="row-infraction">
                                            <td className="table-rank">{(page - 1) * PAGE_SIZE + index + 1}</td>
                                            <td style={{ fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.05em" }}>
                                                {item.truck_license_plate}
                                            </td>
                                            <td className="table-company-name">{company}</td>
                                            <td>{driver}</td>
                                            <td>{dateTime}</td>
                                            <td>{gate}</td>
                                            <td>
                                                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span className={`status-badge ${statusBadgeClass((item as any).primary_status ?? item.status)}`}>
                                                        {statusLabel((item as any).primary_status ?? item.status)}
                                                    </span>
                                                    {((item as any).is_delayed ?? item.status === 'delayed') && (
                                                        <span className="status-badge status-delayed-substate">Delayed</span>
                                                    )}
                                                    {((item as any).is_unloading ?? item.status === 'unloading') && (
                                                        <span className="status-badge status-unloading-substate">Unloading</span>
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="infractions-pagination">
                        <button
                            className="pagination-btn"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="pagination-info">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="pagination-btn"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
