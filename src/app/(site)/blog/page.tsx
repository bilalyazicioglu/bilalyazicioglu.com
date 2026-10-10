import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { BlogList } from "@/components/BlogList";
import { getAllPosts } from "@/lib/blog";
import { getViewCount } from "@/lib/views";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";

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
    <div className="font-ui text-[15px] leading-[1.75]">
      <PageHeader name="blog" section={1} kind="User Commands" summary="notes on engineering and the things I build">
        <p>Notes on engineering, design and the process behind the things I build, in English and Turkish.</p>
      </PageHeader>
      <BlogList posts={posts} />
    </div>
  );
}
