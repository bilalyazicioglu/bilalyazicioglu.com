import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cpuName, getInfra, resetInfraCache } from "./infra";

type Handler = (query: string, path: string) => unknown;

/** Stands in for Prometheus: answers each query through `handler`, records every call. */
function fakePrometheus(handler: Handler) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input);
      const query = url.searchParams.get("query") ?? "";
      calls.push(query);
      const result = handler(query, url.pathname);
      return new Response(JSON.stringify({ status: "success", data: { result } }));
    })
  );
  return calls;
}

const vector = (value: number, metric: Record<string, string> = {}) => [
  { metric, value: [0, String(value)] },
];

function healthyHost(query: string, path: string): unknown {
  if (path.endsWith("query_range")) {
    return [{ metric: {}, values: [[Math.floor(Date.now() / 1000 / 900) * 900, "42"]] }];
  }
  if (query === "up") {
    return ["blog", "prometheus", "node", "loki", "promtail"].map((job) => ({
      metric: { job },
      value: [0, job === "loki" ? "0" : "1"],
    }));
  }
  if (query.startsWith("count by (model_name)")) {
    return vector(4, { model_name: "AMD Ryzen 3 3200U with Radeon Vega Mobile Gfx" });
  }
  if (query === "node_os_info") return vector(1, { name: "Ubuntu", version_id: "24.04.1" });
  if (query.includes("node_cpu_seconds_total") && query.startsWith("100")) return vector(12.5);
  if (query.startsWith("count(node_cpu_seconds_total")) return vector(4);
  if (query.includes("MemTotal_bytes)") && !query.startsWith("100")) return vector(16 * 1024 ** 3);
  return vector(1);
}

beforeEach(() => {
  resetInfraCache();
  vi.stubEnv("PROMETHEUS_URL", "http://prometheus.test:9090/");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("getInfra", () => {
  it("assembles live values, specs, services and history", async () => {
    fakePrometheus(healthyHost);
    const data = await getInfra();

    expect(data.online).toBe(true);
    expect(data.live.cpuPercent).toBe(12.5);
    expect(data.specs).toMatchObject({ cpuModel: "AMD Ryzen 3 3200U", cores: 4, os: "Ubuntu 24.04" });
    expect(data.services.find((s) => s.id === "loki")?.up).toBe(false);
    expect(data.services.find((s) => s.id === "blog")?.up).toBe(true);
    // A job Prometheus has no target for is unknown; a stopped one reports up=0.
    expect(data.services.find((s) => s.id === "grafana")?.up).toBeNull();
    expect(data.history?.cpu.values).toHaveLength(97);
    expect(data.history?.cpu.values.at(-1)).toBe(42);
    expect(data.history?.cpu.values[0]).toBeNull();
  });

  it("sends nothing but its own fixed queries to the configured Prometheus", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        urls.push(input);
        return new Response(JSON.stringify({ status: "success", data: { result: [] } }));
      })
    );
    await getInfra();
    expect(urls.every((u) => u.startsWith("http://prometheus.test:9090/api/v1/query"))).toBe(true);
  });

  it("asks Prometheus once per window, however many visitors there are", async () => {
    const calls = fakePrometheus(healthyHost);
    await Promise.all(Array.from({ length: 50 }, () => getInfra()));
    const first = calls.length;

    await getInfra();
    expect(calls.length).toBe(first);

    vi.setSystemTime(Date.now() + 5_001);
    await getInfra();
    const liveOnly = calls.length - first;
    expect(liveOnly).toBeGreaterThan(0);
    expect(liveOnly).toBeLessThan(first);
  });

  it("degrades to an offline snapshot when Prometheus is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const data = await getInfra();

    expect(data.online).toBe(false);
    expect(data.live.cpuPercent).toBeNull();
    expect(data.live.appMemoryBytes).toBeGreaterThan(0);
    expect(data.history).toBeNull();
    expect(data.services.every((s) => s.up === null)).toBe(true);
  });

  it("caches a failure too, so an outage isn't retried on every request", async () => {
    const fetchMock = vi.fn(async () => new Response("bad gateway", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    await getInfra();
    const afterFirst = fetchMock.mock.calls.length;
    await getInfra();
    expect(fetchMock.mock.calls.length).toBe(afterFirst);
  });

  it("reports the deployed commit from the build environment", async () => {
    fakePrometheus(healthyHost);
    vi.stubEnv("GIT_SHA", "e4af379abc");
    vi.stubEnv("GIT_SUBJECT", "ci: add Vitest suite");
    vi.stubEnv("GIT_COMMIT_TIME", "1791273600");
    expect((await getInfra()).deploy).toMatchObject({
      sha: "e4af379abc",
      subject: "ci: add Vitest suite",
      committedAt: 1791273600,
    });

    vi.stubEnv("GIT_SHA", "");
    vi.stubEnv("GIT_COMMIT_TIME", "");
    expect((await getInfra()).deploy).toMatchObject({ sha: null, committedAt: null });
  });
});

describe("cpuName", () => {
  it.each([
    ["AMD Ryzen 3 3200U with Radeon Vega Mobile Gfx", "AMD Ryzen 3 3200U"],
    ["Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz", "Intel Core i5-8250U"],
    ["Intel(R)  N100", "Intel N100"],
  ])("shortens %j", (raw, short) => {
    expect(cpuName(raw)).toBe(short);
  });
});
