/**
 * Decisions API Service
 * Handles manual review submissions from gate operators
 */
import api from '@/lib/api';

/**
 * Submit manual review decision
 * Uses API Gateway endpoint: POST /api/manual-review/
 *
 * Sends a DecisionResultsMessage via Kafka with the operator's decision.
 * All fields are sent as query params matching the backend's FastAPI signature.
 */
export async function submitManualReview(params: {
    gate_id: string;
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
    truck_id?: string;
}): Promise<void> {
    const queryParams: Record<string, unknown> = {
        gate_id: params.gate_id,
        license_plate: params.license_plate,
        decision: params.decision,
        decision_reason: params.decision_reason,
        decision_source: params.decision_source || 'operator',
        license_crop_url: params.license_crop_url || '',
        un: params.un || '',
        kemler: params.kemler || '',
        hazard_crop_url: params.hazard_crop_url || '',
        route: params.route || '',
        ...(params.truck_id ? { truck_id: params.truck_id } : {}),
    };

    // FastAPI expects repeated query params for lists
    if (params.alerts && params.alerts.length > 0) {
        queryParams.alerts = params.alerts;
    }

    await api.post('/manual-review/', null, { params: queryParams });
}
