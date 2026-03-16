import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import StreamPlayer from '@/components/gate-operator/StreamPlayer';
import { useStreamScale } from '@/hooks/useStreamScale';
import { getGateWebSocket, type DecisionUpdatePayload } from '@/lib/websocket';

export default function WarningSign() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stream quality switching via dedicated WebSocket — gate02 camera
  const { streamUrl } = useStreamScale({ gateId: 2 });

  // Get gate ID from URL param (e.g. /warning-sign/2)
  const { gateId: rawGateId } = useParams<{ gateId: string }>();
  const gateId = rawGateId || "2";
  const { streamUrl, quality: streamQuality, scalingDirection } = useStreamScale({ gateId });

  // Listen for all events on the shared WebSocket
  useEffect(() => {
    const ws = getGateWebSocket(gateId);

    const unsubMessage = ws.onMessage((data: DecisionUpdatePayload) => {
      // Track all messages for debug panel
      debugIdCounter.current += 1;
      setDebugMessages(prev => [{
        id: `ws-dbg-${Date.now()}-${debugIdCounter.current}`,
        timestamp: new Date().toISOString(),
        data,
      }, ...prev].slice(0, 30));

      // Only react to infraction_decision events for the sign
      if (data.message_type !== "infraction_decision") return;

      const infraction = (data as Record<string, unknown>).infraction;
      if (infraction === true) {
        console.log('[WarningSign] Infraction detected — activating signal');
        setIsActive(true);

        // Clear any existing deactivation timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Deactivate after 15 seconds
        timerRef.current = setTimeout(() => setIsActive(false), 15000);
      }
    });

    const unsubConnect = ws.onConnect(() => setIsWsConnected(true));
    const unsubDisconnect = ws.onDisconnect(() => setIsWsConnected(false));

    // Connect if not already connected
    ws.connect();

    return () => {
      unsubMessage();
      unsubConnect();
      unsubDisconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gateId]);


  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 xl:p-10 overflow-y-scroll ${isDarkMode
      ? 'bg-neutral-900 text-white'
      : 'bg-slate-50 text-slate-900'
      }`}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-lg border transition-all ${isDarkMode
          ? 'bg-neutral-800 border-neutral-700 text-yellow-400 hover:bg-neutral-700'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start justify-items-center mx-auto">
        {/* Stream Section */}
        <div className="flex flex-col gap-6 w-full h-full">
          <div className="flex flex-col gap-2">
            <h1 className={`text-5xl xl:text-6xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
              Road Monitoring
            </h1>
            <p className={isDarkMode ? 'text-neutral-400 text-xl' : 'text-slate-600 text-xl'}>
              Hazmat material access control (C3p).
            </p>
          </div>

          <div className={`relative aspect-video bg-black rounded-xl overflow-hidden border shadow-2xl flex items-center justify-center group h-96 lg:h-full ${
            isDarkMode
              ? 'border-neutral-800'
              : 'border-slate-300'
          }`}>
            {/* Real HLS Stream */}
            <style>{`
                            .stream-wrapper .stream-player-container { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden; }
                            .stream-wrapper video.camera-feed { width: 100%; height: 100%; object-fit: cover; }
                            .stream-wrapper video::-webkit-media-controls { display: none !important; }
                            .stream-wrapper .stream-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); z-index: 10; color: white; }
                        `}</style>
            <div className="absolute inset-0 pointer-events-none opacity-80 mix-blend-screen scale-105 stream-wrapper">
              <StreamPlayer streamUrl={streamUrl ?? ""} />
            </div>

            {/* Overlay Grid */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCBMIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')] opacity-30"></div>

            {/* Top Right Status (moved from center & replaced REC tracker) */}
            <div className="absolute top-4 right-4 z-20">
              {isActive ? (
                <div className="bg-red-500/20 text-red-500 border border-red-500/50 px-5 py-2.5 rounded-lg font-bold animate-pulse backdrop-blur-sm flex items-center gap-2.5 text-base">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
                  POSSIBLE VIOLATION DETECTED
                </div>
              ) : (
                <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-5 py-2.5 rounded-lg font-bold backdrop-blur-sm flex items-center gap-2.5 text-base">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  REGULAR TRAFFIC
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Luminous Sign Section */}
        {/* Sign physical frame */}
        <div className={`p-6 rounded-2xl border-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center w-full max-w-sm aspect-2/3 relative ${isDarkMode
          ? 'bg-[#0a0a0a] border-neutral-800'
          : 'bg-slate-700 border-slate-600'
          }`}>
          {/* LED flashing corner lights (often seen on these signs) */}
          <div
            className={`absolute top-6 left-6 w-12 h-12 rounded-full border-4 transition-colors duration-300 z-20 ${isDarkMode ? 'border-[#1a1a1a]' : 'border-slate-600'
              } ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping" : "bg-amber-900/40"} `}
          ></div>
          <div
            className={`absolute top-6 right-6 w-12 h-12 rounded-full border-4 transition-colors duration-300 z-20 ${isDarkMode ? 'border-[#1a1a1a]' : 'border-slate-600'
              } ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping delay-150" : "bg-amber-900/40"} `}
          ></div>

          <div
            className={`absolute bottom-6 left-6 w-12 h-12 rounded-full border-4 transition-colors duration-300 z-20 ${isDarkMode ? 'border-[#1a1a1a]' : 'border-slate-600'
              } ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping delay-75" : "bg-amber-900/40"} `}
          ></div>
          <div
            className={`absolute bottom-6 right-6 w-12 h-12 rounded-full border-4 transition-colors duration-300 z-20 ${isDarkMode ? 'border-[#1a1a1a]' : 'border-slate-600'
              } ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping delay-225" : "bg-amber-900/40"} `}
          ></div>

          {/* The actual display area */}
          <div
            className={`transition-all duration-500 w-full flex-1 flex flex-col items-center justify-center px-6 ${isActive ? "opacity-100" : "opacity-[0.03] grayscale"}`}
          >
            {/* C3p SVG */}
            <div className="w-64 h-64 relative drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full drop-shadow-[0_0_20px_rgba(227,0,15,0.9)]"
              >
                {/* Red Border */}
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="#ffffff"
                  stroke="#E3000F"
                  strokeWidth="8"
                />

                {/* Truck container */}
                <path
                  d="M 30 30 L 70 30 L 73 60 L 27 60 Z"
                  fill="#000000"
                />

                {/* Orange label (Dangerous goods) */}
                <rect
                  x="36"
                  y="35"
                  width="28"
                  height="18"
                  fill="#FF7F00"
                  stroke="#000000"
                  strokeWidth="1"
                />

                {/* Chassis line */}
                <rect x="24" y="62" width="52" height="3" fill="#000000" />

                {/* Wheels */}
                <rect
                  x="27"
                  y="65"
                  width="5"
                  height="12"
                  fill="#000000"
                  rx="1"
                />
                <rect
                  x="34"
                  y="65"
                  width="5"
                  height="12"
                  fill="#000000"
                  rx="1"
                />

                <rect
                  x="68"
                  y="65"
                  width="5"
                  height="12"
                  fill="#000000"
                  rx="1"
                />
                <rect
                  x="61"
                  y="65"
                  width="5"
                  height="12"
                  fill="#000000"
                  rx="1"
                />

                {/* Axle line connecting wheels */}
                <rect x="39" y="70" width="22" height="2" fill="#000000" />
                <circle cx="50" cy="71" r="3" fill="#000000" />
              </svg>
            </div>

            {/* Text underneath the sign */}
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <span className="text-amber-500 font-mono text-4xl font-black tracking-widest drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] leading-tight">
                RESTRICTED
                <br />
                ROAD
              </span>
              <span className="text-amber-500 font-mono text-2xl font-bold tracking-wider drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] mt-2">
                RETURN TO
                <br />
                HIGHWAY
              </span>
            </div>
          </div>

          {/* LED matrix texture overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0icmdiYSgwLDAsMCwwLjgpIi8+Cjwvc3ZnPg==')] opacity-60 pointer-events-none rounded-2xl mix-blend-multiply"></div>

          {/* Pole (for realism) */}
          <div className="absolute -bottom-24 w-16 h-24 bg-linear-to-r from-neutral-800 via-neutral-700 to-neutral-900 rounded-b border-x-2 border-b-2 border-neutral-900 -z-10 shadow-2xl shadow-black"></div>
        </div>
      </div>
      {/* WebSocket Debug Panel */}
      <div style={{
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
                borderLeft: `3px solid ${msg.data?.message_type === 'infraction_decision' ? '#f59e0b' : '#4ade80'}`,
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
                  {JSON.stringify(msg.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
