import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllSlugs, getPostBySlug, getPostTranslation } from "@/lib/blog";
import { getViewCount } from "@/lib/views";
import { ManPrompt } from "@/components/Man";
import { ViewCounter } from "@/components/ViewCounter";

import { siteConfig } from "@/site.config";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

// Posts written from /admin land on disk after the build, so slugs missing from
// generateStaticParams must still render on first request.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = getPostBySlug(slug);
    if (post.draft) return {};

    const translation = getPostTranslation(slug);
    const languages: Record<string, string> = {
      [post.lang === "tr" ? "tr" : "en"]: `${siteConfig.url}/blog/${slug}`,
    };
    if (translation) {
      languages[translation.lang === "tr" ? "tr" : "en"] = `${siteConfig.url}/blog/${translation.slug}`;
    }

    return {
      title: post.title,
      description: post.summary,
      alternates: {
        canonical: `${siteConfig.url}/blog/${slug}`,
        languages,
      },
      openGraph: {
        locale: post.lang === "tr" ? "tr_TR" : "en_US",
      },
    };
  } catch {
    return {};
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let post;
  try {
    post = getPostBySlug(slug);
  } catch {
    notFound();
  }

  // Drafts are only reachable through the tailnet-gated /admin preview.
  if (post.draft) {
    notFound();
  }

  const initialViews = getViewCount(slug);
  const translation = getPostTranslation(slug);

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: post.lang,
    keywords: post.tags.join(", "),
    mainEntityOfPage: `${siteConfig.url}/blog/${slug}`,
    url: `${siteConfig.url}/blog/${slug}`,
    author: {
      "@type": "Person",
      name: siteConfig.name,
      url: siteConfig.url,
      sameAs: [
        "https://github.com/bilalyazicioglu",
        "https://www.linkedin.com/in/bilal-yazicioglu/",
      ],
    },
    publisher: {
      "@type": "Person",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <header className="font-ui">
        <ManPrompt command={`cat ${slug}.mdx`} />
        <p className="mt-6 flex flex-wrap gap-x-4 text-[13px] text-muted">
          <Link href="/blog" className="text-accent underline-offset-[3px] hover:underline">
            ← blog
          </Link>
          <time dateTime={post.date} className="tabular-nums">
            {post.date.slice(0, 10)}
          </time>
          <span>{post.readingTime}</span>
          <ViewCounter slug={slug} initialViews={initialViews} />
          <span>{post.lang}</span>
        </p>
        <h1 lang={post.lang} className="mt-3 text-balance font-body text-[1.75rem] font-bold leading-tight sm:text-[2.125rem]">
          {post.title}
        </h1>
        {post.tags.length > 0 && (
          <p className="mt-3 text-[13px] text-muted">{post.tags.map((tag) => `#${tag}`).join(" ")}</p>
        )}
        {translation && !translation.draft && (
          <p lang={post.lang === "tr" ? "en" : "tr"} className="mt-4 text-[13.5px] text-muted">
            {post.lang === "tr" ? "Also in English: " : "Bu yazı Türkçe olarak da var: "}
            <Link href={`/blog/${translation.slug}`} className="text-accent underline-offset-[3px] hover:underline">
              {translation.title}
            </Link>
          </p>
        )}
      </header>

      {/* The document is `lang="en"`; a Turkish post has to say so itself, or a
          screen reader reads it with English phonetics. */}
      <article lang={post.lang} className="prose-post mt-8 border-t border-ink/15 pt-2">
        <MDXRemote source={post.content} />
      </article>

      <p className="mt-12 font-ui text-[13.5px] text-muted">
        Thoughts on this? Write to{" "}
        <a href={`mailto:${siteConfig.email}`} className="text-accent underline-offset-[3px] hover:underline">
          {siteConfig.email}
        </a>
        .
      </p>
    </>
  );
}
