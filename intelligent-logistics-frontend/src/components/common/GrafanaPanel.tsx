import appConfig from '@/config/appConfig';

type GrafanaPanelProps = {
    dashboardId: string;
    panelId: string;
    orgId?: number;
    refresh?: string;
    title?: string;
    className?: string;
};

export default function GrafanaPanel({
    dashboardId,
    panelId,
    orgId = 1,
    refresh = '5s',
    title = 'Grafana panel',
    className = 'w-full h-full border-0',
}: GrafanaPanelProps) {
    const src = `${appConfig.grafanaUrl}/d-solo/${dashboardId}?orgId=${orgId}&timezone=browser&refresh=${refresh}&panelId=${panelId}&__feature.dashboardScene=true`;
    return (
        <iframe
            src={src}
            className={className}
            frameBorder="0"
            title={title}
        />
    );
}
