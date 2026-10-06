import { collectDefaultMetrics, Counter, Gauge, Registry } from "prom-client";

type Metrics = {
  registry: Registry;
  requestErrors: Counter<"route">;
  lastRequestAt: Gauge;
  httpRequests: Counter<"site">;
  defaultMetricsStarted: boolean;
};

// The proxy, instrumentation and route handlers are separate bundles, each
// with its own copy of this module. Keep the registry on globalThis so they
// all count into the one that /metrics serves — see the same pattern in
// lib/github.ts.
const globalForMetrics = globalThis as unknown as { __blogMetrics?: Metrics };

function createMetrics(): Metrics {
  const registry = new Registry();
  return {
    registry,
    requestErrors: new Counter({
      name: "blog_request_errors_total",
      help: "Total number of server errors captured by Next.js",
      labelNames: ["route"] as const,
      registers: [registry],
    }),
    lastRequestAt: new Gauge({
      name: "blog_last_request_timestamp_seconds",
      help: "Unix timestamp of the last captured server request",
      registers: [registry],
    }),
    httpRequests: new Counter({
      name: "blog_http_requests_total",
      help: "Requests that reached the proxy, by which site they were for",
      labelNames: ["site"] as const,
      registers: [registry],
    }),
    defaultMetricsStarted: false,
  };
}

const metrics = (globalForMetrics.__blogMetrics ??= createMetrics());

export const { registry, requestErrors, lastRequestAt, httpRequests } = metrics;

export function startDefaultMetrics() {
  if (metrics.defaultMetricsStarted) return;
  metrics.defaultMetricsStarted = true;
  collectDefaultMetrics({ register: registry });
}
