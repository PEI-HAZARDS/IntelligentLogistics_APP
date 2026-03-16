import { WifiOff } from "lucide-react";

type StreamPlayerProps = {
  streamUrl: string;
};

export default function StreamPlayer({ streamUrl }: StreamPlayerProps) {
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

  return (
    <div className="stream-player-container">
      <iframe
        src={streamUrl}
        className="camera-feed"
        style={{ border: "none" }}
        allowFullScreen
        allow="autoplay"
        title="Live stream"
      />
    </div>
  );
}


