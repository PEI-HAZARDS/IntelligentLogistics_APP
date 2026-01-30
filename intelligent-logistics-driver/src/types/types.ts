/**
 * TypeScript types matching Data_Module OpenAPI schemas
 * Source: Copied from intelligent-logistics-frontend
 */

// ==================== ENUMS ====================

export type AppointmentStatusEnum = 'in_transit' | 'in_process' | 'canceled' | 'delayed' | 'completed';
export type DeliveryStatusEnum = 'not_started' | 'unloading' | 'completed';
export type ShiftTypeEnum = '06:00-14:00' | '14:00-22:00' | '22:00-06:00';
export type DirectionEnum = 'inbound' | 'outbound';
export type AlertTypeEnum = 'generic' | 'safety' | 'problem' | 'operational';
export type PhysicalStateEnum = 'liquid' | 'solid' | 'gaseous' | 'hybrid';

// ==================== CORE ENTITIES ====================

export interface Cargo {
    id: number;
    booking_reference: string;
    quantity: number;
    state: PhysicalStateEnum;
    description?: string | null;
}

export interface Company {
    nif: string;
    name: string;
    contact?: string | null;
}

export interface Driver {
    drivers_license: string;
    name: string;
    company_nif?: string | null;
    mobile_device_token?: string | null;
    active?: boolean;
    created_at?: string | null;
    company?: Company | null;
}

export interface Truck {
    license_plate: string;
    company_nif?: string | null;
    brand?: string | null;
    company?: Company | null;
}

export interface Terminal {
    id: number;
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    hazmat_approved?: boolean;
}

export interface Gate {
    id: number;
    label: string;
    latitude?: number | null;
    longitude?: number | null;
}

export interface Booking {
    reference: string;
    direction?: DirectionEnum | null;
    created_at?: string | null;
    cargos?: Cargo[];
}

// ==================== APPOINTMENTS / ARRIVALS ====================

export interface Appointment {
    id: number;
    arrival_id: string;
    booking_reference: string;
    driver_license: string;
    truck_license_plate: string;
    terminal_id: number;
    gate_in_id?: number | null;
    gate_out_id?: number | null;
    scheduled_start_time?: string | null;
    expected_duration?: number | null;
    status: AppointmentStatusEnum;
    notes?: string | null;
    booking?: Booking | null;
    driver?: Driver | null;
    truck?: Truck | null;
    terminal?: Terminal | null;
    gate_in?: Gate | null;
    gate_out?: Gate | null;
}

export interface AppointmentStatusUpdate {
    status: AppointmentStatusEnum;
    notes?: string | null;
}

// ==================== DRIVERS ====================

export interface DriverLoginRequest {
    drivers_license: string;
    password: string;
}

export interface DriverLoginResponse {
    token: string;
    drivers_license: string;
    name: string;
    company_nif?: string | null;
    company_name?: string | null;
}

export interface ClaimAppointmentRequest {
    arrival_id: string;
}

export interface ClaimAppointmentResponse {
    appointment_id: number;
    dock_bay_number?: string | null;
    dock_location?: string | null;
    license_plate: string;
    cargo_description?: string | null;
    navigation_url?: string | null;
}

// ==================== USER INFO (for storage) ====================

export interface UserInfo {
    drivers_license: string;
    name: string;
    company_nif?: string | null;
    company_name?: string | null;
    role: 'driver';
}
