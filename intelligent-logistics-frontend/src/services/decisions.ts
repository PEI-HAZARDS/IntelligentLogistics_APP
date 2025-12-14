/**
 * Decisions API Service
 * Handles detection and decision event queries
 */
import api from '@/lib/api';
import type {
    DetectionEvent,
    DecisionEvent,
    DetectionEventsQueryParams,
    DecisionEventsQueryParams,
    DecisionIncomingRequest,
    QueryAppointmentsRequest
} from '@/types/types';

const BASE_PATH = '/decisions';

/**
 * List detection events from MongoDB
 */
export async function getDetectionEvents(
    params?: DetectionEventsQueryParams
): Promise<DetectionEvent[]> {
    const response = await api.get<DetectionEvent[]>(`${BASE_PATH}/events/detections`, {
        params
    });
    return response.data;
}

/**
 * List decision events from MongoDB
 */
export async function getDecisionEvents(
    params?: DecisionEventsQueryParams
): Promise<DecisionEvent[]> {
    const response = await api.get<DecisionEvent[]>(`${BASE_PATH}/events/decisions`, {
        params
    });
    return response.data;
}

/**
 * Get a specific event by ID (MongoDB ObjectId)
 */
export async function getEvent(eventId: string): Promise<unknown> {
    const response = await api.get(`${BASE_PATH}/events/${eventId}`);
    return response.data;
}

/**
 * Process incoming decision from Decision Engine
 */
export async function processDecision(decision: DecisionIncomingRequest): Promise<void> {
    await api.post(`${BASE_PATH}/process`, decision);
}

/**
 * Query appointments within a time window (used by Decision Engine)
 */
export async function queryAppointments(
    query: QueryAppointmentsRequest
): Promise<{ found: boolean; candidates: object[]; message?: string }> {
    const response = await api.post<{ found: boolean; candidates: object[]; message?: string }>(
        `${BASE_PATH}/query-appointments`,
        query
    );
    return response.data;
}

/**
 * Submit manual review decision
 * Uses API Gateway endpoint: POST /api/manual-review/{appointment_id}
 * 
 * @param gateId - If provided and decision is 'approved', creates a Visit with state='unloading'
 */
export async function submitManualReview(
    appointmentId: number,
    decision: 'approved' | 'rejected',
    notes?: string,
    gateId?: number
): Promise<void> {
    await api.post(`/manual-review/${appointmentId}`, null, {
        params: { decision, notes, gate_id: gateId }
    });
}

