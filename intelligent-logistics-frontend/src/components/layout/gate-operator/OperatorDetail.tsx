import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import OperatorHeader from "./OperatorHeader";
import "./operator-layout.css";

export default function OperatorDetail() {
  return (
    <ThemeProvider>
      <div className="operator-layout">
        <OperatorHeader />

        {/* Main Content */}
        <main className="operator-main">
          <Outlet />
        </main>

        <footer className="operator-footer">
          <span>© 2025 Porto de Aveiro - Sistema Gestão Logístico</span>
          <span>Versão 1.0.0</span>
        </footer>
      </div>
    </ThemeProvider>
  );
}
