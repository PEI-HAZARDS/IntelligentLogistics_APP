// Configuração das streams HLS
export const STREAM_CONFIG = {
  baseUrl: "http://10.255.32.35:8080",
  gates: {
    gate01: {
      low: "/hls/low/gate01/index.m3u8",
      high: "/hls/high/gate01/index.m3u8",
    },
    gate02: {
      low: "/hls/low/gate02/index.m3u8",
      high: "/hls/high/gate02/index.m3u8",
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
