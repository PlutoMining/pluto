export type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: [number | string, string];
};

export type PrometheusMatrixResult = {
  metric: Record<string, string>;
  values: Array<[number | string, string]>;
};

export type PrometheusResponse =
  | { status: "success"; data: { resultType: "vector"; result: PrometheusVectorResult[] } }
  | { status: "success"; data: { resultType: "matrix"; result: PrometheusMatrixResult[] } }
  | { status: "error"; error?: string; errorType?: string };

export type TimeRangeKey = "15m" | "1h" | "6h" | "24h" | "7d";

export const TIME_RANGES: Array<{ key: TimeRangeKey; label: string; seconds: number }> = [
  { key: "15m", label: "15m", seconds: 15 * 60 },
  { key: "1h", label: "1h", seconds: 60 * 60 },
  { key: "6h", label: "6h", seconds: 6 * 60 * 60 },
  { key: "24h", label: "24h", seconds: 24 * 60 * 60 },
  { key: "7d", label: "7d", seconds: 7 * 24 * 60 * 60 },
];

function pickStepSeconds(rangeSeconds: number) {
  const targetPoints = 240;
  const raw = Math.ceil(rangeSeconds / targetPoints);
  const candidates = [15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  return candidates.find((c) => c >= raw) ?? 3600;
}

export function rangeToQueryParams(rangeSeconds: number) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - rangeSeconds;
  const stepSeconds = pickStepSeconds(rangeSeconds);
  return { start, end, step: `${stepSeconds}s` };
}

async function fetchProm(url: string, params: Record<string, string>) {
  const u = new URL(url, window.location.origin);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));

  const response = await fetch(u.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const json = (await response.json()) as PrometheusResponse;
  if (!response.ok || json.status === "error") {
    const message = (json as any)?.error || `Prometheus request failed (${response.status})`;
    throw new Error(message);
  }

  return json;
}

export async function promQuery(query: string, time?: number) {
  return fetchProm("/api/prometheus/query", {
    query,
    ...(time !== undefined ? { time: String(time) } : {}),
  });
}

export async function promQueryRange(query: string, start: number, end: number, step: string) {
  return fetchProm("/api/prometheus/query_range", {
    query,
    start: String(start),
    end: String(end),
    step,
  });
}

export function vectorToNumber(result: PrometheusVectorResult[] | undefined, fallback = 0) {
  if (!result || result.length === 0) return fallback;
  const value = Number(result[0].value[1]);
  return Number.isFinite(value) ? value : fallback;
}

export function matrixToSeries(result: PrometheusMatrixResult[] | undefined) {
  if (!result) return [];

  return result.map((series) => ({
    metric: series.metric,
    points: series.values
      .map(([t, v]) => ({
        t: typeof t === "string" ? Number(t) : t,
        v: Number(v),
      }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v)),
  }));
}
