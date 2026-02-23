import { useState, useEffect } from 'react';
import HLSPlayer from '@/components/gate-operator/HLSPlayer';
import { getStreamUrl } from '@/config/streams';

export default function WarningSign() {
  const [isActive, setIsActive] = useState(false);

  // Auto-turn off the sign after 10 seconds to simulate a passing truck (simulates triggering the alert and then returning to normal)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isActive) {
      timeout = setTimeout(() => {
        setIsActive(false);
      }, 10000);
    }
    return () => clearTimeout(timeout);
  }, [isActive]);

  const simulateTruck = () => {
    setIsActive(true);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4 xl:p-8 overflow-y-scroll">
      <div className="w-full max-w-480 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mx-auto">
        {/* Stream Section */}
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white mb-2 tracking-tight">
              Road Monitoring
            </h1>
            <p className="text-neutral-400 text-lg">
              Hazmat material access control (C3p).
            </p>
          </div>

          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center group">
            {/* Real HLS Stream */}
            <style>{`
                            .stream-wrapper .hls-player-container { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden; }
                            .stream-wrapper video.camera-feed { width: 100%; height: 100%; object-fit: cover; }
                            .stream-wrapper video::-webkit-media-controls { display: none !important; }
                            .stream-wrapper .stream-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); z-index: 10; color: white; }
                        `}</style>
            <div className="absolute inset-0 pointer-events-none opacity-80 mix-blend-screen scale-105 stream-wrapper">
              <HLSPlayer
                streamUrl={getStreamUrl("gate01", "high")}
                autoPlay={true}
              />
            </div>

            {/* Overlay Grid */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCBMIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')] opacity-30"></div>

            {/* Top Right Status (moved from center & replaced REC tracker) */}
            <div className="absolute top-4 right-4 z-20">
              {isActive ? (
                <div className="bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded font-bold animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-sm flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
                  POSSIBLE VIOLATION DETECTED
                </div>
              ) : (
                <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-4 py-2 rounded font-bold backdrop-blur-sm flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  REGULAR TRAFFIC
                </div>
              )}
            </div>
          </div>

          <button
            onClick={simulateTruck}
            disabled={isActive}
            className={`mt-2 py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all duration-300 ${isActive
              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
              : "bg-orange-600 hover:bg-orange-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] text-white border border-orange-500/50 active:scale-[0.98]"
              }`}
          >
            {isActive
              ? "Alert in progress..."
              : "Truck detected with hazardous cargo"}
          </button>
        </div>

        {/* Luminous Sign Section */}
        <div className="flex flex-col gap-6 items-center w-full justify-center">
          {/* Sign physical frame */}
          <div className="bg-[#0a0a0a] p-4 rounded-2xl border-4 border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center w-105 h-150 relative">
            {/* LED flashing corner lights (often seen on these signs) */}
            <div
              className={`absolute top-8 left-8 w-10 h-10 rounded-full border-4 border-[#1a1a1a] transition-colors duration-300 z-20 ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping" : "bg-amber-900/40"} `}
            ></div>
            <div
              className={`absolute top-8 right-8 w-10 h-10 rounded-full border-4 border-[#1a1a1a] transition-colors duration-300 z-20 ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping delay-150" : "bg-amber-900/40"} `}
            ></div>

            <div
              className={`absolute bottom-8 left-8 w-10 h-10 rounded-full border-4 border-[#1a1a1a] transition-colors duration-300 z-20 ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping delay-75" : "bg-amber-900/40"} `}
            ></div>
            <div
              className={`absolute bottom-8 right-8 w-10 h-10 rounded-full border-4 border-[#1a1a1a] transition-colors duration-300 z-20 ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping delay-225" : "bg-amber-900/40"} `}
            ></div>

            {/* The actual display area */}
            <div
              className={`transition-all duration-500 w-full flex-1 flex flex-col items-center justify-center mt-8 mb-4 ${isActive ? "opacity-100" : "opacity-[0.03] grayscale"}`}
            >
              {/* C3p SVG */}
              <div className="w-50 h-50 relative drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]">
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
              <div className="mt-8 flex flex-col items-center gap-2 text-center">
                <span className="text-amber-500 font-mono text-3xl font-black tracking-widest drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] leading-tight">
                  RESTRICTED
                  <br />
                  ROAD
                </span>
                <span className="text-amber-500 font-mono text-xl font-bold tracking-wider drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] mt-2">
                  RETURN TO
                  <br />
                  HIGHWAY
                </span>
              </div>
            </div>

            {/* LED matrix texture overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0icmdiYSgwLDAsMCwwLjgpIi8+Cjwvc3ZnPg==')] opacity-60 pointer-events-none rounded-2xl mix-blend-multiply"></div>

            {/* Pole (for realism) */}
            <div className="absolute -bottom-20 w-12 h-20 bg-linear-to-r from-neutral-800 via-neutral-700 to-neutral-900 rounded-b border-x-2 border-b-2 border-neutral-900 -z-10 shadow-2xl shadow-black"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
