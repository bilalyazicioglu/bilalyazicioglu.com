import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getAdminConfig, isValidAdminSessionFromCookies } from "@/lib/admin-auth";
import { StudioEditor } from "@/components/admin/StudioEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Post — Studio",
  robots: { index: false, follow: false },
};

export default async function NewPostStudioPage({
  params,
}: {
  params: Promise<{ adminSecret: string }>;
}) {
  const { adminSecret } = await params;
  const config = getAdminConfig();

  if (!config.secretSlug || adminSecret !== config.secretSlug) {
    notFound();
  }

  const cookieStore = await cookies();
  if (!isValidAdminSessionFromCookies(cookieStore)) {
    notFound();
  }

  return (
    <StudioEditor mode="new" baseStudioPath={`/${adminSecret}`} />
  );
}
