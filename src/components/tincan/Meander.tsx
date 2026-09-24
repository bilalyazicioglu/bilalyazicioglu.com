"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A stretch of string that doesn't run straight down the gutter: it drifts out
 * behind the copy, cuts across behind the leg's glass panel, throws one loop
 * in the open space below the text, and swings back to the gutter where the
 * next leg picks it up.
 *
 * The route is written against what is actually on the page, so it holds its
 * shape at any width:
 *   - "head" points lie between the leg's top (s=0) and the panel's top (s=1),
 *   - "panel" points are fractions of the panel's own box (they may go past
 *     it, to enter and leave it cleanly),
 *   - "open" points lie between the bottom of the leg's last text (s=0) and
 *     the leg's bottom (s=1) — clear space, where the loop can be seen,
 *   - "loop" points are in units of the loop's radius around its centre, so
 *     it stays round on a narrow phone as on a wide screen.
 * For head and open, u runs from the gutter's middle (0) to the leg's right
 * edge (1).
 */
type Space = "head" | "panel" | "open" | "loop";
const ROUTE: [Space, number, number][] = [
  // Hangs by the gutter while the heading and the paragraph have the column,
  // drifting out a little and back as a loose string does.
  ["head", 0, 0],
  ["head", 0.005, 0.3],
  ["head", 0.035, 0.62],
  ["head", 0.02, 0.9],
  // A diagonal behind the glass, where the glow scatters.
  ["panel", 0.1, 0.45],
  ["panel", 0.5, 0.56],
  ["panel", 0.88, 0.7],
  // Turned behind the glass, so it leaves already heading for the loop.
  ["panel", 0.81, 1.2],
  // Out in the open, a cursive loop: down its left side, round the bottom,
  // up the right, and back over the top across its own path, heading home.
  ["loop", 0.2, -2.5],
  ["loop", -0.3, -1.2],
  ["loop", -0.98, -0.15],
  ["loop", -0.62, 0.8],
  ["loop", 0.3, 0.97],
  ["loop", 0.97, 0.25],
  ["loop", 0.72, -0.72],
  ["loop", -0.15, -0.99],
  ["loop", -1.5, -0.55],
  // Out of the loop and away towards the gutter; the last stretch home is
  // drawn by `homeward`, not the spline.
  ["open", 0.46, 0.5],
];

/** The fastest the glow travels along the string, in px/s. */
const MAX_SPEED = 3000;

/** Where across the leg the loop's centre sits, as a share of u. */
const LOOP_AT = 0.772;

type Point = [number, number];

/**
 * Centripetal Catmull–Rom (α = ½) written out as cubic Béziers: it never
 * overshoots or folds into a cusp where points bunch up, which is what makes
 * a hand-placed route read as a string lying loose rather than a spline.
 * Phantom points straight above the start and below the end make the string
 * leave and arrive vertically, so it meets the gutter without a kink.
 */
