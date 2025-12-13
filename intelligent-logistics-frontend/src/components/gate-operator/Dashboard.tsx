import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import HLSPlayer from "./HLSPlayer";
import { AlertTriangle, FileText, ShieldAlert, RefreshCw, Loader2, Wifi, WifiOff, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { getUpcomingArrivals } from "@/services/arrivals";
import { getActiveAlerts } from "@/services/alerts";
import { getStreamUrl as fetchStreamUrl } from "@/services/streams";
import { getGateWebSocket, type DecisionUpdatePayload } from "@/lib/websocket";
import { ToastNotifications, useToasts } from "@/components/common/ToastNotifications";
import type { Appointment, Alert } from "@/types/types";

// Map alert type to detection UI type
function mapAlertTypeToDetection(type: string): "plate" | "safety" | "adr" {
  if (type === "safety" || type === "problem") return "adr";
  if (type === "operational") return "safety";
  return "plate";
}

// Map alert type to severity
function mapAlertSeverity(type: string): "warning" | "danger" | "info" {
  if (type === "problem" || type === "safety") return "danger";
  if (type === "operational") return "warning";
  return "info";
}

// Map API status to English display
function mapStatusToLabel(status: string): string {
  const statusMap: Record<string, string> = {
    in_transit: "In Transit",
    delayed: "Delayed",
    completed: "Completed",
    canceled: "Canceled",
  };
  return statusMap[status] || status;
}

// Detection/Alert UI type
interface UIDetection {
  id: string;
  type: "plate" | "safety" | "adr";
  title: string;
  description: string;
  confidence?: number;
  time: string;
  severity: "warning" | "danger" | "info";
  imageUrl?: string;
}

// Crop image type
interface CropImage {
  id: string;
  url: string;
  type: "lp" | "hz";
  timestamp: string;
}

// Unique ID counter to prevent React duplicate key warnings
let uniqueIdCounter = 0;
function generateUniqueId(prefix: string): string {
  uniqueIdCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueIdCounter}`;
}

// Map API alert to UI detection
function mapAlertToDetection(alert: Alert): UIDetection {
  return {
    id: String(alert.id),
    type: mapAlertTypeToDetection(alert.type),
    title: alert.type.charAt(0).toUpperCase() + alert.type.slice(1),
    description: alert.description || "Alert without description",
    time: new Date(alert.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    severity: mapAlertSeverity(alert.type),
    imageUrl: alert.image_url || undefined,
  };
}

// Map API arrival to UI format  
function mapArrivalToUI(arrival: Appointment) {
  return {
    id: String(arrival.id),
    plate: arrival.truck_license_plate,
    arrivalTime: arrival.scheduled_start_time
      ? new Date(arrival.scheduled_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "--:--",
    cargo: arrival.booking?.reference || "N/A",
    cargoAmount: arrival.notes || "",
    status: mapStatusToLabel(arrival.status) as string,
    dock: arrival.gate_in?.label || "N/A",
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [expandedArrivalId, setExpandedArrivalId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));

  // API data states
  const [arrivals, setArrivals] = useState<ReturnType<typeof mapArrivalToUI>[]>([]);
  const [detections, setDetections] = useState<UIDetection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket states
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [crops, setCrops] = useState<CropImage[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [debugMessages, setDebugMessages] = useState<Array<{ id: string, timestamp: string, data: any }>>([]);
  const [showDebug, setShowDebug] = useState(false);
  const wsRef = useRef<ReturnType<typeof getGateWebSocket> | null>(null);

  // Toast notifications
  const { toasts, addToast, dismissToast } = useToasts();

  // Get gate ID from user info (default to 1 if not set)
  const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
  const gateId = userInfo.gate_id || 1;

  // Fetch data function - now fetches alerts instead of detection events
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [arrivalsData, alertsData] = await Promise.all([
        getUpcomingArrivals(gateId, 5),
        getActiveAlerts(10),
      ]);

      setArrivals(arrivalsData.map(mapArrivalToUI));
      setDetections(alertsData.map(mapAlertToDetection));

      // Extract crop images from alerts that have image_url
      const alertCrops = alertsData
        .filter(a => a.image_url)
        .slice(0, 5)
        .map((a) => ({
          id: `alert-${a.id}`,
          url: a.image_url!,
          type: "lp" as const,
          timestamp: a.timestamp,
        }));

      // Merge with WebSocket crops (WS crops take priority)
      setCrops(prev => {
        const wsCrops = prev.filter(c => c.id.startsWith("ws-"));
        return [...wsCrops, ...alertCrops].slice(0, 5);
      });
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load data. Click refresh to try again.");
    } finally {
      setIsLoading(false);
    }
  }, [gateId]);

  // WebSocket setup with toast notifications
  useEffect(() => {
    const ws = getGateWebSocket(gateId);
    wsRef.current = ws;

    const unsubMessage = ws.onMessage((data: DecisionUpdatePayload) => {
      // Store raw message for debug panel
      setDebugMessages(prev => [{
        id: generateUniqueId('debug'),
        timestamp: new Date().toISOString(),
        data: data
      }, ...prev].slice(0, 10));

      if (data.type === "decision_update" && data.payload) {
        // Map Decision Engine field names to frontend expected names
        const payload = data.payload as {
          lp_cropUrl?: string;
          hz_cropUrl?: string;
          licensePlate?: string;
          UN?: string;
          kemler?: string;
          decision?: string;
          timestamp?: number;
          truck_id?: string;
          gate_id?: number;
          alerts?: string[];
        };

        const lp_crop = payload.lp_cropUrl;
        const hz_crop = payload.hz_cropUrl;
        const lp_result = payload.licensePlate;
        const decision = payload.decision;
        const truck_id = payload.truck_id;

        // Build hz_result from UN and kemler
        const hz_result = (payload.UN || payload.kemler)
          ? `${payload.UN ? `UN: ${payload.UN}` : ''}${payload.UN && payload.kemler ? ' | ' : ''}${payload.kemler ? `Kemler: ${payload.kemler}` : ''}`
          : null;

        const now = payload.timestamp
          ? new Date(payload.timestamp * 1000).toISOString()
          : new Date().toISOString();

        // Add new crops to the beginning of the list
        const newCrops: CropImage[] = [];

        if (lp_crop) {
          newCrops.push({
            id: generateUniqueId('ws-lp'),
            url: lp_crop,
            type: "lp",
            timestamp: now,
          });
        }

        if (hz_crop) {
          newCrops.push({
            id: generateUniqueId('ws-hz'),
            url: hz_crop,
            type: "hz",
            timestamp: now,
          });
        }

        if (newCrops.length > 0) {
          setCrops(prev => [...newCrops, ...prev].slice(0, 5));
        }

        // Create detection and toast notification based on results
        if (hz_result) {
          // Hazmat detection - DANGER toast
          const newDetection: UIDetection = {
            id: generateUniqueId('ws-hz'),
            type: "adr",
            title: "⚠️ Hazmat Detection",
            description: `Hazardous cargo detected: ${hz_result}`,
            time: new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            severity: "danger",
            imageUrl: hz_crop || lp_crop,
          };
          setDetections(prev => [newDetection, ...prev].slice(0, 10));

          // Toast notification for hazmat
          addToast({
            type: "danger",
            title: "⚠️ Hazmat Detection",
            message: `Hazardous cargo detected: ${hz_result}. Truck: ${truck_id || lp_result || 'Unknown'}`,
            imageUrl: hz_crop,
          });
        }

        if (lp_result && !hz_result) {
          // License plate detection - INFO toast
          const newDetection: UIDetection = {
            id: generateUniqueId('ws-lp'),
            type: "plate",
            title: "License Plate Detection",
            description: `License plate: "${lp_result}" detected`,
            time: new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            severity: "info",
            imageUrl: lp_crop,
          };
          setDetections(prev => [newDetection, ...prev].slice(0, 10));

          // Toast notification for license plate (only for important ones)
          if (decision) {
            addToast({
              type: decision === "ACCEPTED" ? "success" : decision === "REJECTED" ? "danger" : "warning",
              title: decision === "ACCEPTED" ? "✅ Arrival Approved" :
                decision === "REJECTED" ? "❌ Arrival Rejected" : "⏳ Manual Review Required",
              message: `Truck ${lp_result}: ${decision}`,
              imageUrl: lp_crop,
            });
          }
        }

        // Handle decision-specific notifications
        if (decision === "MANUAL_REVIEW") {
          addToast({
            type: "warning",
            title: "Manual Review Required",
            message: `Truck ${lp_result || truck_id || 'Unknown'} requires operator review`,
            imageUrl: lp_crop || hz_crop,
          });
        }
      }
    });

    const unsubConnect = ws.onConnect(() => {
      setIsWsConnected(true);
      // Note: Not showing toast here to avoid duplicate notifications
      // WebSocket status is shown via the LIVE indicator
    });

    const unsubDisconnect = ws.onDisconnect(() => {
      setIsWsConnected(false);
    });

    // Connect
    ws.connect();

    return () => {
      unsubMessage();
      unsubConnect();
      unsubDisconnect();
      ws.disconnect();
    };
  }, [gateId, addToast]);

  // Initial fetch and auto-refresh timer
  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);

    // Auto-refresh data every 30 seconds
    const refreshTimer = setInterval(fetchData, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, [fetchData]);

  // Fetch stream URL from API Gateway on mount
  useEffect(() => {
    const loadStreamUrl = async () => {
      try {
        // Use gate1 format (not gate01) as expected by stream server
        const gateKey = `gate${gateId}`;
        const url = await fetchStreamUrl(gateKey, 'high');
        setStreamUrl(url);
      } catch (err) {
        console.error('Failed to fetch stream URL:', err);
        // Fallback to a default placeholder if API fails
        setStreamUrl(null);
      }
    };
    loadStreamUrl();
  }, [gateId]);

  const toggleAccordion = (id: string) => {
    setExpandedArrivalId(expandedArrivalId === id ? null : id);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchData();
  };

  return (
    <div className="operator-dashboard">
      {/* Toast Notifications */}
      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />

      {/* Left Panel - Camera and Detections */}
      <div className="left-panel">
        <div className="camera-section">
          <div className="video-area">
            {streamUrl ? (
              <HLSPlayer
                streamUrl={streamUrl}
                quality="high"
                autoPlay={true}
              />
            ) : (
              <div className="video-loading">
                <Loader2 size={32} className="spin" />
                <span>Loading stream...</span>
              </div>
            )}
          </div>

          {/* Crops column - real-time images from WebSocket/MinIO */}
          <div className="crops-column custom-scrollbar">
            {crops.length > 0 ? (
              crops.map((crop) => (
                <div key={crop.id} className={`crop-thumb ${crop.type === 'hz' ? 'hazmat' : ''}`}>
                  <img
                    src={crop.url}
                    alt={crop.type === 'lp' ? 'License plate crop' : 'Hazmat crop'}
                    onError={(e) => {
                      // Fallback to placeholder on error
                      (e.target as HTMLImageElement).src = '/licen_pl.png';
                    }}
                  />
                  {crop.id.startsWith('ws-') && (
                    <span className="live-badge">LIVE</span>
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="crop-thumb">
                  <img src="/licen_pl.png" alt="crop placeholder" />
                </div>
                <div className="crop-thumb">
                  <img src="/plate.png" alt="crop placeholder" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="detections-section">
          <div className="section-header-row">
            <h3 className="section-title">
              <ShieldAlert size={20} className="inline-icon" /> Alerts & Detections
            </h3>
            <div className="header-badges">
              <span className={`ws-badge ${isWsConnected ? 'connected' : 'disconnected'}`}>
                {isWsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isWsConnected ? 'Live' : 'Offline'}
              </span>
              <button
                className="refresh-btn"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh"
              >
                {isLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="detections-list custom-scrollbar">
            {isLoading && detections.length === 0 ? (
              <div className="loading-state">
                <Loader2 size={24} className="spin" />
                <span>Loading alerts...</span>
              </div>
            ) : detections.length === 0 ? (
              <div className="empty-state">
                <span>No recent alerts.</span>
              </div>
            ) : (
              detections.map((detection) => (
                <div
                  key={detection.id}
                  className={`detection-card severity-${detection.severity}`}
                >
                  <div className="detection-header">
                    <div className="title-row">
                      {detection.type === 'plate' && <FileText size={16} />}
                      {detection.type === 'adr' && <ShieldAlert size={16} />}
                      {detection.type === 'safety' && <AlertTriangle size={16} />}
                      <h4>{detection.title}</h4>
                    </div>
                    <span className="detection-time">{detection.time}</span>
                  </div>
                  <p className="detection-description">{detection.description}</p>
                  {detection.imageUrl && (
                    <div className="detection-image">
                      <img src={detection.imageUrl} alt="Detection" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Upcoming Arrivals */}
      <div className="right-panel">
        <div className="panel-header-row">
          <h2 className="panel-title">Upcoming Arrivals</h2>
          <div className="time-display">
            <span className="time-value">{currentTime}</span>
          </div>
        </div>

        <button
          className="view-toggle-btn"
          onClick={() => navigate("/gate/arrivals")}
        >
          Arrivals List
        </button>

        <div className="arrivals-list custom-scrollbar">
          {isLoading && arrivals.length === 0 ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              <span>Loading arrivals...</span>
            </div>
          ) : arrivals.length === 0 ? (
            <div className="empty-state">
              <span>No scheduled arrivals.</span>
            </div>
          ) : (
            arrivals.map((arrival) => {
              const isExpanded = expandedArrivalId === arrival.id;

              return (
                <div
                  key={arrival.id}
                  className={`arrival-accordion-item ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleAccordion(arrival.id)}
                >
                  {/* Header (Always Visible) */}
                  <div className="accordion-header">
                    <div className="header-main">
                      <span className="plate-id">{arrival.plate}</span>
                      <span className="arrival-time">{arrival.arrivalTime}</span>
                    </div>
                    <div className="header-status">
                      <span
                        className={`status-badge status-${arrival.status
                          .toLowerCase()
                          .replace(/\s/g, "-")}`}
                      >
                        {arrival.status}
                      </span>
                      <svg
                        className={`chevron ${isExpanded ? 'open' : ''}`}
                        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="accordion-content">
                      <div className="detail-row">
                        <span className="label">Dock:</span>
                        <span className="value">{arrival.dock}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Reference:</span>
                        <span className="value">{arrival.cargo}</span>
                      </div>
                      {arrival.cargoAmount && (
                        <div className="detail-row">
                          <span className="label">Notes:</span>
                          <span className="value">{arrival.cargoAmount}</span>
                        </div>
                      )}
                      <div className="actions-row">
                        <Link to={`/gate/arrival/${arrival.id}`} className="details-btn">
                          View Full Details
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* WebSocket Debug Panel */}
      <div className="ws-debug-panel" style={{
        position: 'fixed',
        bottom: showDebug ? '0' : '-300px',
        left: '0',
        right: '0',
        height: '300px',
        background: 'rgba(15, 20, 35, 0.95)',
        borderTop: '2px solid #4ade80',
        transition: 'bottom 0.3s ease',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            position: 'absolute',
            top: '-36px',
            right: '20px',
            background: showDebug ? '#4ade80' : '#374151',
            color: showDebug ? '#000' : '#fff',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <Bug size={16} />
          WebSocket Debug ({debugMessages.length})
          {showDebug ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        <div style={{
          padding: '12px',
          overflowY: 'auto',
          flex: 1,
          fontFamily: 'monospace',
          fontSize: '11px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            color: '#9ca3af',
          }}>
            <span>
              <Wifi size={14} style={{ marginRight: '6px', color: isWsConnected ? '#4ade80' : '#ef4444' }} />
              Gate {gateId} | {isWsConnected ? 'Connected' : 'Disconnected'}
            </span>
            <button
              onClick={() => setDebugMessages([])}
              style={{
                background: '#374151',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              Clear
            </button>
          </div>

          {debugMessages.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
              No WebSocket messages received yet...
            </div>
          ) : (
            debugMessages.map((msg) => (
              <div key={msg.id} style={{
                background: 'rgba(55, 65, 81, 0.5)',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '8px',
                borderLeft: '3px solid #4ade80',
              }}>
                <div style={{ color: '#9ca3af', marginBottom: '4px' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()} — {msg.data?.type || 'unknown'}
                </div>
                <pre style={{
                  color: '#e5e7eb',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {JSON.stringify(msg.data?.payload || msg.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
