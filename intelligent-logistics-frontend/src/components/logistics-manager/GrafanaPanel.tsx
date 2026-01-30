/**
 * Grafana Panel Component
 * Embeds Grafana dashboard panels via iframe
 */
import { useState, useEffect } from "react";
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
}

export default function GrafanaPanel({
    dashboardUid,
    panelId,
    from = "now-24h",
    to = "now",
    height = 250,
    title,
    refresh = 30,
}: GrafanaPanelProps) {
    const { isDarkMode } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Build Grafana embed URL
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
        setError("Failed to load Grafana panel. Please check your connection.");
    };

    // Reset loading state when URL changes
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
            <div className="chart-container" style={{ height }}>
                {isLoading && !error && (
                    <div className="grafana-loading">
                        <div className="grafana-loading-spinner" />
                        <span>Loading chart...</span>
                    </div>
                )}
                {error && (
                    <div className="grafana-loading">
                        <span style={{ color: 'var(--danger-color)' }}>{error}</span>
                    </div>
                )}
                <iframe
                    src={buildGrafanaUrl()}
                    className="grafana-panel"
                    style={{
                        display: isLoading || error ? 'none' : 'block',
                        height,
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                    title={title || `Grafana Panel ${panelId}`}
                />
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
        volumeChart: 1,        // Volume de Chegadas panel ID
        alertsDonut: 2,        // Número de Alertas panel ID
        avgTimeBar: 3,         // Tempo Médio por Transportadora panel ID
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
