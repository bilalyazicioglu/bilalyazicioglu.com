import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { slugify } from "@/lib/slug";
import { mediaDir } from "./store";

export type MediaKind = "cover" | "photo";

/** Uploaded files are served from here, by src/app/media/offline/[file]/route.ts. */
export const MEDIA_URL = "/media/offline";
export const MEDIA_NAME = /^[a-z0-9-]+\.jpg$/;
export const MAX_UPLOAD = 20 * 1024 * 1024;

/**
 * Covers sit 480px tall, twice the shelf's largest; photos fit in 1600px.
 * Re-encoding drops all metadata, including the GPS position phones write
 * into every photo; rotate() first applies the orientation that metadata held.
 */
export async function saveImage(bytes: Buffer, kind: MediaKind, name: string): Promise<string> {
  const image = sharp(bytes, { failOn: "error" }).rotate();
  const resized =
    kind === "cover"
      ? image.resize({ height: 480, withoutEnlargement: true })
      : image.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  const jpg = await resized.jpeg({ quality: kind === "cover" ? 82 : 80, mozjpeg: true }).toBuffer();
  // A fresh name every time, so the file can be cached forever.
  const file = `${slugify(name).slice(0, 40) || kind}-${crypto.randomBytes(4).toString("hex")}.jpg`;
  await fs.mkdir(mediaDir(), { recursive: true });
  await fs.writeFile(path.join(mediaDir(), file), jpg);
  return `${MEDIA_URL}/${file}`;
}

/** Where the admin panel may pull a cover from by link: the cover services it searches. */
const COVER_HOSTS = new Set(["covers.openlibrary.org", "archive.org", "books.google.com", "books.googleusercontent.com"]);

export function isCoverHost(url: URL): boolean {
  return url.protocol === "https:" && (COVER_HOSTS.has(url.hostname) || url.hostname.endsWith(".archive.org"));
}
