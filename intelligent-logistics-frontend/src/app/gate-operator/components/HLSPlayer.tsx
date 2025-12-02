import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

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
      video.muted = true; // Garantir que está muted para autoplay
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

    // Limpar instância anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setStatus("loading");
    setErrorMessage("");

    console.log(`[${quality.toUpperCase()}] Connecting to:`, streamUrl);

    // Verificar suporte HLS.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: true,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        maxFragLookUpTolerance: 0.2,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
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
              setErrorMessage("Erro de rede - Stream não disponível");
              setStatus("error");
              console.log("Attempting to recover from network error...");
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 3000);
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMessage("Erro de mídia - A recuperar...");
              console.log("Attempting to recover from media error...");
              hls.recoverMediaError();
              break;

            default:
              setStatus("error");
              setErrorMessage(`Stream indisponível: ${data.details}`);
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
      // Suporte nativo (Safari)
      console.log(`[${quality.toUpperCase()}] Using native HLS`);
      video.src = streamUrl;
      setStatus("ready");
      
      if (autoPlay) {
        setTimeout(() => startPlayback(), 500);
      }
    } else {
      setStatus("error");
      setErrorMessage("Browser não suporta streaming HLS");
    }

    // Event listeners do vídeo
    const handleLoadedData = () => {
      console.log(`[${quality.toUpperCase()}] Video loaded`);
    };

    const handleError = (e: Event) => {
      console.error(`[${quality.toUpperCase()}] Video error:`, e);
      setStatus("error");
      setErrorMessage("Erro ao carregar stream");
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
          <span>⏳ A conectar à stream...</span>
        </div>
      )}

      {status === "error" && (
        <div className="stream-overlay error">
          <div>❌ {errorMessage}</div>
          <button className="retry-button" onClick={() => window.location.reload()}>
            🔄 Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
}