function smooth(points: Point[], leaving: Point): string {
  const pts: Point[] = [[points[0][0], points[0][1] - 60], ...points, leaving];
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[1][0])} ${f(pts[1][1])}`;
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    const d1 = Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])) || 1e-6;
    const d2 = Math.sqrt(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) || 1e-6;
    const d3 = Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1])) || 1e-6;
    const c1 = [0, 1].map(
      (k) => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) /
        (3 * d1 * (d1 + d2))
    );
    const c2 = [0, 1].map(
      (k) => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) /
        (3 * d3 * (d3 + d2))
    );
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * The whole route: the spline through the points, then one wide Bézier home.
 * A spline squeezed into the last few points bends into the gutter at a sharp
 * elbow; a single curve whose first handle carries on the way the string was
 * already going, and whose second hangs straight above the gutter, spreads
 * that turn over the whole stretch and arrives upright.
 */
function route(points: Point[], home: Point): string {
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const len = Math.hypot(last[0] - prev[0], last[1] - prev[1]) || 1;
  const dir: Point = [(last[0] - prev[0]) / len, (last[1] - prev[1]) / len];
  const reach = Math.hypot(home[0] - last[0], home[1] - last[1]);
  const c1: Point = [last[0] + dir[0] * reach * 0.4, last[1] + dir[1] * reach * 0.4];
  const c2: Point = [home[0], home[1] - (home[1] - last[1]) * 0.8];
  const f = (n: number) => n.toFixed(1);
  // The spline leaves its last point in the same direction the Bézier takes
  // it up, so the two meet without a kink.
  const leaving: Point = [last[0] + dir[0] * 60, last[1] + dir[1] * 60];
  return `${smooth(points, leaving)} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(home[0])} ${f(home[1])}`;
}

type Layout = {
  w: number;
  h: number;
  gutter: number;
  /** The glass panel, in the SVG's coordinates. */
  panel: { x: number; y: number; w: number; h: number };
  /** Where the leg's text ends and the open space begins. */
  open: number;
};

function place([space, a, b]: [Space, number, number], l: Layout): Point {
  const x0 = l.gutter / 2;
  const span = l.w - x0 - 8;
  if (space === "panel") return [l.panel.x + a * l.panel.w, l.panel.y + b * l.panel.h];
  if (space === "head") return [x0 + a * span, b * l.panel.y];
  const room = l.h - l.open;
  if (space === "loop") {
    const r = Math.min(60, room * 0.28);
    const cx = Math.min(x0 + LOOP_AT * span, l.w - r - 12);
    return [cx + a * r, l.open + 0.54 * room + b * r];
  }
  return [x0 + a * span, l.open + b * room];
}

export function Meander({ glass }: { glass: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  // Draw the route in the leg's real pixels, so the stroke and the glow are
  // never stretched and the glow's position is the line's position.
  useEffect(() => {
    const leg = svgRef.current?.parentElement;
    const pane = leg?.querySelector<HTMLElement>(glass);
    const last = leg?.lastElementChild;
    if (!leg || !pane || !last) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const gutter = parseFloat(getComputedStyle(leg).getPropertyValue("--tc-gutter")) * rem;
      const legBox = leg.getBoundingClientRect();
      const paneBox = pane.getBoundingClientRect();
      setLayout({
        w: leg.clientWidth + gutter,
        h: leg.clientHeight,
        gutter,
        panel: {
          x: paneBox.left - legBox.left + gutter,
          y: paneBox.top - legBox.top,
          w: paneBox.width,
          h: paneBox.height,
        },
        open: last.getBoundingClientRect().bottom - legBox.top,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(leg);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [glass]);

  // The glow rides the route at the same share of its length as the middle of
  // the screen has travelled through the leg, and turns with the line.
  //
  // Scroll sets where the glow is going, not where it is. The route is a good
  // deal longer than the leg is tall, so one fast flick can ask it to cover
  // several hundred pixels of string in a single frame; placed there directly
  // it teleports. So it has a top speed: anything slower than that it follows
  // exactly, as it always did at reading speed, and when you fling past it
  // runs along the string at that speed to catch up, like a pulse would.
  useEffect(() => {
    const path = pathRef.current;
    const glow = glowRef.current;
    const leg = svgRef.current?.parentElement;
    if (!layout || !path || !glow || !leg) return;
    const length = path.getTotalLength();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;
    let target = 0;
    let inside = false;
    let at: number | null = null;

    const aim = () => {
      const rect = leg.getBoundingClientRect();
      const t = (window.innerHeight / 2 - rect.top) / rect.height;
      inside = t >= 0 && t <= 1;
      target = Math.min(1, Math.max(0, t)) * length;
    };

    const draw = (s: number) => {
      const here = path.getPointAtLength(s);
      const ahead = path.getPointAtLength(Math.min(length, s + 1));
      const behind = path.getPointAtLength(Math.max(0, s - 1));
      const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI - 90;
      glow.style.transform = `translate(${here.x.toFixed(1)}px, ${here.y.toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`;
    };

    const step = (now: number) => {
      frame = 0;
      aim();
      // The first frame after a pause counts as one frame, so the glow answers
      // the very first scroll instead of waiting a frame to start moving.
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      // Arriving from outside the leg (or asked to hold still) it starts where
      // it should be rather than sliding in from wherever it last was.
      if (at === null || still.matches) at = target;
      else {
        const gap = target - at;
        const reach = MAX_SPEED * dt;
        at = Math.abs(gap) <= reach ? target : at + Math.sign(gap) * reach;
      }
      const travelling = Math.abs(target - at) > 0.5;
      if (!travelling) at = target;
      // Seen while the middle of the screen is in the leg, and for as long
      // as it is still running out to the end of the string after you left.
      const on = inside || travelling;
      glow.dataset.on = String(on);
      if (on) draw(at);
      else at = null;
      if (travelling) frame = requestAnimationFrame(step);
      else last = 0;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };
    aim();
    if (inside) {
      at = target;
      draw(at);
    }
    glow.dataset.on = String(inside);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [layout]);

  return (
    <>
      <svg
        ref={svgRef}
        className="tc-meander"
        width={layout?.w}
        height={layout?.h}
        viewBox={layout ? `0 0 ${layout.w} ${layout.h}` : undefined}
        aria-hidden="true"
      >
        {layout && (
          <path
            ref={pathRef}
            d={route(ROUTE.map((p) => place(p, layout)), [layout.gutter / 2, layout.h])}
          />
        )}
      </svg>
      <span ref={glowRef} className="tc-meander-glow" data-on="false" aria-hidden="true" />
    </>
  );
}
