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
