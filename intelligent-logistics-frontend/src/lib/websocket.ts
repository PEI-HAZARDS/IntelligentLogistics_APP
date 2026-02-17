/**
 * WebSocket utility for real-time communication with API Gateway
 * Handles connection to /ws/gate/{gate_id} for decision updates
 */

type MessageHandler = (data: DecisionUpdatePayload) => void;
type ConnectionHandler = () => void;

/**
 * Payload structure from Decision Engine via Kafka
 * Matches the exact output from DecisionEngine._publish_decision()
 */
export interface DecisionUpdatePayload {
    type: 'decision_update';
    payload: {
        // Timestamp (Unix epoch in seconds)
        timestamp: number;

        // Gate identification
        gate_id: number;

        // License plate detection
        licensePlate: string;
        lp_cropUrl?: string;

        // Hazmat detection (UN/Kemler with descriptions)
        UN?: string | null;      // e.g., "1203: Sample UN Description"
        kemler?: string | null;  // e.g., "33: Sample Kemler Description"
        hz_cropUrl?: string;

        // Decision result
        decision: 'ACCEPTED' | 'REJECTED' | 'MANUAL_REVIEW';

        // Alerts array (reasons for rejection, warnings, etc.)
        alerts: string[];

        // Route info (only present if appointment matched)
        route?: {
            gate_id?: number;
            terminal_id?: number;
            appointment_id?: number;
        } | null;

        // Allow additional fields
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
        this.baseUrl = baseUrl || import.meta.env.VITE_WS_URL || 'ws://10.255.32.70:8000/api';
    }

    /**
     * Connect to the WebSocket
     */
    connect(): void {
        // Prevent duplicate connections - check both OPEN and CONNECTING states
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                console.log('[WS] Already connected');
                return;
            }
            if (this.ws.readyState === WebSocket.CONNECTING) {
                console.log('[WS] Connection already in progress');
                return;
            }
            // Close any existing connection in CLOSING state
            if (this.ws.readyState === WebSocket.CLOSING) {
                console.log('[WS] Waiting for previous connection to close');
                return;
            }
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

        // Clear all handlers to prevent accumulation
        this.messageHandlers.clear();
        this.connectHandlers.clear();
        this.disconnectHandlers.clear();

        console.log('[WS] Disconnected and handlers cleared');
    }

    /**
     * Reset connection state (call before connect on page load)
     */
    reset(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = 0;
        console.log('[WS] Connection state reset');
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
            lpCrop: payload.lp_cropUrl,
            hzCrop: payload.hz_cropUrl,
            lpResult: payload.licensePlate,
            hzResult: payload.UN || payload.kemler || undefined,
            timestamp: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString(),
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
    // Don't call reset() here - it causes issues with React Strict Mode
    // The singleton persists and should maintain its connection state
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
