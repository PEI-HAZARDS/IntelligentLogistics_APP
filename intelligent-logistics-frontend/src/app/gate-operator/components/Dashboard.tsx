import React from "react";
import { Link, useNavigate } from "react-router-dom";
import HLSPlayer from "./HLSPlayer";
import { getStreamUrl } from "../../../config/streams";

type Detection = {
  id: string;
  type: "plate" | "safety" | "adr";
  title: string;
  description: string;
  confidence?: number;
  time: string;
  severity?: "warning" | "danger" | "info";
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

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="operator-dashboard">
      {/* Coluna Esquerda - Câmera e Deteções */}
      <div className="left-panel">
        <div className="camera-section">
          <HLSPlayer
            streamUrl={getStreamUrl("gate01", "high")}
            quality="high"
            autoPlay={true}
          />
        </div>

        <div className="detections-section">
          {mockDetections.map((detection) => (
            <div
              key={detection.id}
              className={`detection-card severity-${detection.severity}`}
            >
              <div className="detection-header">
                <h4>{detection.title}</h4>
              </div>
              <p className="detection-description">{detection.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coluna Direita - Próximas Chegadas */}
      <div className="right-panel">
        <div className="panel-header">
          <div className="time-display">
            <span className="time-label">Hora:</span>
            <span className="time-value">22:12</span>
          </div>
        </div>

        <h2 className="panel-title">Próximas Chegadas</h2>

        <button className="view-toggle-btn" onClick={() => navigate('/gate/arrivals')}>
          Visão Geral
        </button>

        <div className="arrivals-list">
          {mockArrivals.map((arrival) => (
            <Link
              key={arrival.id}
              to={`/gate/arrival/${arrival.id}`}
              className="arrival-card"
            >
              <div className="arrival-header">
                <div className="arrival-field">
                  <span className="label">Matrícula:</span>
                  <span className="value">{arrival.plate}</span>
                </div>
                <div className="arrival-field">
                  <span className="label">Hora de chegada (Prevista):</span>
                  <span className="value">{arrival.arrivalTime}</span>
                </div>
              </div>

              <div className="arrival-body">
                <div className="arrival-row">
                  <div className="arrival-field">
                    <span className="label">Carga:</span>
                    <span className="value">{arrival.cargo}</span>
                  </div>
                </div>
                <div className="arrival-row">
                  <div className="arrival-field">
                    <span className="label">Estado:</span>
                    <span
                      className={`value status-${arrival.status
                        .toLowerCase()
                        .replace(/\s/g, "-")}`}
                    >
                      {arrival.status}
                    </span>
                  </div>
                  <div className="arrival-field">
                    <span className="label">Cais:</span>
                    <span className="value">{arrival.dock}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
