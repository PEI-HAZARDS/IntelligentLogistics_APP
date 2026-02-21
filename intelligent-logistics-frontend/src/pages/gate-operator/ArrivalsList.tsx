import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { getArrivals, getArrivalsStats } from "@/services/arrivals";
import { getActiveAlerts } from "@/services/alerts";
import type { Appointment, AppointmentStatusEnum, Alert, ArrivalsQueryParams } from "@/types/types";

// Map API severity to UI
function mapAlertSeverity(type: string): "warning" | "danger" | "info" {
  if (type === "problem" || type === "safety") return "danger";
  if (type === "operational") return "warning";
  return "info";
}

// Map API alert type to UI type
function mapAlertType(type: string): "plate" | "safety" | "adr" {
  if (type === "safety" || type === "problem") return "adr";
  if (type === "operational") return "safety";
  return "plate";
}

// Map API status to English display
function mapStatusToLabel(status: AppointmentStatusEnum): string {
  const statusMap: Record<AppointmentStatusEnum, string> = {
    in_transit: "In Transit",
    in_process: "In Process",
    delayed: "Delayed",
    completed: "Completed",
    canceled: "Canceled",
  };
  return statusMap[status] || status;
}

// Map English status back to API status
function mapStatusToAPI(status: string): AppointmentStatusEnum {
  const statusMap: Record<string, AppointmentStatusEnum> = {
    "Pending": "in_transit",
    "In Transit": "in_transit",
    "In Process": "in_process",
    "Unloading": "in_process",
    "Delayed": "delayed",
    "Completed": "completed",
    "Canceled": "canceled",
  };
  return statusMap[status] || "in_transit";
}

// UI types for component state
type UIAlert = {
  id: string;
  type: "plate" | "safety" | "adr";
  title: string;
  description: string;
  time: string;
  severity?: "warning" | "danger" | "info";
};

type UIArrival = {
  id: number;
  plate: string;
  dock: string;
  arrivalTime: string;
  cargo: string;
  status: string;
  apiStatus: AppointmentStatusEnum;
  highwayInfraction?: boolean;
};

export const ITEMS_PER_PAGE = 10;

