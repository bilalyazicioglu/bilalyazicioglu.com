/**
 * What /offline shows: places I have been and books I have read. Newest
 * first is not required here — the page sorts — so add entries anywhere.
 *
 * Adding a book:  node scripts/fetch-cover.mjs <isbn>, then an entry below
 *                 with `cover: "/offline/books/<isbn>.jpg"`.
 * Adding photos:  node scripts/add-place-photo.mjs <file> <place-slug>, which
 *                 shrinks the image and strips its metadata (phones write the
 *                 exact GPS position into every photo).
 */

export type Photo = {
  /** Under /public, e.g. "/offline/places/oviedo-1.jpg". */
  src: string;
  /** What the photo shows, for anyone who can't see it. */
  alt: string;
};

export type Place = {
  /** Lower-case and dashed, used for photo file names: "oviedo". */
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
  /** Under /public, e.g. "/offline/books/9781449373320.jpg". */
  cover?: string;
  /** "2026-09" when finished. */
  finished?: string;
  /** Present while I'm still reading it. */
  reading?: { page: number; pages: number };
  note?: string;
  /** The language the title is in, when it isn't English. */
  lang?: string;
};

export const places: Place[] = [
  {
    slug: "istanbul",
    city: "Istanbul",
    country: "Türkiye",
    countryCode: "TR",
    lat: 41.01,
    lng: 28.98,
    note: "Where I live and study.",
    home: true,
  },
  {
    slug: "oviedo",
    city: "Oviedo",
    country: "Spain",
    countryCode: "ES",
    lat: 43.36,
    lng: -5.85,
    year: 2026,
    note: "An Erasmus semester at Universidad de Oviedo, and a season with the university basketball team.",
  },
];

export const books: Book[] = [];
