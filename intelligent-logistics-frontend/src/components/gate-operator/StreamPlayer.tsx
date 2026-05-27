import { useCallback, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import HLSPlayer from "./HLSPlayer";
import WebRTCPlayer from "./WebRTCPlayer";

type StreamPlayerProps = {
  hlsUrl: string | null;
  webrtcUrl?: string | null;
  quality?: "low" | "high";
  autoPlay?: boolean;
};

type Mode = "webrtc" | "hls";

function preferredMode(webrtcUrl: string | null | undefined, _hlsUrl: string | null): Mode {
  const forced = typeof window !== "undefined" ? window.localStorage.getItem("stream.mode") : null;
  if (forced === "hls") return "hls";
  if (forced === "webrtc") return "webrtc";
  return webrtcUrl ? "webrtc" : "hls";
}

export default function StreamPlayer({ hlsUrl, webrtcUrl, autoPlay = true }: StreamPlayerProps) {
  const [mode, setMode] = useState<Mode>(() => preferredMode(webrtcUrl, hlsUrl));

  useEffect(() => {
    setMode(preferredMode(webrtcUrl, hlsUrl));
  }, [webrtcUrl, hlsUrl]);

  const handleWebRTCFail = useCallback(() => {
    if (hlsUrl) setMode("hls");
  }, [hlsUrl]);

  if (!hlsUrl && !webrtcUrl) {
    return (
      <div className="stream-player-container">
        <div className="stream-overlay error">
          <WifiOff size={32} />
          <span>Stream unavailable</span>
        </div>
      </div>
    );
  }

  if (mode === "webrtc" && webrtcUrl) {
    return (
      <WebRTCPlayer
        key={`webrtc:${webrtcUrl}`}
        url={webrtcUrl}
        autoPlay={autoPlay}
        onFail={handleWebRTCFail}
      />
    );
  }

  if (hlsUrl) {
    return <HLSPlayer key={`hls:${hlsUrl}`} url={hlsUrl} autoPlay={autoPlay} />;
  }

  return (
    <div className="stream-player-container">
      <div className="stream-overlay error">
        <WifiOff size={32} />
        <span>Stream unavailable</span>
      </div>
    </div>
  );
}
