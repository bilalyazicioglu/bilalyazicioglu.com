import fs from "node:fs/promises";
import path from "node:path";
import { blogMediaDirectory } from "@/lib/blog-media";
export const dynamic = "force-dynamic";
const types: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!/^[a-zA-Z0-9_-]+\.(png|jpe?g|gif|webp|svg)$/.test(file)) return new Response(null, { status: 404 });
  try {
    let bytes: Buffer;
    try { bytes = await fs.readFile(path.join(blogMediaDirectory(), file)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      bytes = await fs.readFile(path.join(process.cwd(), "public/uploads/blog", file));
    }
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": types[path.extname(file)], "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox", "Cache-Control": "public, max-age=3600",
    } });
  } catch { return new Response(null, { status: 404 }); }
}
