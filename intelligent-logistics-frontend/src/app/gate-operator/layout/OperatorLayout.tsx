import React, { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import Header from "../../shared/layout/Header";
import ArrivalCard, { type Arrival } from "../components/ArrivalCard";
import "./operator-layout.css";

const mock: Arrival[] = [
  {
    id: "1234",
    number: "1432",
    datetime: "13-11-2025 22:14",
    status: "Em descarga",
    dock: "Cais B",
    plate: "BC 8003",
    cargo: "Óleo Diesel",
    quantity: "2500 L",
    adr: "1202",
    company: "Empresa",
    driver: "José Manuel",
    contact: "999 999 999",
    description:
      "A carga classificada como líquido inflamável pertencente à Classe 3 ...",
    history: [
      {
        id: "h1",
        title: "PERIGO DE COMBUSTÃO",
        text: "Nunca fumar, acender fósforos...",
      },
      {
        id: "h2",
        title: "Perigo de Contaminação Aquática",
        text: "Proibir o carregamento ...",
      },
    ],
  },
  {
    id: "5678",
    number: "1433",
    datetime: "13-11-2025 22:00",
    status: "Pendente",
    dock: "Cais A",
    plate: "AA 00 BB",
    cargo: "Óleo Diesel",
    quantity: "3000 L",
    adr: "1202",
    company: "Empresa",
    driver: "António",
    contact: "988 888 888",
    description: "Descrição resumida...",
    history: [],
  },
];

export default function OperatorLayout() {
  return (
    <div className="gate-root">
      <Header
        title="Porto de Aveiro"
        subtitle="Painel de Gestão de Chegadas Diárias"
        user="Maria Vicente"
      />

      <div className="gate-main">
        <aside className="gate-sidebar">
          <div className="logo">Portaria</div>
          <nav className="sidebar-nav">
            <Link to="/gate">Dashboard</Link>
            <Link to="/gate/plates">Verificar Placas</Link>
            <Link to="/gate/authorize">Autorizar Entrada</Link>
            <Link to="/gate/history">Histórico</Link>
            <Link to="/gate/settings">Configurações</Link>
          </nav>
        </aside>

        <section className="gate-content">
          <div className="content-topbar">
            <div className="time-notifs">
              <div className="time">
                Hora: <strong>22:12</strong>
              </div>
              <div className="notifs">
                🔔<span className="badge">1</span>
              </div>
            </div>
            <h1 className="page-title">Próximas Chegadas</h1>
            <div className="actions">
              <button className="overview-btn">Visão Geral</button>
            </div>
          </div>

          <div className="arrivals-wrapper">
            {mock.map((a) => (
              <ArrivalCard key={a.id} item={a} />
            ))}

            <Outlet />
          </div>
        </section>

        <aside className="gate-events">
          <div className="events-panel">
            <h4>Próximas Entradas</h4>
            <div className="placeholder">Sem entradas</div>
          </div>

          <div className="events-panel">
            <h4>Eventos</h4>
            <div className="placeholder">Aguardando eventos...</div>
          </div>
        </aside>
      </div>

      <footer className="gate-footer">
        © 2025 Porto Aveiro Staff Dashboard — Sistema de Gestão de Logística |
        Acesso Restrito
      </footer>
    </div>
  );
}
