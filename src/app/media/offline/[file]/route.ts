import fs from "node:fs/promises";
import path from "node:path";
import { MEDIA_NAME } from "@/lib/offline/media";
import { mediaDir } from "@/lib/offline/store";

/**
 * Covers and photos uploaded from the admin panel. They live on the content
 * volume, outside /public, which Next.js only reads at build time.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  // Only names saveImage() writes, so nothing outside the folder can be asked for.
  if (!MEDIA_NAME.test(file)) return new Response(null, { status: 404 });
  try {
    const bytes = await fs.readFile(path.join(mediaDir(), file));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        // Every upload gets a new name, so a file never changes.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
