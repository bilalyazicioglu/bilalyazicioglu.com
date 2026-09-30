export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDefaultMetrics } = await import("@/lib/metrics");
    const { startStarSyncScheduler } = await import("@/lib/github");
    startDefaultMetrics();
    startStarSyncScheduler();
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: { [key: string]: string | string[] } },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "proxy";
    renderSource?:
      | "react-server-components"
      | "react-server-components-payload"
      | "server-rendering";
    revalidateReason?: "on-demand" | "stale";
    renderType?: "dynamic" | "dynamic-resume";
  }
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { requestErrors, lastRequestAt } = await import("@/lib/metrics");
  requestErrors.inc({ route: context.routePath });
  lastRequestAt.setToCurrentTime();
  console.error("[metrics] server error:", err);
}
