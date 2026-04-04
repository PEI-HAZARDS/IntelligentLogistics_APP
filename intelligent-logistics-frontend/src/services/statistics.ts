/**
 * Statistics Service
 * API calls for manager dashboard data
 */
import api from '@/lib/api';

export interface DashboardSummary {
    totalTrucks: number;
    entriesCount: number;
    exitsCount: number;
    avgPermanenceMinutes: number;
    delayRate: number;
    slaCompliance: number;
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
 * Get dashboard summary metrics for a given date
 */
export async function getDashboardSummary(date?: string): Promise<DashboardSummary> {
    const params = date ? { date } : {};
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
