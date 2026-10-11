import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequestAllowed } from "@/lib/admin-gate";
import { parseOffline } from "@/lib/offline/data";
import { readOffline, writeOffline } from "@/lib/offline/store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const notFound = () => new NextResponse(null, { status: 404 });

export async function GET(request: NextRequest) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return notFound();
  return NextResponse.json(readOffline(), { headers: noStore });
}

/** Saves the whole of /offline's data at once; the admin panel always sends all of it. */
export async function PUT(request: NextRequest) {
  if (!isAdminRequestAllowed(request.headers, request.cookies)) return notFound();
  const body = await request.json().catch(() => null);
  const parsed = parseOffline(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  try {
    writeOffline(parsed);
  } catch (error) {
    console.error("[offline-save]", error);
    return NextResponse.json({ error: "Kaydedilemedi." }, { status: 500, headers: noStore });
  }
  revalidatePath("/offline");
  return NextResponse.json(parsed, { headers: noStore });
}
