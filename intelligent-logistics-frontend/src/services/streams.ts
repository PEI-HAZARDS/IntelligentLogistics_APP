/**
 * Stream API Service
 * Fetches WebRTC stream URLs from API Gateway (MediaMTX backend)
 */
import api from '@/lib/api';

export interface StreamInfo {
    gate_id: string;
    webrtc_url: string;
}

/**
 * Get WebRTC stream URL for a gate
 */
export async function getStreamUrl(gateId: string): Promise<string> {
    const response = await api.get<StreamInfo>(`/stream/${gateId}`);
    return response.data.webrtc_url;
}
