import { getInfra } from "@/lib/infra";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getInfra(), {
    headers: { "Cache-Control": "public, max-age=5" },
  });
}
