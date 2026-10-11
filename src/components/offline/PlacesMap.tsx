"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "@/lib/offline/data";
import { clampView, fitView, placeLabels, zoomView, type Point, type ViewBox } from "@/lib/offline/projection";

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
/** How much one press of + or − zooms. */
const STEP = 1.6;

/**
 * The places map. The land is public/offline/world.svg, pulled in with
 * `<use>` so the browser caches it and the theme colours it; only the shaded
 * countries are drawn inline. Pins are HTML buttons laid over the drawing, so
 * they stay round and keyboard-reachable at any zoom.
 *
 * Zoom with + and −, a double click, ctrl+scroll or a trackpad pinch (which
 * browsers report as ctrl+scroll), or two fingers on a phone; drag to move.
 * A plain scroll still scrolls the page.
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
  // Where the user zoomed or dragged to; null shows the chosen preset view.
  // It belongs to one layout, so a switch between narrow and wide drops it.
  const [cam, setCam] = useState<(ViewBox & { narrow: boolean }) | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
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
      fit: fitView(pins, {
        aspect: narrow ? 1.3 : 2.2,
        minWidth: width * 0.12,
        width,
        height,
        labelRoom: narrow ? 0 : 0.12,
      }),
    }),
    [pins, narrow, width, height]
  );
  const v: ViewBox = cam && cam.narrow === narrow ? cam : views[view];
  const bounds = useMemo(() => ({ width, height, minWidth: width / 24 }), [width, height]);
  const maxW = Math.min(width, height * (v.w / v.h));
  // Borders stay 0.8px on screen at any zoom. (vector-effect would do this,
  // but it doesn't reach into the <use>d drawing.)
  const stroke = boxWidth > 0 ? (0.8 * v.w) / boxWidth : 0.4;

  // The latest view, for the wheel and pointer handlers below.
  const current = useRef(v);
  useLayoutEffect(() => {
    current.current = v;
  }, [v]);
  const move = useCallback((next: ViewBox) => setCam({ ...clampView(next, bounds), narrow }), [bounds, narrow]);
  const zoom = useCallback(
    (factor: number, fx = 0.5, fy = 0.5) => move(zoomView(current.current, factor, fx, fy, bounds)),
    [move, bounds]
  );

  /** A client point as a share of the map's width and height. */
  const share = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect();
    return [(clientX - r.left) / r.width, (clientY - r.top) / r.height] as const;
  };

  // React's wheel listener is passive and can't stop the page from zooming,
  // so this one is attached by hand.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const delta = Math.max(-50, Math.min(50, e.deltaY));
      zoom(Math.exp(delta * 0.01), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom]);

  /** Pins and the card handle their own clicks; anywhere else drags the map. */
  const onMap = (e: React.PointerEvent | React.MouseEvent) =>
    !(e.target as HTMLElement).closest("button, [role=dialog]");

  function onPointerDown(e: React.PointerEvent) {
    if (!onMap(e) || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: React.PointerEvent) {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    const others = [...pointers.current].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = current.current;
    const unit = v.w / box.current!.getBoundingClientRect().width;
    if (others.length === 0) {
      move({
        ...v,
        x: v.x - (e.clientX - last.x) * unit,
        y: v.y - (e.clientY - last.y) * unit,
      });
      return;
    }
    // Two fingers: zoom by how far they spread, around the point between them,
    // and move with that point.
    const other = others[0];
    const before = Math.hypot(last.x - other.x, last.y - other.y);
    const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    if (before < 1 || after < 1) return;
    const [fx, fy] = share((e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
    const zoomed = zoomView(v, before / after, fx, fy, bounds);
    move({
      ...zoomed,
      x: zoomed.x - ((e.clientX - last.x) / 2) * (zoomed.w / box.current!.getBoundingClientRect().width),
      y: zoomed.y - ((e.clientY - last.y) / 2) * (zoomed.w / box.current!.getBoundingClientRect().width),
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (!onMap(e)) return;
    const [fx, fy] = share(e.clientX, e.clientY);
    zoom(e.shiftKey ? STEP : 1 / STEP, fx, fy);
  }

  function choose(name: View) {
    setView(name);
    setCam(null);
  }

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
    // A pin outside the current view is brought in by showing the whole world.
    if (p.x < v.x || p.x > v.x + v.w || p.y < v.y || p.y > v.y + v.h) choose("world");
    setPhoto(0);
    setOpen(i);
  }

  const position = (p: Point) => ({
    left: ((p.x - v.x) / v.w) * 100,
    top: ((p.y - v.y) / v.h) * 100,
  });
  const active = open === null ? null : pins[open];
  // A card with photos is taller than the map is high, so it opens under the
  // map, photo beside text; a plain note floats next to its pin.
  const below = narrow || (active !== null && active.photos.length > 0);
  // Names only where they fit: home first, then places with something to
  // open, so a crowded region still names the ones worth clicking.
  const boxHeight = boxWidth * (v.h / v.w);
  const order = pins
    .map((p, i) => ({ p, i, rank: p.home ? 0 : p.note || p.photos.length ? 1 : 2 }))
    .sort((a, b) => a.rank - b.rank);
  const spots = placeLabels(
    order.map(({ p }) => ({ x: ((p.x - v.x) / v.w) * boxWidth, y: ((p.y - v.y) / v.h) * boxHeight, text: p.city })),
    { width: boxWidth, height: boxHeight }
  );
  const labelAt = new Map(order.map(({ i }, n) => [i, spots[n]]));
  // The list under the map, one line per country, the most visited first.
  const countries = new Map<string, { p: MapPin; i: number }[]>();
  pins.forEach((p, i) => !p.home && countries.set(p.country, [...(countries.get(p.country) ?? []), { p, i }]));
  const byCountry = [...countries].sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 text-[13px]">
        <p className="text-muted">
          <span className="[@media(pointer:coarse)]:hidden">drag to move, ctrl+scroll to zoom</span>
          <span className="hidden [@media(pointer:coarse)]:inline">pinch to zoom</span>
        </p>
        <div className="flex items-baseline gap-4">
          <div role="group" aria-label="Map view" className="flex gap-4">
            {(["fit", "world"] as const).map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={view === name}
                onClick={() => choose(name)}
                className={`underline-offset-4 ${view === name ? "text-ink underline decoration-accent" : "text-muted hover:text-ink"}`}
              >
                {name === "fit" ? "my places" : "whole world"}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Zoom" className="flex">
            {(
              [
                ["Zoom out", "−", STEP, v.w >= maxW - 0.5],
                ["Zoom in", "+", 1 / STEP, v.w <= bounds.minWidth + 0.5],
              ] as const
            ).map(([label, sign, factor, limit]) => (
              <button
                key={sign}
                type="button"
                aria-label={label}
                disabled={limit}
                onClick={() => zoom(factor)}
                className="h-6 w-6 border border-ink/15 leading-none text-ink first:rounded-l-md last:rounded-r-md last:border-l-0 hover:bg-ink/5 disabled:text-muted/50 disabled:hover:bg-transparent"
              >
                {sign}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={box}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        // One finger scrolls the page until the map is zoomed in; two always zoom it.
        style={{ touchAction: v.w < maxW - 0.5 ? "none" : "pan-y" }}
        className="relative cursor-grab select-none overflow-hidden rounded-md border border-ink/15 bg-ink/[0.03] active:cursor-grabbing"
      >
        <svg
          viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`}
          role="img"
          aria-label="World map with the places listed below pinned on it"
          className="block h-auto w-full"
        >
          <use
            href="/offline/world.svg#world"
            className="fill-[color-mix(in_srgb,var(--color-ink)_9%,var(--color-canvas))] stroke-ink/25"
            strokeWidth={stroke}
          />
          {visited.map((c) => (
            <path
              key={c.id}
              d={c.d}
              className="fill-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-canvas))] stroke-ink/25"
              strokeWidth={stroke}
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
              {labelAt.get(i) && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -translate-y-1/2 whitespace-nowrap text-[11.5px] [text-shadow:0_0_3px_var(--color-canvas),0_0_3px_var(--color-canvas)] ${
                    labelAt.get(i) === "right" ? "translate-x-[12px]" : "-translate-x-[calc(100%+12px)]"
                  }`}
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

      {byCountry.length > 0 && (
        <dl className="mt-3 grid gap-x-[2.5ch] text-[14px] sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-y-1">
          {byCountry.map(([country, list]) => (
            <div key={country} className="contents">
              <dt className="mt-2 text-muted sm:mt-0">{country}</dt>
              <dd>
                {list.map(({ p, i }, n) => (
                  <span key={p.slug}>
                    {n > 0 && " "}
                    {/* A name and its comma never part across lines. */}
                    <span className="whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggle(i)}
                        className="text-left text-accent underline-offset-[3px] hover:underline"
                      >
                        {p.city}
                      </button>
                      {p.photos.length > 0 && <span className="text-muted"> ({p.photos.length} photos)</span>}
                      {n < list.length - 1 && ","}
                    </span>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
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
