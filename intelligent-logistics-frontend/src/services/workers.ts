/**
 * Workers API Service
 * Handles all worker (operator/manager) related API calls
 */
import api from '@/lib/api';
import type {
    WorkerInfo,
    OperatorDashboard,
    ManagerOverview,
    UpdatePasswordRequest,
    UpdateEmailRequest,
    CreateWorkerRequest
} from '@/types/types';

const BASE_PATH = '/workers';

/**
 * List all operators
 */
export async function getOperators(skip = 0, limit = 100): Promise<WorkerInfo[]> {
    const response = await api.get<WorkerInfo[]>(`${BASE_PATH}/operators`, {
        params: { skip, limit }
    });
    return response.data;
}

/**
 * Get authenticated operator info
 */
export async function getMyOperatorInfo(numWorker: string): Promise<WorkerInfo> {
    const response = await api.get<WorkerInfo>(`${BASE_PATH}/operators/me`, {
        params: { num_worker: numWorker }
    });
    return response.data;
}

/**
 * Get specific operator info
 */
export async function getOperator(numWorker: string): Promise<WorkerInfo> {
    const response = await api.get<WorkerInfo>(`${BASE_PATH}/operators/${numWorker}`);
    return response.data;
}

/**
 * Get operator's current shift for a gate
 */
export async function getOperatorCurrentShift(
    numWorker: string,
    gateId: number
): Promise<unknown> {
    const response = await api.get(
        `${BASE_PATH}/operators/${numWorker}/current-shift/${gateId}`
    );
    return response.data;
}

/**
 * List shifts for an operator
 */
export async function getOperatorShifts(
    numWorker: string,
    gateId?: number,
    limit = 50
): Promise<unknown[]> {
    const response = await api.get<unknown[]>(`${BASE_PATH}/operators/${numWorker}/shifts`, {
        params: { gate_id: gateId, limit }
    });
    return response.data;
}

/**
 * Get operator dashboard for a gate
 */
export async function getOperatorDashboard(
    numWorker: string,
    gateId: number
): Promise<OperatorDashboard> {
    const response = await api.get<OperatorDashboard>(
        `${BASE_PATH}/operators/${numWorker}/dashboard/${gateId}`
    );
    return response.data;
}

/**
 * List all managers
 */
export async function getManagers(skip = 0, limit = 100): Promise<WorkerInfo[]> {
    const response = await api.get<WorkerInfo[]>(`${BASE_PATH}/managers`, {
        params: { skip, limit }
    });
    return response.data;
}

/**
 * Get authenticated manager info
 */
export async function getMyManagerInfo(numWorker: string): Promise<WorkerInfo> {
    const response = await api.get<WorkerInfo>(`${BASE_PATH}/managers/me`, {
        params: { num_worker: numWorker }
    });
    return response.data;
}

/**
 * Get manager dashboard/overview
 */
export async function getManagerDashboard(numWorker: string): Promise<ManagerOverview> {
    const response = await api.get<ManagerOverview>(
        `${BASE_PATH}/managers/${numWorker}/overview`
    );
    return response.data;
}

/**
 * List all shifts for a date (manager ShiftsPage)
 */
export interface ShiftListItem {
    id: string;
    gateId: number;
    gateName: string;
    shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT';
    date: string;
    operatorId: string;
    operatorName: string;
    managerId?: string;
    managerName?: string;
    currentArrivals: number;
    maxArrivals: number;
    status: 'active' | 'pending' | 'completed' | 'inactive';
}

export async function getShifts(params?: {
    targetDate?: string;
    shiftType?: string;
    gateId?: number;
}): Promise<ShiftListItem[]> {
    const queryParams: Record<string, string | number> = {};
    if (params?.targetDate) queryParams.target_date = params.targetDate;
    if (params?.shiftType) queryParams.shift_type = params.shiftType;
    if (params?.gateId !== undefined) queryParams.gate_id = params.gateId;

    const response = await api.get<ShiftListItem[]>(`${BASE_PATH}/shifts`, {
        params: queryParams,
    });
    return response.data;
}

export interface GateItem {
    id: number;
    label: string;
}

export async function getGates(): Promise<GateItem[]> {
    const response = await api.get<GateItem[]>(`${BASE_PATH}/gates`);
    return response.data;
}

export interface ShiftCreatePayload {
    gate_id: number;
    shift_type: 'MORNING' | 'AFTERNOON' | 'NIGHT';
    date: string;
    operator_num_worker?: string;
    manager_num_worker?: string;
}

export async function createShift(payload: ShiftCreatePayload): Promise<ShiftListItem> {
    const response = await api.post<ShiftListItem>(`${BASE_PATH}/shifts`, payload);
    return response.data;
}

export interface ShiftUpdatePayload {
    operator_num_worker?: string | null;
    manager_num_worker?: string | null;
}

export async function updateShift(
    gateId: number,
    shiftType: string,
    date: string,
    payload: ShiftUpdatePayload,
): Promise<ShiftListItem> {
    const response = await api.put<ShiftListItem>(
        `${BASE_PATH}/shifts/${gateId}/${shiftType}/${date}`,
        payload,
    );
    return response.data;
}

export async function deleteShift(
    gateId: number,
    shiftType: string,
    date: string,
): Promise<void> {
    await api.delete(`${BASE_PATH}/shifts/${gateId}/${shiftType}/${date}`);
}

/**
 * List all workers
 */
export async function getAllWorkers(
    skip = 0,
    limit = 100,
    onlyActive = true
): Promise<WorkerInfo[]> {
    const response = await api.get<WorkerInfo[]>(BASE_PATH, {
        params: { skip, limit, only_active: onlyActive }
    });
    return response.data;
}

/**
 * Get specific worker
 */
export async function getWorker(numWorker: string): Promise<WorkerInfo> {
    const response = await api.get<WorkerInfo>(`${BASE_PATH}/${numWorker}`);
    return response.data;
}

/**
 * Create new worker
 */
export async function createWorker(workerData: CreateWorkerRequest): Promise<WorkerInfo> {
    const response = await api.post<WorkerInfo>(BASE_PATH, workerData);
    return response.data;
}

/**
 * Deactivate worker
 */
export async function deactivateWorker(numWorker: string): Promise<void> {
    await api.delete(`${BASE_PATH}/${numWorker}`);
}

/**
 * Change worker password
 */
export async function changePassword(
    numWorker: string,
    passwordData: UpdatePasswordRequest
): Promise<void> {
    await api.post(`${BASE_PATH}/password`, passwordData, {
        params: { num_worker: numWorker }
    });
}

/**
 * Change worker email
 */
export async function changeEmail(
    numWorker: string,
    emailData: UpdateEmailRequest
): Promise<void> {
    await api.post(`${BASE_PATH}/email`, emailData, {
        params: { num_worker: numWorker }
    });
}

/**
 * Promote operator to manager
 */
export async function promoteToManager(
    numWorker: string,
    accessLevel = 'basic'
): Promise<void> {
    await api.post(`${BASE_PATH}/${numWorker}/promote`, null, {
        params: { access_level: accessLevel }
    });
}
