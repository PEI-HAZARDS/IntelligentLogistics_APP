import { Link, useNavigate } from "react-router-dom";
import HLSPlayer from "./HLSPlayer";
import { getStreamUrl } from "@/config/streams";
import { AlertTriangle, FileText, ShieldAlert } from "lucide-react";

type Detection = {
  id: string;
  type: "plate" | "safety" | "adr";
  title: string;
  description: string;
  confidence?: number;
  time: string;
  severity: "warning" | "danger" | "info";
};

type Arrival = {
  id: string;
  plate: string;
  arrivalTime: string;
  cargo: string;
  cargoAmount: string;
  status: "Atrasado" | "Em trânsito" | "Pendente" | "Em descarga" | "Concluído";
  dock: string;
};

const mockDetections: Detection[] = [
  {
    id: "1",
    type: "plate",
    title: "Deteção Matrícula",
    description: 'Matrícula: "BC 8003" detetada com 95% de confiança',
    confidence: 95,
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
  {
    id: "5",
    type: "plate",
    title: "Deteção Matrícula",
    description: 'Matrícula: "AA-00-BB" (Histórico)',
    time: "21:45",
    severity: "info",
  },
  {
    id: "6",
    type: "safety",
    title: "Verificação de EPI",
    description: "Operador sem colete detetado na zona C",
    time: "21:30",
    severity: "warning",
  },
];

const mockArrivals: Arrival[] = [
  {
    id: "1",
    plate: "AA 00 BB",
    arrivalTime: "22h00m",
    cargo: "óleo Diesel (3000 L)",
    cargoAmount: "3000 L",
    status: "Atrasado",
    dock: "A",
  },
  {
    id: "2",
    plate: "BC 8003",
    arrivalTime: "22h15m",
    cargo: "óleo Diesel (2500 L)",
    cargoAmount: "2500 L",
    status: "Em trânsito",
    dock: "B",
  },
];

import { useState, useEffect } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [expandedArrivalId, setExpandedArrivalId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleAccordion = (id: string) => {
    setExpandedArrivalId(expandedArrivalId === id ? null : id);
  };

  return (
    <div className="operator-dashboard">
      {/* Coluna Esquerda - Câmera e Deteções */}
      <div className="left-panel">
        <div className="camera-section">
          <div className="video-area">
            <HLSPlayer
              streamUrl={getStreamUrl("gate01", "high")}
              quality="high"
              autoPlay={true}
            />
          </div>

          {/* Crops column - imagens serão carregadas via URLs da base de dados */}
          <div className="crops-column custom-scrollbar">
            {/* Placeholder thumbnails - substituir pelo mapeamento das URLs reais */}
            <div className="crop-thumb">
              <img src="/licen_pl.png" alt="crop placeholder" />
            </div>
            <div className="crop-thumb">
              <img src="/licen_pl.png" alt="crop placeholder" />
            </div>
            <div className="crop-thumb">
              <img src="/plate.png" alt="crop placeholder" />
            </div>
            <div className="crop-thumb">
              <img src="/plate.png" alt="crop placeholder" />
            </div>
            <div className="crop-thumb">
              <img src="/licen_pl.png" alt="crop placeholder" />
            </div>
          </div>
        </div>

        <div className="detections-section">
          <h3 className="section-title">
            <ShieldAlert size={20} className="inline-icon" /> Eventos de Deteção
          </h3>
          <div className="detections-list custom-scrollbar">
            {mockDetections.map((detection) => (
              <div
                key={detection.id}
                className={`detection-card severity-${detection.severity}`}
              >
                <div className="detection-header">
                  <div className="title-row">
                    {detection.type === 'plate' && <FileText size={16} />}
                    {detection.type === 'adr' && <ShieldAlert size={16} />}
                    {detection.type === 'safety' && <AlertTriangle size={16} />}
                    <h4>{detection.title}</h4>
                  </div>
                  <span className="detection-time">{detection.time}</span>
                </div>
                <p className="detection-description">{detection.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna Direita - Próximas Chegadas */}
      <div className="right-panel">
        <div className="panel-header-row">
          <h2 className="panel-title">Próximas Chegadas</h2>
          <div className="time-display">
            <span className="time-value">{currentTime}</span>
          </div>
        </div>

        <button
          className="view-toggle-btn"
          onClick={() => navigate("/gate/arrivals")}
        >
          Lista de Chegadas
        </button>

        <div className="arrivals-list custom-scrollbar">
          {mockArrivals.map((arrival) => {
            const isExpanded = expandedArrivalId === arrival.id;

            return (
              <div
                key={arrival.id}
                className={`arrival-accordion-item ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleAccordion(arrival.id)}
              >
                {/* Header (Always Visible) */}
                <div className="accordion-header">
                  <div className="header-main">
                    <span className="plate-id">{arrival.plate}</span>
                    <span className="arrival-time">{arrival.arrivalTime}</span>
                  </div>
                  <div className="header-status">
                    <span
                      className={`status-badge status-${arrival.status
                        .toLowerCase()
                        .replace(/\s/g, "-")}`}
                    >
                      {arrival.status}
                    </span>
                    <svg
                      className={`chevron ${isExpanded ? 'open' : ''}`}
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="accordion-content">
                    <div className="detail-row">
                      <span className="label">Cais:</span>
                      <span className="value">{arrival.dock}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Carga:</span>
                      <span className="value">{arrival.cargo}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Quantidade:</span>
                      <span className="value">{arrival.cargoAmount}</span>
                    </div>
                    <div className="actions-row">
                      <Link to={`/gate/arrival/${arrival.id}`} className="details-btn">
                        Ver Detalhes Completos
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div >
    </div >
  );
}
