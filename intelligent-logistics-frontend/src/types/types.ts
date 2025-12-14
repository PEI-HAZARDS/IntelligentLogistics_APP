/**
 * TypeScript types matching Data_Module OpenAPI schemas
 * Source: /IntelligentLogistics/src/Data_Module/openapi.yaml
 */

// ==================== ENUMS ====================

export type AppointmentStatusEnum = 'in_transit' | 'canceled' | 'delayed' | 'completed';
export type DeliveryStatusEnum = 'unloading' | 'completed';
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

// Booking definition moved to after Cargo

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

export interface Visit {
    appointment_id: number;
    shift_gate_id: number;
    shift_type: ShiftTypeEnum;
    shift_date: string;
    entry_time?: string | null;
    out_time?: string | null;
    state: DeliveryStatusEnum;
}

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

// ==================== ALERTS ====================

export interface Alert {
    id: number;
    visit_id?: number | null;
    type: AlertTypeEnum;
    description?: string | null;
    image_url?: string | null;
    timestamp: string;
}

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

// ==================== DECISIONS / EVENTS ====================

export interface DecisionIncomingRequest {
    license_plate: string;
    gate_id: number;
    appointment_id: number;
    decision: string;
    status: string;
    notes?: string | null;
    alerts?: object[] | null;
    extra_data?: object | null;
}

export interface QueryAppointmentsRequest {
    time_frame?: number;
    gate_id: number;
}

export interface DetectionEventRequest {
    type: string;
    license_plate?: string | null;
    gate_id: number;
    confidence?: number | null;
    agent: string;
    raw_data?: object | null;
}

export interface DetectionEvent {
    _id?: string;
    type: string;
    license_plate?: string | null;
    gate_id: number;
    confidence?: number | null;
    agent: string;
    timestamp?: string;
    raw_data?: object | null;
}

export interface DecisionEvent {
    _id?: string;
    license_plate: string;
    gate_id: number;
    decision: string;
    timestamp?: string;
    appointment_id?: number;
}

// ==================== API QUERY PARAMS ====================

export interface ArrivalsQueryParams {
    skip?: number;
    limit?: number;
    gate_id?: number;
    shift_gate_id?: number;
    shift_type?: string;
    shift_date?: string;
    status?: AppointmentStatusEnum;
    scheduled_date?: string;
}

export interface AlertsQueryParams {
    skip?: number;
    limit?: number;
    alert_type?: string;
    visit_id?: number;
}

export interface DetectionEventsQueryParams {
    license_plate?: string;
    gate_id?: number;
    event_type?: string;
    limit?: number;
}

export interface DecisionEventsQueryParams {
    license_plate?: string;
    gate_id?: number;
    decision?: string;
    limit?: number;
}
