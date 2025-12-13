/**
 * WebSocket utility for real-time communication with API Gateway
 * Handles connection to /ws/gate/{gate_id} for decision updates
 */

type MessageHandler = (data: DecisionUpdatePayload) => void;
type ConnectionHandler = () => void;

export interface DecisionUpdatePayload {
    type: 'decision_update';
    payload: {
        truck_id?: string;
        lp_crop?: string;      // MinIO URL for license plate crop
        hz_crop?: string;      // MinIO URL for hazmat crop
        lp_result?: string;    // License plate text result
        hz_result?: string;    // Hazmat detection result
        decision?: string;     // ACCEPTED, REJECTED, MANUAL_REVIEW
        route?: string;
        gate_id?: number;
        appointment_id?: number;
        timestamp?: string;
        [key: string]: unknown;
    };
}

export interface CropUpdate {
    lpCrop?: string;
    hzCrop?: string;
    lpResult?: string;
    hzResult?: string;
    timestamp: string;
}

class GateWebSocket {
    private ws: WebSocket | null = null;
    private gateId: string | number;
    private baseUrl: string;
    private messageHandlers: Set<MessageHandler> = new Set();
    private connectHandlers: Set<ConnectionHandler> = new Set();
    private disconnectHandlers: Set<ConnectionHandler> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(gateId: string | number, baseUrl?: string) {
        this.gateId = gateId;
        // Default to API Gateway WebSocket URL
        this.baseUrl = baseUrl || import.meta.env.VITE_WS_URL || 'ws://10.255.32.100:8000/api';
    }

    /**
     * Connect to the WebSocket
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[WS] Already connected');
            return;
        }

        const url = `${this.baseUrl}/ws/decisions/${this.gateId}`;
        console.log(`[WS] Connecting to ${url}...`);

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[WS] Connected successfully');
                this.reconnectAttempts = 0;
                this.connectHandlers.forEach(handler => handler());
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as DecisionUpdatePayload;
                    console.log('[WS] Message received:', data.type);
                    this.messageHandlers.forEach(handler => handler(data));
                } catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };

            this.ws.onclose = (event) => {
                console.log(`[WS] Connection closed: ${event.code} ${event.reason}`);
                this.ws = null;
                this.disconnectHandlers.forEach(handler => handler());
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
            };
        } catch (err) {
            console.error('[WS] Failed to create WebSocket:', err);
            this.attemptReconnect();
        }
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[WS] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Disconnect from the WebSocket
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
        console.log('[WS] Disconnected');
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Subscribe to decision update messages
     */
    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    /**
     * Subscribe to connection events
     */
    onConnect(handler: ConnectionHandler): () => void {
        this.connectHandlers.add(handler);
        return () => this.connectHandlers.delete(handler);
    }

    /**
     * Subscribe to disconnection events
     */
    onDisconnect(handler: ConnectionHandler): () => void {
        this.disconnectHandlers.add(handler);
        return () => this.disconnectHandlers.delete(handler);
    }

    /**
     * Extract crop URLs from decision payload
     */
    static extractCrops(payload: DecisionUpdatePayload['payload']): CropUpdate {
        return {
            lpCrop: payload.lp_crop,
            hzCrop: payload.hz_crop,
            lpResult: payload.lp_result,
            hzResult: payload.hz_result,
            timestamp: payload.timestamp || new Date().toISOString(),
        };
    }
}

// Singleton instance holder
let wsInstance: GateWebSocket | null = null;

/**
 * Get or create WebSocket connection for a gate
 */
export function getGateWebSocket(gateId: string | number): GateWebSocket {
    if (!wsInstance || wsInstance['gateId'] !== gateId) {
        wsInstance?.disconnect();
        wsInstance = new GateWebSocket(gateId);
    }
    return wsInstance;
}

/**
 * React hook for WebSocket connection
 */
export function useGateWebSocket(
    gateId: string | number
) {
    const ws = getGateWebSocket(gateId);

    // Effect should be handled in component
    return {
        connect: () => ws.connect(),
        disconnect: () => ws.disconnect(),
        isConnected: () => ws.isConnected(),
        onMessage: ws.onMessage.bind(ws),
        onConnect: ws.onConnect.bind(ws),
        onDisconnect: ws.onDisconnect.bind(ws),
        extractCrops: GateWebSocket.extractCrops,
    };
}

export { GateWebSocket };
export default GateWebSocket;
