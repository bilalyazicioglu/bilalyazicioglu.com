import fs from "node:fs";
import path from "node:path";
import seed from "@/content/offline.json";
import { getBlogDir } from "@/lib/blog";
import { parseOffline, type OfflineData } from "./data";

/**
 * Where /offline's data lives: next to the blog posts, on the content volume
 * in production, so what the admin panel saves survives a rebuild. Until the
 * first save, the copy built into the app (src/content/offline.json) is used.
 */
export function getOfflineDir(): string {
  return path.dirname(getBlogDir());
}

const dataPath = () => path.join(getOfflineDir(), "offline.json");

/** Covers and photos uploaded from the admin panel; served by /media/offline/[file]. */
export const mediaDir = () => path.join(getOfflineDir(), "offline-media");

export function readOffline(): OfflineData {
  let raw: unknown = seed;
  try {
    raw = JSON.parse(fs.readFileSync(dataPath(), "utf8"));
  } catch {
    // No saved copy yet (or an unreadable one): show the built-in copy.
  }
  const parsed = parseOffline(raw);
  return "error" in parsed ? (parseOffline(seed) as OfflineData) : parsed;
}

/** Written to a temporary file and renamed, so a reader never sees half a file. */
export function writeOffline(data: OfflineData): void {
  const file = dataPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}
