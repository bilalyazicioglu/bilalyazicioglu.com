/**
 * What /offline shows: places I have been, the provinces of Türkiye I have
 * been to, and the books I am reading or have just read.
 *
 * The data is edited from the admin panel and kept on the content volume
 * (see store.ts); src/content/offline.json is the starting copy. This module
 * holds only the shapes and the check every save goes through, so the browser
 * can share it.
 */

export type Photo = {
  /** "/media/offline/oviedo-1a2b.jpg", or a file under /public. */
  src: string;
  /** What the photo shows, for anyone who can't see it. */
  alt: string;
};

export type Place = {
  /** Lower-case and dashed: "oviedo". Unique; names the place's photo files. */
  slug: string;
  city: string;
  country: string;
  /** ISO 3166-1 alpha-2, which is how the map knows which country to shade. */
  countryCode: string;
  lat: number;
  lng: number;
  /** The year of the visit; left out for home. */
  year?: number;
  note?: string;
  photos?: Photo[];
  /** Drawn as a hollow pin, and not counted as a trip. */
  home?: boolean;
};

export type Book = {
  title: string;
  author: string;
  /** "/media/offline/…jpg", or a file under /public. */
  cover?: string;
  /** Still on it, or read recently. The shelf is what I'm reading now, not an archive. */
  status: "reading" | "read";
  /** Where I am in a book I'm reading. */
  progress?: { page: number; pages: number };
  note?: string;
  /** The language the title is in, when it isn't English. */
  lang?: string;
};

export type OfflineData = {
  places: Place[];
  /** In shelf order: the first one shows first. */
  books: Book[];
  /** Provinces of Türkiye by ISO 3166-2 code ("TR-34"), shaded on the map. */
  turkey: { visited: string[]; lived: string[] };
};

const LIMIT = { text: 200, note: 600, places: 300, books: 60, photos: 12 };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function text(v: unknown, max = LIMIT.text): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** A path on this site, never another origin, so a saved cover or photo can't point anywhere else. */
function localPath(v: unknown): string {
  const s = text(v, 300);
  return /^\/(?!\/)[\w\-./]+$/.test(s) && !s.includes("..") ? s : "";
}

const optional = <T>(value: T | "" | undefined) => (value === "" || value === undefined ? undefined : value);

function parsePlace(raw: unknown, i: number): Place | string {
  if (!isObject(raw)) return `Place ${i + 1} is not an object.`;
  const slug = text(raw.slug, 60);
  const city = text(raw.city);
  const country = text(raw.country);
  const countryCode = text(raw.countryCode, 2).toUpperCase();
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return `Place ${i + 1}: the slug may only hold a-z, 0-9 and dashes.`;
  if (!city || !country) return `Place "${slug}": city and country are required.`;
  if (!/^[A-Z]{2}$/.test(countryCode)) return `Place "${slug}": the country code must be two letters.`;
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) return `Place "${slug}": the coordinates are out of range.`;
  const year = Number(raw.year);
  const photos = (Array.isArray(raw.photos) ? raw.photos : [])
    .filter(isObject)
    .map((p) => ({ src: localPath(p.src), alt: text(p.alt) }))
    .filter((p) => p.src)
    .slice(0, LIMIT.photos);
  return {
    slug,
    city,
    country,
    countryCode,
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
    year: Number.isInteger(year) && year > 1900 && year < 2200 ? year : undefined,
    note: optional(text(raw.note, LIMIT.note)),
    photos: photos.length ? photos : undefined,
    home: raw.home === true || undefined,
  };
}

function parseBook(raw: unknown, i: number): Book | string {
  if (!isObject(raw)) return `Book ${i + 1} is not an object.`;
  const title = text(raw.title);
  const author = text(raw.author);
  if (!title || !author) return `Book ${i + 1}: title and author are required.`;
  const status = raw.status === "reading" ? "reading" : "read";
  let progress: Book["progress"];
  if (status === "reading" && isObject(raw.progress)) {
    const page = Math.floor(Number(raw.progress.page));
    const pages = Math.floor(Number(raw.progress.pages));
    if (pages > 0 && page >= 0) progress = { page: Math.min(page, pages), pages };
  }
  return {
    title,
    author,
    cover: optional(localPath(raw.cover)),
    status,
    progress,
    note: optional(text(raw.note, LIMIT.note)),
    lang: optional(text(raw.lang, 12)),
  };
}

const provinceList = (v: unknown) =>
  [...new Set((Array.isArray(v) ? v : []).filter((c): c is string => typeof c === "string" && /^TR-\d{2}$/.test(c)))].sort();

/**
 * The check every save from the admin panel goes through: trims and caps the
 * text, drops what isn't understood, and refuses what would break the page.
 */
export function parseOffline(raw: unknown): OfflineData | { error: string } {
  if (!isObject(raw)) return { error: "The data must be an object." };
  const rawPlaces = Array.isArray(raw.places) ? raw.places.slice(0, LIMIT.places) : [];
  const rawBooks = Array.isArray(raw.books) ? raw.books.slice(0, LIMIT.books) : [];
  const places: Place[] = [];
  for (const [i, p] of rawPlaces.entries()) {
    const place = parsePlace(p, i);
    if (typeof place === "string") return { error: place };
    if (places.some((other) => other.slug === place.slug)) return { error: `Two places share the slug "${place.slug}".` };
    places.push(place);
  }
  const books: Book[] = [];
  for (const [i, b] of rawBooks.entries()) {
    const book = parseBook(b, i);
    if (typeof book === "string") return { error: book };
    books.push(book);
  }
  const turkey = isObject(raw.turkey) ? raw.turkey : {};
  const lived = provinceList(turkey.lived);
  // A province I lived in is not also listed as one I visited.
  const visited = provinceList(turkey.visited).filter((c) => !lived.includes(c));
  return { places, books, turkey: { visited, lived } };
}
