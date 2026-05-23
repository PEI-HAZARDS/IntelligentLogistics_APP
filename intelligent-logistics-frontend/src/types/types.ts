/**
 * Re-exports core domain types from the shared package.
 * Web-specific types (Worker*, Alert, query params, etc.) are defined below.
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

import type { AppointmentStatusEnum, DeliveryStatusEnum } from '@il/shared';

// ==================== VISIT (web-only request types) ====================

export interface CreateVisitRequest {
  shift_gate_id: number;
  shift_type: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  shift_date: string;
}

export interface VisitStatusUpdate {
  state: DeliveryStatusEnum;
  entry_time?: string | null;
  out_time?: string | null;
  notes?: string | null;
}

// ==================== QUERY PARAMS ====================

export interface ArrivalsQueryParams {
  gate_id?: number;
  page?: number;
  limit?: number;
  status?: AppointmentStatusEnum;
  statuses?: string;
  search?: string;
  highway_infraction?: boolean;
  scheduled_date?: string;
  shift_gate_id?: number;
  shift_type?: string;
  shift_date?: string;
}

export interface AlertsQueryParams {
  skip?: number;
  limit?: number;
  alert_type?: string;
  visit_id?: number;
}

// ==================== ALERTS ====================

export interface Alert {
  id: number;
  visit_id?: number | null;
  type: AlertTypeEnum;
  description?: string | null;
  image_url?: string | null;
  timestamp: string;
}

export type { AlertTypeEnum } from '@il/shared';

export interface CreateAlertRequest {
  visit_id?: number | null;
  type: string;
  description: string;
  image_url?: string | null;
}

export interface CreateHazmatAlertRequest {
  appointment_id: number;
  un_code?: string | null;
  kemler_code?: string | null;
  detected_hazmat?: string | null;
}

// ==================== WORKERS ====================

export interface WorkerLoginRequest {
  email: string;
  password: string;
}

export interface WorkerLoginResponse {
  token: string;
  num_worker: string;
  name: string;
  email: string;
  active: boolean;
}

export interface WorkerInfo {
  num_worker: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export interface CreateWorkerRequest {
  num_worker: string;
  name: string;
  email: string;
  password: string;
  role: string;
  access_level?: string | null;
  phone?: string | null;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateEmailRequest {
  new_email: string;
}

// ==================== DASHBOARDS ====================

import type { Appointment } from '@il/shared';

export interface OperatorDashboard {
  operator_num_worker: string;
  gate_id: number;
  date: string;
  upcoming_arrivals: Appointment[];
  stats: Record<string, number>;
}

export interface ManagerOverview {
  manager_num_worker: string;
  date: string;
  active_gates: number;
  shifts_today: number;
  recent_alerts: number;
  statistics: Record<string, number>;
}
