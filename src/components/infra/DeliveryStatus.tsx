"use client";

import { useEffect, useState } from "react";
import type { DeliveryStatus as Status } from "@/lib/delivery-status";
import { ManRows, ManSection, manLink } from "@/components/Man";

export function DeliveryStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function update() {
      if (document.visibilityState === "visible") {
        try {
          const response = await fetch("/api/status", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]) });
          if (!response.ok) throw new Error("Status unavailable");
          const next: Status = await response.json();
          if (!["homeserver", "static-fallback"].includes(next.backend) || !next.release) throw new Error("Invalid status");
          if (!cancelled) { setStatus(next); setStale(false); }
        } catch { if (!cancelled) setStale(true); }
      }
      if (!cancelled) timer = setTimeout(update, 60_000);
    }
    void update();
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, []);
  const timestamp = (value: string | null) => value ? new Date(value).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC") : "not recorded";
  const sha = status?.release.sha;
  return (
    <ManSection title="SERVING THIS REQUEST">
      <p className="mb-3 max-w-[64ch] text-muted">
        {status ? status.backend === "homeserver"
          ? "The homeserver is answering. Cloudflare keeps a static snapshot available if the origin fails."
          : "Cloudflare is serving the static snapshot. Editing and live homelab metrics are unavailable on this backend."
          : "Checking the backend for this browser. The page remains available if this check fails."}
      </p>
      <ManRows>
        <span>backend</span><span>{status?.backend ?? "unknown"}</span>
        <span>release</span><span>{sha ? <a className={manLink} href={`https://github.com/bilalyazicioglu/bilalyazicioglu.com/commit/${sha}`}>{sha.slice(0, 7)}</a> : "not recorded"}</span>
        <span>built</span><span>{timestamp(status?.release.builtAt ?? null)}</span>
        <span>activated</span><span>{timestamp(status?.release.activatedAt ?? null)}</span>
        <span>checked</span><span>{status ? timestamp(status.checkedAt) : "pending"}{stale ? " (last reading; refresh failed)" : ""}</span>
      </ManRows>
      <p className="mt-3 max-w-[64ch] text-[13px] text-muted">One reading per minute while visible. This describes this request, not a global uptime guarantee.</p>
    </ManSection>
  );
}
