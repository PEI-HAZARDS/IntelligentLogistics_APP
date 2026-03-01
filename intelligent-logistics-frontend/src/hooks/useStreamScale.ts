import { useEffect, useState, useRef } from "react";
import { getStreamUrl } from "@/services/streams";

type Quality = "low" | "high";

interface UseStreamScaleOptions {
    gateId: string | number;
    wsBaseUrl?: string;
}

function normalizeWsBaseUrl(rawBaseUrl?: string): string {
    const fallback = "ws://10.255.32.70:8000/api";
    const input = rawBaseUrl?.trim() || fallback;

    if (/^wss?:\/\//i.test(input)) {
        return input.replace(/\/+$/, "");
    }

    if (/^https?:\/\//i.test(input)) {
        try {
            const url = new URL(input);
            url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
            return url.toString().replace(/\/+$/, "");
        } catch {
            return fallback;
        }
    }

    const sanitized = input.replace(/^\/+/, "").replace(/\/+$/, "");
    if (typeof window !== "undefined") {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${sanitized}`;
    }

    return `ws://${sanitized}`;
}

/**
 * Hook that manages stream quality switching via the dedicated
 * /ws/stream/{gate_id} WebSocket endpoint.
 *
 * - Starts in "low" quality (360p) to save bandwidth
 * - Listens for {"event":"stream_scale","mode":"scale_up"|"scale_down"} events
 * - Fetches the new HLS URL from the API Gateway on each switch
 */
export function useStreamScale({ gateId, wsBaseUrl }: UseStreamScaleOptions) {
    const [quality, setQuality] = useState<Quality>("low");
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [scalingDirection, setScalingDirection] = useState<"up" | "down" | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const scalingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    const base = normalizeWsBaseUrl(wsBaseUrl || import.meta.env.VITE_WS_URL);

    // Fetch initial stream URL (low quality by default)
    useEffect(() => {
        const gateKey = `gate${gateId}`;
        getStreamUrl(gateKey, "low")
            .then((url) => setStreamUrl(url))
            .catch((err) => console.error("[StreamScale] Failed to fetch initial stream URL:", err));
    }, [gateId]);

    // WebSocket connection to /ws/stream/{gate_id}
    useEffect(() => {
        const url = `${base}/ws/stream/${gateId}`;

        function connect() {
            if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

            console.log(`[StreamScale] Connecting to ${url}`);
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setWsConnected(true);
                reconnectAttempts.current = 0;
                console.log(`[StreamScale] Connected for gate ${gateId}`);
            };

            ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.event === "stream_scale") {
                        const newQuality: Quality = msg.mode === "scale_up" ? "high" : "low";
                        const direction = msg.mode === "scale_up" ? "up" : "down";
                        console.log(`[StreamScale] Switching to ${newQuality} (${msg.quality})`);

                        // Show scaling direction overlay
                        if (scalingTimerRef.current) clearTimeout(scalingTimerRef.current);
                        setScalingDirection(direction);
                        scalingTimerRef.current = setTimeout(() => setScalingDirection(null), 3500);

                        const gateKey = `gate${gateId}`;
                        const newUrl = await getStreamUrl(gateKey, newQuality);
                        setQuality(newQuality);
                        setStreamUrl(newUrl);
                    }
                } catch (err) {
                    console.error("[StreamScale] Error handling message:", err);
                }
            };

            ws.onclose = (event) => {
                setWsConnected(false);
                wsRef.current = null;
                console.warn(
                    `[StreamScale] Disconnected for gate ${gateId} (code=${event.code}, reason="${event.reason || "no-reason"}", clean=${event.wasClean})`
                );
                attemptReconnect();
            };

            ws.onerror = (err) => {
                console.error("[StreamScale] WebSocket error:", err, "readyState=", ws.readyState);
            };
        }

        function attemptReconnect() {
            if (reconnectAttempts.current >= maxReconnectAttempts) {
                console.log("[StreamScale] Max reconnect attempts reached");
                return;
            }
            reconnectAttempts.current++;
            const delay = 3000 * Math.pow(2, reconnectAttempts.current - 1);
            console.log(`[StreamScale] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
            reconnectTimer.current = setTimeout(connect, delay);
        }

        connect();

        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // prevent reconnect on intentional close
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [gateId, base]);

    return { streamUrl, quality, wsConnected, scalingDirection };
}
