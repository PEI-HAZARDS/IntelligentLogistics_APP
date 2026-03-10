import React from "react";
import { createRoot } from "react-dom/client";
import AppRouter from "./router";
import { ThemeProvider } from "./contexts/ThemeContext";
import config from "./config/appConfig";
import "./index.css";

document.title = `${config.subtitle} | ${config.portName}`;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  </React.StrictMode>
);
