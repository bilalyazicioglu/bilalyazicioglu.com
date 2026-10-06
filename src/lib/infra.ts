/**
 * Live numbers for /infra, read from the Prometheus that already scrapes this
 * host.
 *
 * Prometheus stays private: the blog container reaches it over the compose
 * network, and nothing a visitor sends ends up in a query. Every query is a
 * constant below, and answers are cached on globalThis — live values for a few
 * seconds, history and specs for a minute — so a thousand open tabs cost
 * Prometheus the same as one. Failures are cached too, for the same reason.
 *
 * Deliberately absent: hostnames, IPs, ports, image versions, kernel version
 * and host uptime. The last two say how long ago the machine was patched.
 */

import type { InfraData, Series, ServiceStatus } from "./infra-types";

const LIVE_TTL_MS = 5_000;
const SLOW_TTL_MS = 60_000;
const QUERY_TIMEOUT_MS = 2_000;
const HISTORY_SECONDS = 24 * 60 * 60;
const HISTORY_STEP_SECONDS = 15 * 60;

function prometheusUrl(): string {
  return (process.env.PROMETHEUS_URL ?? "http://prometheus:9090").replace(/\/+$/, "");
}

const CPU = '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[1m])))';
const MEMORY = "100 * (1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes))";
const TEMPERATURE = "max(node_hwmon_temp_celsius) or max(node_thermal_zone_temp)";
const ROOT_FS = 'mountpoint="/",fstype!="rootfs"';

const LIVE_QUERIES = {
  cpuPercent: CPU,
  memoryPercent: MEMORY,
  loadPerCore: 'sum(node_load1) / count(node_cpu_seconds_total{mode="idle"})',
  temperatureC: TEMPERATURE,
  diskPercent: `100 * (1 - sum(node_filesystem_avail_bytes{${ROOT_FS}}) / sum(node_filesystem_size_bytes{${ROOT_FS}}))`,
  requestsPerMinute: "sum(rate(blog_http_requests_total[5m])) * 60 or vector(0)",
  requests24h: "sum(increase(blog_http_requests_total[24h])) or vector(0)",
  errors24h: "sum(increase(blog_request_errors_total[24h])) or vector(0)",
  eventLoopLagMs: 'max(nodejs_eventloop_lag_p99_seconds{job="blog"}) * 1000',
} as const;

const HISTORY_QUERIES = {
  cpu: '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[15m])))',
  memory: MEMORY,
  requests: "sum(rate(blog_http_requests_total[15m])) * 60",
  temperature: TEMPERATURE,
} as const;

/** Prometheus job → what the page calls it. Order is display order. */
const SERVICES: Omit<ServiceStatus, "up">[] = [
  { id: "blog", label: "Next.js app", role: "Renders this page" },
  { id: "prometheus", label: "Prometheus", role: "Metrics, kept 30 days" },
  { id: "node", label: "Node exporter", role: "Reads the hardware" },
  { id: "loki", label: "Loki", role: "Stores logs" },
  { id: "promtail", label: "Promtail", role: "Ships container logs" },
  { id: "grafana", label: "Grafana", role: "Private dashboards" },
];

type Sample = { metric: Record<string, string>; value: [number, string] };
type RangeSample = { metric: Record<string, string>; values: [number, string][] };

