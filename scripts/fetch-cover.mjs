/**
 * Finds a book cover online and saves it into public/offline/books/, so the
 * page serves it itself and no visitor's browser asks another site for it.
 *
 *   node scripts/fetch-cover.mjs 9781449373320
 *   node scripts/fetch-cover.mjs "Kürk Mantolu Madonna" "Sabahattin Ali"
 *
 * An ISBN gets that exact edition from Open Library. A title and author search
 * Open Library first, then Google Books, which knows more Turkish editions.
 * The command prints the `cover:` line to paste into src/lib/offline/data.ts.
 *
 * Look at the saved image before using it: Open Library sometimes has a page
 * scan or an author photo filed as the cover, Turkish books most of all. A
 * number after the author skips to another match:
 *   node scripts/fetch-cover.mjs "Tutunamayanlar" "Oğuz Atay" 2
 *
 * When no search finds it, give the image itself — a link or a file — and the
 * title to name it by:
 *   node scripts/fetch-cover.mjs https://…/cover.jpg "Tutunamayanlar"
 *   node scripts/fetch-cover.mjs ~/Downloads/cover.png "Tutunamayanlar"
 *
 * Google Books allows a few anonymous searches a day across everyone; set
 * GOOGLE_BOOKS_KEY (a free key from Google Cloud) to search it reliably.
 */
import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const [first, author, pick = "1"] = process.argv.slice(2);
let skip = Math.max(0, Number(pick) - 1 || 0);
if (!first) {
  console.error('usage: node scripts/fetch-cover.mjs <isbn>\n       node scripts/fetch-cover.mjs "<title>" "<author>"');
  process.exit(1);
}

const direct = /^https?:\/\//.test(first) || /\.(jpe?g|png|webp|avif)$/i.test(first);
const isbn = first.replace(/[-\s]/g, "");
const byIsbn = /^(\d{9}[\dX]|\d{13})$/i.test(isbn);

/** "Kürk Mantolu Madonna" → "kurk-mantolu-madonna". */
const slugify = (text) =>
  text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function get(url, seconds = 15) {
  const res = await fetch(url, { signal: AbortSignal.timeout(seconds * 1000) });
  return res.ok ? res : null;
}

async function openLibrary() {
  if (byIsbn) {
    // default=false makes Open Library answer 404 instead of a blank placeholder.
    return [{ url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`, from: "Open Library" }];
  }
  // Search by title alone and match the author loosely: Open Library spells the
  // same name several ways ("Oğuz", "Oguz", "Oǧuz"), and a strict author filter
  // misses them.
  const q = new URLSearchParams({ title: first, limit: "20", fields: "title,author_name,cover_i" });
  const res = await get(`https://openlibrary.org/search.json?${q}`);
  const docs = (res && (await res.json()).docs?.filter((d) => d.cover_i)) ?? [];
  const surname = author ? slugify(author).split("-").at(-1) : "";
  // Several editions, best match first: the covers server is slow, and some
  // images never arrive, so the next edition is the fallback.
  return docs
    .filter((d) => !author || (d.author_name ?? []).some((a) => slugify(a).includes(surname)))
    .slice(0, 5)
    .map((d) => ({ url: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg?default=false`, from: `Open Library ("${d.title}")` }));
}

async function googleBooks() {
  const q = byIsbn ? `isbn:${isbn}` : `intitle:${first}${author ? ` inauthor:${author}` : ""}`;
  const key = process.env.GOOGLE_BOOKS_KEY;
  const params = new URLSearchParams({ q, maxResults: "5", ...(key && { key }) });
  const res = await get(`https://www.googleapis.com/books/v1/volumes?${params}`);
  const item = res && (await res.json()).items?.find((i) => i.volumeInfo?.imageLinks?.thumbnail);
  if (!item) return [];
  // zoom=0 asks for the largest scan Google has; edge=curl would add a fake page curl.
  const url = item.volumeInfo.imageLinks.thumbnail.replace(/^http:/, "https:").replace("&edge=curl", "").replace(/zoom=\d/, "zoom=0");
  return [{ url, from: `Google Books ("${item.volumeInfo.title}")` }];
}

let image = null;
if (direct) {
  if (!author) {
    console.error('Give the title too, to name the file: node scripts/fetch-cover.mjs <image> "<title>"');
    process.exit(1);
  }
  const res = /^https?:/.test(first) ? await get(first, 30) : null;
  const bytes = res ? Buffer.from(await res.arrayBuffer()) : await readFile(first.replace(/^~/, process.env.HOME ?? "~"));
  image = { bytes, from: res ? "the link" : "the file" };
}
search: for (const source of direct ? [] : [openLibrary, googleBooks]) {
  for (const found of (await source().catch(() => [])) ?? []) {
    console.error(`trying ${found.from}…`);
    const res = await get(found.url, 30).catch(() => null);
    if (!res) continue;
    const bytes = Buffer.from(await res.arrayBuffer());
    const { width = 0 } = await sharp(bytes).metadata();
    // Anything this narrow is a "no cover" placeholder, not a cover.
    if (width < 60) continue;
    if (skip-- > 0) continue;
    image = { bytes, from: found.from };
    break search;
  }
}
if (!image) {
  console.error(`No cover found for ${byIsbn ? isbn : `"${first}"`}. Try the ISBN of another edition, or save an image yourself.`);
  process.exit(1);
}

// 480px tall is twice the largest size the shelf shows; re-encoding also drops metadata.
const jpg = await sharp(image.bytes)
  .resize({ height: 480, withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toBuffer();
const name = direct ? slugify(author) : byIsbn ? isbn : slugify(first);
const out = `public/offline/books/${name}.jpg`;
await writeFile(out, jpg);
console.log(`${out} (${Math.round(jpg.length / 1024)} KB, from ${image.from})`);
console.log(`cover: "/offline/books/${name}.jpg",`);
if (!direct) console.log(`Check that it is the cover. If not, add a number to try another match, e.g. … "${author ?? ""}" 2`);
