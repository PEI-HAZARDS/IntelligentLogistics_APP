/**
 * Alerts API Service
 * Handles all alert related API calls
 */
import api from '@/lib/api';
import type {
    Alert,
    AlertsQueryParams,
    CreateAlertRequest,
    CreateHazmatAlertRequest
} from '@/types/types';

const BASE_PATH = '/alerts';

/**
 * List alerts with optional filters
 */
export async function getAlerts(params?: AlertsQueryParams): Promise<Alert[]> {
    const response = await api.get<Alert[]>(BASE_PATH, { params });
    return response.data;
}

/**
 * List active alerts (last 24h)
 */
export async function getActiveAlerts(limit: number = 50): Promise<Alert[]> {
    const response = await api.get<Alert[]>(`${BASE_PATH}/active`, {
        params: { limit }
    });
    return response.data;
}

/**
 * Get alert statistics by type (last 24h)
 */
export async function getAlertsStats(): Promise<Record<string, number>> {
    const response = await api.get<Record<string, number>>(`${BASE_PATH}/stats`);
    return response.data;
}

/**
 * Get all alerts for a specific visit
 */
export async function getVisitAlerts(visitId: number): Promise<Alert[]> {
    const response = await api.get<Alert[]>(`${BASE_PATH}/visit/${visitId}`);
    return response.data;
}

/**
 * Get a single alert by ID
 */
export async function getAlert(alertId: number): Promise<Alert> {
    const response = await api.get<Alert>(`${BASE_PATH}/${alertId}`);
    return response.data;
}

/**
 * Create a manual alert
 */
export async function createAlert(alertData: CreateAlertRequest): Promise<Alert> {
    const response = await api.post<Alert>(BASE_PATH, alertData);
    return response.data;
}

/**
 * Create a hazmat/ADR specific alert
 */
export async function createHazmatAlert(
    alertData: CreateHazmatAlertRequest
): Promise<Alert> {
    const response = await api.post<Alert>(`${BASE_PATH}/hazmat`, alertData);
    return response.data;
}

/**
 * Get ADR codes reference
 */
export async function getAdrCodes(): Promise<unknown> {
    const response = await api.get(`${BASE_PATH}/reference/adr-codes`);
    return response.data;
}

/**
 * Get Kemler codes reference
 */
export async function getKemlerCodes(): Promise<unknown> {
    const response = await api.get(`${BASE_PATH}/reference/kemler-codes`);
    return response.data;
}
