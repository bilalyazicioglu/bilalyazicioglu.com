import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequestAllowed } from "@/lib/admin-gate";
import {
  getAllPosts,
  isValidSlug,
  postExists,
  writePost,
  type PostInput,
} from "@/lib/blog";

export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const notFound = () => new NextResponse(null, { status: 404 });

type Payload = Partial<PostInput> & { overwrite?: boolean };

function parsePayload(body: unknown): { post: PostInput; overwrite: boolean } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Gövde bir nesne olmalı." };
  }
  const raw = body as Payload;

  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
  if (!isValidSlug(slug)) {
    return { error: "Slug yalnızca küçük harf, rakam ve tire içerebilir." };
  }

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return { error: "Başlık zorunlu." };
  }

  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Tarih YYYY-AA-GG biçiminde olmalı." };
  }

  const content = typeof raw.content === "string" ? raw.content : "";
  if (!content.trim()) {
    return { error: "İçerik boş olamaz." };
  }

  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  return {
    post: {
      slug,
      title,
      summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
      date,
      tags,
      // Only the two known languages are accepted; anything else is English,
      // matching how `toMeta` reads a post back off disk.
      lang: raw.lang === "tr" ? "tr" : "en",
      draft: raw.draft === true,
      content,
    },
    overwrite: raw.overwrite === true,
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return notFound();

  return NextResponse.json(
    { posts: getAllPosts(true) },
    { headers: noCacheHeaders }
  );
}

export async function POST(request: NextRequest) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400, headers: noCacheHeaders });
  }

  const parsed = parsePayload(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: noCacheHeaders });
  }

  const { post, overwrite } = parsed;
  if (!overwrite && postExists(post.slug)) {
    return NextResponse.json(
      { error: `"${post.slug}" zaten var. Üzerine yazmak için düzenleme modunu kullan.` },
      { status: 409, headers: noCacheHeaders }
    );
  }

  try {
    writePost(post);
  } catch (err) {
    console.error("[admin] write failed:", err);
    return NextResponse.json({ error: "Yazı kaydedilemedi." }, { status: 500, headers: noCacheHeaders });
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ ok: true, slug: post.slug }, { headers: noCacheHeaders });
}
