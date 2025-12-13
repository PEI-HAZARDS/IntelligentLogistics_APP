/**
 * Stream API Service
 * Fetches HLS stream URLs from API Gateway
 */
import api from '@/lib/api';

export interface StreamInfo {
    gate_id: string;
    quality: 'low' | 'high';
    hls_url: string;
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
 * Get stream URL for a gate with specified quality
 */
export async function getStreamUrl(
    gateId: string,
    quality: 'low' | 'high' = 'high'
): Promise<string> {
    const streamInfo = quality === 'low'
        ? await getLowStreamUrl(gateId)
        : await getHighStreamUrl(gateId);
    return streamInfo.hls_url;
}
