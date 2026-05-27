import api from '@/lib/api';

export interface StreamInfo {
    gate_id: string;
    quality: 'low' | 'high';
    hls_url: string;
    webrtc_url: string;
}

export interface StreamUrls {
    quality: 'low' | 'high';
    webrtcUrl: string;
    hlsUrl: string;
}

function toAbsolute(urlOrPath: string): string {
    if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
    return `${window.location.origin}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
}

export async function getStreamUrls(
    gateId: string,
    quality: 'low' | 'high' = 'low',
): Promise<StreamUrls> {
    const { data } = await api.get<StreamInfo>(`/stream/${gateId}/${quality}`);
    return {
        quality: data.quality,
        webrtcUrl: toAbsolute(data.webrtc_url),
        hlsUrl: toAbsolute(data.hls_url),
    };
}
