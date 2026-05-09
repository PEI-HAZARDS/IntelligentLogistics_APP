import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Clock,
  Truck,
  CheckCircle,
  RotateCcw,
  Trash2,
  FileText,
  Inbox,
  X,
  Eye,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Pin,
  PinOff,
  Container,
  CalendarClock,
  PackageOpen,
} from "lucide-react";
import { getArrivals, getArrivalsStats, getArrival } from "@/services/arrivals";
import { getGateWebSocket } from "@/lib/websocket";
import type { Appointment, AppointmentStatusEnum, ArrivalsQueryParams } from "@/types/types";

// Map API status to English display
function mapStatusToLabel(status: AppointmentStatusEnum): string {
  const statusMap: Record<AppointmentStatusEnum, string> = {
    scheduled: "Scheduled",
    in_transit: "In Transit",
    in_process: "In Process",
    unloading: "Unloading",
    delayed: "Delayed",
    completed: "Completed",
    canceled: "Canceled",
  };
  return statusMap[status] || status;
}

// Map English status back to API status
function mapStatusToAPI(status: string): AppointmentStatusEnum {
  const statusMap: Record<string, AppointmentStatusEnum> = {
    "Scheduled": "scheduled",
    "Pending": "in_transit",
    "In Transit": "in_transit",
    "In Process": "in_process",
    "Unloading": "unloading",
    "Delayed": "delayed",
    "Completed": "completed",
    "Canceled": "canceled",
  };
  return statusMap[status] || "in_transit";
}
type UIArrival = {
  id: number;
  plate: string;
  dock: string;
  arrivalTime: string;
  cargo: string;
  status: string;           // display_status label (compat)
  primaryStatus: string;    // primary state label (never Delayed/Unloading)
  apiStatus: AppointmentStatusEnum;
  highwayInfraction?: boolean;
  isDelayed?: boolean;
  isUnloading?: boolean;
};

export const ITEMS_PER_PAGE = 10;

