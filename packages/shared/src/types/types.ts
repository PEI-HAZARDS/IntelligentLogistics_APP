/**
 * Core domain types shared between the web frontend and the driver mobile app.
 * Matches the Data_Module OpenAPI schemas.
 * App-specific types (Worker*, Claim*, UserInfo) live in each app's own types file.
 */

// ==================== ENUMS ====================

// Persisted appointment states (stored in DB — never 'delayed' or 'unloading')
export type PrimaryAppointmentStatus =
  | 'scheduled'
  | 'in_transit'
  | 'in_process'
  | 'completed'
  | 'canceled';

// Display status includes computed sub-states returned by the API
export type AppointmentStatusEnum = PrimaryAppointmentStatus | 'unloading' | 'delayed';

// Computed display sub-states (never stored; returned by API in display_status field)
export type AppointmentDisplayStatus = AppointmentStatusEnum | 'in_port';

// Visit states — Visit is only created when truck enters port, so initial state is always 'in_port'
export type DeliveryStatusEnum = 'in_port' | 'unloading' | 'done';

export type ShiftTypeEnum = '06:00-14:00' | '14:00-22:00' | '22:00-06:00';
export type DirectionEnum = 'inbound' | 'outbound';
export type AlertTypeEnum = 'generic' | 'safety' | 'problem' | 'operational';
export type PhysicalStateEnum = 'liquid' | 'solid' | 'gaseous' | 'hybrid';

// ==================== PAGINATION ====================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

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

// ==================== APPOINTMENTS ====================

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
  // Computed sub-state fields returned by the API (never stored in DB)
  display_status?: AppointmentDisplayStatus | null;
  primary_status?: PrimaryAppointmentStatus | null;
  is_delayed?: boolean | null;
  is_unloading?: boolean | null;
  is_in_port?: boolean | null;
  is_visit_done?: boolean | null;
  notes?: string | null;
  highway_infraction?: boolean;
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

// ==================== VISIT ====================

export interface Visit {
  appointment_id: number;
  shift_gate_id: number;
  shift_type: ShiftTypeEnum;
  shift_date: string;
  entry_time?: string | null;
  out_time?: string | null;
  state: DeliveryStatusEnum;
}

// Enriched response from GET /arrivals/{id}/detail
export interface AppointmentDetail {
  id: number;
  arrival_id: string;
  status: AppointmentStatusEnum;
  scheduled_start_time?: string | null;
  expected_duration?: number | null;
  notes?: string | null;
  highway_infraction?: boolean;
  driver?: Driver | null;
  truck?: Truck | null;
  booking?: Booking | null;
  gate_in?: Gate | null;
  gate_out?: Gate | null;
  terminal?: Terminal | null;
  visit?: {
    appointment_id: number;
    shift_gate_id: number;
    shift_type?: string | null;
    shift_date?: string | null;
    entry_time?: string | null;
    out_time?: string | null;
    state: DeliveryStatusEnum;
  } | null;
}
