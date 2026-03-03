import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import HLSPlayer from '@/components/gate-operator/HLSPlayer';
import { useStreamScale } from '@/hooks/useStreamScale';

export default function WarningSign() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isActive, setIsActive] = useState(false);

  // Stream quality switching via dedicated WebSocket — gate01 camera
  const { streamUrl, quality: streamQuality, scalingDirection } = useStreamScale({ gateId: 1 });

  // Auto cycle: 10s on, 5s off
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isActive) {
      // Signal is active for 10 seconds, then turn off
      timeout = setTimeout(() => {
        setIsActive(false);
      }, 10000);
    } else {
      // Signal is off for 5 seconds, then turn on
      timeout = setTimeout(() => {
        setIsActive(true);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [isActive]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 xl:p-10 overflow-y-scroll ${
      isDarkMode 
        ? 'bg-neutral-900 text-white'
        : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-lg border transition-all ${
          isDarkMode
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
            <h1 className={`text-5xl xl:text-6xl font-extrabold tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
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
                            .stream-wrapper .hls-player-container { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden; }
                            .stream-wrapper video.camera-feed { width: 100%; height: 100%; object-fit: cover; }
                            .stream-wrapper video::-webkit-media-controls { display: none !important; }
                            .stream-wrapper .stream-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); z-index: 10; color: white; }
                        `}</style>
            <div className="absolute inset-0 pointer-events-none opacity-80 mix-blend-screen scale-105 stream-wrapper">
              {streamUrl ? (
                <HLSPlayer
                  streamUrl={streamUrl}
                  quality={streamQuality}
                  autoPlay={true}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                  Loading stream...
                </div>
              )}
            </div>

            {/* Overlay Grid */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCBMIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')] opacity-30"></div>

            {/* Stream Scaling Overlay */}
            <div
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              style={{
                opacity: scalingDirection ? 1 : 0,
                transition: 'opacity 0.4s ease-in-out',
              }}
            >
              <div
                className="px-8 py-4 rounded-xl font-bold text-xl tracking-wide flex items-center gap-3 backdrop-blur-md border"
                style={{
                  background: scalingDirection === 'up'
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(245, 158, 11, 0.2)',
                  borderColor: scalingDirection === 'up'
                    ? 'rgba(16, 185, 129, 0.5)'
                    : 'rgba(245, 158, 11, 0.5)',
                  color: scalingDirection === 'up' ? '#34d399' : '#fbbf24',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {scalingDirection === 'up' ? (
                    <><polyline points="18 15 12 9 6 15" /><line x1="12" y1="9" x2="12" y2="21" /></>
                  ) : (
                    <><polyline points="6 9 12 15 18 9" /><line x1="12" y1="3" x2="12" y2="15" /></>
                  )}
                </svg>
                {scalingDirection === 'up' ? 'Scaling Up — HD' : 'Scaling Down — SD'}
              </div>
            </div>

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

            {/* Top Left — Stream Quality Badge */}
            <div className="absolute top-4 left-4 z-20">
              <div
                className="px-3 py-1.5 rounded font-mono text-xs font-bold backdrop-blur-sm flex items-center gap-2 border"
                style={{
                  background: streamQuality === 'high' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                  borderColor: streamQuality === 'high' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.4)',
                  color: streamQuality === 'high' ? '#34d399' : '#94a3b8',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: streamQuality === 'high' ? '#34d399' : '#94a3b8' }}
                />
                {streamQuality === 'high' ? 'HD' : 'SD'}
              </div>
            </div>
          </div>
        </div>

        {/* Luminous Sign Section */}
        {/* Sign physical frame */}
        <div className={`p-6 rounded-2xl border-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center w-full max-w-sm aspect-2/3 relative ${
            isDarkMode
              ? 'bg-[#0a0a0a] border-neutral-800'
              : 'bg-slate-700 border-slate-600'
          }`}>
            {/* LED flashing corner lights (often seen on these signs) */}
            <div
              className={`absolute top-6 left-6 w-12 h-12 rounded-full border-4 transition-colors duration-300 z-20 ${
                isDarkMode ? 'border-[#1a1a1a]' : 'border-slate-600'
              } ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping" : "bg-amber-900/40"} `}
            ></div>
            <div
              className={`absolute top-6 right-6 w-12 h-12 rounded-full border-4 transition-colors duration-300 z-20 ${
                isDarkMode ? 'border-[#1a1a1a]' : 'border-slate-600'
              } ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping delay-150" : "bg-amber-900/40"} `}
            ></div>

            <div
              className={`absolute bottom-6 left-6 w-12 h-12 rounded-full border-4 transition-colors duration-300 z-20 ${
                isDarkMode ? 'border-[#1a1a1a]' : 'border-slate-600'
              } ${isActive ? "bg-amber-500 shadow-[0_0_30px_#f59e0b] animate-ping delay-75" : "bg-amber-900/40"} `}
            ></div>
            <div
              className={`absolute bottom-6 right-6 w-12 h-12 rounded-full border-4 transition-colors duration-300 z-20 ${
                isDarkMode ? 'border-[#1a1a1a]' : 'border-slate-600'
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
    </div>
  );
}
