const TIMEOUT_MS = 2_500;
const PROBE_INTERVAL_MS = 30_000;
const RECOVERY_SUCCESSES = 3;

type State = { down: boolean; nextProbe: number; successes: number; probing: boolean };

/** Request-driven circuit breaker. State is local to each Cloudflare isolate. */
export class OriginFailover {
  private states = new Map<string, State>();

  constructor(
    private fetchOrigin: typeof fetch = (request, init) => fetch(request, init),
    private now = () => Date.now(),
  ) {}

  private async timedFetch(request: Request): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      // Clear the deadline once headers arrive, so large downloads can finish.
      return await this.fetchOrigin(new Request(request, { signal: controller.signal, redirect: "manual" }));
    } finally {
      clearTimeout(timer);
    }
  }

  async fetch(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    let state = this.states.get(url.hostname);
    if (!state) {
      state = { down: false, nextProbe: 0, successes: 0, probing: false };
      this.states.set(url.hostname, state);
    }
    if (state.down) {
      if (!state.probing && this.now() >= state.nextProbe) {
        state.probing = true;
        state.nextProbe = this.now() + PROBE_INTERVAL_MS;
        try {
          // A same-zone subrequest bypasses this route and reaches Tunnel DNS.
          const health = await this.timedFetch(new Request(new URL("/", url), {
            method: "HEAD",
            headers: { Accept: "text/html", "Cache-Control": "no-cache" },
          }));
          const healthy = health.status >= 200 && health.status < 400;
          state.successes = healthy ? state.successes + 1 : 0;
          if (state.successes >= RECOVERY_SUCCESSES) state.down = false;
          await health.body?.cancel();
        } catch {
          state.successes = 0;
        } finally {
          state.probing = false;
        }
      }
      if (state.down) return null;
    }
    try {
      const response = await this.timedFetch(request);
      if (response.status < 500) return response;
      state.down = true;
      state.successes = 0;
      state.nextProbe = this.now() + PROBE_INTERVAL_MS;
      if (!["GET", "HEAD"].includes(request.method)) return response;
      await response.body?.cancel();
    } catch {
      state.down = true;
      state.successes = 0;
      state.nextProbe = this.now() + PROBE_INTERVAL_MS;
    }
    return null;
  }
}
