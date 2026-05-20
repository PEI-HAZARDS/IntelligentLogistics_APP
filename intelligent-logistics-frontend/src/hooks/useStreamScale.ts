import { useEffect, useState, useRef } from "react";
import { getStreamUrls, type StreamUrls } from "@/services/streams";
import { getGateWebSocket, type DecisionUpdatePayload } from "@/lib/websocket";

type Quality = "low" | "high";

interface UseStreamScaleOptions {
    gateId: string | number;
}

/**
 * Hook that manages stream quality switching via the unified
 * /ws/gate/{gate_id} WebSocket endpoint.
 *
 * - Starts in "low" quality to save bandwidth.
 * - Listens for {"message_type":"scale_network","mode":"scale_up"|"scale_down"} events
 *   on the shared GateWebSocket.
 * - Fetches both WebRTC and HLS URLs from the API Gateway on each switch so the
 *   player can choose primary transport with HLS fallback.
 */
export function useStreamScale({ gateId }: UseStreamScaleOptions) {
    const [quality, setQuality] = useState<Quality>("low");
    const [urls, setUrls] = useState<StreamUrls | null>(null);
    const [scalingDirection, setScalingDirection] = useState<"up" | "down" | null>(null);
    const scalingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const gateKey = `gate${gateId}`;
        getStreamUrls(gateKey, "low")
            .then(setUrls)
            .catch((err) => console.error("[StreamScale] Failed to fetch initial stream URLs:", err));
    }, [gateId]);

    useEffect(() => {
        const ws = getGateWebSocket(gateId);

        const unsubscribe = ws.onMessage(async (data: DecisionUpdatePayload) => {
            if (data.message_type !== "scale_network") return;

            const mode = (data as Record<string, unknown>).mode as string | undefined;
            if (!mode) return;

            const newQuality: Quality = mode === "scale_up" ? "high" : "low";
            const direction = mode === "scale_up" ? "up" : "down";
            console.log(`[StreamScale] Switching to ${newQuality} (${mode})`);

            if (scalingTimerRef.current) clearTimeout(scalingTimerRef.current);
            setScalingDirection(direction);
            scalingTimerRef.current = setTimeout(() => setScalingDirection(null), 3500);

            const gateKey = `gate${gateId}`;
            try {
                const next = await getStreamUrls(gateKey, newQuality);
                setQuality(newQuality);
                setUrls(next);
            } catch (err) {
                console.error("[StreamScale] Failed to fetch new stream URLs:", err);
            }
        });

        return () => {
            unsubscribe();
            if (scalingTimerRef.current) clearTimeout(scalingTimerRef.current);
        };
    }, [gateId]);

    return {
        webrtcUrl: urls?.webrtcUrl ?? null,
        hlsUrl: urls?.hlsUrl ?? null,
        quality,
        scalingDirection,
    };
}
