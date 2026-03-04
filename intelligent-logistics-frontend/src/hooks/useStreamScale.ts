import { useEffect, useState, useRef } from "react";
import { getStreamUrl } from "@/services/streams";
import { getGateWebSocket, type DecisionUpdatePayload } from "@/lib/websocket";

type Quality = "low" | "high";

interface UseStreamScaleOptions {
    gateId: string | number;
}

/**
 * Hook that manages stream quality switching via the unified
 * /ws/gate/{gate_id} WebSocket endpoint.
 *
 * - Starts in "low" quality (360p) to save bandwidth
 * - Listens for {"message_type":"scale_network","mode":"scale_up"|"scale_down"} events
 *   on the shared GateWebSocket
 * - Fetches the new HLS URL from the API Gateway on each switch
 */
export function useStreamScale({ gateId }: UseStreamScaleOptions) {
    const [quality, setQuality] = useState<Quality>("low");
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [scalingDirection, setScalingDirection] = useState<"up" | "down" | null>(null);
    const scalingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch initial stream URL (low quality by default)
    useEffect(() => {
        const gateKey = `gate${gateId}`;
        getStreamUrl(gateKey, "low")
            .then((url) => setStreamUrl(url))
            .catch((err) => console.error("[StreamScale] Failed to fetch initial stream URL:", err));
    }, [gateId]);

    // Subscribe to scale_network events on the shared GateWebSocket
    useEffect(() => {
        const ws = getGateWebSocket(gateId);

        const unsubscribe = ws.onMessage(async (data: DecisionUpdatePayload) => {
            if (data.message_type !== "scale_network") return;

            const mode = (data as Record<string, unknown>).mode as string | undefined;
            if (!mode) return;

            const newQuality: Quality = mode === "scale_up" ? "high" : "low";
            const direction = mode === "scale_up" ? "up" : "down";
            console.log(`[StreamScale] Switching to ${newQuality} (${mode})`);

            // Show scaling direction overlay
            if (scalingTimerRef.current) clearTimeout(scalingTimerRef.current);
            setScalingDirection(direction);
            scalingTimerRef.current = setTimeout(() => setScalingDirection(null), 3500);

            const gateKey = `gate${gateId}`;
            try {
                const newUrl = await getStreamUrl(gateKey, newQuality);
                setQuality(newQuality);
                setStreamUrl(newUrl);
            } catch (err) {
                console.error("[StreamScale] Failed to fetch new stream URL:", err);
            }
        });

        return () => {
            unsubscribe();
            if (scalingTimerRef.current) clearTimeout(scalingTimerRef.current);
        };
    }, [gateId]);

    return { streamUrl, quality, scalingDirection };
}
