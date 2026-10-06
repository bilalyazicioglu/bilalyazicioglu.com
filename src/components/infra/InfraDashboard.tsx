"use client";

import { useEffect, useState } from "react";
import { INFRA_API_PATH, type InfraData, type Series } from "@/lib/infra-types";
import { siteConfig } from "@/site.config";
import { Sparkline } from "./Sparkline";
import { formatAgo, formatBytes, formatNumber } from "./format";

const POLL_MS = 5_000;
const REPO = `https://github.com/${siteConfig.githubUsername}/bilalyazicioglu.com`;

const pct = (v: number) => `${formatNumber(v)}%`;
const celsius = (v: number) => `${formatNumber(v)}°C`;
const perMinute = (v: number) => `${formatNumber(v, v < 10 ? 1 : 0)}/min`;

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 font-ui text-xs font-bold uppercase tracking-wider text-accent">{children}</p>;
}

function Meter({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/15" aria-hidden>
      <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${clamped}%` }} />
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  meter,
  history,
  format,
  max,
}: {
  label: string;
  value: string;
  note?: string;
  meter?: number | null;
  history?: Series | null;
  format?: (v: number) => string;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink/15 p-4">
      <div>
        <p className="font-ui text-[10px] uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-1 font-ui text-2xl font-bold">{value}</p>
        {note && <p className="font-ui text-[10px] uppercase tracking-wider text-muted">{note}</p>}
      </div>
      {meter !== undefined && meter !== null && <Meter value={meter} />}
      {history && format && <Sparkline series={history} label={label} format={format} max={max} />}
    </div>
  );
}

export function InfraDashboard({ initial }: { initial: InfraData }) {
  const { data, stale } = useLiveInfra(initial);
  const now = useNow(initial.generatedAt);
  const { live, specs, history, services, deploy } = data;
  const offline = !data.online;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b-[1.5px] border-ink px-4 py-4 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-3 py-1 font-ui text-[11px] font-bold uppercase tracking-wider">
          <span className={`h-1.5 w-1.5 rounded-full ${offline || stale ? "bg-muted" : "animate-pulse bg-accent"}`} />
          {offline ? "Metrics offline" : stale ? "Reconnecting" : "Live"}
        </span>
        <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
          Updated {formatAgo(data.generatedAt, now)} ago · refreshes every {POLL_MS / 1000}s
        </span>
      </div>

      {offline && (
        <p className="border-b border-ink/10 px-4 py-3 text-sm text-ink/70 sm:px-6">
          Prometheus isn&apos;t answering right now, so the host numbers are blank. The page itself is
          still being served from the machine — that part, at least, is working.
        </p>
      )}

      <section className="border-b-[1.5px] border-ink px-4 py-8 sm:px-6">
        <SectionTitle>Host · right now</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="CPU"
            value={live.cpuPercent === null ? "—" : pct(live.cpuPercent)}
            note={live.loadPerCore === null ? undefined : `load ${formatNumber(live.loadPerCore, 2)} per core`}
            meter={live.cpuPercent}
            history={history?.cpu}
            format={pct}
            max={100}
          />
          <Tile
            label="Memory"
            value={live.memoryPercent === null ? "—" : pct(live.memoryPercent)}
            note={specs.memoryBytes === null ? undefined : `of ${formatBytes(specs.memoryBytes)} usable`}
            meter={live.memoryPercent}
            history={history?.memory}
            format={pct}
            max={100}
          />
          <Tile
            label="Temperature"
            value={live.temperatureC === null ? "—" : celsius(live.temperatureC)}
            note="hottest sensor"
            history={history?.temperature}
            format={celsius}
          />
          <Tile
            label="Traffic"
            value={live.requestsPerMinute === null ? "—" : perMinute(live.requestsPerMinute)}
            note={live.requests24h === null ? undefined : `${formatNumber(live.requests24h)} requests · 24h`}
            history={history?.requests}
            format={perMinute}
          />
        </div>
      </section>

      <section className="grid border-b-[1.5px] border-ink lg:grid-cols-2">
        <div className="border-b-[1.5px] border-ink px-4 py-8 sm:px-6 lg:border-b-0 lg:border-r-[1.5px]">
          <SectionTitle>The machine</SectionTitle>
          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3">
            {[
              ["CPU", specs.cpuModel ? `${specs.cpuModel}${specs.cores ? ` · ${specs.cores} threads` : ""}` : null],
              // What Linux can use — the integrated GPU's share of RAM is not in it.
              ["Memory", specs.memoryBytes === null ? null : `${formatBytes(specs.memoryBytes)} usable`],
              // The root filesystem, which can be smaller than the physical disk.
              [
                "Root volume",
                specs.diskBytes === null
                  ? null
                  : `${formatBytes(specs.diskBytes)}${live.diskPercent === null ? "" : ` · ${pct(live.diskPercent)} used`}`,
              ],
              ["OS", specs.os],
              ["Network", "Cloudflare Tunnel · Tailscale for admin"],
            ].map(([term, detail]) => (
              <div key={term} className="contents">
                <dt className="font-ui text-[10px] uppercase tracking-wider text-muted">{term}</dt>
                <dd className="font-ui text-sm font-bold break-words">{detail ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="px-4 py-8 sm:px-6">
          <SectionTitle>Running build</SectionTitle>
          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3">
            <dt className="font-ui text-[10px] uppercase tracking-wider text-muted">Commit</dt>
            <dd className="font-ui text-sm font-bold break-words">
              {deploy.sha ? (
                <a
                  href={`${REPO}/commit/${deploy.sha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
                >
                  {deploy.sha.slice(0, 7)}
                </a>
              ) : (
                "—"
              )}
              {deploy.subject && <span className="mt-1 block font-normal text-ink/70">{deploy.subject}</span>}
            </dd>
            <dt className="font-ui text-[10px] uppercase tracking-wider text-muted">Committed</dt>
            <dd className="font-ui text-sm font-bold">
              {deploy.committedAt === null ? "—" : `${formatAgo(deploy.committedAt * 1000, now)} ago`}
            </dd>
            <dt className="font-ui text-[10px] uppercase tracking-wider text-muted">Live for</dt>
            <dd className="font-ui text-sm font-bold">{formatAgo(deploy.startedAt, now)}</dd>
            <dt className="font-ui text-[10px] uppercase tracking-wider text-muted">App</dt>
            <dd className="font-ui text-sm font-bold">
              {formatBytes(live.appMemoryBytes)} RSS
              {live.eventLoopLagMs !== null && ` · ${formatNumber(live.eventLoopLagMs, 1)} ms event-loop p99`}
            </dd>
            <dt className="font-ui text-[10px] uppercase tracking-wider text-muted">Errors</dt>
            <dd className="font-ui text-sm font-bold">
              {live.errors24h === null ? "—" : `${formatNumber(live.errors24h)} in 24h`}
            </dd>
          </dl>
        </div>
      </section>

      <section className="border-b-[1.5px] border-ink px-4 py-8 sm:px-6">
        <SectionTitle>Services</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.id} className="flex items-start justify-between gap-3 rounded-xl border border-ink/15 p-4">
              <div>
                <p className="font-ui text-sm font-bold">{service.label}</p>
                <p className="font-ui text-[10px] uppercase tracking-wider text-muted">{service.role}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-ui text-[10px] font-bold uppercase tracking-wider">
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${
                    service.up === null ? "bg-muted" : service.up ? "bg-accent" : "border-2 border-ink bg-transparent"
                  }`}
                />
                {service.up === null ? "unknown" : service.up ? "up" : "down"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
