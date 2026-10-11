"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "@/lib/offline/data";
import {
  clampView,
  fitView,
  placeCentered,
  placeLabels,
  zoomView,
  type Point,
  type Rect,
  type ViewBox,
} from "@/lib/offline/projection";

export type MapPin = Point & {
  slug: string;
  city: string;
  country: string;
  year?: number;
  note?: string;
  photos: Photo[];
  home: boolean;
};

/** A province of Türkiye: its outline, and where its name is written. */
export type Province = { id: string; name: string; d: string; cx: number; cy: number };

type View = "fit" | "world";

/** Below this the map is too small to float a card over; the card opens under it. */
const NARROW = 560;
/** Province names are written once the map is zoomed in about this close. */
const PROVINCE_NAMES_BELOW = 320;
/**
 * Safari reports a pinch, on a Mac trackpad or an iPhone, as its own gesture
 * events rather than as ctrl+scroll or two pointers, and zooms the whole page
 * unless they are cancelled.
 */
type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number };
const safariGestures = () => typeof window !== "undefined" && "GestureEvent" in window;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How much one press of + or − zooms. */
const STEP = 1.6;

/**
 * The places map. The land is public/offline/world.svg, pulled in with
 * `<use>` so the browser caches it and the theme colours it; only the shaded
 * countries are drawn inline. Pins are HTML buttons laid over the drawing, so
 * they stay round and keyboard-reachable at any zoom.
 *
 * It behaves like a map:
 * - drag to move, and a flick keeps coasting;
 * - pinch (trackpad or phone), ctrl+scroll, double click, or + and − to zoom;
 * - once the map has been clicked, a two-finger scroll moves it, and hands
 *   the scroll back to the page when the map can go no further;
 * - arrow keys move it and + and − zoom it while it has focus;
 * - choosing a place from the list flies the map to it.
 * Until it has been clicked, a plain scroll over it still scrolls the page.
 */
