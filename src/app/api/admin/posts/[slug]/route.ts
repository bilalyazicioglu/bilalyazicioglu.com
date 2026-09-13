import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequestAllowed } from "@/lib/admin-gate";
import { deletePost, getPostBySlug, isValidSlug, postExists } from "@/lib/blog";

export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const notFound = () => new NextResponse(null, { status: 404 });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return notFound();

  const { slug } = await params;
  if (!isValidSlug(slug) || !postExists(slug)) return notFound();

  return NextResponse.json({ post: getPostBySlug(slug) }, { headers: noCacheHeaders });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return notFound();

  const { slug } = await params;
  if (!isValidSlug(slug) || !postExists(slug)) return notFound();

  try {
    deletePost(slug);
  } catch (err) {
    console.error("[admin] delete failed:", err);
    return NextResponse.json({ error: "Yazı silinemedi." }, { status: 500, headers: noCacheHeaders });
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ ok: true }, { headers: noCacheHeaders });
}
