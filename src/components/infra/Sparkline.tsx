"use client";

import { useState } from "react";
import type { Series } from "@/lib/infra-types";
import { formatClock } from "./format";

const WIDTH = 240;
const HEIGHT = 44;
const PAD = 4;

/**
 * Twenty-four hours as one thin line: the history in the muted ink, the latest
 * point in the accent. Hover, or focus and use the arrow keys, to read any
 * sample; the summary in the label carries the same numbers for screen readers.
 */
export function Sparkline({
  series,
  label,
  format,
  min = 0,
  max,
}: {
  series: Series;
  label: string;
  format: (value: number) => string;
  /** Fixed bounds keep a flat 2% from looking like a cliff. */
  min?: number;
  max?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const { values } = series;
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) {
    return <p className="font-ui text-[10px] uppercase tracking-wider text-muted">Not enough history yet</p>;
  }

  const hi = max ?? (Math.max(...present) * 1.1 || 1);
  const lo = Math.min(min, ...present);
  const x = (i: number) => PAD + (i / (values.length - 1)) * (WIDTH - PAD * 2);
  const y = (v: number) => HEIGHT - PAD - ((v - lo) / (hi - lo || 1)) * (HEIGHT - PAD * 2);

  // Gaps in the data stay gaps: each run of samples is its own subpath.
  let d = "";
  values.forEach((v, i) => {
    if (v === null) return;
    d += `${i === 0 || values[i - 1] === null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });

  let last = values.length - 1;
  while (values[last] === null) last--;
  const timeAt = (i: number) => series.start + i * series.step;

  const shown = active ?? last;
  const shownValue = values[shown];
  const summary = `${label}, last 24 hours: low ${format(Math.min(...present))}, high ${format(
    Math.max(...present)
  )}, now ${format(values[last]!)}`;

  function pick(clientX: number, rect: DOMRect) {
    const ratio = (clientX - rect.left) / rect.width;
    setActive(Math.max(0, Math.min(values.length - 1, Math.round(ratio * (values.length - 1)))));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={summary}
          tabIndex={0}
          className="h-11 w-full cursor-crosshair touch-none overflow-visible rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const step = e.key === "ArrowLeft" ? -1 : 1;
            setActive((i) => Math.max(0, Math.min(values.length - 1, (i ?? last) + step)));
          }}
        >
          <path
            d={d}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={0}
              y2={HEIGHT}
              stroke="var(--color-ink)"
              strokeOpacity={0.35}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {/* HTML, not SVG: the SVG stretches to fit, which would squash a circle. */}
        {shownValue !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent"
            style={{ left: `${(x(shown) / WIDTH) * 100}%`, top: `${(y(shownValue) / HEIGHT) * 100}%` }}
          />
        )}
      </div>
      <p className="flex justify-between font-ui text-[10px] uppercase tracking-wider text-muted">
        <span>{active === null ? "24h" : formatClock(timeAt(active))}</span>
        <span className="text-ink">{shownValue === null ? "no data" : format(shownValue)}</span>
      </p>
    </div>
  );
}
