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
 * Run it once and commit the output; the site never fetches a map at runtime.
 *   node scripts/build-world-map.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { geoNaturalEarth1, geoPath } from "d3-geo";
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
  "</g></svg>";
await writeFile(new URL("../public/offline/world.svg", import.meta.url), svg);
console.log(`world-map.json: ${shapes.length} shapes, ${WIDTH}×${height}`);
