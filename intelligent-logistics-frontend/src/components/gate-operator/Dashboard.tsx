import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import AppointmentDetailModal from "@/components/common/AppointmentDetailModal";
import StreamPlayer from "./StreamPlayer";
import ManualReviewModal, { type ManualReviewData } from "./ManualReviewModal";
import DetectionDetailsModal from "./DetectionDetailsModal";
import ImagePreviewModal from "./ImagePreviewModal";
import { AlertTriangle, ShieldAlert, RefreshCw, Loader2, Wifi, WifiOff, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { useStreamScale } from "@/hooks/useStreamScale";
import { getGateWebSocket, toGatewayMediaUrl, type DecisionUpdatePayload } from "@/lib/websocket";
import { ToastNotifications, useToasts } from "@/components/common/ToastNotifications";
import AuthedImage from "@/components/common/AuthedImage";
import type { Appointment } from "@/types/types";
import { labelForStatus } from "@/lib/statusLabel";

// Extended Appointment type with all orthogonal state flags
// Note: is_delayed, is_unloading, primary_status, display_status already exist on Appointment
interface ExtendedAppointment extends Appointment {
  highway_infraction?: boolean;
  is_delayed?: boolean | null;
  is_unloading?: boolean | null;
}

// Detection/Alert UI type - matches the new card design
interface UIDetection {
  id: string;
  type: "plate" | "safety" | "adr";
  time: string;
  severity: "warning" | "danger" | "info";
  // New fields for redesigned card
  decision?: "ACCEPTED" | "REJECTED" | "MANUAL_REVIEW";
  decisionSource?: "automated" | "operator";
  decisionReason?: string;
  licensePlate?: string;
  kemler?: string;
  kemlerDescription?: string;
  UN?: string;
  unDescription?: string;
  imageUrl?: string;
  truckId?: string;
  /** Full original WS payload — forwarded as-is on manual review submission */
  originalPayload?: DecisionUpdatePayload;
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



// Map API arrival to UI format  
// Mirror of backend DELAY_TOLERANCE_MINUTES (sql_models.py)
const DELAY_TOLERANCE_MS = 1 * 60 * 1000;

function mapArrivalToUI(arrival: ExtendedAppointment) {
  const primaryStatus = arrival.primary_status ?? arrival.status;
  // For scheduled rows the backend never sets is_delayed; compute client-side.
  const isDelayedScheduled =
    arrival.status === "scheduled" &&
    !!arrival.scheduled_start_time &&
    new Date(arrival.scheduled_start_time).getTime() < Date.now() - DELAY_TOLERANCE_MS;
  return {
    id: String(arrival.id),
    plate: arrival.truck_license_plate,
    arrivalTime: arrival.scheduled_start_time
      ? new Date(arrival.scheduled_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "--:--",
    cargo: arrival.booking?.reference || "N/A",
    cargoAmount: arrival.notes || "",
    status: labelForStatus(arrival.status) as string,        // display_status (compat)
    primaryStatus: labelForStatus(primaryStatus) as string,  // primary for new badge
    isDelayed: arrival.is_delayed ?? (arrival.status === "delayed" || isDelayedScheduled),
    isUnloading: (arrival.is_unloading || arrival.status === "unloading") && !arrival.is_visit_done,
    isVisitDone: (arrival.is_visit_done ?? false) && primaryStatus === 'in_process',
    dock: arrival.gate_in?.label || "N/A",
    highwayInfraction: arrival.highway_infraction || false,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [expandedArrivalId, setExpandedArrivalId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  const [arrivalFilter, setArrivalFilter] = useState<"scheduled" | "in_transit">("scheduled");

  // API data states
  const [arrivals, setArrivals] = useState<ReturnType<typeof mapArrivalToUI>[]>([]);
  const [detections, setDetections] = useState<UIDetection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [arrivalsError, setArrivalsError] = useState<string | null>(null);

  // WebSocket states
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [crops, setCrops] = useState<CropImage[]>([]);
  // Load saved payloads from localStorage on mount
  const [debugMessages, setDebugMessages] = useState<Array<{ id: string, timestamp: string, data: DecisionUpdatePayload }>>(() => {
    try {
      const saved = localStorage.getItem('ws_payloads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showDebug, setShowDebug] = useState(false);
  const wsRef = useRef<ReturnType<typeof getGateWebSocket> | null>(null);

  // Manual Review Modal state
  const [manualReviewData, setManualReviewData] = useState<ManualReviewData | null>(null);

  // Detection Details Modal state
  const [selectedDetection, setSelectedDetection] = useState<UIDetection | null>(null);

  // Image Preview Modal state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Held Manual Reviews (displayed as cards in detections list)
  const [heldReviews, setHeldReviews] = useState<ManualReviewData[]>([]);

  // Toast notifications
  const { toasts, addToast, dismissToast } = useToasts();

  // Get gate ID from URL param (e.g. /gate/1)
  const { gateId: rawGateId } = useParams<{ gateId: string }>();
  const gateId = rawGateId || "1";

  // Stream quality switching via unified WebSocket (/ws/gate/{gate_id})
  const { hlsUrl, webrtcUrl, quality: streamQuality, scalingDirection } = useStreamScale({ gateId });
  const isScalingTransition = Boolean(scalingDirection);
  const scalingUp = scalingDirection === 'up';
  const streamBadgeLabel = isScalingTransition
    ? (scalingUp ? 'Up -> HD' : 'Down -> SD')
    : (streamQuality === 'high' ? 'HD' : 'SD');
  const streamBadgeBackground = isScalingTransition
    ? (scalingUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.2)')
    : (streamQuality === 'high' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)');
  const streamBadgeBorder = isScalingTransition
    ? (scalingUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.5)')
    : (streamQuality === 'high' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.4)');
  const streamBadgeColor = isScalingTransition
    ? (scalingUp ? '#34d399' : '#fbbf24')
    : (streamQuality === 'high' ? '#34d399' : '#94a3b8');

  // Fetch data function - only fetches arrivals (alerts come from WebSocket only)
  const fetchData = useCallback(async () => {
    setArrivalsError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { getArrivals } = await import('@/services/arrivals');
      const baseParams = { gate_id: Number(gateId), scheduled_date: today, page: 1, limit: 15 };

      let items;
      if (arrivalFilter === "scheduled") {
        // Scheduled only — isDelayed computed client-side in mapArrivalToUI
        const scheduledRes = await getArrivals({ ...baseParams, status: "scheduled" });
        const mapped = scheduledRes.items.map(mapArrivalToUI);
        // Delayed first, then by arrival time ascending
        mapped.sort((a, b) => {
          const aD = a.isDelayed ? 0 : 1;
          const bD = b.isDelayed ? 0 : 1;
          if (aD !== bD) return aD - bD;
          return a.arrivalTime.localeCompare(b.arrivalTime);
        });
        items = mapped;
      } else {
        // In Transit: status=in_transit now returns all in_transit (on-time and delayed).
        // is_delayed flag on each item distinguishes them for badge rendering.
        const inTransitRes = await getArrivals({ ...baseParams, status: "in_transit" });
        const mapped = inTransitRes.items.map(mapArrivalToUI);
        // Delayed first, then by arrival time ascending
        mapped.sort((a, b) => {
          const aD = a.isDelayed ? 0 : 1;
          const bD = b.isDelayed ? 0 : 1;
          if (aD !== bD) return aD - bD;
          return a.arrivalTime.localeCompare(b.arrivalTime);
        });
        items = mapped;
      }
      setArrivals(items);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setArrivalsError("Failed to load arrivals. Click refresh to try again.");
    } finally {
      setIsLoading(false);
    }
  }, [gateId, arrivalFilter]);

  // Process a single payload and update UI (detections, crops, toasts)
  // showToast = true for real-time updates, false for initial load from storage
  const processPayload = useCallback((data: DecisionUpdatePayload, showToast: boolean = true) => {
    console.log('[Dashboard] processPayload called', { message_type: data?.message_type, showToast, data });
    if (!data || !data.message_type) {
      console.warn('[Dashboard] processPayload returning early - missing message_type', { data });
      return;
    }

    // Skip non-decision messages (e.g. scale_network) — they are handled by other hooks
    if (data.message_type === "scale_network") return;

    // Infraction decisions are visually handled by the WarningSign component,
    // but we still need to re-fetch the upcoming arrivals so the infraction
    // badge and stats update in real-time.
    if (data.message_type === "infraction_decision") {
      fetchData();
      return;
    }

    // Status changes (e.g. driver claimed appointment → in_transit) need a refetch
    // so the dashboard's upcoming arrivals list reflects the new status immediately.
    if (data.message_type === "status_changed") {
      fetchData();
      return;
    }



    const lp_crop = toGatewayMediaUrl(data.license_crop_url);
    const hz_crop = toGatewayMediaUrl(data.hazard_crop_url);
    const lp_result = data.license_plate;
    const decision = data.decision?.toUpperCase();
    const decision_source = data.decision_source;



    // Parse timestamp - could be Unix seconds, Unix milliseconds, or ISO string
    let now: string;
    try {
      if (data.timestamp) {
        const ts = data.timestamp;
        if (typeof ts === 'string') {
          // ISO string or other date string
          now = new Date(ts).toISOString();
        } else if (typeof ts === 'number') {
          // Check if it's seconds or milliseconds (timestamps before year 2001 in ms would be < 1e12)
          const date = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
          now = date.toISOString();
        } else {
          now = new Date().toISOString();
        }
      } else {
        now = new Date().toISOString();
      }
    } catch (e) {
      console.warn('[Dashboard] Failed to parse timestamp, using current time', data.timestamp, e);
      now = new Date().toISOString();
    }

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

    // Only add crops for real-time updates, not on initial load
    if (showToast && newCrops.length > 0) {
      setCrops(newCrops);
    }

    // Parse UN and Kemler from payload (format: "1203: Description" or just "1203")
    const parseCodeWithDescription = (value?: string | null): { code?: string; description?: string } => {
      if (!value) return {};
      const parts = value.split(':');
      return {
        code: parts[0]?.trim(),
        description: parts[1]?.trim()
      };
    };

    const unParsed = parseCodeWithDescription(data.un);
    const kemlerParsed = parseCodeWithDescription(data.kemler);

    // Determine severity based on decision and hazmat
    let severity: "warning" | "danger" | "info" = "info";
    if (data.un || data.kemler) {
      severity = "danger";
    } else if (decision === "REJECTED") {
      severity = "danger";
    } else if (decision === "MANUAL_REVIEW") {
      severity = "warning";
    }

    // Create unified detection card
    const newDetection: UIDetection = {
      id: generateUniqueId('ws-det'),
      type: (data.un || data.kemler) ? "adr" : "plate",
      time: new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      severity,
      decision: decision as UIDetection['decision'],
      decisionSource: decision_source as UIDetection['decisionSource'],
      decisionReason: data.decision_reason,
      licensePlate: lp_result,
      kemler: kemlerParsed.code,
      kemlerDescription: kemlerParsed.description,
      UN: unParsed.code,
      unDescription: unParsed.description,
      imageUrl: lp_crop || hz_crop,
      truckId: data.truck_id as string | undefined,
      originalPayload: data as DecisionUpdatePayload,
    };
    setDetections(prev => [newDetection, ...prev].slice(0, 10));

    // Trigger Manual Review Modal when MANUAL_REVIEW decision arrives
    if (showToast && decision === "MANUAL_REVIEW") {
      setManualReviewData({
        id: generateUniqueId('mr'),
        licensePlate: lp_result,
        lpCropUrl: lp_crop,
        hzCropUrl: hz_crop,
        UN: data.un,
        kemler: data.kemler,
        timestamp: now,
        truckId: data.truck_id as string | undefined,
        originalPayload: data as DecisionUpdatePayload,
      });
    }

    // Toast notifications for real-time updates only
    // Strictly follow backend alerts: One toast per alert in the payload
    if (showToast && data.alerts && Array.isArray(data.alerts)) {
      data.alerts.forEach((alertMsg) => {
        if (typeof alertMsg === 'string' && alertMsg.trim()) {
          // Determine type based on alert content for better UX
          let toastType: "danger" | "warning" | "success" | "info" = "danger";
          if (alertMsg.toLowerCase().includes('approved') || alertMsg.toLowerCase().includes('accepted')) {
            toastType = "success";
          } else if (alertMsg.toLowerCase().includes('review') || alertMsg.toLowerCase().includes('pending')) {
            toastType = "warning";
          }

          addToast({
            type: toastType,
            title: "Alert",
            message: alertMsg,
          });
        }
      });
    }

    // Refresh arrivals list when ACCEPTED, REJECTED, or INFRACTION info arrives
    // This ensures the "Upcoming Arrivals" list reflects the exact status or infraction change automatically
    if (showToast && (decision === "ACCEPTED" || decision === "REJECTED" || data.message_type === 'decision_results')) {
      fetchData();
    }
  }, [addToast, fetchData]);

  // Track the last processed payload ID to avoid duplicates
  const lastProcessedIdRef = useRef<string | null>(null);
  // Track if this is the initial load (to process all payloads)
  const isInitialLoadRef = useRef(true);

  // Listen for localStorage changes and process new payloads
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('ws_payloads');
        console.log('[Dashboard] handleStorageChange called', { hasSaved: !!saved });
        if (!saved) return;

        const messages = JSON.parse(saved) as Array<{ id: string, timestamp: string, data: DecisionUpdatePayload }>;
        console.log('[Dashboard] Parsed messages', { count: messages.length, isInitialLoad: isInitialLoadRef.current, lastProcessedId: lastProcessedIdRef.current });
        if (messages.length === 0) return;

        // Update debug messages state
        setDebugMessages(messages);

        if (isInitialLoadRef.current) {
          // On initial load:
          // - Process only the NEWEST payload for crops (with showToast=true to trigger crop loading)
          // - Process ALL payloads for detection cards (showToast=false, no toasts)
          console.log('[Dashboard] Initial load - processing all messages');
          isInitialLoadRef.current = false;

          // First, process all messages for detections only (oldest first, no crops/toasts)
          const reversedMessages = [...messages].reverse();
          reversedMessages.forEach(msg => {
            processPayload(msg.data, false);
          });

          // Then load crops from the newest message only
          const newest = messages[0];
          if (newest) {
            // Extract crops from newest flat payload
            const newestData = newest.data as DecisionUpdatePayload;
            const newCrops: CropImage[] = [];
            const now = newestData?.timestamp ? new Date(newestData.timestamp * 1000).toISOString() : new Date().toISOString();

            const initLp = toGatewayMediaUrl(newestData?.license_crop_url);
            const initHz = toGatewayMediaUrl(newestData?.hazard_crop_url);
            if (initLp) {
              newCrops.push({ id: generateUniqueId('init-lp'), url: initLp, type: "lp", timestamp: now });
            }
            if (initHz) {
              newCrops.push({ id: generateUniqueId('init-hz'), url: initHz, type: "hz", timestamp: now });
            }
            if (newCrops.length > 0) {
              setCrops(newCrops);
            }
          }

          lastProcessedIdRef.current = messages[0]?.id || null;
        } else {
          // For subsequent updates, only process the newest payload (with toasts + crops)
          const newest = messages[0];
          const shouldProcess = newest && newest.id !== lastProcessedIdRef.current;
          console.log('[Dashboard] Subsequent update', { newestId: newest?.id, lastProcessedId: lastProcessedIdRef.current, shouldProcess });
          if (shouldProcess) {
            lastProcessedIdRef.current = newest.id;
            processPayload(newest.data, true);
          }
        }
      } catch (e) {
        console.warn('Failed to process localStorage payloads:', e);
      }
    };

    // Listen for storage events (from other tabs)
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event (from same tab)
    window.addEventListener('ws_payload_updated', handleStorageChange);

    // Process any existing payloads on mount
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ws_payload_updated', handleStorageChange);
    };
  }, [processPayload]);

  // WebSocket setup - ONLY saves to localStorage, UI updates via storage listener
  useEffect(() => {
    const ws = getGateWebSocket(gateId);
    wsRef.current = ws;

    const unsubMessage = ws.onMessage((data: DecisionUpdatePayload) => {
      // Save to localStorage - UI will update via storage listener
      try {
        const saved = localStorage.getItem('ws_payloads');
        const existing = saved ? JSON.parse(saved) : [];
        const newMessages = [{
          id: generateUniqueId('debug'),
          timestamp: new Date().toISOString(),
          data: data
        }, ...existing].slice(0, 10);

        localStorage.setItem('ws_payloads', JSON.stringify(newMessages));

        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new Event('ws_payload_updated'));
      } catch (e) {
        console.warn('Failed to save payload to localStorage:', e);
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

    // Connect (or sync state if already open from a prior mount in Strict Mode)
    ws.connect();
    // After subscribing handlers, sync state in case the WS connected between
    // cleanup of a prior mount and this mount (Strict Mode race: onopen fired
    // while connectHandlers was empty, so setIsWsConnected(true) was missed).
    if (ws.isConnected()) {
      setIsWsConnected(true);
    }

    return () => {
      // Only unsubscribe handlers - don't disconnect the singleton WebSocket
      // The WebSocket persists across React Strict Mode remounts
      unsubMessage();
      unsubConnect();
      unsubDisconnect();
      // NOTE: Do NOT call ws.disconnect() here - it causes race conditions
      // with React Strict Mode's mount/unmount/mount cycle
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

  // Stream URL is managed by useStreamScale hook

  const toggleAccordion = (id: string) => {
    setExpandedArrivalId(expandedArrivalId === id ? null : id);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchData();
  };

  const handleWsReconnect = () => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.reconnectNow();
  };

  // Handle manual review completion
  const handleManualReviewComplete = (licensePlate: string, decision: 'accepted' | 'rejected') => {
    addToast({
      type: decision === 'accepted' ? 'success' : 'warning',
      title: 'Manual Review',
      message: `${licensePlate} ${decision}`,
    });
    // Refresh arrivals list
    fetchData();
  };

  return (
    <div className="operator-dashboard">
      {/* Manual Review Modal */}
      <ManualReviewModal
        isOpen={manualReviewData !== null}
        reviewData={manualReviewData}
        gateId={gateId}
        onClose={() => setManualReviewData(null)}
        onHold={(data) => {
          // Add to held reviews if not already there
          setHeldReviews(prev => {
            if (prev.some(r => r.id === data.id)) return prev;
            return [...prev, data];
          });
        }}
        onDecisionComplete={(licensePlate, decision) => {
          // Remove from held reviews when decision is made
          setHeldReviews(prev => prev.filter(r => r.id !== manualReviewData?.id));
          handleManualReviewComplete(licensePlate, decision);
        }}
      />

      {/* Detection Details Modal */}
      <DetectionDetailsModal
        isOpen={selectedDetection !== null}
        detection={selectedDetection}
        onClose={() => setSelectedDetection(null)}
      />

      {/* Image Preview Modal (for crop zoom) */}
      <ImagePreviewModal
        isOpen={previewImage !== null}
        imageUrl={previewImage?.url || null}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />

      {/* Toast Notifications */}
      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />

      {/* Left Panel - Camera and Detections */}
      <div className="left-panel">
        <div className="camera-section">
          <div className="video-area">
            {hlsUrl ? (
              <StreamPlayer
                hlsUrl={hlsUrl}
                webrtcUrl={webrtcUrl}
                quality={streamQuality}
                autoPlay={true}
              />
            ) : (
              <StreamPlayer
                hlsUrl={null}
                quality="low"
                autoPlay={false}
              />
            )}

            {/* Top Left — Unified Stream Badge */}
            <div
              style={{
                position: 'absolute',
                top: '0.5rem',
                left: '0.5rem',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: '1px solid',
                  background: streamBadgeBackground,
                  borderColor: streamBadgeBorder,
                  color: streamBadgeColor,
                  minWidth: isScalingTransition ? '104px' : '56px',
                  justifyContent: 'center',
                  transform: isScalingTransition ? 'scale(1.05)' : 'scale(1)',
                  transition: 'min-width 0.35s ease, transform 0.35s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                }}
              >
                {isScalingTransition ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {scalingUp ? (
                      <><polyline points="18 15 12 9 6 15" /><line x1="12" y1="9" x2="12" y2="21" /></>
                    ) : (
                      <><polyline points="6 9 12 15 18 9" /><line x1="12" y1="3" x2="12" y2="15" /></>
                    )}
                  </svg>
                ) : (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: streamBadgeColor,
                    }}
                  />
                )}
                {streamBadgeLabel}
              </div>
            </div>
          </div>

          {/* Crops column - real-time images from WebSocket/MinIO */}
          <div className="crops-column custom-scrollbar">
            {crops.length > 0 ? (
              crops.map((crop) => (
                <div
                  key={crop.id}
                  className={`crop-thumb ${crop.type === 'hz' ? 'hazmat' : ''}`}
                  onClick={() => setPreviewImage({
                    url: crop.url,
                    title: crop.type === 'lp' ? 'License Plate' : 'Hazmat Placard'
                  })}
                  style={{ cursor: 'pointer' }}
                >
                  <AuthedImage
                    src={crop.url}
                    alt={crop.type === 'lp' ? 'License plate crop' : 'Hazmat crop'}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {crop.id.startsWith('ws-') && (
                    <span className="live-badge">LIVE</span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-crops">
                <span>Waiting for detections...</span>
              </div>
            )}
          </div>
        </div>

        <div className="detections-section">
          <div className="section-header-row">
            <h3 className="section-title">
              <ShieldAlert size={20} className="inline-icon" /> Detections & Decisions
            </h3>
            <div className="header-badges">
              <span className={`ws-badge ${isWsConnected ? 'connected' : 'disconnected'}`}>
                {isWsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isWsConnected ? 'Live' : 'Offline'}
              </span>
              <button
                className={`refresh-btn${!isWsConnected ? ' ws-reconnecting' : ''}`}
                onClick={() => { handleRefresh(); handleWsReconnect(); }}
                disabled={isLoading && isWsConnected}
                title={isWsConnected ? 'Refresh data' : 'Click to reconnect WebSocket'}
              >
                {(isLoading || !isWsConnected) ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              </button>
            </div>
          </div>



          <div className="detections-list custom-scrollbar">
            {/* Held Reviews - displayed prominently at top */}
            {heldReviews.map((held) => {
              // Parse kemler and UN to separate code from description
              const parseCodeWithDescription = (value?: string): { code?: string; description?: string } => {
                if (!value) return {};
                const parts = value.split(':');
                return {
                  code: parts[0]?.trim(),
                  description: parts[1]?.trim()
                };
              };

              const kemlerParsed = parseCodeWithDescription(held.kemler);
              const unParsed = parseCodeWithDescription(held.UN);

              return (
                <div
                  key={`held-${held.id}`}
                  className="detection-card decision-manual-review"
                  onClick={() => setManualReviewData(held)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="detection-header">
                    <span className="decision-badge decision-manual-review">
                      MANUAL_REVIEW
                    </span>
                    <span className="decision-badge decision-manual-review">
                      HELD
                    </span>
                    <span className="detection-time">
                      {new Date(held.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="detection-fields">
                    <div className="detection-field">
                      <span className="field-label">LICENSE</span>
                      <span className="field-value">{held.licensePlate || 'N/A'}</span>
                    </div>
                    {kemlerParsed.code && (
                      <div className="detection-field">
                        <span className="field-label">KEMLER</span>
                        <span className="field-value">{kemlerParsed.code}</span>
                        {kemlerParsed.description && (
                          <span className="field-description">{kemlerParsed.description}</span>
                        )}
                      </div>
                    )}
                    {unParsed.code && (
                      <div className="detection-field">
                        <span className="field-label">UN</span>
                        <span className="field-value">{unParsed.code}</span>
                        {unParsed.description && (
                          <span className="field-description">{unParsed.description}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="held-hint">Click to resume review</div>
                </div>
              );
            })}

            {isLoading && detections.length === 0 && heldReviews.length === 0 ? (
              <div className="loading-state">
                <Loader2 size={24} className="spin" />
                <span>Loading alerts...</span>
              </div>
            ) : detections.length === 0 && heldReviews.length === 0 ? (
              <div className="empty-state">
                <span>No recent alerts.</span>
              </div>
            ) : (
              detections.map((detection) => (
                <div
                  key={detection.id}
                  className={`detection-card severity-${detection.severity} decision-${detection.decision?.toLowerCase().replace('_', '-') || 'unknown'}`}
                  onClick={() => {
                    // For MANUAL_REVIEW, open the action modal; for others, show details
                    if (detection.decision === 'MANUAL_REVIEW') {
                      setManualReviewData({
                        id: detection.id,
                        licensePlate: detection.licensePlate,
                        UN: detection.UN && detection.unDescription
                          ? `${detection.UN}: ${detection.unDescription}`
                          : detection.UN,
                        kemler: detection.kemler && detection.kemlerDescription
                          ? `${detection.kemler}: ${detection.kemlerDescription}`
                          : detection.kemler,
                        timestamp: detection.time,
                        truckId: detection.truckId,
                        originalPayload: detection.originalPayload,
                      });
                    } else {
                      setSelectedDetection(detection);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Header: DECISION, SOURCE, and TRK-ID */}
                  <div className="detection-header">
                    {detection.decision ? (
                      <span className={`decision-badge decision-${detection.decision.toLowerCase().replace('_', '-')}`}>
                        {detection.decision.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="decision-badge decision-manual-review">UNKNOWN</span>
                    )}
                    {detection.decisionSource && (
                      <span className={`source-badge source-${detection.decisionSource}`}>
                        {detection.decisionSource === 'automated' ? 'Automated' : 'Operator'}
                      </span>
                    )}
                    {detection.decisionReason && <span className="decision-reason">{detection.decisionReason.replace(/_/g, ' ')}</span>}
                    <span className="detection-time">{detection.time}</span>
                  </div>

                  {/* Content: LICENSE, KEMLER, UN */}
                  <div className="detection-fields">
                    {detection.licensePlate && (
                      <div className="detection-field">
                        <span className="field-label">LICENSE</span>
                        <span className="field-value">{detection.licensePlate}</span>
                      </div>
                    )}
                    {detection.kemler && (
                      <div className="detection-field">
                        <span className="field-label">KEMLER</span>
                        <span className="field-value">{detection.kemler}</span>
                        {detection.kemlerDescription && (
                          <span className="field-description">{detection.kemlerDescription}</span>
                        )}
                      </div>
                    )}
                    {detection.UN && (
                      <div className="detection-field">
                        <span className="field-label">UN</span>
                        <span className="field-value">{detection.UN}</span>
                        {detection.unDescription && (
                          <span className="field-description">{detection.unDescription}</span>
                        )}
                      </div>
                    )}
                  </div>
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
          onClick={() => navigate(`/gate/${gateId}/arrivals`)}
        >
          Arrivals List
        </button>

        <div className="arrival-filter-toggle">
          <button
            className={`arrival-filter-btn ${arrivalFilter === "scheduled" ? "active" : ""}`}
            onClick={() => setArrivalFilter("scheduled")}
          >
            Scheduled
          </button>
          <button
            className={`arrival-filter-btn ${arrivalFilter === "in_transit" ? "active" : ""}`}
            onClick={() => setArrivalFilter("in_transit")}
          >
            In Transit
          </button>
        </div>

        {arrivalsError && (
          <div className="error-message">
            <AlertTriangle size={16} />
            <span>{arrivalsError}</span>
          </div>
        )}

        <div className="arrivals-list custom-scrollbar">
          {isLoading && arrivals.length === 0 ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              <span>Loading arrivals...</span>
            </div>
          ) : arrivals.length === 0 ? (
            <div className="empty-state">
              {arrivalFilter === "scheduled" ? (
                <span>No scheduled arrivals.</span>
              ) : (
                <span>No arrivals in transit.</span>
              )}
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
                      <span className="status-badge-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                        <span
                          className={`status-badge status-${(arrival.primaryStatus ?? arrival.status)
                            .toLowerCase()
                            .replace(/\s/g, "-")}`}
                        >
                          {arrival.primaryStatus ?? arrival.status}
                        </span>
                        {arrival.isDelayed && (
                          <span className="status-badge status-delayed-substate">Delayed</span>
                        )}
                        {arrival.isUnloading && (
                          <span className="status-badge status-unloading-substate">Unloading</span>
                        )}
                        {arrival.isVisitDone && (
                          <span className="status-badge status-leaving-port">Leaving Port</span>
                        )}
                        {arrival.highwayInfraction && (
                          <span className="status-badge status-highway-infraction">
                            Infraction
                          </span>
                        )}
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
                        <button
                          className="details-btn"
                          onClick={e => { e.stopPropagation(); setDetailId(Number(arrival.id)); }}
                        >
                          View Full Details
                        </button>
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
              onClick={() => {
                localStorage.removeItem('ws_payloads');
                setDebugMessages([]);
                lastProcessedIdRef.current = null;
                isInitialLoadRef.current = true;
              }}
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
                  {new Date(msg.timestamp).toLocaleTimeString()} — {(msg.data?.message_type as string) || 'unknown'}
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

      <AppointmentDetailModal appointmentId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
