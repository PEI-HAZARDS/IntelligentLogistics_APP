import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";

type HLSPlayerProps = {
  streamUrl: string;
  quality?: "low" | "high";
  autoPlay?: boolean;
};

export default function HLSPlayer({
  streamUrl,
  quality = "high",
  autoPlay = true,
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "playing">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const connectStream = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clear previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus("loading");
    setErrorMessage("");
    retryCountRef.current = 0;

    // No URL provided — show error immediately
    if (!streamUrl) {
      setStatus("error");
      setErrorMessage("Stream not configured");
      return;
    }

    console.log(`[${quality.toUpperCase()}] Connecting to:`, streamUrl);

    // Connection timeout — if not ready in 15s, show error
    timeoutRef.current = setTimeout(() => {
      setStatus("error");
      setErrorMessage("Connection timed out");
    }, 15000);

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        maxFragLookUpTolerance: 0.2,
        manifestLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 10000,
            maxLoadTimeMs: 10000,
            timeoutRetry: { maxNumRetry: 2, retryDelayMs: 1000, maxRetryDelayMs: 0 },
            errorRetry: { maxNumRetry: 2, retryDelayMs: 1000, maxRetryDelayMs: 4000 },
          },
        },
        playlistLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 10000,
            maxLoadTimeMs: 10000,
            timeoutRetry: { maxNumRetry: 2, retryDelayMs: 0, maxRetryDelayMs: 0 },
            errorRetry: { maxNumRetry: 2, retryDelayMs: 1000, maxRetryDelayMs: 4000 },
          },
        },
        fragLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 15000,
            maxLoadTimeMs: 15000,
            timeoutRetry: { maxNumRetry: 3, retryDelayMs: 0, maxRetryDelayMs: 0 },
            errorRetry: { maxNumRetry: 3, retryDelayMs: 1000, maxRetryDelayMs: 4000 },
          },
        },
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus("ready");
        if (autoPlay) {
          setTimeout(async () => {
            try {
              video.muted = true;
              await video.play();
              setStatus("playing");
            } catch {
              setStatus("ready");
            }
          }, 500);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          retryCountRef.current++;

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retryCountRef.current <= 2) {
            hls.recoverMediaError();
            return;
          }

          setStatus("error");
          setErrorMessage(
            data.type === Hls.ErrorTypes.NETWORK_ERROR
              ? "Stream unavailable"
              : "Stream error"
          );
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        retryCountRef.current = 0;
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadeddata", () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus("ready");
        if (autoPlay) video.play().catch(() => { });
      }, { once: true });
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus("error");
      setErrorMessage("Browser does not support HLS");
    }
  }, [streamUrl, quality, autoPlay]);

  useEffect(() => {
    connectStream();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [connectStream]);

  return (
    <div className="hls-player-container">
      <video
        ref={videoRef}
        className="camera-feed"
        controls
        muted
        playsInline
      />
      {status === "loading" && (
        <div className="stream-overlay loading">
          <Loader2 size={24} className="animate-spin" />
          <span>Connecting...</span>
        </div>
      )}

      {status === "error" && (
        <div className="stream-overlay error">
          <WifiOff size={32} />
          <span>{errorMessage}</span>
          <button className="retry-button" onClick={connectStream}>
            <RefreshCw size={16} />
            Reconnect
          </button>
        </div>
      )}
    </div>
  );
}
