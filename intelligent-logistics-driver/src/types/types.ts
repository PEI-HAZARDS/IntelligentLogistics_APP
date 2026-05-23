/**
 * Re-exports core domain types from the shared package.
 * Driver-specific types (ClaimRequest/Response, UserInfo, auth) are defined below.
 */
export type {
  PrimaryAppointmentStatus,
  AppointmentStatusEnum,
  AppointmentDisplayStatus,
  DeliveryStatusEnum,
  ShiftTypeEnum,
  DirectionEnum,
  AlertTypeEnum,
  PhysicalStateEnum,
  PaginatedResponse,
  Cargo,
  Company,
  Driver,
  Truck,
  Terminal,
  Gate,
  Booking,
  Appointment,
  AppointmentStatusUpdate,
  Visit,
  AppointmentDetail,
} from '@il/shared';

// ==================== DRIVER AUTH ====================

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

// ==================== CLAIM ====================

export interface ClaimAppointmentRequest {
  arrival_id: string;
  booking_reference: string;
}

export interface ClaimAppointmentResponse {
  appointment_id: number;
  dock_bay_number?: string | null;
  dock_location?: string | null;
  license_plate: string;
  cargo_description?: string | null;
  navigation_url?: string | null;
}

// ==================== USER INFO (stored locally) ====================

export interface UserInfo {
  drivers_license: string;
  name: string;
  company_nif?: string | null;
  company_name?: string | null;
  role: 'driver';
}
