"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "@/lib/offline/data";
import { fitView, type Point, type ViewBox } from "@/lib/offline/projection";

export type MapPin = Point & {
  slug: string;
  city: string;
  country: string;
  year?: number;
  note?: string;
  photos: Photo[];
  home: boolean;
};

type View = "fit" | "world";

/** Below this the map is too small to float a card over; the card opens under it. */
const NARROW = 560;

/**
 * The places map. The land is public/offline/world.svg, pulled in with
 * `<use>` so the browser caches it and the theme colours it; only the shaded
 * countries are drawn inline. Pins are HTML buttons laid over the drawing, so
 * they stay round and keyboard-reachable at any zoom.
 */
export function PlacesMap({
  width,
  height,
  pins,
  visited,
}: {
  width: number;
  height: number;
  pins: MapPin[];
  visited: { id: string; d: string }[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [boxWidth, setBoxWidth] = useState(0);
  const [view, setView] = useState<View>("fit");
  const [open, setOpen] = useState<number | null>(null);
  const [photo, setPhoto] = useState(0);
  const narrow = boxWidth > 0 && boxWidth < NARROW;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const views = useMemo<Record<View, ViewBox>>(
    () => ({
      // The world without the empty Arctic band at the top.
      world: { x: 0, y: height * 0.04, w: width, h: height * 0.92 },
      fit: fitView(pins, { aspect: narrow ? 1.3 : 2.2, minWidth: width * 0.12, width, height, labelRoom: narrow ? 0 : 0.12 }),
    }),
    [pins, narrow, width, height]
  );
  const v = views[view];

  const close = useCallback((refocus: boolean) => {
    setOpen((current) => {
      if (refocus && current !== null) pinRefs.current[current]?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  function toggle(i: number) {
    if (open === i) return close(false);
    const p = pins[i];
    const f = views.fit;
    // A pin outside the zoomed view can only be shown by zooming out.
    if (view === "fit" && (p.x < f.x || p.x > f.x + f.w || p.y < f.y || p.y > f.y + f.h)) setView("world");
    setPhoto(0);
    setOpen(i);
  }

  const position = (p: Point) => ({ left: ((p.x - v.x) / v.w) * 100, top: ((p.y - v.y) / v.h) * 100 });
  const active = open === null ? null : pins[open];
  // A card with photos is taller than the map is high, so it opens under the
  // map, photo beside text; a plain note floats next to its pin.
  const below = narrow || (active !== null && active.photos.length > 0);
  const trips = pins.map((p, i) => ({ p, i })).filter(({ p }) => !p.home);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-end gap-x-4 text-[13px]">
        <div role="group" aria-label="Map view" className="flex gap-4">
          {(["fit", "world"] as const).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={view === name}
              onClick={() => setView(name)}
              className={`underline-offset-4 ${view === name ? "text-ink underline decoration-accent" : "text-muted hover:text-ink"}`}
            >
              {name === "fit" ? "my places" : "whole world"}
            </button>
          ))}
        </div>
      </div>

      <div ref={box} className="relative overflow-hidden rounded-md border border-ink/15 bg-ink/[0.03]">
        <svg
          viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`}
          role="img"
          aria-label="World map with the places listed below pinned on it"
          className="block h-auto w-full"
        >
          <use
            href="/offline/world.svg#world"
            className="fill-[color-mix(in_srgb,var(--color-ink)_9%,var(--color-canvas))] stroke-ink/25"
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
          />
          {visited.map((c) => (
            <path
              key={c.id}
              d={c.d}
              className="fill-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-canvas))] stroke-ink/25"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {pins.map((p, i) => {
          const { left, top } = position(p);
          const inside = left > -1 && left < 101 && top > -1 && top < 101;
          return (
            <div key={p.slug} hidden={!inside}>
              <button
                ref={(el) => {
                  pinRefs.current[i] = el;
                }}
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={open === i}
                aria-label={`${p.city}, ${p.country}${p.home ? " (home)" : ""}`}
                className="group absolute -ml-[11px] -mt-[11px] h-[22px] w-[22px] rounded-full"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span
                  aria-hidden
                  className={`absolute rounded-full ring-2 transition-[inset] ${
                    p.home ? "bg-canvas ring-accent" : "bg-accent ring-canvas"
                  } ${open === i ? "inset-[3px]" : "inset-[5px] group-hover:inset-[4px]"}`}
                />
              </button>
              {view === "fit" && !narrow && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute translate-x-[12px] -translate-y-1/2 whitespace-nowrap text-[11.5px] [text-shadow:0_0_3px_var(--color-canvas),0_0_3px_var(--color-canvas)]"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  {p.city}
                </span>
              )}
            </div>
          );
        })}

        {active && !below && (
          <PlaceCard
            pin={active}
            photo={photo}
            setPhoto={setPhoto}
            onClose={() => close(true)}
            style={cardPosition(position(active), boxWidth)}
          />
        )}
      </div>

      {active && below && (
        <PlaceCard pin={active} photo={photo} setPhoto={setPhoto} onClose={() => close(true)} wide={!narrow} />
      )}

      {trips.length > 0 && (
        <ul className="mt-3 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-[2.5ch] gap-y-0.5 text-[14px] sm:grid-cols-[max-content_max-content_minmax(0,1fr)]">
          {trips.map(({ p, i }) => (
            <li key={p.slug} className="contents">
              <span className="hidden text-muted tabular-nums sm:inline">{p.year}</span>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="text-left text-accent underline-offset-[3px] hover:underline"
              >
                {p.city}
                {p.photos.length > 0 && <span className="text-muted"> ({p.photos.length} photos)</span>}
              </button>
              <span className="text-muted">{p.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Above the pin when there is room, below it otherwise; never off the map's sides. */
function cardPosition({ left, top }: { left: number; top: number }, boxWidth: number): React.CSSProperties {
  const cardWidth = Math.min(300, boxWidth * 0.7);
  const x = (left / 100) * boxWidth;
  const clamped = Math.max(8, Math.min(boxWidth - cardWidth - 8, x - cardWidth / 2));
  return top > 55
    ? { left: clamped, bottom: `calc(${100 - top}% + 16px)`, width: cardWidth }
    : { left: clamped, top: `calc(${top}% + 16px)`, width: cardWidth };
}

function PlaceCard({
  pin,
  photo,
  setPhoto,
  onClose,
  style,
  wide = false,
}: {
  pin: MapPin;
  photo: number;
  setPhoto: (i: number) => void;
  onClose: () => void;
  style?: React.CSSProperties;
  /** Under a full-width map: photo on the left, text on the right. */
  wide?: boolean;
}) {
  const floating = style !== undefined;
  const count = pin.photos.length;
  const current = pin.photos[photo];

  return (
    <div
      role="dialog"
      aria-label={pin.city}
      style={style}
      className={`z-10 overflow-hidden border border-ink/15 bg-surface text-[13.5px] leading-normal ${
        floating ? "absolute rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.18)]" : "mt-2 rounded-md"
      } ${wide && current ? "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : ""}`}
    >
      {current && (
        <div className="relative aspect-[4/3] bg-ink/5">
          <Image
            src={current.src}
            alt={current.alt}
            fill
            sizes={wide ? "420px" : "(max-width: 560px) 100vw, 300px"}
            className="object-cover"
          />
          {count > 1 && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-6 text-[12px] text-white">
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => setPhoto((photo - 1 + count) % count)}
                className="px-1.5 text-base leading-none"
              >
                ‹
              </button>
              <span aria-live="polite">
                {photo + 1} / {count}
              </span>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => setPhoto((photo + 1) % count)}
                className="px-1.5 text-base leading-none"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
      <div className="relative px-3 py-2.5 pr-8">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-2 top-1.5 text-base text-muted hover:text-ink"
        >
          ×
        </button>
        <p>
          <b className="font-bold">{pin.city}</b>{" "}
          <span className="text-muted">
            {pin.country}
            {pin.home ? ", home" : pin.year ? `, ${pin.year}` : ""}
          </span>
        </p>
        {pin.note && <p className="mt-1 font-body text-[14px]">{pin.note}</p>}
      </div>
    </div>
  );
}
