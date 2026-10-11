import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminRequestAllowed } from "@/lib/admin-gate";
import { isCoverHost, MAX_UPLOAD, saveImage, type MediaKind } from "@/lib/offline/media";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Stores a cover or a photo, shrunk and stripped of metadata. Takes either a
 * file (multipart: file, kind, name) or a cover found by /covers (JSON: url,
 * name), which is downloaded here so visitors never load it from elsewhere.
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return new NextResponse(null, { status: 404 });

  let bytes: Buffer;
  let kind: MediaKind = "cover";
  let name = "";
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Dosya bulunamadı.");
    if (file.size > MAX_UPLOAD) return fail("Dosya 20 MB'tan büyük olamaz.");
    kind = form.get("kind") === "photo" ? "photo" : "cover";
    name = String(form.get("name") ?? "");
    bytes = Buffer.from(await file.arrayBuffer());
  } else {
    const body = (await request.json().catch(() => null)) as { url?: unknown; name?: unknown } | null;
    let url: URL;
    try {
      url = new URL(String(body?.url ?? ""));
    } catch {
      return fail("Geçersiz bağlantı.");
    }
    if (!isCoverHost(url)) return fail("Kapak yalnızca Open Library ya da Google Books'tan indirilebilir; başka bir görseli dosya olarak yükle.");
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (!res?.ok) return fail("Kapak indirilemedi.", 502);
    bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_UPLOAD) return fail("Görsel çok büyük.");
    name = String(body?.name ?? "");
  }

  try {
    return NextResponse.json({ url: await saveImage(bytes, kind, name) });
  } catch (error) {
    console.error("[offline-media]", error);
    return fail("Görsel okunamadı. JPEG, PNG ya da WebP olmalı (iPhone'un HEIC dosyaları desteklenmiyor).");
  }
}
