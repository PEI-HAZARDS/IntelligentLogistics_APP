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
 * Start unloading — transition visit state to 'unloading' (driver-triggered at dock)
 */
export async function startUnloading(appointmentId: number): Promise<void> {
    await api.patch(`${BASE_PATH}/appointments/${appointmentId}/status`, {
        status: 'unloading',
        notes: 'Driver started unloading',
    });
}

/**
 * Complete an appointment (confirm delivery)
 */
export async function completeAppointment(appointmentId: number): Promise<void> {
    await api.patch(`${BASE_PATH}/appointments/${appointmentId}/status`, {
        status: 'completed',
    });
}
