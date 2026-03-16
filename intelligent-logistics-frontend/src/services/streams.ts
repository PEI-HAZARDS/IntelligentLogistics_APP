/**
 * Stream API Service
 * Fetches stream URLs from API Gateway (MediaMTX backend)
 */
import api from '@/lib/api';

export interface StreamInfo {
    gate_id: string;
    quality: 'low' | 'high';
    hls_url: string;
    webrtc_url: string;
}

/**
 * Get low quality stream URL for a gate
 */
export async function getLowStreamUrl(gateId: string): Promise<StreamInfo> {
    const response = await api.get<StreamInfo>(`/stream/${gateId}/low`);
    return response.data;
}

/**
 * Get high quality stream URL for a gate
 */
export async function getHighStreamUrl(gateId: string): Promise<StreamInfo> {
    const response = await api.get<StreamInfo>(`/stream/${gateId}/high`);
    return response.data;
}

/**
 * Get stream URL for a gate with specified quality.
 * Returns the WebRTC iframe URL (ultra-low latency via MediaMTX).
 */
export async function getStreamUrl(
    gateId: string,
    quality: 'low' | 'high' = 'high'
): Promise<string> {
    const streamInfo = quality === 'low'
        ? await getLowStreamUrl(gateId)
        : await getHighStreamUrl(gateId);
    return streamInfo.webrtc_url;
}
