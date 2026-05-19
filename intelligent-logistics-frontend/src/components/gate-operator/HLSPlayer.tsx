import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { WifiOff } from "lucide-react";

type HLSPlayerProps = {
  url: string;
  autoPlay?: boolean;
  onFatalError?: () => void;
};

export default function HLSPlayer({ url, autoPlay = true, onFatalError }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    setErrored(false);

    const canPlayNatively = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    if (canPlayNatively) {
      video.src = url;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (!Hls.isSupported()) {
      console.error("[HLSPlayer] hls.js not supported in this browser");
      setErrored(true);
      onFatalError?.();
      return;
    }

    const hls = new Hls({
      lowLatencyMode: true,
      manifestLoadingMaxRetry: 4,
      manifestLoadingRetryDelay: 1000,
      manifestLoadingMaxRetryTimeout: 8000,
      xhrSetup: (xhr) => {
        const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      },
    });
    hlsRef.current = hls;

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (!data.fatal) return;
      console.error("[HLSPlayer] fatal hls.js error", data);
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          setErrored(true);
          onFatalError?.();
          hls.destroy();
          hlsRef.current = null;
      }
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [url, onFatalError]);

  if (errored || !url) {
    return (
      <div className="stream-player-container">
        <div className="stream-overlay error">
          <WifiOff size={32} />
          <span>Stream unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stream-player-container">
      <video
        ref={videoRef}
        className="camera-feed"
        autoPlay={autoPlay}
        muted
        playsInline
        controls={false}
      />
    </div>
  );
}
