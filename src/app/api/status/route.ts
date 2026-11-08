import release from "@/generated/release.json";
import type { DeliveryStatus } from "@/lib/delivery-status";
export const dynamic = "force-dynamic";
export function GET() {
  const status: DeliveryStatus = {
    backend: "homeserver",
    release: { ...release, activatedAt: process.env.DEPLOYED_AT || null },
    checkedAt: new Date().toISOString(),
  };
  return Response.json(status, { headers: { "Cache-Control": "no-store", "X-Blog-Backend": "homeserver" } });
}
