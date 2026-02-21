import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

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
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "playing">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const startPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = true; // Ensure it is muted for autoplay
      await video.play();
      setStatus("playing");
      console.log(`[${quality.toUpperCase()}] Playback started`);
    } catch (err) {
      console.warn("Play failed:", err);
      setStatus("ready");
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clear previous instance if it exists
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setStatus("loading");
    setErrorMessage("");

    console.log(`[${quality.toUpperCase()}] Connecting to:`, streamUrl);

    // Check HLS.js support
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
            timeoutRetry: { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 0 },
            errorRetry:   { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
          },
        },
        playlistLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 10000,
            maxLoadTimeMs: 10000,
            timeoutRetry: { maxNumRetry: 4, retryDelayMs: 0, maxRetryDelayMs: 0 },
            errorRetry:   { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
          },
        },
        fragLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 20000,
            maxLoadTimeMs: 20000,
            timeoutRetry: { maxNumRetry: 6, retryDelayMs: 0, maxRetryDelayMs: 0 },
            errorRetry:   { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
          },
        },
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        console.log(`[${quality.toUpperCase()}] Loading manifest...`);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("ready");
        console.log(`[${quality.toUpperCase()}] Manifest parsed, stream ready`);

        if (autoPlay) {
          setTimeout(() => startPlayback(), 500);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error(`[${quality.toUpperCase()}] HLS Error:`, data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMessage("Network Error - Stream unavailable");
              setStatus("error");
              console.log("Attempting to recover from network error...");
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 3000);
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMessage("Media Error - Recovering...");
              console.log("Attempting to recover from media error...");
              hls.recoverMediaError();
              break;

            default:
              setStatus("error");
              setErrorMessage(`Stream unavailable: ${data.details}`);
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (status === "error") {
          setStatus("ready");
          setErrorMessage("");
        }
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native support (Safari)
      console.log(`[${quality.toUpperCase()}] Using native HLS`);
      video.src = streamUrl;
      setStatus("ready");

      if (autoPlay) {
        setTimeout(() => startPlayback(), 500);
      }
    } else {
      setStatus("error");
      setErrorMessage("Browser does not support HLS streaming");
    }

    // Video event listeners
    const handleLoadedData = () => {
      console.log(`[${quality.toUpperCase()}] Video loaded`);
    };

    const handleError = (e: Event) => {
      console.error(`[${quality.toUpperCase()}] Video error:`, e);
      setStatus("error");
      setErrorMessage("Error loading stream");
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);

    // Cleanup
    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, quality]);

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
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={20} className="animate-spin" /> Connecting to stream...
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="stream-overlay error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <AlertCircle size={20} /> {errorMessage}
          </div>
          <button className="retry-button" onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
