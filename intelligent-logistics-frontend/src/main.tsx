import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRouter from "./router";
import { ThemeProvider } from "./contexts/ThemeContext";
import config from "./config/appConfig";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

document.title = `${config.subtitle} | ${config.portName}`;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
