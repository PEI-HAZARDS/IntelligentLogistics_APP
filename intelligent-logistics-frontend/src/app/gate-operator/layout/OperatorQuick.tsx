import React from "react";
import { Outlet } from "react-router-dom";
import "./operator-layout.css";

export default function OperatorQuick() {
  return (
    <div className="operator-layout">
      {/* Header */}
      <header className="operator-header">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-icon"></div>
            <span className="logo-text">Porto de Aveiro</span>
          </div>
          <span className="header-subtitle">
            Painel de Gestão de Chegadas Diárias
          </span>
        </div>

        <div className="header-right">
          <div className="notification-bell">
            <div className="bell-icon">
              <div className="bell-top"></div>
              <div className="bell-middle"></div>
              <div className="bell-bottom"></div>
            </div>
          </div>
          <div className="user-avatar"></div>
          <span className="user-name">Maria Vicente</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="operator-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="operator-footer">
        <div className="footer-content">
          <span className="footer-copyright">
            © 2025 Porto Aveiro Staff Dashboard
          </span>
          <span className="footer-info">
            Sistema de Gestão de Logistica | Acesso Restrito
          </span>
        </div>
      </footer>
    </div>
  );
}
