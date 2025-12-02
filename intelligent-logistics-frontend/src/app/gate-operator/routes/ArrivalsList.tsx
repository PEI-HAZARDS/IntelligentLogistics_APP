import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

const mockArrivals: Arrival[] = [];

export default function ArrivalsList() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [dockFilter, setDockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = {
    total: 2,
    pending: 1,
    inProgress: 1,
    completed: 0,
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
        {/* Header com Hora e Estatísticas */}
        <div className="arrivals-header">
          <div className="time-badge">
            <span className="time-label">Hora:</span>
            <span className="time-value">22:22</span>
          </div>
          <h1 className="page-title">Lista de Chegadas</h1>
          <button className="btn-primary" onClick={() => navigate('/gate')}>
            Próximas Chegadas
          </button>
        </div>

        {/* Estatísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total de Chegadas</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pendentes</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚚</div>
            <div className="stat-content">
              <span className="stat-value">{stats.inProgress}</span>
              <span className="stat-label">Em descarga</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <span className="stat-value">{stats.completed}</span>
              <span className="stat-label">Concluídos Hoje</span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="filters-section">
          <h3 className="filters-title">🔍 Filtros e Pesquisa</h3>
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
            <button className="btn-secondary">🔍 Aplicar Filtros</button>
            <button className="btn-outline">🗑️ Limpar</button>
            <button className="btn-primary">🔄 Atualizar</button>
          </div>
        </div>

        {/* Tabela/Cards */}
        <div className="arrivals-content">
          <div className="content-header">
            <h3 className="content-title">📋 Lista de Chegadas Turno XXX</h3>
            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
              >
                📊 Tabela
              </button>
              <button
                className={`toggle-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
              >
                🗂️ Cartões
              </button>
            </div>
          </div>

          {mockArrivals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-message">Sem chegadas previstas nas próximas 24h...</p>
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
                  {mockArrivals.map((arrival) => (
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
                        <button className="btn-icon">👁️</button>
                        <button className="btn-icon">✏️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
