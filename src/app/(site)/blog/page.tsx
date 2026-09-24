import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { CtaBand } from "@/components/CtaBand";
import { BlogList } from "@/components/BlogList";
import { getAllPosts } from "@/lib/blog";
import { getViewCount } from "@/lib/views";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on engineering, design, and process.",
  alternates: {
    canonical: `${siteConfig.url}/blog`,
  },
};

export default function BlogPage() {
  // View counts are read here rather than in the list, so the client component
  // never has to fetch them a row at a time.
  const posts = getAllPosts().map((post) => ({
    ...post,
    views: getViewCount(post.slug),
  }));

  return (
    <>
      <PageHeader
        eyebrow={`Posts [${String(posts.length).padStart(2, "0")}]`}
        titleLines={["WRIT_", "INGS"]}
        backHref="/"
        backLabel="Back to home"
      >
        <p className="max-w-lg text-sm leading-relaxed text-ink/70">
          Notes on engineering, design, and the process behind the things I
          build — in English and Turkish.
        </p>
      </PageHeader>

      <BlogList posts={posts} />

      <CtaBand label="Enjoying the writing?" highlight="Get in touch." />
    </>
  );
}