export function PlacesMap({
  width,
  height,
  pins,
  visited,
  provinces,
}: {
  width: number;
  height: number;
  pins: MapPin[];
  visited: { id: string; d: string }[];
  /** All of Türkiye's provinces, and which I have been to and live in. */
  provinces?: { all: Province[]; visited: string[]; lived: string[] };
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

  // The view the handlers below work from. It is set where the view changes
  // as well as after each render, so several events in one frame add up.
  const current = useRef(v);
  useLayoutEffect(() => {
    current.current = v;
  }, [v]);
  const frame = useRef(0);
  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);
  useEffect(() => stop, [stop]);

  /** Straight to a view: dragging, pinching, scrolling. */
  const move = useCallback(
    (next: ViewBox) => {
      stop();
      const clamped = clampView(next, bounds);
      current.current = clamped;
      setCam({ ...clamped, narrow });
    },
    [bounds, narrow, stop]
  );
  const zoom = useCallback(
    (factor: number, fx = 0.5, fy = 0.5) => move(zoomView(current.current, factor, fx, fy, bounds)),
    [move, bounds]
  );
  /** Eased to a view: buttons, double click, keys, the list. */
  const fly = useCallback(
    (target: ViewBox, done?: () => void) => {
      stop();
      const from = current.current;
      const to = clampView(target, bounds);
      if (reducedMotion()) {
        current.current = to;
        setCam({ ...to, narrow });
        done?.();
        return;
      }
      const start = performance.now();
      const fromAspect = from.w / from.h;
      const toAspect = to.w / to.h;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 260);
        const k = 1 - (1 - t) ** 3;
        // Width changes by the same factor each moment, so a zoom feels even.
        const w = from.w * (to.w / from.w) ** k;
        const h = w / (fromAspect + (toAspect - fromAspect) * k);
        const cx = from.x + from.w / 2 + (to.x + to.w / 2 - from.x - from.w / 2) * k;
        const cy = from.y + from.h / 2 + (to.y + to.h / 2 - from.y - from.h / 2) * k;
        const next = { x: cx - w / 2, y: cy - h / 2, w, h };
        current.current = next;
        setCam({ ...next, narrow });
        if (t < 1) frame.current = requestAnimationFrame(tick);
        else {
          frame.current = 0;
          done?.();
        }
      };
      frame.current = requestAnimationFrame(tick);
    },
    [bounds, narrow, stop]
  );
  const flyZoom = (factor: number, fx = 0.5, fy = 0.5) => fly(zoomView(current.current, factor, fx, fy, bounds));

  /** A client point as a share of the map's width and height. */
  const share = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect();
    return [(clientX - r.left) / r.width, (clientY - r.top) / r.height] as const;
  };

  // Once clicked (or focused), a scroll moves the map instead of the page.
  const engaged = useRef(false);

  // React's wheel listener is passive and can't stop the page from scrolling
  // or zooming, so these are attached by hand.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const v = current.current;
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        // ctrl+scroll, and a pinch on a trackpad in Chrome and Firefox.
        e.preventDefault();
        const delta = Math.max(-50, Math.min(50, e.deltaY));
        zoom(Math.exp(delta * 0.01), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        return;
      }
      // Two fingers on a trackpad. Zoomed all the way out there is nothing to
      // move, and at the map's edge the scroll belongs to the page again.
      if (!engaged.current || v.w >= Math.min(width, height * (v.w / v.h)) - 0.5) return;
      const unit = v.w / r.width;
      const line = e.deltaMode === 1 ? 16 : 1;
      const next = clampView({ ...v, x: v.x + e.deltaX * line * unit, y: v.y + e.deltaY * line * unit }, bounds);
      if (Math.abs(next.x - v.x) < 1e-6 && Math.abs(next.y - v.y) < 1e-6) return;
      e.preventDefault();
      move(next);
    };
    // Safari's pinch: scale is measured from where the fingers started.
    let start: { v: ViewBox; fx: number; fy: number } | null = null;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      const g = e as GestureEvent;
      const r = el.getBoundingClientRect();
      start = { v: current.current, fx: (g.clientX - r.left) / r.width, fy: (g.clientY - r.top) / r.height };
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as GestureEvent;
      if (start && g.scale > 0) move(zoomView(start.v, 1 / g.scale, start.fx, start.fy, bounds));
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      start = null;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    el.addEventListener("gestureend", onGestureEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("gestureend", onGestureEnd);
    };
  }, [zoom, move, bounds, width, height]);

  /** Pins and the card handle their own clicks; anywhere else drags the map. */
  const onMap = (e: React.PointerEvent | React.MouseEvent) =>
    !(e.target as HTMLElement).closest("button, [role=dialog]");

  // How fast the last drag was moving, in map units per millisecond, so that
  // letting go of a flick keeps the map coasting.
  const velocity = useRef({ vx: 0, vy: 0, at: 0 });

  function onPointerDown(e: React.PointerEvent) {
    engaged.current = true;
    if (!onMap(e) || (e.pointerType === "mouse" && e.button !== 0)) return;
    stop();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    velocity.current = { vx: 0, vy: 0, at: 0 };
  }

  function onPointerMove(e: React.PointerEvent) {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    const others = [...pointers.current].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = current.current;
    const unit = v.w / box.current!.getBoundingClientRect().width;
    if (others.length === 0) {
      const dx = -(e.clientX - last.x) * unit;
      const dy = -(e.clientY - last.y) * unit;
      move({ ...v, x: v.x + dx, y: v.y + dy });
      // An event's timeStamp is on the same clock as requestAnimationFrame's.
      const now = e.timeStamp;
      const dt = Math.max(1, now - velocity.current.at);
      // Smoothed, so one jittery event doesn't set the speed.
      velocity.current = {
        vx: velocity.current.vx * 0.6 + (dx / dt) * 0.4,
        vy: velocity.current.vy * 0.6 + (dy / dt) * 0.4,
        at: now,
      };
      return;
    }
    // Two fingers: zoom by how far they spread, around the point between them,
    // and move with that point. Safari's gesture events above do this there.
    velocity.current = { vx: 0, vy: 0, at: 0 };
    if (safariGestures()) return;
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
    const wasDragging = pointers.current.size === 1 && pointers.current.has(e.pointerId);
    pointers.current.delete(e.pointerId);
    const { vx, vy, at } = velocity.current;
    // Only a flick still moving as the finger lifts coasts on.
    if (!wasDragging || reducedMotion() || e.timeStamp - at > 80 || Math.hypot(vx, vy) < 0.004) return;
    let last = e.timeStamp;
    let speed = { vx, vy };
    const coast = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const v = current.current;
      const next = clampView({ ...v, x: v.x + speed.vx * dt, y: v.y + speed.vy * dt }, bounds);
      const stuck = Math.abs(next.x - v.x) < 1e-6 && Math.abs(next.y - v.y) < 1e-6;
      const decay = Math.exp(-dt / 325);
      speed = { vx: speed.vx * decay, vy: speed.vy * decay };
      current.current = next;
      setCam({ ...next, narrow });
      frame.current = !stuck && Math.hypot(speed.vx, speed.vy) > 0.0015 ? requestAnimationFrame(coast) : 0;
    };
    frame.current = requestAnimationFrame(coast);
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (!onMap(e)) return;
    const [fx, fy] = share(e.clientX, e.clientY);
    flyZoom(e.shiftKey ? STEP : 1 / STEP, fx, fy);
  }

  /** With the map itself focused (not a pin in it): arrows move it, + and − zoom it. */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    const v = current.current;
    const step = (e.shiftKey ? 0.6 : 0.25) * v.w;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (arrows[e.key]) {
      e.preventDefault();
      const [dx, dy] = arrows[e.key];
      fly({ ...v, x: v.x + dx, y: v.y + dy });
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      flyZoom(1 / STEP);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      flyZoom(STEP);
    } else if (e.key === "0") {
      e.preventDefault();
      choose("fit");
    }
  }

  function choose(name: View) {
    setView(name);
    // Eased to the preset, then handed back to it, so a resize still re-fits.
    fly(views[name], () => setCam(null));
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
    // A pin outside the view is flown to, at the zoom the map is already at.
    if (p.x < v.x || p.x > v.x + v.w || p.y < v.y || p.y > v.y + v.h) {
      fly({ ...v, x: p.x - v.w / 2, y: p.y - v.h / 2 });
    }
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
  const screen = (p: Point) => ({ x: ((p.x - v.x) / v.w) * boxWidth, y: ((p.y - v.y) / v.h) * boxHeight });
  const spots = placeLabels(
    order.map(({ p }) => ({ ...screen(p), text: p.city })),
    { width: boxWidth, height: boxHeight }
  );
  const labelAt = new Map(order.map(({ i }, n) => [i, spots[n]]));

  // Türkiye's provinces are named once the map is close enough, visited ones
  // first, in whatever room the pins and their names leave.
  const provinceNames: { p: Province; x: number; y: number; state: "lived" | "visited" | "none" }[] = [];
  if (provinces && boxWidth > 0 && v.w <= PROVINCE_NAMES_BELOW) {
    const rank = (id: string) => (provinces.lived.includes(id) ? 0 : provinces.visited.includes(id) ? 1 : 2);
    const taken: Rect[] = [];
    order.forEach(({ p }, n) => {
      const { x, y } = screen(p);
      taken.push([x - 9, y - 9, x + 9, y + 9]);
      const spot = spots[n];
      if (spot) {
        const w = p.city.length * 7;
        taken.push(spot === "right" ? [x + 12, y - 8, x + 12 + w, y + 8] : [x - 12 - w, y - 8, x - 12, y + 8]);
      }
    });
    const inView = provinces.all
      .filter((p) => p.cx >= v.x && p.cx <= v.x + v.w && p.cy >= v.y && p.cy <= v.y + v.h)
      .sort((a, b) => rank(a.id) - rank(b.id));
    const fits = placeCentered(
      inView.map((p) => ({ ...screen({ x: p.cx, y: p.cy }), text: p.name })),
      taken,
      { width: boxWidth, height: boxHeight }
    );
    inView.forEach((p, n) => {
      if (fits[n])
        provinceNames.push({
          p,
          ...screen({ x: p.cx, y: p.cy }),
          state: ["lived", "visited", "none"][rank(p.id)] as "lived",
        });
    });
  }
  const provinceList = (ids: string[]) =>
    provinces?.all
      .filter((p) => ids.includes(p.id))
      .map((p) => p.name)
      .sort((a, b) => a.localeCompare(b, "tr")) ?? [];
  const beenTo = provinceList(provinces?.visited ?? []);
  const livedIn = provinceList(provinces?.lived ?? []);

  // The list under the map, one line per country, the most visited first.
  const countries = new Map<string, { p: MapPin; i: number }[]>();
  pins.forEach((p, i) => !p.home && countries.set(p.country, [...(countries.get(p.country) ?? []), { p, i }]));
  if (beenTo.length + livedIn.length > 0 && !countries.has("Türkiye")) countries.set("Türkiye", []);
  const byCountry = [...countries].sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 text-[13px]">
        <p className="text-muted">
          <span className="[@media(pointer:coarse)]:hidden">
            click the map, then scroll with two fingers to move; pinch or ctrl+scroll to zoom
          </span>
          <span className="hidden [@media(pointer:coarse)]:inline">drag to move, pinch to zoom</span>
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
                onClick={() => flyZoom(factor)}
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
        onKeyDown={onKeyDown}
        onFocus={(e) => {
          if (e.target === e.currentTarget) engaged.current = true;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && !pointers.current.size) engaged.current = false;
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) engaged.current = false;
        }}
        tabIndex={0}
        role="group"
        aria-label="Map of the places. Arrow keys move it, plus and minus zoom it, 0 resets it."
        // One finger scrolls the page until the map is zoomed in; two always zoom it.
        style={{ touchAction: v.w < maxW - 0.5 ? "none" : "pan-y" }}
        className="relative cursor-grab select-none overflow-hidden rounded-md border border-ink/15 bg-ink/[0.03] outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent active:cursor-grabbing"
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
          {provinces?.all
            .filter((c) => provinces.visited.includes(c.id) || provinces.lived.includes(c.id))
            .map((c) => (
              <path
                key={c.id}
                d={c.d}
                className={
                  provinces.lived.includes(c.id)
                    ? "fill-[color-mix(in_srgb,var(--color-accent)_60%,var(--color-canvas))]"
                    : "fill-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-canvas))]"
                }
              />
            ))}
          {/* Türkiye's province borders, once zoomed in far enough to tell them apart. */}
          {provinces && beenTo.length + livedIn.length > 0 && v.w < PROVINCE_NAMES_BELOW && (
            <use href="/offline/world.svg#tr" className="fill-none stroke-ink/20" strokeWidth={stroke * 0.75} />
          )}
        </svg>

        {provinceNames.map(({ p, x, y, state }) => (
          <span
            key={p.id}
            aria-hidden
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10.5px] leading-none [text-shadow:0_0_3px_var(--color-canvas),0_0_3px_var(--color-canvas)] ${
              state === "lived" ? "font-bold text-ink" : state === "visited" ? "text-ink" : "text-ink/50"
            }`}
            style={{ left: x, top: y }}
          >
            {p.name}
          </span>
        ))}

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
                      {p.photos.length > 0 && (
                        <span className="text-muted">
                          {" "}
                          ({p.photos.length} photo{p.photos.length === 1 ? "" : "s"})
                        </span>
                      )}
                      {n < list.length - 1 && ","}
                    </span>
                  </span>
                ))}
                {country === "Türkiye" && beenTo.length + livedIn.length > 0 && (
                  <span className={`block text-muted ${list.length ? "mt-0.5" : ""}`}>
                    {livedIn.length > 0 && `lived in ${livedIn.join(", ")}`}
                    {livedIn.length > 0 && beenTo.length > 0 && "; "}
                    {beenTo.length > 0 && `been to ${beenTo.join(", ")}`}
                  </span>
                )}
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

  // The photos either side are fetched ahead, so an arrow shows its photo at
  // once instead of after a wait.
  useEffect(() => {
    if (count < 2) return;
    for (const step of [1, 2, -1]) {
      const img = new window.Image();
      img.src = pin.photos[(photo + step + count) % count].src;
    }
  }, [photo, count, pin.photos]);

  return (
    <div
      role="dialog"
      aria-label={pin.city}
      style={style}
      className={`z-10 overflow-hidden border border-ink/15 bg-surface text-[13.5px] leading-normal ${
        floating ? "absolute rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.18)]" : "relative mt-2 rounded-md"
      } ${wide && current ? "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : ""}`}
    >
      {current && (
        <div className={`relative bg-ink/5 ${wide ? "aspect-square" : "aspect-[4/5]"}`}>
          {/* Served as they are: they were shrunk when uploaded, and Cloudflare
              caches these files but not /_next/image, which made every photo
              a slow trip to the server. */}
          <Image src={current.src} alt={current.alt} fill unoptimized loading="eager" className="object-contain" />
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
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-2 top-1.5 z-20 rounded bg-surface/85 px-1.5 text-base leading-snug text-muted shadow-sm hover:text-ink"
      >
        ×
      </button>
      {/* Beside the photo the text is as tall as the photo and scrolls inside
          it; the place above a rule, this photo's own words below it. */}
      <div className="relative min-h-0">
        <div className={wide && current ? "absolute inset-0 flex flex-col" : ""}>
          <div className={`px-3 py-2.5 pr-8 ${wide && current ? "min-h-0 flex-1 overflow-y-auto" : ""}`}>
            <p>
              <b className="font-bold">{pin.city}</b>{" "}
              <span className="text-muted">
                {pin.country}
                {pin.home ? ", home" : pin.year ? `, ${pin.year}` : ""}
              </span>
            </p>
            {pin.note && <p className="mt-1 font-body text-[14px]">{pin.note}</p>}
          </div>
          {current?.alt && (
            <div
              // The photo's alt text is these same words; read it once.
              aria-hidden
              className={`border-t border-ink/15 px-3 py-2.5 ${wide ? "min-h-0 flex-1 overflow-y-auto" : ""}`}
            >
              <p className="font-body text-[14px]">{current.alt}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
