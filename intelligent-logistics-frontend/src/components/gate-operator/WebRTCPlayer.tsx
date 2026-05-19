import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";

type WebRTCPlayerProps = {
  url: string;
  autoPlay?: boolean;
  onFail?: (reason: string) => void;
  iceTimeoutMs?: number;
};

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 2000): Promise<void> {
  if (pc.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    const onChange = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", onChange);
    setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }, timeoutMs);
  });
}

export default function WebRTCPlayer({
  url,
  autoPlay = true,
  onFail,
  iceTimeoutMs = 6000,
}: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    setErrored(false);

    const abort = new AbortController();
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.addTransceiver("video", { direction: "recvonly" });

    let sessionUrl: string | null = null;
    let connected = false;
    let cancelled = false;
    let iceTimer: ReturnType<typeof setTimeout> | null = null;

    const fail = (reason: string) => {
      if (cancelled || connected) return;
      cancelled = true;
      console.warn("[WebRTCPlayer] fail:", reason);
      try { pc.close(); } catch { /* noop */ }
      setErrored(true);
      onFail?.(reason);
    };

    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (stream && video.srcObject !== stream) {
        video.srcObject = stream;
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "connected" || s === "completed") {
        connected = true;
        if (iceTimer) clearTimeout(iceTimer);
      } else if (s === "failed" || s === "disconnected" || s === "closed") {
        fail(`ice ${s}`);
      }
    };

    iceTimer = setTimeout(() => fail("ice timeout"), iceTimeoutMs);

    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGatheringComplete(pc, 2000);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            ...authHeader(),
          },
          body: pc.localDescription?.sdp ?? offer.sdp ?? "",
          signal: abort.signal,
        });

        if (!res.ok) {
          fail(`whep ${res.status}`);
          return;
        }

        const loc = res.headers.get("Location");
        if (loc) sessionUrl = new URL(loc, url).toString();

        const answerSdp = await res.text();
        if (cancelled) return;
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        fail(`handshake error: ${(err as Error).message}`);
      }
    })();

    return () => {
      cancelled = true;
      if (iceTimer) clearTimeout(iceTimer);
      abort.abort();
      if (sessionUrl) {
        fetch(sessionUrl, { method: "DELETE", headers: authHeader(), keepalive: true }).catch(() => { /* noop */ });
      }
      try { pc.close(); } catch { /* noop */ }
    };
  }, [url, onFail, iceTimeoutMs]);

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
