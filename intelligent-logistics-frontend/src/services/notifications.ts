/**
 * Notifications API Service
 * Persistent operator notifications stored in MongoDB (replaces localStorage).
 */
import api from '@/lib/api';

export interface Notification {
    id: string;
    gate_id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger';
    read: boolean;
    created_at: string;
    appointment_id?: number;
    license_plate?: string;
    [key: string]: unknown;
}

const BASE_PATH = '/notifications';

/**
 * Fetch notifications for a gate.
 * @param gateId       Gate to fetch notifications for.
 * @param limit        Max notifications to return (default 50).
 * @param unreadOnly   When true, returns only unread notifications (useful for badge count).
 */
export async function getNotifications(
    gateId: number,
    limit = 50,
    unreadOnly = false,
): Promise<Notification[]> {
    const response = await api.get<Notification[]>(BASE_PATH, {
        params: { gate_id: gateId, limit, unread_only: unreadOnly },
    });
    return response.data;
}

/**
 * Counts unread notifications for a gate (lightweight badge query).
 */
export async function getUnreadCount(gateId: number): Promise<number> {
    const items = await getNotifications(gateId, 200, true);
    return items.length;
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<Notification> {
    const response = await api.patch<Notification>(`${BASE_PATH}/${notificationId}/read`);
    return response.data;
}

/**
 * Marks all notifications for a gate as read.
 * @returns Number of updated documents.
 */
export async function markAllNotificationsRead(gateId: number): Promise<{ updated: number }> {
    const response = await api.patch<{ updated: number }>(`${BASE_PATH}/read-all`, null, {
        params: { gate_id: gateId },
    });
    return response.data;
}
