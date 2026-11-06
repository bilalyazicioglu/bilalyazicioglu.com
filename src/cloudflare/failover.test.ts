import { afterEach, describe, expect, it, vi } from "vitest";
import { OriginFailover } from "./failover";

const request = (path = "/") => new Request(`https://bilalyazicioglu.com${path}`);
afterEach(() => vi.useRealTimers());

describe("origin failover", () => {
  it("passes through genuine 404s without treating them as outages", async () => {
    const fetchOrigin = vi.fn<typeof fetch>().mockResolvedValue(new Response("missing", { status: 404 }));
    const origin = new OriginFailover(fetchOrigin);
    expect((await origin.fetch(request("/missing")))?.status).toBe(404);
    expect((await origin.fetch(request("/missing")))?.status).toBe(404);
    expect(fetchOrigin).toHaveBeenCalledTimes(2);
  });

  it("serves fallback during cooldown, and returns only after three healthy probes", async () => {
    let now = 0;
    const fetchOrigin = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("tunnel down", { status: 530 }))
      .mockImplementation(async () => new Response("home"));
    const origin = new OriginFailover(fetchOrigin, () => now);
    expect(await origin.fetch(request())).toBeNull();
    expect(await origin.fetch(request())).toBeNull();
    expect(fetchOrigin).toHaveBeenCalledTimes(1);
    for (const time of [30_000, 60_000]) {
      now = time;
      expect(await origin.fetch(request())).toBeNull();
    }
    now = 90_000;
    expect(await (await origin.fetch(request()))?.text()).toBe("home");
    expect(fetchOrigin.mock.calls.map(([req]) => (req as Request).method)).toEqual(["GET", "HEAD", "HEAD", "HEAD", "GET"]);
  });

  it("resets recovery when another health check fails", async () => {
    let now = 0;
    const fetchOrigin = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockImplementation(async () => new Response("home"));
    const origin = new OriginFailover(fetchOrigin, () => now);
    expect(await origin.fetch(request())).toBeNull();
    for (const time of [30_000, 60_000, 90_000, 120_000]) {
      now = time;
      expect(await origin.fetch(request())).toBeNull();
    }
    now = 150_000;
    expect((await origin.fetch(request()))?.status).toBe(200);
  });

  it("bounds the wait for an unreachable origin", async () => {
    vi.useFakeTimers();
    const fetchOrigin = vi.fn<typeof fetch>().mockImplementation((req) => new Promise((_resolve, reject) => {
      (req as Request).signal.addEventListener("abort", () => reject(new Error("timeout")));
    }));
    const origin = new OriginFailover(fetchOrigin);
    const pending = origin.fetch(request());
    await vi.advanceTimersByTimeAsync(2_500);
    expect(await pending).toBeNull();
    expect(await origin.fetch(request())).toBeNull();
    expect(fetchOrigin).toHaveBeenCalledTimes(1);
  });

  it("never retries a write, preserving its body and upstream failure response", async () => {
    const fetchOrigin = vi.fn<typeof fetch>().mockImplementation(async (req) => {
      expect(await (req as Request).text()).toBe("payload");
      return new Response("write failed", { status: 500 });
    });
    const origin = new OriginFailover(fetchOrigin);
    const response = await origin.fetch(new Request("https://bilalyazicioglu.com/api/views/post", {
      method: "POST", body: "payload",
    }));
    expect(response?.status).toBe(500);
    expect(fetchOrigin).toHaveBeenCalledTimes(1);
  });
});
