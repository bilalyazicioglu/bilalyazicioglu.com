/**
 * The shape /api/infra returns. Kept apart from lib/infra.ts so the proxy and
 * the browser can import it without pulling in the Prometheus client.
 */

export const INFRA_API_PATH = "/api/infra";

/** Evenly spaced samples: `values[i]` was taken at `start + i * step` seconds. */
export type Series = {
  start: number;
  step: number;
  values: (number | null)[];
};

export type ServiceStatus = {
  id: string;
  label: string;
  role: string;
  /** null when Prometheus could not be asked, or has no target for it. */
  up: boolean | null;
};

export type InfraData = {
  /** Unix ms when this snapshot was taken on the server. */
  generatedAt: number;
  /** Whether Prometheus answered. Everything below it is null when it did not. */
  online: boolean;
  live: {
    cpuPercent: number | null;
    memoryPercent: number | null;
    loadPerCore: number | null;
    temperatureC: number | null;
    diskPercent: number | null;
    requestsPerMinute: number | null;
    requests24h: number | null;
    errors24h: number | null;
    eventLoopLagMs: number | null;
    /** Read from this process directly, so it is there even without Prometheus. */
    appMemoryBytes: number;
  };
  specs: {
    cpuModel: string | null;
    cores: number | null;
    memoryBytes: number | null;
    diskBytes: number | null;
    os: string | null;
  };
  services: ServiceStatus[];
  history: {
    cpu: Series;
    memory: Series;
    requests: Series;
    temperature: Series;
  } | null;
  deploy: {
    sha: string | null;
    subject: string | null;
    /** Unix seconds of the deployed commit. */
    committedAt: number | null;
    /** Unix ms when this process started — i.e. when the deploy went live. */
    startedAt: number;
  };
};
