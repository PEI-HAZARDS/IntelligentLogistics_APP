/**
 * Statistics Service
 * API calls for manager dashboard data
 */
import api from '@/lib/api';

export interface DashboardSummary {
    trucksInPort: number;
    trucksInTransit: number;          // on-time in_transit (not yet delayed)
    trucksInTransitDelayed?: number;  // in_transit past scheduled time
    scheduledCount: number;
    unloadingCount: number;           // in_process with active unloading Visit
    completedCount: number;
    entriesCount: number;
    exitsCount: number;
    avgPermanenceMinutes: number;
    avgWaitingMinutes: number;
    delayRate: number;
    slaCompliance: number;
    infractionCount: number;
    peakHour: { hour: number; count: number } | null;
    portCapacity: number;
    congestionRate: number;
    vehiclesPerHour: number;
}

export interface DecisionAnalytics {
    totalDecisions: number;
    accepted: number;
    rejected: number;
    manualReview: number;
    acceptanceRate: number;
    avgPipelineMs: number;
    avgDetectionToDecisionMs: number;
}

export interface TransportStats {
    companyName: string;
    companyNif: string;
    avgUnloadingTime: number;
    avgWaitingTime: number;
    operationsCount: number;
    slaAttendedRate: number;
}

export interface VolumeDataPoint {
    timestamp: string;
    entries: number;
    exits: number;
}

export interface AlertsBreakdown {
    type: string;
    count: number;
    percentage: number;
}

/**
 * Get dashboard summary metrics. Pass `from`/`to` for period-scoped KPIs
 * (week/month/quarter/year), or `date` (default today) for a single day.
 */
export async function getDashboardSummary(date?: string, from?: string, to?: string): Promise<DashboardSummary> {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await api.get('/statistics/summary', { params });
    return response.data;
}

/**
 * Get per-company transport statistics
 */
export async function getTransportStats(
    from?: string,
    to?: string
): Promise<TransportStats[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const response = await api.get('/statistics/by-company', { params });
    return response.data;
}

/**
 * Get volume time series data
 */
export async function getVolumeData(
    from?: string,
    to?: string,
    interval: 'hour' | 'day' | 'week' = 'hour'
): Promise<VolumeDataPoint[]> {
    const params: Record<string, string> = { interval };
    if (from) params.from = from;
    if (to) params.to = to;

    const response = await api.get('/statistics/volume', { params });
    return response.data;
}

/**
 * Get decision analytics from MongoDB
 */
export async function getDecisionAnalytics(date?: string): Promise<DecisionAnalytics> {
    const params = date ? { date } : {};
    const response = await api.get('/statistics/decision-analytics', { params });
    return response.data;
}

/**
 * Get alerts breakdown by type
 */
export async function getAlertsBreakdown(
    from?: string,
    to?: string
): Promise<AlertsBreakdown[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const response = await api.get('/statistics/alerts', { params });
    return response.data;
}

export interface WaitDistribution {
    "0_5": number;
    "5_15": number;
    "15_30": number;
    over_30: number;
}

export interface SustainabilitySummary {
    from_date: string;
    to_date: string;
    trucks_processed: number;
    trucks_delayed: number;
    avg_waiting_minutes: number;
    total_waiting_minutes: number;
    total_co2_kg_estimate: number;
    avg_co2_per_truck_kg: number;
    appointments_excluded?: number;
    wait_distribution?: WaitDistribution;
}

export interface SustainabilityTrendPoint {
    period: string;
    trucks_processed: number;
    avg_waiting_minutes: number;
    total_co2_kg: number;
}

export async function getSustainabilitySummary(
    from: string,
    to: string
): Promise<SustainabilitySummary> {
    const response = await api.get('/statistics/sustainability/summary', {
        params: { from_date: from, to_date: to },
    });
    return response.data;
}

export async function getSustainabilityTrend(
    granularity: 'day' | 'week' | 'month' = 'day',
    nPeriods = 7
): Promise<SustainabilityTrendPoint[]> {
    const response = await api.get('/statistics/sustainability/trend', {
        params: { granularity, n_periods: nPeriods },
    });
    return response.data;
}
