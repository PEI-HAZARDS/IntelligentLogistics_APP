/**
 * Arrivals API Service
 * Handles all arrival/appointment related API calls
 */
import api from '@/lib/api';
import type {
    Appointment,
    AppointmentStatusUpdate,
    ArrivalsQueryParams,
    PaginatedResponse,
    Visit,
    CreateVisitRequest,
    VisitStatusUpdate
} from '@/types/types';

const BASE_PATH = '/arrivals';

/**
 * List arrivals with server-side pagination, filtering and search.
 * Normalizes both legacy flat-array responses and the new PaginatedResponse envelope
 * so callers always receive { items, total, page, limit, pages }.
 */
export async function getArrivals(params?: ArrivalsQueryParams): Promise<PaginatedResponse<Appointment>> {
    const response = await api.get<PaginatedResponse<Appointment> | Appointment[]>(BASE_PATH, { params });
    const data = response.data;

    // Backend not yet updated — flat array returned
    if (Array.isArray(data)) {
        return {
            items: data,
            total: data.length,
            page: params?.page ?? 1,
            limit: params?.limit ?? data.length,
            pages: 1,
        };
    }

    return data;
}

/**
 * Get arrival statistics by status
 */
export async function getArrivalsStats(
    gateId?: number,
    targetDate?: string
): Promise<Record<string, number>> {
    const response = await api.get<Record<string, number>>(`${BASE_PATH}/stats`, {
        params: { gate_id: gateId, target_date: targetDate }
    });
    return response.data;
}

/**
 * Get upcoming arrivals for a gate
 */
export async function getUpcomingArrivals(
    gateId: number,
    limit: number = 5,
    status?: Appointment['status']
): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>(`${BASE_PATH}/next/${gateId}`, {
        params: { limit, status }
    });
    return response.data;
}

/**
 * Get a single arrival by appointment ID
 */
export async function getArrival(appointmentId: number): Promise<Appointment> {
    const response = await api.get<Appointment>(`${BASE_PATH}/${appointmentId}`);
    return response.data;
}

/**
 * Get arrival by PIN/arrival_id (used by drivers)
 */
export async function getArrivalByPin(arrivalId: string): Promise<Appointment> {
    const response = await api.get<Appointment>(`${BASE_PATH}/pin/${arrivalId}`);
    return response.data;
}

/**
 * Query arrivals by license plate
 */
export async function queryArrivalsByLicensePlate(
    licensePlate: string,
    params?: Partial<ArrivalsQueryParams>
): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>(
        `${BASE_PATH}/query/license-plate/${encodeURIComponent(licensePlate)}`,
        { params }
    );
    return response.data;
}

/**
 * Update appointment status
 */
export async function updateArrivalStatus(
    appointmentId: number,
    update: AppointmentStatusUpdate
): Promise<Appointment> {
    const response = await api.patch<Appointment>(
        `${BASE_PATH}/${appointmentId}/status`,
        update
    );
    return response.data;
}

/**
 * Create a visit when truck arrives
 */
export async function createVisit(
    appointmentId: number,
    visitData: CreateVisitRequest
): Promise<Visit> {
    const response = await api.post<Visit>(
        `${BASE_PATH}/${appointmentId}/visit`,
        visitData
    );
    return response.data;
}

/**
 * Update visit status (e.g., to 'completed' when truck leaves)
 */
export async function updateVisit(
    appointmentId: number,
    update: VisitStatusUpdate
): Promise<Visit> {
    const response = await api.patch<Visit>(
        `${BASE_PATH}/${appointmentId}/visit`,
        update
    );
    return response.data;
}
