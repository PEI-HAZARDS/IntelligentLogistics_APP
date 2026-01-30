/**
 * Statistics Service
 * API calls for manager dashboard data
 */
import axios from 'axios';
import config from '@/config/appConfig';

const api = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: 10000,
});

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

// Mock data for development when API is not available
export const MOCK_SUMMARY: DashboardSummary = {
    totalTrucks: 47,
    entriesCount: 23,
    exitsCount: 24,
    avgPermanenceMinutes: 45,
    delayRate: 8.5,
    slaCompliance: 94.2,
};

export const MOCK_TRANSPORT_STATS: TransportStats[] = [
    { companyName: "TransLogis", companyNif: "501234567", avgUnloadingTime: 32, avgWaitingTime: 15, operationsCount: 12, slaAttendedRate: 95 },
    { companyName: "RapidCargo", companyNif: "502345678", avgUnloadingTime: 28, avgWaitingTime: 18, operationsCount: 8, slaAttendedRate: 88 },
    { companyName: "EuroFreight", companyNif: "503456789", avgUnloadingTime: 45, avgWaitingTime: 12, operationsCount: 15, slaAttendedRate: 92 },
    { companyName: "NorteTransporte", companyNif: "504567890", avgUnloadingTime: 38, avgWaitingTime: 22, operationsCount: 6, slaAttendedRate: 78 },
    { companyName: "SulExpress", companyNif: "505678901", avgUnloadingTime: 30, avgWaitingTime: 14, operationsCount: 10, slaAttendedRate: 96 },
];
