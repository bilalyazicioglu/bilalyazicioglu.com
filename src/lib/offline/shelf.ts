import type { Book, Place } from "./data";

/** Books still being read, then finished ones grouped by year, newest first. */
export function shelve(books: Book[]): { reading: Book[]; years: { year: string; books: Book[] }[] } {
  const reading = books.filter((b) => b.reading);
  const finished = books
    .filter((b) => !b.reading && b.finished)
    .sort((a, b) => b.finished!.localeCompare(a.finished!));
  const years: { year: string; books: Book[] }[] = [];
  for (const book of finished) {
    const year = book.finished!.slice(0, 4);
    const group = years.at(-1);
    if (group?.year === year) group.books.push(book);
    else years.push({ year, books: [book] });
  }
  return { reading, years };
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

/** "5 places in 3 countries", counting the home country only if a trip went there. */
export function tally(places: Place[]): string {
  const away = trips(places);
  const countries = new Set(away.map((p) => p.countryCode)).size;
  const placeWord = away.length === 1 ? "place" : "places";
  const countryWord = countries === 1 ? "country" : "countries";
  return `${away.length} ${placeWord} in ${countries} ${countryWord}`;
}

/** "Sep 2026" from "2026-09"; nothing from a bare "2026", which its year heading already says. */
export function monthLabel(finished: string): string {
  const [year, month] = finished.split("-").map(Number);
  if (!month) return "";
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Fourteen blocks, filled in proportion to the page I'm on. */
export function progressBar({ page, pages }: { page: number; pages: number }, width = 14): [string, string] {
  const filled = Math.max(0, Math.min(width, Math.round((page / Math.max(1, pages)) * width)));
  return ["█".repeat(filled), "░".repeat(width - filled)];
}
