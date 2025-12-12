import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Truck,
  CheckCircle,
  Search,
  Filter,
  RotateCcw,
  Trash2,
  FileText,
  Inbox,
  X,
  Save,
  Eye,
  Edit,
  ArrowLeft,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { getArrivals, getArrivalsStats, updateArrivalStatus } from "@/services/arrivals";
import { getActiveAlerts } from "@/services/alerts";
import type { Appointment, AppointmentStatusEnum, Alert } from "@/types/types";

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

// Map API status to Portuguese display
function mapStatusToPortuguese(status: AppointmentStatusEnum): string {
  const statusMap: Record<AppointmentStatusEnum, string> = {
    in_transit: "Em trânsito",
    delayed: "Atrasado",
    completed: "Concluído",
    canceled: "Cancelado",
  };
  return statusMap[status] || status;
}

// Map Portuguese status back to API status
function mapStatusToAPI(status: string): AppointmentStatusEnum {
  const statusMap: Record<string, AppointmentStatusEnum> = {
    "Pendente": "in_transit",
    "Em trânsito": "in_transit",
    "Em descarga": "in_transit",
    "Atrasado": "delayed",
    "Concluído": "completed",
    "Cancelado": "canceled",
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
};

export default function ArrivalsList() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }));

  // API data states
  const [arrivals, setArrivals] = useState<UIArrival[]>([]);
  const [alerts, setAlerts] = useState<UIAlert[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [dockFilter, setDockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [selectedArrival, setSelectedArrival] = useState<UIArrival | null>(null);
  const [editedArrival, setEditedArrival] = useState<UIArrival | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");

  // Get gate ID from user info
  const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
  const gateId = userInfo.gate_id || 1;

  // Map API arrival to UI
  const mapArrivalToUI = (arrival: Appointment): UIArrival => ({
    id: arrival.id,
    plate: arrival.truck_license_plate,
    dock: arrival.gate_in?.label || "N/A",
    arrivalTime: arrival.scheduled_start_time
      ? new Date(arrival.scheduled_start_time).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
      : "--:--",
    cargo: arrival.booking?.reference || "N/A",
    status: mapStatusToPortuguese(arrival.status),
    apiStatus: arrival.status,
  });

  // Map API alert to UI
  const mapAlertToUI = (alert: Alert): UIAlert => ({
    id: String(alert.id),
    type: mapAlertType(alert.type),
    title: alert.type.charAt(0).toUpperCase() + alert.type.slice(1) + " Alert",
    description: alert.description || "Alerta sem descrição",
    time: new Date(alert.timestamp).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
    severity: mapAlertSeverity(alert.type),
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [arrivalsData, alertsData, statsData] = await Promise.all([
        getArrivals({ gate_id: gateId, limit: 100 }),
        getActiveAlerts(20),
        getArrivalsStats(gateId),
      ]);

      setArrivals(arrivalsData.map(mapArrivalToUI));
      setAlerts(alertsData.map(mapAlertToUI));
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  }, [gateId]);

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }));
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

  // Filter Logic
  const filteredArrivals = arrivals.filter((arrival) => {
    if (statusFilter !== "all" && arrival.status !== statusFilter) return false;
    if (dockFilter !== "all" && arrival.dock !== dockFilter) return false;
    if (searchQuery && !arrival.plate.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Calculate stats - use API stats if available, otherwise calculate from arrivals
  const dynamicStats = {
    total: arrivals.length,
    pending: stats.in_transit || arrivals.filter(a => a.apiStatus === "in_transit").length,
    inProgress: stats.delayed || arrivals.filter(a => a.apiStatus === "delayed").length,
    completed: stats.completed || arrivals.filter(a => a.apiStatus === "completed").length,
  };

  const handleView = (arrival: UIArrival) => {
    setSelectedArrival(arrival);
    setEditedArrival(null);
    setModalMode("view");
  };

  const handleEdit = (arrival: UIArrival) => {
    setSelectedArrival(arrival);
    setEditedArrival({ ...arrival });
    setModalMode("edit");
  };

  const closeModal = () => {
    setSelectedArrival(null);
    setEditedArrival(null);
  };

  const handleSave = async () => {
    if (!editedArrival || !selectedArrival) return;

    setIsSaving(true);
    try {
      const newApiStatus = mapStatusToAPI(editedArrival.status);
      await updateArrivalStatus(editedArrival.id, {
        status: newApiStatus,
      });

      // Update local state
      setArrivals((prev) =>
        prev.map((a) =>
          a.id === editedArrival.id
            ? { ...a, status: editedArrival.status, apiStatus: newApiStatus, dock: editedArrival.dock }
            : a
        )
      );

      closeModal();
    } catch (err) {
      console.error("Failed to save:", err);
      setError("Erro ao guardar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearFilters = () => {
    setDockFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchData();
  };

  // Get unique docks from arrivals
  const availableDocks = [...new Set(arrivals.map(a => a.dock))].filter(d => d !== "N/A");

  return (
    <div className="arrivals-list-page">
      {/* Coluna Esquerda - Alertas */}
      <aside className="alerts-sidebar">
        <h2 className="sidebar-title">Últimos Alertas</h2>
        <div className="alerts-list">
          {isLoading && alerts.length === 0 ? (
            <div className="loading-state">
              <Loader2 size={20} className="spin" />
              <span>A carregar...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              <span>Sem alertas recentes.</span>
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
            <h1 className="panel-title">Lista de Chegadas</h1>
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
        <div className="stats-grid">
          <div
            className={`stat-card ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter("all")}
          >
            <div className="stat-icon"><FileText size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.total}</span>
              <span className="stat-label">Total de Chegadas</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'Em trânsito' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Em trânsito")}
          >
            <div className="stat-icon"><Clock size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.pending}</span>
              <span className="stat-label">Em Trânsito</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'Atrasado' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Atrasado")}
          >
            <div className="stat-icon"><Truck size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.inProgress}</span>
              <span className="stat-label">Atrasados</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'Concluído' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Concluído")}
          >
            <div className="stat-icon"><CheckCircle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.completed}</span>
              <span className="stat-label">Concluídos Hoje</span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="filters-section">
          <h3 className="filters-title">
            <Search className="inline-icon" size={20} style={{ marginRight: '8px' }} />
            Filtros e Pesquisa
          </h3>
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="dock-filter">Cais</label>
              <select id="dock-filter" value={dockFilter} onChange={(e) => setDockFilter(e.target.value)}>
                <option value="all">Todos os Cais</option>
                {availableDocks.map((dock) => (
                  <option key={dock} value={dock}>Cais {dock}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="status-filter">Estado</label>
              <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Todos os estados</option>
                <option value="Em trânsito">Em trânsito</option>
                <option value="Atrasado">Atrasado</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="search-input">Pesquisar</label>
              <input
                id="search-input"
                type="text"
                placeholder="Matrícula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="filters-actions">
            <button className="btn-outline" onClick={handleClearFilters}>
              <Trash2 size={16} /> Limpar
            </button>
            <button className="btn-primary" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}
              Atualizar
            </button>
          </div>
        </div>

        {/* Tabela/Cards */}
        <div className="arrivals-content">
          <div className="content-header">
            <h3 className="content-title">📋 Lista de Chegadas</h3>
          </div>

          {isLoading && arrivals.length === 0 ? (
            <div className="loading-state">
              <Loader2 size={32} className="spin" />
              <span>A carregar chegadas...</span>
            </div>
          ) : filteredArrivals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Inbox size={48} /></div>
              <p className="empty-message">
                {arrivals.length === 0
                  ? "Nenhuma chegada encontrada."
                  : "Nenhuma chegada encontrada com os filtros atuais..."}
              </p>
            </div>
          ) : (
            <div className="arrivals-table">
              <table>
                <thead>
                  <tr>
                    <th>Matrícula</th>
                    <th>Cais</th>
                    <th>Hora de Chegada</th>
                    <th>Referência</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArrivals.map((arrival) => (
                    <tr key={arrival.id}>
                      <td>{arrival.plate}</td>
                      <td>{arrival.dock}</td>
                      <td>{arrival.arrivalTime}</td>
                      <td>{arrival.cargo}</td>
                      <td>
                        <span className={`status-badge status-${arrival.status.toLowerCase().replace(/\s/g, "-")}`}>
                          {arrival.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => handleView(arrival)} title="Ver Detalhes">
                          <Eye size={18} />
                        </button>
                        <button className="btn-icon" onClick={() => handleEdit(arrival)} title="Editar">
                          <Edit size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                {modalMode === "view" ? <Eye size={20} /> : <Edit size={20} />}
                {modalMode === "view" ? "Detalhes da Chegada" : "Editar Chegada"}
              </h3>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Matrícula</span>
                <span className="detail-value">{selectedArrival.plate}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Hora de Chegada</span>
                <span className="detail-value">{selectedArrival.arrivalTime}</span>
              </div>

              {modalMode === "view" ? (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Cais</span>
                    <span className="detail-value">{selectedArrival.dock}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Referência</span>
                    <span className="detail-value">{selectedArrival.cargo}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Estado</span>
                    <span className="status-badge-wrapper" style={{ marginTop: '0.5rem' }}>
                      <span className={`status-badge status-${selectedArrival.status.toLowerCase().replace(/\s/g, "-")}`}>
                        {selectedArrival.status}
                      </span>
                    </span>
                  </div>
                </>
              ) : (
                /* Edit Mode Form */
                <>
                  <div className="detail-row">
                    <label className="detail-label">Cais</label>
                    <select
                      className="detail-input"
                      value={editedArrival?.dock || selectedArrival.dock}
                      onChange={(e) => setEditedArrival((prev) => prev ? { ...prev, dock: e.target.value } : null)}
                    >
                      {availableDocks.map((dock) => (
                        <option key={dock} value={dock}>Cais {dock}</option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-row">
                    <label className="detail-label">Referência (Restrito)</label>
                    <input
                      className="detail-input"
                      type="text"
                      value={selectedArrival.cargo}
                      disabled
                      style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="detail-row">
                    <label className="detail-label">Estado</label>
                    <select
                      className="detail-input"
                      value={editedArrival?.status || selectedArrival.status}
                      onChange={(e) => setEditedArrival((prev) => prev ? { ...prev, status: e.target.value } : null)}
                    >
                      <option value="Em trânsito">Em trânsito</option>
                      <option value="Atrasado">Atrasado</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancelar
              </button>
              {modalMode === "edit" && (
                <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="spin inline-icon" style={{ marginRight: '6px' }} />
                      A guardar...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="inline-icon" style={{ marginRight: '6px' }} />
                      Guardar Alterações
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
