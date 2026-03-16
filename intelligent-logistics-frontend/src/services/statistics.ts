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

// -----------------------------------------------------------------------------
// Mock data for development when API is not available
// Coherent story:
// - Busy but controlled day at the port
// - Good SLA compliance overall
// - Mild operational pressure around midday
// - A couple of weaker carriers, but no disaster scenario
// -----------------------------------------------------------------------------

export const MOCK_SUMMARY: DashboardSummary = {
    totalTrucks: 42,
    entriesCount: 31,
    exitsCount: 28,
    avgPermanenceMinutes: 52,
    delayRate: 11.4,
    slaCompliance: 91.8,
};

export const MOCK_TRANSPORT_STATS: TransportStats[] = [
    {
        companyName: "Atlantic Gate Logistics",
        companyNif: "501234567",
        avgUnloadingTime: 34,
        avgWaitingTime: 11,
        operationsCount: 18,
        slaAttendedRate: 96,
    },
    {
        companyName: "Lusitania Cargo",
        companyNif: "502345678",
        avgUnloadingTime: 37,
        avgWaitingTime: 14,
        operationsCount: 15,
        slaAttendedRate: 93,
    },
    {
        companyName: "Iberia Freight Solutions",
        companyNif: "503456789",
        avgUnloadingTime: 41,
        avgWaitingTime: 16,
        operationsCount: 13,
        slaAttendedRate: 89,
    },
    {
        companyName: "North Dock Transportes",
        companyNif: "504567890",
        avgUnloadingTime: 46,
        avgWaitingTime: 21,
        operationsCount: 11,
        slaAttendedRate: 84,
    },
    {
        companyName: "PortoBulk Transit",
        companyNif: "505678901",
        avgUnloadingTime: 39,
        avgWaitingTime: 13,
        operationsCount: 14,
        slaAttendedRate: 91,
    },
    {
        companyName: "Tagus Heavy Logistics",
        companyNif: "506789012",
        avgUnloadingTime: 49,
        avgWaitingTime: 24,
        operationsCount: 9,
        slaAttendedRate: 81,
    },
    {
        companyName: "EuroHaul Atlantic",
        companyNif: "507890123",
        avgUnloadingTime: 36,
        avgWaitingTime: 12,
        operationsCount: 16,
        slaAttendedRate: 94,
    },
];

// Stable deterministic hourly volume data for the last 24 hours
// Pattern: low traffic at night, morning ramp-up, midday peak, softer evening
function generateMockVolumeData(): VolumeDataPoint[] {
    const points: VolumeDataPoint[] = [];
    const now = new Date();

    const hourlyPattern = [
        { entries: 1, exits: 1 }, // -23h
        { entries: 1, exits: 1 },
        { entries: 2, exits: 1 },
        { entries: 2, exits: 2 },
        { entries: 3, exits: 2 },
        { entries: 4, exits: 3 },
        { entries: 5, exits: 4 },
        { entries: 6, exits: 5 },
        { entries: 7, exits: 6 },
        { entries: 8, exits: 7 },
        { entries: 9, exits: 8 },
        { entries: 10, exits: 8 },
        { entries: 9, exits: 8 },
        { entries: 8, exits: 7 },
        { entries: 7, exits: 7 },
        { entries: 6, exits: 6 },
        { entries: 5, exits: 5 },
        { entries: 4, exits: 5 },
        { entries: 3, exits: 4 },
        { entries: 3, exits: 3 },
        { entries: 2, exits: 3 },
        { entries: 2, exits: 2 },
        { entries: 1, exits: 2 },
        { entries: 1, exits: 1 }, // current hour
    ];

    for (let i = 23; i >= 0; i--) {
        const ts = new Date(now);
        ts.setHours(ts.getHours() - i, 0, 0, 0);

        const patternIndex = 23 - i;
        const point = hourlyPattern[patternIndex];

        points.push({
            timestamp: ts.toISOString(),
            entries: point.entries,
            exits: point.exits,
        });
    }

    return points;
}

export const MOCK_VOLUME_DATA: VolumeDataPoint[] = generateMockVolumeData();

export const MOCK_ALERTS_BREAKDOWN: AlertsBreakdown[] = [
    { type: "operational", count: 14, percentage: 46.7 },
    { type: "problem", count: 8, percentage: 26.7 },
    { type: "safety", count: 5, percentage: 16.7 },
    { type: "generic", count: 3, percentage: 10.0 },
];