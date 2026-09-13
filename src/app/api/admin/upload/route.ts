import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { isAdminRequestAllowed } from "@/lib/admin-gate";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Yüklenecek dosya bulunamadı." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Yalnızca PNG, JPEG, WebP, GIF veya SVG formatları desteklenir." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Dosya boyutu 10MB sınırını aşamaz." },
        { status: 400 }
      );
    }

    // Sanitize extension
    const ext = path.extname(file.name).toLowerCase() || ".png";
    const rawBase = path.basename(file.name, ext).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const sanitizedBase = rawBase.slice(0, 40) || "image";
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const fileName = `${sanitizedBase}-${Date.now()}-${randomSuffix}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "blog");
    await fs.mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/blog/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (error) {
    console.error("[upload-error]", error);
    return NextResponse.json({ error: "Görsel kaydedilemedi." }, { status: 500 });
  }
}

