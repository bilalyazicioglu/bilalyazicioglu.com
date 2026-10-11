import { describe, expect, it } from "vitest";
import { geoNaturalEarth1 } from "d3-geo";
import map from "./world-map.json";
import { clampView, fitView, placeLabels, project, zoomView } from "./projection";
import { byCountry, progressBar, shelve, tally, trips } from "./shelf";
import { parseOffline, type Book, type Place } from "./data";

describe("project", () => {
  it("puts a pin exactly where d3 drew the map", () => {
    const d3 = geoNaturalEarth1().scale(map.scale).translate(map.translate as [number, number]);
    for (const [lat, lng] of [
      [41.01, 28.98],
      [43.36, -5.85],
      [-33.87, 151.21],
      [64.15, -21.94],
    ]) {
      const [x, y] = d3([lng, lat])!;
      const p = project(lat, lng, map);
      expect(p.x).toBeCloseTo(x, 6);
      expect(p.y).toBeCloseTo(y, 6);
    }
  });

  it("keeps every pin on the drawing", () => {
    const p = project(-55, -70, map);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(map.height);
  });
});

describe("fitView", () => {
  const size = { width: 1000, height: 440 };

  it("frames all points at the requested aspect ratio", () => {
    const v = fitView([{ x: 400, y: 150 }, { x: 560, y: 170 }], { ...size, aspect: 2, minWidth: 80 });
    expect(v.w / v.h).toBeCloseTo(2);
    expect(v.x).toBeLessThan(400);
    expect(v.x + v.w).toBeGreaterThan(560);
  });

  it("doesn't zoom in past minWidth on a single pin", () => {
    expect(fitView([{ x: 500, y: 200 }], { ...size, aspect: 2, minWidth: 120 }).w).toBe(120);
  });

  it("stays inside the map near an edge", () => {
    const v = fitView([{ x: 5, y: 5 }], { ...size, aspect: 2, minWidth: 200 });
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });
});

describe("zoomView", () => {
  const bounds = { width: 1000, height: 440, minWidth: 40 };
  const v = { x: 0, y: 0, w: 880, h: 440 };

  it("keeps the point under the cursor in place", () => {
    const z = zoomView(v, 0.5, 0.25, 0.5, bounds);
    expect(z.w).toBe(440);
    expect(z.x + 0.25 * z.w).toBeCloseTo(v.x + 0.25 * v.w);
    expect(z.y + 0.5 * z.h).toBeCloseTo(v.y + 0.5 * v.h);
  });

  it("keeps the aspect ratio", () => {
    const z = zoomView(v, 0.3, 0.5, 0.5, bounds);
    expect(z.w / z.h).toBeCloseTo(2);
  });

  it("stops at minWidth and at the whole map", () => {
    expect(zoomView(v, 0.001, 0.5, 0.5, bounds).w).toBe(40);
    expect(zoomView(v, 10, 0.5, 0.5, bounds).w).toBe(880);
  });

  it("won't pan past the edge", () => {
    expect(clampView({ x: -50, y: 900, w: 200, h: 100 }, bounds)).toEqual({ x: 0, y: 340, w: 200, h: 100 });
  });
});

describe("placeLabels", () => {
  const box = { width: 400, height: 200 };

  it("puts a lone label on the right", () => {
    expect(placeLabels([{ x: 100, y: 100, text: "Oviedo" }], box)).toEqual(["right"]);
  });

  it("moves a label left when the right is taken, and drops it when both are", () => {
    const spots = placeLabels(
      [
        { x: 100, y: 100, text: "Gijón" }, // the right would cover Avilés's pin
        { x: 130, y: 100, text: "Avilés" },
        { x: 115, y: 100, text: "Luanco" }, // boxed in on both sides
      ],
      box
    );
    expect(spots).toEqual(["left", "right", null]);
  });

  it("flips at the box's right edge", () => {
    expect(placeLabels([{ x: 390, y: 100, text: "Medina" }], box)).toEqual(["left"]);
  });
});

const book = (title: string, status: Book["status"]): Book => ({ title, author: "A", status });

describe("shelve", () => {
  it("splits current reads from recent ones and keeps the order set in the panel", () => {
    const { reading, read } = shelve([book("b", "read"), book("now", "reading"), book("a", "read")]);
    expect(reading.map((b) => b.title)).toEqual(["now"]);
    expect(read.map((b) => b.title)).toEqual(["b", "a"]);
  });
});

describe("parseOffline", () => {
  const place = { slug: "oviedo", city: "Oviedo", country: "Spain", countryCode: "es", lat: 43.36, lng: -5.85 };

  it("keeps good data and tidies it", () => {
    const parsed = parseOffline({
      places: [{ ...place, note: "  hi  ", year: "2026", photos: [{ src: "/media/offline/a-1.jpg", alt: "x" }] }],
      books: [{ title: "T", author: "A", status: "reading", progress: { page: 500, pages: 300 } }],
      turkey: { visited: ["TR-07", "TR-34", "nope"], lived: ["TR-34"] },
    });
    expect(parsed).toEqual({
      places: [{ ...place, countryCode: "ES", note: "hi", year: 2026, photos: [{ src: "/media/offline/a-1.jpg", alt: "x" }] }],
      books: [{ title: "T", author: "A", status: "reading", progress: { page: 300, pages: 300 } }],
      turkey: { visited: ["TR-07"], lived: ["TR-34"] },
    });
  });

  it("refuses what would break the page", () => {
    expect(parseOffline({ places: [{ ...place, lat: 200 }] })).toHaveProperty("error");
    expect(parseOffline({ places: [place, place] })).toHaveProperty("error");
    expect(parseOffline({ books: [{ title: "", author: "A" }] })).toHaveProperty("error");
  });

  it("only lets covers and photos point at this site", () => {
    const parsed = parseOffline({
      books: [
        { title: "T", author: "A", cover: "https://evil.example/x.jpg" },
        { title: "U", author: "A", cover: "//evil.example/x.jpg" },
        { title: "V", author: "A", cover: "/media/../../etc/passwd" },
      ],
    });
    expect("error" in parsed ? null : parsed.books.map((b) => b.cover)).toEqual([undefined, undefined, undefined]);
  });
});

describe("places", () => {
  const place = (slug: string, countryCode: string, year?: number, home = false): Place => ({
    slug,
    city: slug,
    country: countryCode,
    countryCode,
    lat: 0,
    lng: 0,
    year,
    home,
  });
  const all = [place("ist", "TR", undefined, true), place("a", "ES", 2025), place("b", "ES", 2026), place("c", "PT", 2026)];

  it("leaves home out of the trips and the tally", () => {
    expect(trips(all).map((p) => p.slug)).toEqual(["b", "c", "a"]);
    expect(tally(all)).toBe("3 places in 2 countries");
    expect(tally([all[0], all[1]])).toBe("1 place in 1 country");
  });

  it("groups trips by country, the most visited first", () => {
    const groups = byCountry([place("ist", "TR", undefined, true), place("rome", "IT"), place("lugo", "ES"), place("leon", "ES")]);
    expect(groups.map(([country, list]) => [country, list.map((p) => p.slug)])).toEqual([
      ["ES", ["lugo", "leon"]],
      ["IT", ["rome"]],
    ]);
  });
});

describe("labels", () => {
  it("draws progress", () => {
    expect(progressBar({ page: 50, pages: 100 })).toEqual(["███████", "░░░░░░░"]);
    expect(progressBar({ page: 400, pages: 100 }).join("")).toBe("██████████████");
  });
});
