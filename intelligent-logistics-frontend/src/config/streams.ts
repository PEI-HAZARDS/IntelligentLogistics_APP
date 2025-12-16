const DEFAULT_STREAM_BASE_URL = "http://10.255.32.35:8080";
// Configuração das streams HLS
export const STREAM_CONFIG = {
  baseUrl: DEFAULT_STREAM_BASE_URL,
  gates: {
    gate01: {
      low: "/hls/low/gate1/index.m3u8",
      high: "/hls/high/gate1/index.m3u8",
    },
    gate02: {
      low: "/hls/low/gate2/index.m3u8",
      high: "/hls/high/gate2/index.m3u8",
    },
  },
} as const;

export function getStreamUrl(gate: string, quality: "low" | "high" = "high"): string {
  const gateConfig = STREAM_CONFIG.gates[gate as keyof typeof STREAM_CONFIG.gates];
  if (!gateConfig) {
    console.warn(`Gate ${gate} not found, using gate01`);
    return `${STREAM_CONFIG.baseUrl}${STREAM_CONFIG.gates.gate01[quality]}`;
  }
  return `${STREAM_CONFIG.baseUrl}${gateConfig[quality]}`;
}