function ArrivalsList() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));

  // API data states
  const [arrivals, setArrivals] = useState<UIArrival[]>([]);
  const arrivalsRef = useRef<UIArrival[]>(arrivals);
  arrivalsRef.current = arrivals;
  const [stats, setStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [dockFilter, setDockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pinned state caching full objects
  const [pinnedArrivals, setPinnedArrivals] = useState<UIArrival[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("pinned_arrivals") || "[]");
      // Handle legacy string/number array migration or nulls
      const validStored = (stored || []).filter(Boolean);
      if (validStored.length > 0 && typeof validStored[0] !== 'object') {
        localStorage.removeItem("pinned_arrivals");
        return [];
      }
      return validStored;
    } catch {
      return [];
    }
  });

  const togglePin = (arrival: UIArrival) => {
    setPinnedArrivals((prev) => {
      const isPinned = prev.some(p => p.id === arrival.id);
      const next = isPinned ? prev.filter((p) => p.id !== arrival.id) : [...prev, arrival];
      localStorage.setItem("pinned_arrivals", JSON.stringify(next));
      return next;
    });
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [serverPages, setServerPages] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);

  // Debounced search (400ms delay)
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      // Reset page when search query changes to prevent empty pages
      if (searchQuery !== debouncedSearch) {
        setCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  // Modal states
  const [selectedArrival, setSelectedArrival] = useState<UIArrival | null>(null);

  // Get gate ID from URL param (e.g. /gate/1/arrivals)
  const { gateId: rawGateId } = useParams<{ gateId: string }>();
  const gateId = rawGateId || "1";

  // Map API arrival to UI
  const mapArrivalToUI = (arrival: Appointment): UIArrival => {
    const primaryStatus = (arrival as any).primary_status ?? arrival.status;
    return {
      id: arrival.id,
      plate: arrival.truck_license_plate,
      dock: arrival.gate_in?.label || "N/A",
      arrivalTime: arrival.scheduled_start_time
        ? new Date(arrival.scheduled_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        : "--:--",
      cargo: arrival.booking?.reference || "N/A",
      status: arrival.status ? mapStatusToLabel(arrival.status) : "Unknown",
      primaryStatus: primaryStatus ? mapStatusToLabel(primaryStatus) : "Unknown",
      apiStatus: (arrival.status ?? "scheduled"),
      highwayInfraction: arrival.highway_infraction || false,
      isDelayed: (arrival as any).is_delayed ?? arrival.status === "delayed",
      isUnloading: (arrival as any).is_unloading ?? arrival.status === "unloading",
    };
  };

  // Fetch data function
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const arrivalsParams: ArrivalsQueryParams = {
        gate_id: Number(gateId),
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        scheduled_date: today,
      };
      if (statusFilter === "Violators") {
        arrivalsParams.highway_infraction = true;
      } else if (statusFilter !== "all") {
        arrivalsParams.status = mapStatusToAPI(statusFilter);
      }
      if (debouncedSearch) arrivalsParams.search = debouncedSearch;

      const [arrivalsData, statsData] = await Promise.all([
        getArrivals(arrivalsParams),
        getArrivalsStats(Number(gateId)),
      ]);
      console.log('Arrivals StatsData:', statsData);

      let mapped = arrivalsData.items.map(mapArrivalToUI);

      // Merge cached pinned items that are not in the current page
      const missingPinned = pinnedArrivals.filter(p => !mapped.some(a => a.id === p.id));
      if (missingPinned.length > 0) {
        // Fetch them individually to update live status, but use cached object as foundation
        const missingArrivalPromises = missingPinned.map(async (cached) => {
          try {
            const liveData = await getArrival(cached.id);
            if (liveData) {
              return {
                ...cached,
                status: liveData.status ? mapStatusToLabel(liveData.status) : cached.status,
                apiStatus: liveData.status || cached.apiStatus,
                highwayInfraction: liveData.highway_infraction ?? cached.highwayInfraction
              };
            }
          } catch {
            // display cached data if fetch fails (e.g. item was deleted or network error), but remove from pinned
            setPinnedArrivals(prev => {
              const next = prev.filter(p => p.id !== cached.id);
              localStorage.setItem("pinned_arrivals", JSON.stringify(next));
              return next;
            });
          }
          return cached;
        });

        const mappedMissing = await Promise.all(missingArrivalPromises);
        mapped = [...mapped, ...mappedMissing];
      }

      setArrivals(mapped);
      setServerPages(arrivalsData.pages);
      setServerTotal(arrivalsData.total);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
    // Painel de debug removido
    // console.log('Stats Data:', statsData);
  }, [gateId, currentPage, debouncedSearch, statusFilter, pinnedArrivals]);

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Data fetch effect
  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const refreshTimer = setInterval(fetchData, 30000);
    return () => clearInterval(refreshTimer);
  }, [fetchData]);

  // Real-time WebSocket: apply local deltas to stats + arrivals list
  useEffect(() => {
    const ws = getGateWebSocket(gateId);
    ws.connect();

    const unsubscribe = ws.onMessage((data: Record<string, unknown>) => {
      const messageType = data.message_type as string | undefined;

      // ── status_changed: appointment_id + new_status ──
      if (messageType === "status_changed") {
        const appointmentId = data.appointment_id as number;
        const newStatus = data.new_status as AppointmentStatusEnum;
        const target = arrivalsRef.current.find(a => a.id === appointmentId);

        if (target && target.apiStatus !== newStatus) {
          const oldStatus = target.apiStatus;
          setStats(prev => {
            const next = { ...prev };
            next[oldStatus] = Math.max(0, (next[oldStatus] || 0) - 1);
            next[newStatus] = (next[newStatus] || 0) + 1;
            return next;
          });
          setArrivals(prev => prev.map(a =>
            a.id === appointmentId
              ? { ...a, apiStatus: newStatus, status: mapStatusToLabel(newStatus) }
              : a
          ));
        } else if (!target) {
          // Appointment not on current page — can't compute delta, refetch stats
          fetchData();
        }
        return;
      }

      // ── decision_results ACCEPTED: license_plate → in_process ──
      if (messageType === "decision_results" && data.decision === "ACCEPTED") {
        const plate = data.license_plate as string;
        const target = arrivalsRef.current.find(a => a.plate === plate);

        if (target && target.apiStatus !== "in_process") {
          const oldStatus = target.apiStatus;
          setStats(prev => {
            const next = { ...prev };
            next[oldStatus] = Math.max(0, (next[oldStatus] || 0) - 1);
            next["in_process"] = (next["in_process"] || 0) + 1;
            return next;
          });
          setArrivals(prev => prev.map(a =>
            a.plate === plate && a.apiStatus === oldStatus
              ? { ...a, apiStatus: "in_process" as AppointmentStatusEnum, status: mapStatusToLabel("in_process" as AppointmentStatusEnum) }
              : a
          ));
        } else if (!target) {
          fetchData();
        }
        return;
      }

      // ── infraction_decision: flag arrival + increment infractions count ──
      if (messageType === "infraction_decision") {
        const plate = (data.license_plate || data.truck_id) as string;
        const target = plate ? arrivalsRef.current.find(a => a.plate === plate) : null;

        if (target && !target.highwayInfraction) {
          setStats(prev => ({ ...prev, infractions: (prev.infractions || 0) + 1 }));
          setArrivals(prev => prev.map(a =>
            a.plate === plate ? { ...a, highwayInfraction: true } : a
          ));
        } else if (!target) {
          fetchData();
        }
        return;
      }

      // ── Other decision_results (REJECTED, etc.) — refetch for full update ──
      if (messageType === "decision_results") {
        fetchData();
      }
    });

    // Reconcile on WS reconnect (covers missed messages during disconnect)
    const unsubReconnect = ws.onConnect(() => {
      console.log("[ArrivalsList] WS reconnected — reconciling stats");
      fetchData();
    });

    return () => {
      unsubscribe();
      unsubReconnect();
    };
  }, [gateId, fetchData]);

  // Filter Logic — dock is the only remaining client-side dimension
  // Pinned items always bypass client-side filters
  const filteredArrivals = dockFilter !== "all"
    ? arrivals.filter(a => a.dock === dockFilter || pinnedArrivals.some(p => p.id === a.id))
    : arrivals;

  // Sort so pinned items always appear at the top
  const displayArrivals = [...filteredArrivals].sort((a, b) => {
    const aPinned = pinnedArrivals.some(p => p.id === a.id);
    const bPinned = pinnedArrivals.some(p => p.id === b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });
  const totalPages = serverPages;

  // Reset page when server-side filter status changes
  useEffect(() => { setCurrentPage(1); }, [statusFilter]);

  // All stats come from the /stats endpoint (full gate population, not current page)
  const statsTotal = (stats.scheduled ?? 0) + (stats.in_transit ?? 0) + (stats.in_process ?? 0) + (stats.unloading ?? 0) + (stats.delayed ?? 0) + (stats.completed ?? 0);
  const dynamicStats = {
    total: statsTotal || serverTotal,
    scheduled: stats.scheduled ?? 0,
    pending: stats.in_transit ?? 0,
    inProcess: stats.in_process ?? 0,
    unloading: stats.unloading ?? 0,
    inProgress: stats.delayed ?? 0,
    completed: stats.completed ?? 0,
    infractions: stats.infractions ?? 0,
  };

  const handleView = (arrival: UIArrival) => {
    setSelectedArrival(arrival);
  };

  const closeModal = () => {
    setSelectedArrival(null);
  };

  const handleClearFilters = () => {
    setDockFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchData();
  };

  // Get unique docks from arrivals
  const availableDocks = [...new Set(arrivals.map(a => a.dock))].filter(d => d !== "N/A");

  return (
    <div className="arrivals-list-page">
      {/* Coluna Direita - Lista de Chegadas */}
      <main className="arrivals-main">
        {/* Grid Header for alignment */}
        <div className="header-grid">
          <div className="header-left">
            <button
              className="btn-secondary"
              onClick={() => navigate(`/gate/${gateId}`)}
            >
              <ArrowLeft size={18} />
              Gate View
            </button>
          </div>

          <div className="header-center">
            <h1 className="panel-title">Arrivals List</h1>
          </div>

          <div className="header-right">
            <div className="time-display">
              <span className="time-value">{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Estatísticas (Clickable Filters) */}
        {/* Estatísticas — compact pill grid */}
        <div className="stats-grid">
          {/* Row 1: Total · Scheduled · Delayed · Infractions */}
          <div
            className={`stat-card ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter("all")}
          >
            <div className="stat-icon"><FileText size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.total}</span>
              <span className="stat-label">Total Arrivals</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'Scheduled' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Scheduled")}
          >
            <div className="stat-icon"><CalendarClock size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.scheduled}</span>
              <span className="stat-label">Scheduled</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'Delayed' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Delayed")}
          >
            <div className="stat-icon"><Clock size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.inProgress}</span>
              <span className="stat-label">Delayed</span>
            </div>
          </div>
          <div
            className={`stat-card violators ${statusFilter === 'Violators' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Violators")}
          >
            <div className="stat-icon"><ShieldAlert size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.infractions}</span>
              <span className="stat-label">Infractions</span>
            </div>
          </div>
          {/* Row 2: In Transit · In Process · Unloading · Completed */}
          <div
            className={`stat-card ${statusFilter === 'In Transit' ? 'active' : ''}`}
            onClick={() => setStatusFilter("In Transit")}
          >
            <div className="stat-icon"><Truck size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.pending}</span>
              <span className="stat-label">In Transit</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'In Process' ? 'active' : ''}`}
            onClick={() => setStatusFilter("In Process")}
          >
            <div className="stat-icon"><Container size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.inProcess}</span>
              <span className="stat-label">In Process</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'Unloading' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Unloading")}
          >
            <div className="stat-icon"><PackageOpen size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.unloading}</span>
              <span className="stat-label">Unloading</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'Completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Completed")}
          >
            <div className="stat-icon"><CheckCircle size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>

        {/* Tabela/Cards — unified filter bar */}
        <div className="arrivals-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Unified inline bar: title + filters + actions */}
          <div className="arrivals-toolbar">
            <h3 className="content-title">Arrivals List</h3>
            <span className="content-count">
              {dynamicStats.total} {dynamicStats.total === 1 ? 'arrival' : 'arrivals'}
            </span>
            <div className="toolbar-spacer" />
            <select
              id="dock-filter"
              className="toolbar-select"
              value={dockFilter}
              onChange={(e) => setDockFilter(e.target.value)}
            >
              <option value="all">All Docks</option>
              {availableDocks.map((dock) => (
                <option key={dock} value={dock}>Dock {dock}</option>
              ))}
            </select>
            <input
              id="search-input"
              className="toolbar-search"
              type="text"
              placeholder="License plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn-icon-only" onClick={handleClearFilters} title="Clear Filters">
              <Trash2 size={18} />
            </button>
            <button className="btn-icon-only btn-primary-icon" onClick={handleRefresh} disabled={isLoading} title="Refresh">
              {isLoading ? <Loader2 size={18} className="spin" /> : <RotateCcw size={18} />}
            </button>
          </div>

          {isLoading && arrivals.length === 0 ? (
            <div className="loading-state">
              <Loader2 size={32} className="spin" />
              <span>Loading arrivals...</span>
            </div>
          ) : displayArrivals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Inbox size={48} /></div>
              <p className="empty-message">
                {arrivals.length === 0
                  ? "No arrivals found."
                  : "No arrivals found with current filters..."}
              </p>
            </div>
          ) : (
            <div className="table-pagination-wrapper">
              <div className="arrivals-table">
                <table>
                  <thead>
                    <tr>
                      <th>License Plate</th>
                      <th>Dock</th>
                      <th>Arrival Time</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayArrivals.map((arrival) => {
                      const isPinned = pinnedArrivals.some(p => p.id === arrival.id);
                      return (
                        <tr
                          key={arrival.id}
                          className={[
                            arrival.highwayInfraction ? 'row-violation' : '',
                            arrival.apiStatus === 'delayed' ? 'row-delayed' : '',
                            isPinned ? 'row-pinned' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isPinned && <Pin fill="currentColor" size={14} style={{ opacity: 0.6 }} />}
                              <span>{arrival.plate}</span>
                            </div>
                          </td>
                          <td>{arrival.dock}</td>
                          <td>{arrival.arrivalTime}</td>
                          <td>{arrival.cargo}</td>
                          <td>
                            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                              <span className={`status-badge status-${((arrival.primaryStatus || arrival.status) || 'unknown').toLowerCase().replace(/\s/g, "-")}`}>
                                {arrival.primaryStatus || arrival.status || 'Unknown'}
                              </span>
                              {arrival.isDelayed && (
                                <span className="status-badge status-delayed-substate">Delayed</span>
                              )}
                              {arrival.isUnloading && (
                                <span className="status-badge status-unloading-substate">Unloading</span>
                              )}
                              {arrival.highwayInfraction && (
                                <span className="status-badge status-highway-infraction">Infraction</span>
                              )}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-icon"
                              onClick={() => togglePin(arrival)}
                              title={isPinned ? "Unpin Arrival" : "Pin Arrival"}
                            >
                              {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                            </button>
                            <button className="btn-icon" onClick={() => handleView(arrival)} title="View Details">
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {(displayArrivals.length >= ITEMS_PER_PAGE || currentPage > 1) && (
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal / Information Card */}
      {selectedArrival && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <Eye size={20} />
                Arrival Details
              </h3>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">License Plate</span>
                <span className="detail-value">{selectedArrival.plate}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Arrival Time</span>
                <span className="detail-value">{selectedArrival.arrivalTime}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Dock</span>
                <span className="detail-value">{selectedArrival.dock}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Reference</span>
                <span className="detail-value">{selectedArrival.cargo}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="status-badge-wrapper" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <span className={`status-badge status-${selectedArrival.status.toLowerCase().replace(/\s/g, "-")}`}>
                    {selectedArrival.status}
                  </span>
                  {selectedArrival.highwayInfraction && (
                    <span className="status-badge status-highway-infraction">
                      Infraction
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ArrivalsList;
