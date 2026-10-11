import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminRequestAllowed } from "@/lib/admin-gate";
import { findCity } from "@/lib/offline/lookup";

export const dynamic = "force-dynamic";

/** ?q=Oviedo: matching cities with their country and coordinates. */
export async function GET(request: NextRequest) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return new NextResponse(null, { status: 404 });
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  return NextResponse.json({ cities: q ? await findCity(q) : [] });
}
