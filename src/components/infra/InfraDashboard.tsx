"use client";

import { useEffect, useState } from "react";
import { INFRA_API_PATH, type InfraData, type Series } from "@/lib/infra-types";
import { siteConfig } from "@/site.config";
import { ManRows, ManSection, manLink } from "@/components/Man";
import { Sparkline } from "./Sparkline";
import { formatAgo, formatBytes, formatNumber } from "./format";

const POLL_MS = 5_000;
const REPO = `https://github.com/${siteConfig.githubUsername}/bilalyazicioglu.com`;

const pct = (v: number) => `${formatNumber(v)}%`;
const celsius = (v: number) => `${formatNumber(v)}°C`;
const perMinute = (v: number) => `${formatNumber(v, v < 10 ? 1 : 0)}/min`;
/** Small shares get a decimal: "0.4%" says more than a rounded "0%". */
const share = (v: number) => `${formatNumber(v, v < 10 ? 1 : 0)}%`;

/**
 * The CPU row is the whole machine, and the machine runs more than this site,
 * so the site's own share sits right under it — a spike to 90% shows at a
 * glance whether the blog had anything to do with it.
 */
function cpuNote(app: number | null, load: number | null): string | undefined {
  const parts = [
    app === null ? null : `this site ${share(app)}`,
    load === null ? null : `load ${formatNumber(load, 2)} per core`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

/** Polls while the tab is visible; a hidden tab costs the server nothing. */
function useLiveInfra(initial: InfraData) {
  const [data, setData] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function tick() {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(INFRA_API_PATH, { cache: "no-store" });
          if (!res.ok) throw new Error(String(res.status));
          const next = (await res.json()) as InfraData;
          if (!cancelled) {
            setData(next);
            setStale(false);
          }
        } catch {
          if (!cancelled) setStale(true);
        }
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    }

    timer = setTimeout(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { data, stale };
}

/** Starts from the snapshot's own clock so the server and first client render agree. */
function useNow(start: number) {
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * One reading: name, value, then its last 24 hours. The note under it says
 * what the number is measured against. On a phone the chart drops below.
 */
function Metric({
  label,
  value,
  note,
  history,
  format,
  max,
}: {
  label: string;
  value: string;
  note?: string;
  history?: Series | null;
  format?: (v: number) => string;
  max?: number;
}) {
  return (
    <div className="grid grid-cols-[12ch_minmax(0,1fr)] items-start gap-x-[2ch] sm:grid-cols-[12ch_9ch_minmax(0,1fr)]">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
      <div className="col-span-2 mt-1 sm:col-span-1 sm:mt-0">
        {history && format && <Sparkline series={history} label={label} format={format} max={max} />}
      </div>
      {note && <p className="col-span-2 text-[13px] text-muted sm:col-span-3">{note}</p>}
    </div>
  );
}

export function InfraDashboard({ initial }: { initial: InfraData }) {
  const { data, stale } = useLiveInfra(initial);
  const now = useNow(initial.generatedAt);
  const { live, specs, history, services, deploy } = data;
  const offline = !data.online;

  const state = offline ? "metrics offline" : stale ? "reconnecting" : "live";

  return (
    <>
      <ManSection title="RIGHT NOW">
        <p className="mb-4 text-[13.5px] text-muted">
          <span className={offline || stale ? "text-muted" : "text-ok"}>
            <span aria-hidden className={offline || stale ? "" : "motion-safe:animate-pulse"}>
              ●
            </span>{" "}
            {state}
          </span>
          , updated {formatAgo(data.generatedAt, now)} ago, refreshes every {POLL_MS / 1000}s
        </p>

        {offline ? (
          <p className="max-w-[64ch]">
            Prometheus isn&apos;t answering right now, so the host numbers are blank. The page itself is still being
            served from the machine — that part, at least, is working.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <Metric
              label="cpu"
              value={live.cpuPercent === null ? "—" : pct(live.cpuPercent)}
              note={cpuNote(live.appCpuPercent, live.loadPerCore)}
              history={history?.cpu}
              format={pct}
              max={100}
            />
            <Metric
              label="memory"
              value={live.memoryPercent === null ? "—" : pct(live.memoryPercent)}
              note={specs.memoryBytes === null ? undefined : `of ${formatBytes(specs.memoryBytes)} usable`}
              history={history?.memory}
              format={pct}
              max={100}
            />
            <Metric
              label="temperature"
              value={live.temperatureC === null ? "—" : celsius(live.temperatureC)}
              note="hottest sensor"
              history={history?.temperature}
              format={celsius}
            />
            <Metric
              label="traffic"
              value={live.requestsPerMinute === null ? "—" : perMinute(live.requestsPerMinute)}
              note={live.requests24h === null ? undefined : `${formatNumber(live.requests24h)} requests in 24h`}
              history={history?.requests}
              format={perMinute}
            />
          </div>
        )}
      </ManSection>

      <ManSection title="THE MACHINE">
        <ManRows>
          {[
            ["cpu", specs.cpuModel ? `${specs.cpuModel}${specs.cores ? `, ${specs.cores} threads` : ""}` : null],
            // What Linux can use — the integrated GPU's share of RAM is not in it.
            ["memory", specs.memoryBytes === null ? null : `${formatBytes(specs.memoryBytes)} usable`],
            // The root filesystem, which can be smaller than the physical disk.
            [
              "root volume",
              specs.diskBytes === null
                ? null
                : `${formatBytes(specs.diskBytes)}${live.diskPercent === null ? "" : `, ${pct(live.diskPercent)} used`}`,
            ],
            ["os", specs.os],
            ["network", "Cloudflare Tunnel, Tailscale for admin"],
          ].map(([term, detail]) => (
            <div key={term} className="contents">
              <span className="text-muted">{term}</span>
              <span className="break-words">{detail ?? "—"}</span>
            </div>
          ))}
        </ManRows>
      </ManSection>

      <ManSection title="RUNNING BUILD">
        <ManRows>
          <span className="text-muted">commit</span>
          <span className="break-words">
            {deploy.sha ? (
              <a href={`${REPO}/commit/${deploy.sha}`} target="_blank" rel="noopener noreferrer" className={manLink}>
                {deploy.sha.slice(0, 7)}
              </a>
            ) : (
              "—"
            )}
            {deploy.subject && <> {deploy.subject}</>}
          </span>
          <span className="text-muted">committed</span>
          <span>{deploy.committedAt === null ? "—" : `${formatAgo(deploy.committedAt * 1000, now)} ago`}</span>
          <span className="text-muted">live for</span>
          <span>{formatAgo(deploy.startedAt, now)}</span>
          <span className="text-muted">app</span>
          <span>
            {formatBytes(live.appMemoryBytes)} RSS
            {live.eventLoopLagMs !== null && `, ${formatNumber(live.eventLoopLagMs, 1)} ms event-loop p99`}
          </span>
          <span className="text-muted">errors</span>
          <span>{live.errors24h === null ? "—" : `${formatNumber(live.errors24h)} in 24h`}</span>
        </ManRows>
      </ManSection>

      <ManSection title="SERVICES">
        <ul className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-[2ch] gap-y-1 sm:grid-cols-[max-content_max-content_minmax(0,1fr)]">
          {services.map((service) => (
            <li key={service.id} className="contents">
              <span className={service.up === null ? "text-muted" : service.up ? "text-ok" : "text-bad"}>
                <span aria-hidden>{service.up === null ? "○" : "●"}</span>{" "}
                {service.up === null ? "unknown" : service.up ? "up" : "down"}
              </span>
              <span>{service.label}</span>
              <span className="col-start-2 mb-1.5 text-[13.5px] text-muted sm:col-start-3 sm:mb-0 sm:text-[15px]">
                {service.role}
              </span>
            </li>
          ))}
        </ul>
      </ManSection>
    </>
  );
}
