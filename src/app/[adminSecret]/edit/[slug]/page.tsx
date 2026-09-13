import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getAdminConfig, isValidAdminSessionFromCookies } from "@/lib/admin-auth";
import { getPostBySlug, isValidSlug, postExists } from "@/lib/blog";
import { StudioEditor } from "@/components/admin/StudioEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Post — Studio",
  robots: { index: false, follow: false },
};

export default async function EditPostStudioPage({
  params,
}: {
  params: Promise<{ adminSecret: string; slug: string }>;
}) {
  const { adminSecret, slug } = await params;
  const config = getAdminConfig();

  if (!config.secretSlug || adminSecret !== config.secretSlug) {
    notFound();
  }

  const cookieStore = await cookies();
  if (!isValidAdminSessionFromCookies(cookieStore)) {
    notFound();
  }

  if (!isValidSlug(slug) || !postExists(slug)) {
    notFound();
  }

  const post = getPostBySlug(slug);

  return (
    <StudioEditor
      mode="edit"
      baseStudioPath={`/${adminSecret}`}
      initialPost={post}
    />
  );
}
