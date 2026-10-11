import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getAdminConfig, isValidAdminSessionFromCookies } from "@/lib/admin-auth";
import { OfflineEditor } from "@/components/admin/OfflineEditor";
import { readOffline } from "@/lib/offline/store";
import provinces from "@/lib/offline/turkey-provinces.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offline — Studio",
  robots: { index: false, follow: false },
};

export default async function OfflineStudioPage({ params }: { params: Promise<{ adminSecret: string }> }) {
  const { adminSecret } = await params;
  const config = getAdminConfig();
  if (!config.secretSlug || adminSecret !== config.secretSlug) notFound();
  if (!isValidAdminSessionFromCookies(await cookies())) notFound();

  return (
    <OfflineEditor
      initial={readOffline()}
      provinces={provinces.map(({ id, name }) => ({ id, name }))}
      backHref={`/${adminSecret}`}
    />
  );
}
