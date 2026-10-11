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
  /** "2026-09" when finished, or just "2026" when the month is forgotten. */
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
  { slug: "a-coruna", city: "A Coruña", country: "Spain", countryCode: "ES", lat: 43.362, lng: -8.411 },
  { slug: "lugo", city: "Lugo", country: "Spain", countryCode: "ES", lat: 43.012, lng: -7.556 },
  { slug: "o-cebreiro", city: "O Cebreiro", country: "Spain", countryCode: "ES", lat: 42.708, lng: -7.043 },
  { slug: "villafranca-del-bierzo", city: "Villafranca del Bierzo", country: "Spain", countryCode: "ES", lat: 42.607, lng: -6.811 },
  { slug: "cudillero", city: "Cudillero", country: "Spain", countryCode: "ES", lat: 43.563, lng: -6.146 },
  { slug: "aviles", city: "Avilés", country: "Spain", countryCode: "ES", lat: 43.556, lng: -5.925 },
  { slug: "luanco", city: "Luanco", country: "Spain", countryCode: "ES", lat: 43.614, lng: -5.792 },
  { slug: "gijon", city: "Gijón", country: "Spain", countryCode: "ES", lat: 43.532, lng: -5.661 },
  { slug: "ribadesella", city: "Ribadesella", country: "Spain", countryCode: "ES", lat: 43.462, lng: -5.059 },
  { slug: "arriondas", city: "Arriondas", country: "Spain", countryCode: "ES", lat: 43.389, lng: -5.185 },
  { slug: "cangas-de-onis", city: "Cangas de Onís", country: "Spain", countryCode: "ES", lat: 43.351, lng: -5.129 },
  { slug: "san-vicente-de-la-barquera", city: "San Vicente de la Barquera", country: "Spain", countryCode: "ES", lat: 43.384, lng: -4.399 },
  { slug: "santander", city: "Santander", country: "Spain", countryCode: "ES", lat: 43.462, lng: -3.81 },
  { slug: "laredo", city: "Laredo", country: "Spain", countryCode: "ES", lat: 43.41, lng: -3.416 },
  { slug: "bilbao", city: "Bilbao", country: "Spain", countryCode: "ES", lat: 43.263, lng: -2.935 },
  { slug: "eibar", city: "Eibar", country: "Spain", countryCode: "ES", lat: 43.184, lng: -2.472 },
  { slug: "san-sebastian", city: "San Sebastián", country: "Spain", countryCode: "ES", lat: 43.318, lng: -1.981 },
  { slug: "vitoria-gasteiz", city: "Vitoria-Gasteiz", country: "Spain", countryCode: "ES", lat: 42.847, lng: -2.672 },
  { slug: "leon", city: "León", country: "Spain", countryCode: "ES", lat: 42.599, lng: -5.567 },
  { slug: "astorga", city: "Astorga", country: "Spain", countryCode: "ES", lat: 42.458, lng: -6.056 },
  { slug: "burgos", city: "Burgos", country: "Spain", countryCode: "ES", lat: 42.344, lng: -3.697 },
  { slug: "benavente", city: "Benavente", country: "Spain", countryCode: "ES", lat: 42.003, lng: -5.678 },
  { slug: "valladolid", city: "Valladolid", country: "Spain", countryCode: "ES", lat: 41.652, lng: -4.724 },
  { slug: "zamora", city: "Zamora", country: "Spain", countryCode: "ES", lat: 41.504, lng: -5.745 },
  { slug: "zaragoza", city: "Zaragoza", country: "Spain", countryCode: "ES", lat: 41.649, lng: -0.889 },
  { slug: "lleida", city: "Lleida", country: "Spain", countryCode: "ES", lat: 41.617, lng: 0.62 },
  { slug: "barcelona", city: "Barcelona", country: "Spain", countryCode: "ES", lat: 41.387, lng: 2.169 },
  { slug: "salamanca", city: "Salamanca", country: "Spain", countryCode: "ES", lat: 40.97, lng: -5.663 },
  { slug: "madrid", city: "Madrid", country: "Spain", countryCode: "ES", lat: 40.417, lng: -3.704 },
  { slug: "plasencia", city: "Plasencia", country: "Spain", countryCode: "ES", lat: 40.03, lng: -6.088 },
  { slug: "caceres", city: "Cáceres", country: "Spain", countryCode: "ES", lat: 39.475, lng: -6.372 },
  { slug: "merida", city: "Mérida", country: "Spain", countryCode: "ES", lat: 38.916, lng: -6.344 },
  { slug: "valencia", city: "Valencia", country: "Spain", countryCode: "ES", lat: 39.47, lng: -0.376 },
  { slug: "seville", city: "Seville", country: "Spain", countryCode: "ES", lat: 37.389, lng: -5.984 },
  { slug: "jerez", city: "Jerez de la Frontera", country: "Spain", countryCode: "ES", lat: 36.686, lng: -6.137 },
  { slug: "cadiz", city: "Cádiz", country: "Spain", countryCode: "ES", lat: 36.527, lng: -6.289 },
  { slug: "lisbon", city: "Lisbon", country: "Portugal", countryCode: "PT", lat: 38.722, lng: -9.139 },
  { slug: "paris", city: "Paris", country: "France", countryCode: "FR", lat: 48.857, lng: 2.352 },
  { slug: "bordeaux", city: "Bordeaux", country: "France", countryCode: "FR", lat: 44.838, lng: -0.579 },
  { slug: "rome", city: "Rome", country: "Italy", countryCode: "IT", lat: 41.903, lng: 12.496 },
  { slug: "ghent", city: "Ghent", country: "Belgium", countryCode: "BE", lat: 51.054, lng: 3.725 },
  { slug: "bruges", city: "Bruges", country: "Belgium", countryCode: "BE", lat: 51.209, lng: 3.225 },
  { slug: "brussels", city: "Brussels", country: "Belgium", countryCode: "BE", lat: 50.85, lng: 4.352 },
  { slug: "amsterdam", city: "Amsterdam", country: "Netherlands", countryCode: "NL", lat: 52.37, lng: 4.895 },
  { slug: "mecca", city: "Mecca", country: "Saudi Arabia", countryCode: "SA", lat: 21.389, lng: 39.858 },
  { slug: "medina", city: "Medina", country: "Saudi Arabia", countryCode: "SA", lat: 24.467, lng: 39.611 },
];

export const books: Book[] = [
  {
    title: "A Game of Thrones",
    author: "George R. R. Martin",
    cover: "/offline/books/9780553593716.jpg",
    finished: "2026",
  },
  {
    title: "Silent Spring",
    author: "Rachel Carson",
    cover: "/offline/books/9780618249060.jpg",
    finished: "2026",
  },
  {
    title: "Why Nations Fail",
    author: "Daron Acemoğlu, James A. Robinson",
    cover: "/offline/books/9780307719225.jpg",
    finished: "2026",
  },
];