async function prometheus<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const url = `${prometheusUrl()}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`prometheus ${res.status}`);
  const body = (await res.json()) as { status: string; data?: { result?: T[] } };
  if (body.status !== "success") throw new Error("prometheus query failed");
  return body.data?.result ?? [];
}

const query = (q: string) => prometheus<Sample>("/api/v1/query", { query: q });

function toNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function scalar(q: string): Promise<number | null> {
  const [first] = await query(q);
  return toNumber(first?.value[1]);
}

async function series(q: string, end: number): Promise<Series> {
  const start = end - HISTORY_SECONDS;
  const [first] = await prometheus<RangeSample>("/api/v1/query_range", {
    query: q,
    start: String(start),
    end: String(end),
    step: String(HISTORY_STEP_SECONDS),
  });
  const byTime = new Map((first?.values ?? []).map(([t, v]) => [Math.round(t), toNumber(v)]));
  const values: (number | null)[] = [];
  for (let t = start; t <= end; t += HISTORY_STEP_SECONDS) {
    values.push(byTime.get(t) ?? null);
  }
  return { start, step: HISTORY_STEP_SECONDS, values };
}

/** "AMD Ryzen 3 3200U with Radeon Vega Mobile Gfx" → "AMD Ryzen 3 3200U". */
export function cpuName(raw: string): string {
  return raw
    .replace(/\((R|TM)\)/gi, "")
    .replace(/\s+with\s+Radeon.*$/i, "")
    .replace(/\s+CPU\s+@.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Live = Omit<InfraData["live"], "appMemoryBytes"> & { services: ServiceStatus[] };
type Slow = Pick<InfraData, "specs" | "history">;

async function fetchLive(): Promise<Live> {
  const keys = Object.keys(LIVE_QUERIES) as (keyof typeof LIVE_QUERIES)[];
  const [values, up] = await Promise.all([
    Promise.all(keys.map((key) => scalar(LIVE_QUERIES[key]))),
    query("up"),
  ]);
  const upByJob = new Map(up.map((s) => [s.metric.job, s.value[1] === "1"]));
  return {
    ...(Object.fromEntries(keys.map((key, i) => [key, values[i]])) as Omit<Live, "services">),
    services: SERVICES.map((service) => ({ ...service, up: upByJob.get(service.id) ?? null })),
  };
}

async function fetchSlow(): Promise<Slow> {
  const end = Math.floor(Date.now() / 1000 / HISTORY_STEP_SECONDS) * HISTORY_STEP_SECONDS;
  const [cpuInfo, osInfo, cores, memoryBytes, diskBytes, cpu, memory, requests, temperature] =
    await Promise.all([
      query("count by (model_name) (node_cpu_info)"),
      query("node_os_info"),
      scalar('count(node_cpu_seconds_total{mode="idle"})'),
      scalar("sum(node_memory_MemTotal_bytes)"),
      scalar(`sum(node_filesystem_size_bytes{${ROOT_FS}})`),
      series(HISTORY_QUERIES.cpu, end),
      series(HISTORY_QUERIES.memory, end),
      series(HISTORY_QUERIES.requests, end),
      series(HISTORY_QUERIES.temperature, end),
    ]);
  // Name and major.minor only: a point release would date the last upgrade.
  const os = osInfo[0]?.metric;
  return {
    specs: {
      cpuModel: cpuInfo[0]?.metric.model_name ? cpuName(cpuInfo[0].metric.model_name) : null,
      cores,
      memoryBytes,
      diskBytes,
      os: os?.name ? [os.name, os.version_id?.match(/^\d+(\.\d+)?/)?.[0]].filter(Boolean).join(" ") : null,
    },
    history: { cpu, memory, requests, temperature },
  };
}

type Cached<T> = { at: number; value: T | null; inflight: Promise<T | null> | null };

const globalForInfra = globalThis as unknown as {
  __infraCache?: { live: Cached<Live>; slow: Cached<Slow> };
};

function cache() {
  return (globalForInfra.__infraCache ??= {
    live: { at: 0, value: null, inflight: null },
    slow: { at: 0, value: null, inflight: null },
  });
}

/** Answers from cache while fresh; otherwise one shared fetch for every caller. */
function cached<T>(entry: Cached<T>, ttl: number, load: () => Promise<T>): Promise<T | null> {
  if (Date.now() - entry.at < ttl) return Promise.resolve(entry.value);
  entry.inflight ??= load()
    .catch(() => null)
    .then((value) => {
      entry.value = value;
      entry.at = Date.now();
      entry.inflight = null;
      return value;
    });
  return entry.inflight;
}

const startedAt = Date.now() - Math.round(process.uptime() * 1000);

export async function getInfra(): Promise<InfraData> {
  const state = cache();
  const [live, slow] = await Promise.all([
    cached(state.live, LIVE_TTL_MS, fetchLive),
    cached(state.slow, SLOW_TTL_MS, fetchSlow),
  ]);
  const committedAt = Number(process.env.GIT_COMMIT_TIME);

  return {
    generatedAt: Date.now(),
    online: live !== null,
    live: {
      cpuPercent: live?.cpuPercent ?? null,
      memoryPercent: live?.memoryPercent ?? null,
      loadPerCore: live?.loadPerCore ?? null,
      temperatureC: live?.temperatureC ?? null,
      diskPercent: live?.diskPercent ?? null,
      requestsPerMinute: live?.requestsPerMinute ?? null,
      requests24h: live?.requests24h ?? null,
      errors24h: live?.errors24h ?? null,
      eventLoopLagMs: live?.eventLoopLagMs ?? null,
      appMemoryBytes: process.memoryUsage().rss,
    },
    specs: slow?.specs ?? { cpuModel: null, cores: null, memoryBytes: null, diskBytes: null, os: null },
    services: live?.services ?? SERVICES.map((service) => ({ ...service, up: null })),
    history: slow?.history ?? null,
    deploy: {
      sha: process.env.GIT_SHA?.trim() || null,
      subject: process.env.GIT_SUBJECT?.trim() || null,
      committedAt: Number.isFinite(committedAt) && committedAt > 0 ? committedAt : null,
      startedAt,
    },
  };
}

/** Test hook: forget cached answers. */
export function resetInfraCache() {
  delete globalForInfra.__infraCache;
}
