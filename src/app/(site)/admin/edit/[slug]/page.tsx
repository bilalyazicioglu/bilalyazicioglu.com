import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { getPostBySlug, isValidSlug, postExists } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yazıyı düzenle",
  robots: { index: false, follow: false },
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isValidSlug(slug) || !postExists(slug)) {
    notFound();
  }

  const post = getPostBySlug(slug);

  return (
    <PostEditor
      mode="edit"
      initialPost={{
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        date: post.date,
        tags: post.tags,
        lang: post.lang,
        draft: post.draft,
        content: post.content,
      }}
    />
  );
}
