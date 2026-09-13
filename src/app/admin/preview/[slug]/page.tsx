import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPostBySlug, isValidSlug, postExists } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Önizleme",
  robots: { index: false, follow: false },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Renders a post exactly as /blog/[slug] does, but reachable only through the
 * tailnet gate — this is how drafts get looked at before publishing.
 */
export default async function PreviewPage({
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
    <>
      <div className="border-b-[1.5px] border-ink px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href={`/admin/edit/${slug}`}
            className="inline-flex items-center gap-1.5 font-ui text-xs font-bold uppercase tracking-wider text-ink/60 hover:text-accent"
          >
            ← Düzenlemeye dön
          </Link>
          <span className="border border-ink/25 px-2 py-0.5 font-ui text-[10px] uppercase tracking-wider text-ink/50">
            {post.draft ? "Taslak önizleme" : "Yayında"}
          </span>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
            {formatDate(post.date)}
          </span>
          <span className="text-ink/20">/</span>
          <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
            {post.readingTime}
          </span>
        </div>
        <h1 className="font-ui text-2xl font-bold tracking-tight text-ink sm:text-4xl leading-tight">
          {post.title}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-ink/15 px-2.5 py-0.5 font-ui text-[10px] uppercase tracking-wider text-ink/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <article className="prose-post px-4 py-10 sm:px-6">
        <MDXRemote source={post.content} />
      </article>
    </>
  );
}
