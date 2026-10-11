import { slugify } from "@/lib/slug";

/**
 * Searches the admin panel runs on the server: covers for a book, and
 * coordinates for a city. Nothing here is stored; the panel shows the results
 * and the chosen one is saved.
 */

export type CoverCandidate = { url: string; from: string };

const get = (url: string, init: RequestInit = {}) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(15_000) }).then((r) => (r.ok ? r : null), () => null);

/**
 * Open Library first, then Google Books, which knows more Turkish editions.
 * Open Library sometimes files a page scan or an author photo as a cover,
 * so the panel shows them all to pick from.
 */
export async function findCovers({ isbn, title, author }: { isbn?: string; title?: string; author?: string }): Promise<CoverCandidate[]> {
  const cleanIsbn = (isbn ?? "").replace(/[-\s]/g, "");
  const byIsbn = /^(\d{9}[\dX]|\d{13})$/i.test(cleanIsbn);
  const found: CoverCandidate[] = [];

  if (byIsbn) {
    // default=false answers 404 instead of a blank placeholder.
    const url = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`;
    if (await get(url, { method: "HEAD" })) found.push({ url, from: "Open Library" });
  } else if (title) {
    // By title alone, matching the author loosely: Open Library spells the
    // same name several ways ("Oğuz", "Oguz", "Oǧuz").
    const q = new URLSearchParams({ title, limit: "20", fields: "title,author_name,cover_i" });
    const res = await get(`https://openlibrary.org/search.json?${q}`);
    const docs: { title: string; author_name?: string[]; cover_i?: number }[] = res ? ((await res.json()).docs ?? []) : [];
    const surname = author ? slugify(author).split("-").at(-1) ?? "" : "";
    for (const d of docs) {
      if (!d.cover_i) continue;
      if (surname && !(d.author_name ?? []).some((a) => slugify(a).includes(surname))) continue;
      found.push({ url: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`, from: `Open Library: ${d.title}` });
      if (found.length >= 6) break;
    }
  }

  const q = byIsbn ? `isbn:${cleanIsbn}` : title ? `intitle:${title}${author ? ` inauthor:${author}` : ""}` : "";
  if (q) {
    const key = process.env.GOOGLE_BOOKS_KEY;
    const params = new URLSearchParams({ q, maxResults: "6", ...(key && { key }) });
    const res = await get(`https://www.googleapis.com/books/v1/volumes?${params}`);
    const items: { volumeInfo?: { title?: string; imageLinks?: { thumbnail?: string } } }[] = res ? ((await res.json()).items ?? []) : [];
    for (const item of items) {
      const thumb = item.volumeInfo?.imageLinks?.thumbnail;
      if (!thumb) continue;
      // zoom=0 asks for the largest scan; edge=curl would add a fake page curl.
      const url = thumb.replace(/^http:/, "https:").replace("&edge=curl", "").replace(/zoom=\d/, "zoom=0");
      found.push({ url, from: `Google Books: ${item.volumeInfo?.title ?? ""}` });
    }
  }
  return found;
}

export type CityCandidate = { city: string; country: string; countryCode: string; lat: number; lng: number; label: string };

/** OpenStreetMap's Nominatim: free, one request a second, and it asks callers to name themselves. */
export async function findCity(query: string): Promise<CityCandidate[]> {
  const params = new URLSearchParams({ q: query, format: "jsonv2", addressdetails: "1", limit: "6", "accept-language": "en" });
  const res = await get(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "bilalyazicioglu.com admin (offline map)" },
  });
  const rows: { lat: string; lon: string; name?: string; display_name: string; address?: Record<string, string> }[] = res ? await res.json() : [];
  return rows
    .map((r) => {
      const a = r.address ?? {};
      return {
        city: a.city ?? a.town ?? a.village ?? a.municipality ?? r.name ?? "",
        country: a.country ?? "",
        countryCode: (a.country_code ?? "").toUpperCase(),
        lat: Math.round(Number(r.lat) * 1000) / 1000,
        lng: Math.round(Number(r.lon) * 1000) / 1000,
        label: r.display_name,
      };
    })
    .filter((c) => c.city && /^[A-Z]{2}$/.test(c.countryCode));
}
