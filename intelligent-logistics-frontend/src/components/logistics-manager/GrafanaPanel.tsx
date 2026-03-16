/**
 * Grafana Panel Component
 * Embeds Grafana dashboard panels via iframe
 */
import { useState, useEffect, type ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import config from "@/config/appConfig";

interface GrafanaPanelProps {
    /** Dashboard UID from Grafana */
    dashboardUid: string;
    /** Panel ID to display */
    panelId: number;
    /** Time range - start (Grafana format: 'now-1h', 'now-7d', etc.) */
    from?: string;
    /** Time range - end */
    to?: string;
    /** Panel height in pixels */
    height?: number;
    /** Optional title override */
    title?: string;
    /** Refresh interval in seconds (0 = no refresh) */
    refresh?: number;
    /** Demo fallback content */
    mockContent?: ReactNode;
}

export default function GrafanaPanel({
    dashboardUid,
    panelId,
    from = "now-24h",
    to = "now",
    height = 250,
    title,
    refresh = 30,
    mockContent,
}: GrafanaPanelProps) {
    const { isDarkMode } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const buildGrafanaUrl = () => {
        const theme = isDarkMode ? "dark" : "light";
        const params = new URLSearchParams({
            orgId: "1",
            from,
            to,
            theme,
            panelId: panelId.toString(),
        });

        if (refresh > 0) {
            params.append("refresh", `${refresh}s`);
        }

        return `${config.grafanaUrl}/d-solo/${dashboardUid}?${params.toString()}`;
    };

    const handleLoad = () => {
        setIsLoading(false);
        setError(null);
    };

    const handleError = () => {
        setIsLoading(false);
        setError("Failed to load panel");
    };

    useEffect(() => {
        setIsLoading(true);
        setError(null);
    }, [dashboardUid, panelId, from, to, isDarkMode]);

    return (
        <div className="chart-card">
            {title && (
                <div className="chart-header">
                    <h3 className="chart-title">{title}</h3>
                </div>
            )}

            <div className="chart-container" style={{ height, position: "relative" }}>
                {/* -------------------------------------------------------------
                   DEMO MODE: show mock content directly for presentation.
                   
                   To restore live Grafana mode:
                   1. Remove the demo block below
                   2. Uncomment the iframe block underneath it
                ------------------------------------------------------------- */}
                {mockContent ? (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        <div
                            style={{
                                fontSize: "0.8rem",
                                opacity: 0.75,
                                marginBottom: "0.75rem",
                            }}
                        >
                            Demo data
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>{mockContent}</div>
                    </div>
                ) : (
                    <div className="grafana-loading">
                        <span>No chart data available</span>
                    </div>
                )}

                {/*
                {isLoading && !error && (
                    <div className="grafana-loading">
                        <div className="grafana-loading-spinner" />
                        <span>Loading chart...</span>
                    </div>
                )}

                {error && (
                    <div className="grafana-loading">
                        <span style={{ color: "var(--danger-color)" }}>
                            Failed to load Grafana panel. Please check your connection.
                        </span>
                    </div>
                )}

                <iframe
                    src={buildGrafanaUrl()}
                    className="grafana-panel"
                    style={{
                        display: isLoading || error ? "none" : "block",
                        height,
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                    title={title || `Grafana Panel ${panelId}`}
                />
                */}
            </div>
        </div>
    );
}

/**
 * Common dashboard panel configurations
 * Edit these to match your Grafana dashboard setup
 */
export const DASHBOARD_PANELS = {
    overview: {
        uid: "overview",
        volumeChart: 1,
        alertsDonut: 2,
        avgTimeBar: 3,
    },
    apiGateway: {
        uid: "api-gateway",
        requests: 1,
        latency: 2,
    },
    dataModule: {
        uid: "data-module",
        arrivals: 1,
        visits: 2,
    },
};