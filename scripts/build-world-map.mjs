/**
 * Draws the world for /offline, in a Natural Earth projection:
 *
 * - public/offline/world.svg: every country as one path inside <g id="world">,
 *   with no fill or stroke of its own, so the page can colour it through
 *   `<use href>` with the theme's tokens. The browser caches it like any file.
 * - src/lib/offline/world-map.json: the same paths keyed by ISO alpha-2 code,
 *   for the few countries the page shades as visited, plus the scale and offset
 *   needed to drop a pin on the same projection.
 *
 * - Türkiye's 81 provinces, from Natural Earth's 1:10m admin-1 data (public
 *   domain): their borders go into world.svg as <g id="tr">, and each one's
 *   path into src/lib/offline/turkey-provinces.json, keyed by ISO 3166-2 code
 *   ("TR-34"), so the page can shade the provinces I have been to.
 *
 * Run it once and commit the output; the site never fetches a map at runtime.
 *   node scripts/build-world-map.mjs
 * The admin-1 file is 40 MB; it is downloaded once into the system temp folder.
 */
import { access, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";

const require = createRequire(import.meta.url);
const WIDTH = 1000;

const topology = JSON.parse(await readFile(require.resolve("world-atlas/countries-110m.json"), "utf8"));
// Antarctica only takes room at the bottom of a map of places people live.
const world = feature(topology, topology.objects.countries);
world.features = world.features.filter((f) => f.properties.name !== "Antarctica");

const projection = geoNaturalEarth1().fitWidth(WIDTH, world);
const path = geoPath(projection).digits(1);
const [[, top], [, bottom]] = path.bounds(world);
const height = Math.ceil(bottom - top + 2);
projection.translate([projection.translate()[0], projection.translate()[1] - top + 1]);

const shapes = [];
for (const f of world.features) {
  const d = path(f);
  if (!d) continue;
  // A few disputed areas have no ISO code; they still draw, they just can't be "visited".
  const id = countries.numericToAlpha2(f.id) ?? "";
  shapes.push({ id, name: f.properties.name, d });
}

// --- Türkiye's provinces -------------------------------------------------
const ADMIN1 = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";
const cache = join(tmpdir(), "ne_10m_admin_1_states_provinces.geojson");
if (!(await access(cache).then(() => true, () => false))) {
  console.log("downloading Natural Earth admin-1 (40 MB)…");
  const res = await fetch(ADMIN1);
  if (!res.ok) throw new Error(`admin-1 download failed: ${res.status}`);
  await writeFile(cache, Buffer.from(await res.arrayBuffer()));
}
const admin1 = JSON.parse(await readFile(cache, "utf8"));

/** Douglas–Peucker: drops points that stray less than `tolerance` from the line. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1;
    let farDist = tolerance;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const dist = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (dist > farDist) [far, farDist] = [i, dist];
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// A province spans a few map units, and the map zooms to about 40 units
// across, so a hundredth of a unit is below a pixel even fully zoomed in.
const ringPath = (ring) => {
  const all = ring.map((c) => projection(c));
  // A closed ring starts and ends on the same point, which would leave
  // simplify() no line to measure from; each half is simplified on its own.
  const mid = Math.floor(all.length / 2);
  const pts = [...simplify(all.slice(0, mid + 1), 0.02).slice(0, -1), ...simplify(all.slice(mid), 0.02)];
  return pts.length < 3 ? "" : "M" + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L") + "Z";
};
const provinces = admin1.features
  .filter((f) => f.properties.iso_a2 === "TR")
  .map((f) => {
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    const d = polygons.flatMap((rings) => rings.map(ringPath)).join("");
    // Where the name is written: the middle of the province, in map units.
    const [cx, cy] = projection(geoCentroid(f));
    return {
      id: f.properties.iso_3166_2,
      name: f.properties.name_tr ?? f.properties.name,
      cx: Math.round(cx * 100) / 100,
      cy: Math.round(cy * 100) / 100,
      d,
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));
await writeFile(new URL("../src/lib/offline/turkey-provinces.json", import.meta.url), JSON.stringify(provinces));

const out = {
  width: WIDTH,
  height,
  // pin = naturalEarth1Raw(λ, φ) * scale + translate, with y flipped (see projection.ts).
  scale: projection.scale(),
  translate: projection.translate(),
  shapes,
};
await writeFile(new URL("../src/lib/offline/world-map.json", import.meta.url), JSON.stringify(out));
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}"><g id="world">` +
  shapes.map((s) => `<path d="${s.d}"/>`).join("") +
  `</g><g id="tr">` +
  provinces.map((p) => `<path d="${p.d}"/>`).join("") +
  "</g></svg>";
await writeFile(new URL("../public/offline/world.svg", import.meta.url), svg);
console.log(`world-map.json: ${shapes.length} shapes, ${WIDTH}×${height}; ${provinces.length} provinces`);
