/**
 * Drivers API Service
 * Handles all driver-related API calls for the mobile app
 */
import api from '@/lib/api';
import type {
    Driver,
    DriverLoginRequest,
    DriverLoginResponse,
    ClaimAppointmentRequest,
    ClaimAppointmentResponse,
    Appointment
} from '@/types/types';

const BASE_PATH = '/drivers';

/**
 * Driver login
 */
export async function login(credentials: DriverLoginRequest): Promise<DriverLoginResponse> {
    const response = await api.post<DriverLoginResponse>(`${BASE_PATH}/login`, credentials);
    return response.data;
}

/**
 * Claim an arrival using PIN
 */
export async function claimArrival(
    driversLicense: string,
    claimData: ClaimAppointmentRequest
): Promise<ClaimAppointmentResponse> {
    const response = await api.post<ClaimAppointmentResponse>(
        `${BASE_PATH}/claim`,
        claimData,
        { params: { drivers_license: driversLicense } }
    );
    return response.data;
}

/**
 * Get driver's active arrival/appointment
 */
export async function getMyActiveArrival(driversLicense: string): Promise<Appointment | null> {
    const response = await api.get<Appointment | null>(`${BASE_PATH}/me/active`, {
        params: { drivers_license: driversLicense }
    });
    return response.data;
}

/**
 * Get driver's today arrivals
 */
export async function getMyTodayArrivals(driversLicense: string): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>(`${BASE_PATH}/me/today`, {
        params: { drivers_license: driversLicense }
    });
    return response.data;
}

/**
 * List all drivers (backoffice)
 */
export async function getAllDrivers(
    skip = 0,
    limit = 100,
    onlyActive = true
): Promise<Driver[]> {
    const response = await api.get<Driver[]>(BASE_PATH, {
        params: { skip, limit, only_active: onlyActive }
    });
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
 * Complete an appointment (confirm delivery)
 */
export async function completeAppointment(appointmentId: number): Promise<void> {
    // Status updates are handled by the arrivals endpoint
    await api.patch(`/arrivals/${appointmentId}/status`, {
        status: 'completed'
    });
}
