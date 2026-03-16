import { useEffect, useState } from "react";
import { getStreamUrl } from "@/services/streams";
import { getGateWebSocket, type DecisionUpdatePayload } from "@/lib/websocket";

interface UseStreamScaleOptions {
    gateId: string | number;
}

/**
 * Hook that fetches the WebRTC stream URL for a gate from the API Gateway.
 * The backend (MediaMTX) provides the WebRTC playback URL.
 */
export function useStreamScale({ gateId }: UseStreamScaleOptions) {
    const [streamUrl, setStreamUrl] = useState<string | null>(null);

    useEffect(() => {
        const gateKey = `gate${gateId}`;
        getStreamUrl(gateKey)
            .then((url) => setStreamUrl(url))
            .catch((err) => console.error("[Stream] Failed to fetch stream URL:", err));
    }, [gateId]);

    return { streamUrl };
}
