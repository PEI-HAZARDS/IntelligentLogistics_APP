/**
 * Drivers API Service
 * Handles all driver-related API calls for the mobile app
 * Adapted from web version
 */
import api from './api';
import type {
    Driver,
    DriverLoginRequest,
    DriverLoginResponse,
    ClaimAppointmentRequest,
    ClaimAppointmentResponse,
    Appointment,
} from '../types/types';

const BASE_PATH = '/drivers';

/** Keycloak auth response shape */
interface AuthDriverLoginResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user_info: {
        drivers_license: string;
        name: string;
        company_nif?: string | null;
        company_name?: string | null;
    };
}

/**
 * Driver login via Keycloak-mediated auth endpoint.
 */
export async function login(credentials: DriverLoginRequest): Promise<AuthDriverLoginResponse> {
    const response = await api.post<AuthDriverLoginResponse>('/auth/drivers/login', credentials);
    return response.data;
}

/** Problem categories a driver can report from the road. */
export type ProblemCategory = 'breakdown' | 'lost' | 'delay' | 'accident' | 'cargo' | 'other';

/** Payload for {@link reportProblem}. Driver identity is taken from the JWT server-side. */
export interface DriverProblemReport {
    category: ProblemCategory;
    note?: string;
    /** Reverse-geocoded place name, e.g. "Rua do Porto, Aveiro" → shown as "near …". */
    location_label?: string;
    latitude?: number;
    longitude?: number;
    arrival_id?: string;
    appointment_id?: number;
    license_plate?: string;
}

/**
 * Report a problem to the logistics manager. The server turns this into a
 * `problem` alert that appears in the manager's alerts widget.
 */
export async function reportProblem(report: DriverProblemReport): Promise<void> {
    await api.post(`${BASE_PATH}/report-problem`, report);
}

/**
 * Claim an arrival using PIN.
 * Driver identity is extracted from the JWT token on the server.
 */
export async function claimArrival(
    claimData: ClaimAppointmentRequest
): Promise<ClaimAppointmentResponse> {
    const response = await api.post<ClaimAppointmentResponse>(
        `${BASE_PATH}/claim`,
        claimData,
    );
    return response.data;
}

/**
 * Get driver's active arrival/appointment.
 * Driver identity is extracted from the JWT token on the server.
 */
export async function getMyActiveArrival(): Promise<Appointment | null> {
    const response = await api.get<Appointment | null>(`${BASE_PATH}/me/active`);
    return response.data;
}

/**
 * Get driver's today arrivals.
 * Driver identity is extracted from the JWT token on the server.
 */
export async function getMyTodayArrivals(): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>(`${BASE_PATH}/me/today`);
    return response.data;
}

/**
 * Get specific driver details
 */
export async function getDriver(driversLicense: string): Promise<Driver> {
    const response = await api.get<Driver>(`${BASE_PATH}/${encodeURIComponent(driversLicense)}`);
    return response.data;
}

/**
 * Get arrival history for a driver
 */
export async function getDriverArrivals(
    driversLicense: string,
    limit = 50
): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>(
        `${BASE_PATH}/${encodeURIComponent(driversLicense)}/arrivals`,
        { params: { limit } }
    );
    return response.data;
}

/**
 * Update appointment status
 */
export async function updateArrivalStatus(
    appointmentId: number,
    status: string,
    notes?: string,
): Promise<void> {
    await api.patch(`${BASE_PATH}/appointments/${appointmentId}/status`, { status, notes });
}

/**
 * Start trip — transition appointment from 'scheduled' to 'in_transit'
 */
export async function startTrip(appointmentId: number): Promise<void> {
    await api.patch(`${BASE_PATH}/appointments/${appointmentId}/status`, {
        status: 'in_transit',
        notes: 'Driver started trip',
    });
}

/**
 * Start unloading — transition visit state to 'unloading' (driver at dock, cargo being offloaded)
 */
export async function startUnloading(appointmentId: number): Promise<void> {
    await api.patch(`${BASE_PATH}/appointments/${appointmentId}/visit`, {
        state: 'unloading',
    });
}

/**
 * Complete unloading — transition visit state to 'done' (cargo fully offloaded)
 * The appointment is still in_process; driver must then confirm departure separately.
 */
export async function completeUnloading(appointmentId: number): Promise<void> {
    await api.patch(`${BASE_PATH}/appointments/${appointmentId}/visit`, {
        state: 'done',
    });
}

/**
 * Complete appointment — confirm departure from port (appointment → completed)
 * Only valid after visit state is 'done'.
 */
export async function completeAppointment(appointmentId: number): Promise<void> {
    await api.patch(`${BASE_PATH}/appointments/${appointmentId}/status`, {
        status: 'completed',
    });
}

export interface PaginatedAppointments {
    items: Appointment[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

/**
 * Get unclaimed scheduled appointments for the driver's company.
 * Driver claims one via claimArrival() with the arrival_id PIN.
 */
export async function getAvailableBookings(page = 1, limit = 20): Promise<PaginatedAppointments> {
    const response = await api.get<PaginatedAppointments>(`${BASE_PATH}/me/available-bookings`, {
        params: { page, limit },
    });
    return response.data;
}
