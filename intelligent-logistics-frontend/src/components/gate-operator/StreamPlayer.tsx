import { WifiOff } from "lucide-react";

type StreamPlayerProps = {
  streamUrl: string;
  quality?: "low" | "high";
  autoPlay?: boolean;
};

export default function StreamPlayer({ streamUrl, autoPlay = true }: StreamPlayerProps) {
  if (!streamUrl) {
    return (
      <div className="stream-player-container">
        <div className="stream-overlay error">
          <WifiOff size={32} />
          <span>Stream unavailable</span>
        </div>
      </div>
    );
  }

  const iframeSrc = (() => {
    if (!autoPlay) return streamUrl;

    // Prefer query-driven autoplay when supported by the stream endpoint.
    try {
      const url = new URL(streamUrl, window.location.origin);
      if (!url.searchParams.has("autoplay")) {
        url.searchParams.set("autoplay", "1");
      }
      return url.toString();
    } catch {
      return streamUrl;
    }
  })();

  return (
    <div className="stream-player-container">
      <iframe
        src={iframeSrc}
        className="camera-feed"
        style={{ border: "none" }}
        allowFullScreen
        allow="fullscreen; picture-in-picture"
        title="Live stream"
      />
    </div>
  );
}


