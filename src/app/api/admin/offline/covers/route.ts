import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminRequestAllowed } from "@/lib/admin-gate";
import { findCovers } from "@/lib/offline/lookup";

export const dynamic = "force-dynamic";

/** ?isbn=… or ?title=…&author=…: cover images to choose from, not yet saved. */
export async function GET(request: NextRequest) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return new NextResponse(null, { status: 404 });
  const p = request.nextUrl.searchParams;
  const covers = await findCovers({
    isbn: p.get("isbn") ?? undefined,
    title: p.get("title")?.slice(0, 200) ?? undefined,
    author: p.get("author")?.slice(0, 200) ?? undefined,
  });
  return NextResponse.json({ covers });
}
