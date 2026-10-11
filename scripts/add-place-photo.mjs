/**
 * Copies a photo into public/offline/places/, shrunk for the web and with every
 * bit of metadata removed. Phones write the exact GPS position, the device and
 * the time into each photo; none of that should end up on the site.
 *
 *   node scripts/add-place-photo.mjs ~/Desktop/IMG_1234.jpg oviedo
 *
 * Writes oviedo-1.jpg (or the next free number) and prints the line to add to
 * that place's `photos` in src/lib/offline/data.ts. HEIC needs converting to
 * JPEG first, e.g. in Preview or with `sips -s format jpeg`.
 */
import { access } from "node:fs/promises";
import sharp from "sharp";

const [file, slug] = process.argv.slice(2);
if (!file || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("usage: node scripts/add-place-photo.mjs <photo> <place-slug>");
  process.exit(1);
}

let n = 1;
const taken = async (i) => access(`public/offline/places/${slug}-${i}.jpg`).then(() => true, () => false);
while (await taken(n)) n++;
const out = `public/offline/places/${slug}-${n}.jpg`;

// rotate() bakes the EXIF orientation into the pixels before the metadata goes.
const info = await sharp(file)
  .rotate()
  .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(out);
console.log(`${out} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB, metadata removed)`);
console.log(`{ src: "/offline/places/${slug}-${n}.jpg", alt: "…what the photo shows…" },`);
