/**
 * Where a latitude and longitude land on the drawing in public/offline/world.svg.
 *
 * The map was drawn by d3-geo's Natural Earth projection (scripts/build-world-map.mjs),
 * which recorded its scale and offset. Natural Earth is a pair of polynomials,
 * so placing a pin needs those two numbers and the formula below — not d3 in
 * the browser.
 */

export type Point = { x: number; y: number };

/** d3-geo's geoNaturalEarth1Raw, unchanged. */
function naturalEarth1(lambda: number, phi: number): [number, number] {
  const phi2 = phi * phi;
  const phi4 = phi2 * phi2;
  return [
    lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4))),
    phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4))),
  ];
}

export function project(
  lat: number,
  lng: number,
  { scale, translate }: { scale: number; translate: [number, number] | number[] }
): Point {
  const [x, y] = naturalEarth1((lng * Math.PI) / 180, (lat * Math.PI) / 180);
  return { x: translate[0] + scale * x, y: translate[1] - scale * y };
}

export type ViewBox = { x: number; y: number; w: number; h: number };

/**
 * The smallest view of the given aspect ratio (width / height) that shows
 * every point with some room around it, never narrower than `minWidth` so a
 * single pin doesn't fill the screen, and never outside the map. `labelRoom`
 * adds that share of the width on the right, where pin labels sit.
 */
export function fitView(
  points: Point[],
  {
    aspect,
    minWidth,
    width,
    height,
    labelRoom = 0,
  }: { aspect: number; minWidth: number; width: number; height: number; labelRoom?: number }
): ViewBox {
  if (points.length === 0) return { x: 0, y: 0, w: width, h: height };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let w = Math.max(minWidth, (x1 - x0) * 1.5, (y1 - y0) * 1.5 * aspect);
  w = Math.min(w * (1 + labelRoom), width);
  const h = Math.min(w / aspect, height);
  const cx = (x0 + x1) / 2 + (w * labelRoom) / 2;
  const x = Math.min(Math.max(0, cx - w / 2), width - w);
  const y = Math.min(Math.max(0, (y0 + y1) / 2 - h / 2), height - h);
  return { x, y, w, h };
}

export type Bounds = { width: number; height: number; minWidth: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), Math.max(lo, hi));

/**
 * The view moved back inside the map, its width between `minWidth` and as
 * wide as the map allows. The aspect ratio never changes, so the map's box on
 * the page keeps its height while zooming.
 */
export function clampView(v: ViewBox, { width, height, minWidth }: Bounds): ViewBox {
  const aspect = v.w / v.h;
  const w = clamp(v.w, minWidth, Math.min(width, height * aspect));
  const h = w / aspect;
  return { x: clamp(v.x, 0, width - w), y: clamp(v.y, 0, height - h), w, h };
}

/**
 * The view scaled by `factor` (below 1 zooms in) around a point given as a
 * share of the view's width and height, which stays under the cursor.
 */
export function zoomView(v: ViewBox, factor: number, fx: number, fy: number, bounds: Bounds): ViewBox {
  const next = clampView({ ...v, w: v.w * factor, h: v.h * factor }, bounds);
  const px = v.x + fx * v.w;
  const py = v.y + fy * v.h;
  return clampView({ ...next, x: px - fx * next.w, y: py - fy * next.h }, bounds);
}

export type Label = { x: number; y: number; text: string };
export type LabelSpot = "right" | "left";

/**
 * Which pins get a name beside them, in screen pixels: each label goes to the
 * right of its pin, or the left when the right is taken, and is dropped when
 * both would overlap another label or pin or leave the box. Earlier labels win,
 * so list the ones that matter most first.
 */
export function placeLabels(
  labels: Label[],
  {
    width,
    height,
    charWidth = 7,
    lineHeight = 15,
    gap = 12,
    pinRadius = 7,
  }: { width: number; height: number; charWidth?: number; lineHeight?: number; gap?: number; pinRadius?: number }
): (LabelSpot | null)[] {
  type Rect = [number, number, number, number];
  const taken: Rect[] = labels.map((l) => [l.x - pinRadius, l.y - pinRadius, l.x + pinRadius, l.y + pinRadius]);
  const free = (r: Rect, self: number) =>
    r[0] >= 0 &&
    r[2] <= width &&
    r[1] >= 0 &&
    r[3] <= height &&
    taken.every((t, i) => i === self || r[2] <= t[0] || r[0] >= t[2] || r[3] <= t[1] || r[1] >= t[3]);
  return labels.map((l, i) => {
    const w = l.text.length * charWidth;
    const [top, bottom] = [l.y - lineHeight / 2, l.y + lineHeight / 2];
    const right: Rect = [l.x + gap, top, l.x + gap + w, bottom];
    const left: Rect = [l.x - gap - w, top, l.x - gap, bottom];
    for (const [spot, rect] of [
      ["right", right],
      ["left", left],
    ] as const) {
      if (free(rect, i)) {
        taken.push(rect);
        return spot;
      }
    }
    return null;
  });
}

export type Rect = [left: number, top: number, right: number, bottom: number];

/**
 * Which centred labels (province names) get drawn, in screen pixels: a label
 * is kept unless it overlaps one kept before it, a box to avoid (pins and
 * their names), or the edge of the map. Earlier labels win.
 */
export function placeCentered(
  labels: Label[],
  avoid: Rect[],
  {
    width,
    height,
    charWidth = 6.5,
    lineHeight = 13,
  }: { width: number; height: number; charWidth?: number; lineHeight?: number }
): boolean[] {
  const taken: Rect[] = [...avoid];
  return labels.map((l) => {
    const half = (l.text.length * charWidth) / 2;
    const r: Rect = [l.x - half, l.y - lineHeight / 2, l.x + half, l.y + lineHeight / 2];
    const ok =
      r[0] >= 0 &&
      r[2] <= width &&
      r[1] >= 0 &&
      r[3] <= height &&
      taken.every((t) => r[2] <= t[0] || r[0] >= t[2] || r[3] <= t[1] || r[1] >= t[3]);
    if (ok) taken.push(r);
    return ok;
  });
}