function ArrivalsList() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));

  // API data states
  const [arrivals, setArrivals] = useState<UIArrival[]>([]);
  const [alerts, setAlerts] = useState<UIAlert[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [dockFilter, setDockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pinned state
  const [pinnedArrivals, setPinnedArrivals] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("pinned_arrivals") || "[]");
    } catch {
      return [];
    }
  });

  const togglePin = (id: number) => {
    setPinnedArrivals((prev) => {
      const isPinned = prev.includes(id);
      const next = isPinned ? prev.filter((p) => p !== id) : [...prev, id];
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

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('alerts_sidebar_collapsed');
    return saved === 'true';
  });

  // Modal states
  const [selectedArrival, setSelectedArrival] = useState<UIArrival | null>(null);

  // Get gate ID from user info
  const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
  const gateId = userInfo.gate_id || 1;

  // Map API arrival to UI
  const mapArrivalToUI = (arrival: Appointment): UIArrival => ({
    id: arrival.id,
    plate: arrival.truck_license_plate,
    dock: arrival.gate_in?.label || "N/A",
    arrivalTime: arrival.scheduled_start_time
      ? new Date(arrival.scheduled_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "--:--",
    cargo: arrival.booking?.reference || "N/A",
    status: mapStatusToLabel(arrival.status),
    apiStatus: arrival.status,
    highwayInfraction: (arrival as any).highway_infraction || false,
  });

  // Map API alert to UI
  const mapAlertToUI = (alert: Alert): UIAlert => ({
    id: String(alert.id),
    type: mapAlertType(alert.type),
    title: alert.type.charAt(0).toUpperCase() + alert.type.slice(1) + " Alert",
    description: alert.description || "Alert without description",
    time: new Date(alert.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    severity: mapAlertSeverity(alert.type),
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const arrivalsParams: ArrivalsQueryParams = {
        gate_id: gateId,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };
      // statusFilter "Violators" has no backend param — filter client-side after fetch
      if (statusFilter !== "all" && statusFilter !== "Violators") {
        arrivalsParams.status = mapStatusToAPI(statusFilter);
      }
      if (debouncedSearch) arrivalsParams.search = debouncedSearch;

      const [arrivalsData, alertsData, statsData] = await Promise.all([
        getArrivals(arrivalsParams),
        getActiveAlerts(20),
        getArrivalsStats(gateId),
      ]);

      let mapped = arrivalsData.items.map(mapArrivalToUI);
      if (statusFilter === "Violators") mapped = mapped.filter(a => a.highwayInfraction);

      setArrivals(mapped);
      setServerPages(arrivalsData.pages);
      setServerTotal(arrivalsData.total);
      setAlerts(alertsData.map(mapAlertToUI));
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [gateId, currentPage, debouncedSearch, statusFilter]);

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

  // Filter Logic — dock is the only remaining client-side dimension
  const displayArrivals = dockFilter !== "all"
    ? arrivals.filter(a => a.dock === dockFilter)
    : arrivals;
  const totalPages = serverPages;

  // Reset page when server-side filter status changes
  useEffect(() => { setCurrentPage(1); }, [statusFilter]);

  // All stats come from the /stats endpoint (full gate population, not current page)
  const statsTotal = (stats.in_transit ?? 0) + (stats.in_process ?? 0) + (stats.delayed ?? 0) + (stats.completed ?? 0);
  const dynamicStats = {
    total: statsTotal || serverTotal,
    pending: stats.in_transit ?? 0,
    inProcess: stats.in_process ?? 0,
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

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('alerts_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Get unique docks from arrivals
  const availableDocks = [...new Set(arrivals.map(a => a.dock))].filter(d => d !== "N/A");

  return (
    <div className="arrivals-list-page">
      {/* Álerta Sidebar — collapsible */}
      <aside className={`alerts-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && <h2 className="sidebar-title">Latest Alerts</h2>}
          <button
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft size={18} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>
        </div>
        {!sidebarCollapsed && (
          <div className="alerts-list">
            {isLoading && alerts.length === 0 ? (
              <div className="loading-state">
                <Loader2 size={20} className="spin" />
                <span>Loading...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="empty-state">
                <span>No recent alerts.</span>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className={`alert-card severity-${alert.severity}`}>
                  <div className="alert-header">
                    <h4>{alert.title}</h4>
                    <span className="alert-time">{alert.time}</span>
                  </div>
                  <p className="alert-description">{alert.description}</p>
                </div>
              ))
            )}
          </div>
        )}
      </aside>

      {/* Coluna Direita - Lista de Chegadas */}
      <main className="arrivals-main">
        {/* Grid Header for alignment */}
        <div className="header-grid">
          <div className="header-left">
            <button
              className="btn-secondary"
              onClick={() => navigate('/gate')}
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
        {/* Estatísticas — compact 2×3 pill grid */}
        <div className="stats-grid">
          {/* Row 1: Total · Delayed · Infractions */}
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
            className={`stat-card ${statusFilter === 'Delayed' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Delayed")}
          >
            <div className="stat-icon"><AlertTriangle size={20} /></div>
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
          {/* Row 2: In Transit · In Process · Completed */}
          <div
            className={`stat-card ${statusFilter === 'In Transit' ? 'active' : ''}`}
            onClick={() => setStatusFilter("In Transit")}
          >
            <div className="stat-icon"><Clock size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.pending}</span>
              <span className="stat-label">In Transit</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'In Process' ? 'active' : ''}`}
            onClick={() => setStatusFilter("In Process")}
          >
            <div className="stat-icon"><Truck size={20} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.inProcess}</span>
              <span className="stat-label">In Process</span>
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

        {/* Tabela/Cards e Filtros Integrados */}
        <div className="arrivals-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Table header row */}
          <div className="content-header" style={{ marginBottom: 0 }}>
            <h3 className="content-title">Arrivals List</h3>
            <span className="content-count">
              {displayArrivals.length} {displayArrivals.length === 1 ? 'arrival' : 'arrivals'}
            </span>
          </div>

          {/* Filtros Integrados */}
          <div className="filters-section" style={{ margin: 0, padding: 0, background: 'transparent', border: 'none' }}>
            <div className="filters-grid" style={{ marginBottom: 0 }}>
              <div className="filter-group">
                <label htmlFor="dock-filter">Dock</label>
                <select id="dock-filter" value={dockFilter} onChange={(e) => setDockFilter(e.target.value)}>
                  <option value="all">All Docks</option>
                  {availableDocks.map((dock) => (
                    <option key={dock} value={dock}>Dock {dock}</option>
                  ))}
                </select>
              </div>
              {/* O filtro de status foi removido daqui pois está sendo controlado pelos cards acima */}
              <div className="filter-group">
                <label htmlFor="search-input">Search</label>
                <input
                  id="search-input"
                  type="text"
                  placeholder="License plate..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filter-group filter-actions-inline">
                <label>&nbsp;</label>
                <div className="filter-buttons">
                  <button className="btn-icon-only" onClick={handleClearFilters} title="Clear Filters">
                    <Trash2 size={18} />
                  </button>
                  <button className="btn-icon-only btn-primary-icon" onClick={handleRefresh} disabled={isLoading} title="Refresh">
                    {isLoading ? <Loader2 size={18} className="spin" /> : <RotateCcw size={18} />}
                  </button>
                </div>
              </div>
            </div>
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
                    {displayArrivals.map((arrival) => (
                      <tr
                        key={arrival.id}
                        className={[
                          arrival.highwayInfraction ? 'row-violation' : '',
                          arrival.apiStatus === 'delayed' ? 'row-delayed' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <td>{arrival.plate}</td>
                        <td>{arrival.dock}</td>
                        <td>{arrival.arrivalTime}</td>
                        <td>{arrival.cargo}</td>
                        <td>
                          <span className={`status-badge status-${arrival.status.toLowerCase().replace(/\s/g, "-")}`}>
                            {arrival.status}
                          </span>
                          {arrival.highwayInfraction && (
                            <span className="status-badge status-highway-infraction" style={{ marginLeft: '4px' }}>
                              Infraction
                            </span>
                          )}
                        </td>
                        <td>
                          <button className="btn-icon" onClick={() => handleView(arrival)} title="View Details">
                            <Eye size={18} />
                          </button>
                          <button className="btn-icon" onClick={() => handleEdit(arrival)} title="Edit">
                            <Edit size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
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

              {modalMode === "view" ? (
                <>
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
