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
 * Uses API Gateway endpoint: POST /api/manual-review/
 * 
 * Sends a DecisionResultsMessage via Kafka with the operator's decision.
 * All fields are sent as query params matching the backend's FastAPI signature.
 */
export async function submitManualReview(params: {
    license_plate: string;
    decision: string;
    decision_reason: string;
    decision_source?: string;
    license_crop_url?: string;
    un?: string;
    kemler?: string;
    hazard_crop_url?: string;
    alerts?: string[];
    route?: string;
}): Promise<void> {
    const queryParams: Record<string, unknown> = {
        license_plate: params.license_plate,
        decision: params.decision,
        decision_reason: params.decision_reason,
        decision_source: params.decision_source || 'operator',
        license_crop_url: params.license_crop_url || '',
        un: params.un || '',
        kemler: params.kemler || '',
        hazard_crop_url: params.hazard_crop_url || '',
        route: params.route || '',
    };

    // FastAPI expects repeated query params for lists
    if (params.alerts && params.alerts.length > 0) {
        queryParams.alerts = params.alerts;
    }

    await api.post('/manual-review/', null, { params: queryParams });
}
