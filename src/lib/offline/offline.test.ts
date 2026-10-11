import { describe, expect, it } from "vitest";
import { geoNaturalEarth1 } from "d3-geo";
import map from "./world-map.json";
import { fitView, project } from "./projection";
import { monthLabel, progressBar, shelve, tally, trips } from "./shelf";
import type { Book, Place } from "./data";

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

const book = (title: string, extra: Partial<Book>): Book => ({ title, author: "A", ...extra });

describe("shelve", () => {
  it("puts current reads first and groups the rest by year, newest first", () => {
    const { reading, years } = shelve([
      book("old", { finished: "2025-11" }),
      book("now", { reading: { page: 10, pages: 100 } }),
      book("new", { finished: "2026-09" }),
      book("mid", { finished: "2026-04" }),
    ]);
    expect(reading.map((b) => b.title)).toEqual(["now"]);
    expect(years.map((y) => [y.year, y.books.map((b) => b.title)])).toEqual([
      ["2026", ["new", "mid"]],
      ["2025", ["old"]],
    ]);
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
});

describe("labels", () => {
  it("formats months and draws progress", () => {
    expect(monthLabel("2026-09")).toBe("Sep 2026");
    expect(progressBar({ page: 50, pages: 100 })).toEqual(["███████", "░░░░░░░"]);
    expect(progressBar({ page: 400, pages: 100 }).join("")).toBe("██████████████");
  });
});
