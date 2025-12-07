import { useState, useEffect } from "react";
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
  ArrowLeft
} from "lucide-react";

type Alert = {
  id: string;
  type: "plate" | "safety" | "adr";
  title: string;
  description: string;
  time: string;
  severity?: "warning" | "danger" | "info";
};

type Arrival = {
  id: string;
  plate: string;
  dock: string;
  arrivalTime: string;
  cargo: string;
  status: "Pendente" | "Em descarga" | "Concluído";
};

const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "plate",
    title: "Deteção Matrícula",
    description: 'Matrícula: "BC 8003" detetada com 95% de confiança',
    time: "22:00",
    severity: "info",
  },
  {
    id: "2",
    type: "safety",
    title: "Deteção Placa de Segurança",
    description: '"30": líquido inflamável | "1202": óleo diesel',
    time: "22:00",
    severity: "warning",
  },
  {
    id: "3",
    type: "adr",
    title: "Deteção Placa ADR",
    description: "Líquidos inflamáveis: PERIGO DE COMBUSTÃO",
    time: "22:00",
    severity: "danger",
  },
  {
    id: "4",
    type: "adr",
    title: "Deteção Placa ADR",
    description: "Perigo Ambiental Aquático",
    time: "22:01",
    severity: "danger",
  },
];

const mockArrivals: Arrival[] = [
  {
    id: "1",
    plate: "AA-00-BB",
    dock: "A",
    arrivalTime: "22:00",
    cargo: "Óleo Diesel (3000L)",
    status: "Pendente",
  },
  {
    id: "2",
    plate: "BC-80-03",
    dock: "B",
    arrivalTime: "22:15",
    cargo: "Gasolina (5000L)",
    status: "Em descarga",
  },
  {
    id: "3",
    plate: "CC-11-DD",
    dock: "C",
    arrivalTime: "22:30",
    cargo: "Etanol (2000L)",
    status: "Concluído",
  },
  {
    id: "4",
    plate: "EE-22-FF",
    dock: "A",
    arrivalTime: "23:00",
    cargo: "Contentores Variados",
    status: "Pendente",
  },
];

export default function ArrivalsList() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [dockFilter, setDockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArrival, setSelectedArrival] = useState<Arrival | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");

  const handleView = (arrival: Arrival) => {
    setSelectedArrival(arrival);
    setModalMode("view");
  };

  const handleEdit = (arrival: Arrival) => {
    setSelectedArrival(arrival);
    setModalMode("edit");
  };

  const closeModal = () => {
    setSelectedArrival(null);
  };

  const handleSave = () => {
    // Here you would typically call an API to update the arrival
    // For now we just close the modal
    console.log("Saving changes...", selectedArrival);
    closeModal();
  };


  const navigate = useNavigate();

  // Filter Logic
  const filteredArrivals = mockArrivals.filter((arrival) => {
    // 1. Status Filter
    if (statusFilter !== "all" && arrival.status !== statusFilter) return false;
    // 2. Dock Filter
    if (dockFilter !== "all" && arrival.dock !== dockFilter) return false;
    // 3. Search Query (Plate)
    if (searchQuery && !arrival.plate.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });

  // Calculate stats dynamically based on mock data (or real data in future)
  const dynamicStats = {
    total: mockArrivals.length,
    pending: mockArrivals.filter(a => a.status === "Pendente").length,
    inProgress: mockArrivals.filter(a => a.status === "Em descarga").length,
    completed: mockArrivals.filter(a => a.status === "Concluído").length
  };

  const handleClearFilters = () => {
    setDockFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="arrivals-list-page">
      {/* Coluna Esquerda - Alertas */}

      <aside className="alerts-sidebar">
        <h2 className="sidebar-title">Últimos Alertas</h2>
        <div className="alerts-list">
          {mockAlerts.map((alert) => (
            <div key={alert.id} className={`alert-card severity-${alert.severity}`}>
              <div className="alert-header">
                <h4>{alert.title}</h4>
                <span className="alert-time">{alert.time}</span>
              </div>
              <p className="alert-description">{alert.description}</p>
            </div>
          ))}
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
            className={`stat-card ${statusFilter === 'Pendente' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Pendente")}
          >
            <div className="stat-icon"><Clock size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.pending}</span>
              <span className="stat-label">Pendentes</span>
            </div>
          </div>
          <div
            className={`stat-card ${statusFilter === 'Em descarga' ? 'active' : ''}`}
            onClick={() => setStatusFilter("Em descarga")}
          >
            <div className="stat-icon"><Truck size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{dynamicStats.inProgress}</span>
              <span className="stat-label">Em descarga</span>
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
                <option value="A">Cais A</option>
                <option value="B">Cais B</option>
                <option value="C">Cais C</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="status-filter">Estado</label>
              <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Todos os estados</option>
                <option value="Pendente">Pendente</option>
                <option value="Em descarga">Em descarga</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="time-filter">Hora</label>
              <input id="time-filter" type="time" />
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
            <button className="btn-secondary">
              <Filter size={16} /> Aplicar Filtros
            </button>
            <button className="btn-outline" onClick={handleClearFilters}>
              <Trash2 size={16} /> Limpar
            </button>
            <button className="btn-primary">
              <RotateCcw size={16} /> Atualizar
            </button>
          </div>
        </div>

        {/* Tabela/Cards */}
        <div className="arrivals-content">
          <div className="content-header">
            <h3 className="content-title">📋 Lista de Chegadas Turno XXX</h3>
            <div className="view-toggle">
              {/* View content placeholder if needed, or remove completely */}
            </div>
          </div>

          {filteredArrivals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Inbox size={48} /></div>
              <p className="empty-message">Nenhuma chegada encontrada com os filtros atuais...</p>
            </div>
          ) : (
            <div className="arrivals-table">
              <table>
                <thead>
                  <tr>
                    <th>Matrícula</th>
                    <th>Cais</th>
                    <th>Hora de Chegada</th>
                    <th>Carga</th>
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
      </main >

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
                    <span className="detail-label">Carga</span>
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
                      value={selectedArrival.dock}
                      onChange={(e) => setSelectedArrival({ ...selectedArrival, dock: e.target.value })}
                    >
                      <option value="A">Cais A</option>
                      <option value="B">Cais B</option>
                      <option value="C">Cais C</option>
                    </select>
                  </div>
                  <div className="detail-row">
                    <label className="detail-label">Carga (Restrito)</label>
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
                      value={selectedArrival.status}
                      onChange={(e) => setSelectedArrival({ ...selectedArrival, status: e.target.value as any })}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em descarga">Em descarga</option>
                      <option value="Concluído">Concluído</option>
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
                <button className="btn-primary" onClick={handleSave}>
                  <Save size={16} className="inline-icon" style={{ marginRight: '6px' }} />
                  Guardar Alterações
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
