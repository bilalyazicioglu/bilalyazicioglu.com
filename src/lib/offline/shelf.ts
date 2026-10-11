import type { Book, Place } from "./data";

/** The shelf in the order the admin panel set: books I'm reading, then ones I just read. */
export function shelve(books: Book[]): { reading: Book[]; read: Book[] } {
  return { reading: books.filter((b) => b.status === "reading"), read: books.filter((b) => b.status === "read") };
}

/** Trips newest first; home is the starting point, not a trip. */
export function trips(places: Place[]): Place[] {
  return places.filter((p) => !p.home).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

/** Trips by country, the most visited country first, places in the order listed. */
export function byCountry(places: Place[]): [string, Place[]][] {
  const groups = new Map<string, Place[]>();
  for (const place of trips(places)) groups.set(place.country, [...(groups.get(place.country) ?? []), place]);
  return [...groups].sort((a, b) => b[1].length - a[1].length);
}

/**
 * "5 places in 3 countries", counting the home country only if a trip went
 * there, and the provinces of Türkiye when any are marked.
 */
export function tally(places: Place[], provinces = 0): string {
  const away = trips(places);
  const countries = new Set(away.map((p) => p.countryCode)).size;
  const placeWord = away.length === 1 ? "place" : "places";
  const countryWord = countries === 1 ? "country" : "countries";
  const line = `${away.length} ${placeWord} in ${countries} ${countryWord}`;
  return provinces ? `${line}, ${provinces} of Türkiye's 81 provinces` : line;
}

/** Fourteen blocks, filled in proportion to the page I'm on. */
export function progressBar({ page, pages }: { page: number; pages: number }, width = 14): [string, string] {
  const filled = Math.max(0, Math.min(width, Math.round((page / Math.max(1, pages)) * width)));
  return ["█".repeat(filled), "░".repeat(width - filled)];
}
