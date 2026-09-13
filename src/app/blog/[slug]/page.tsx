import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllSlugs, getPostBySlug, getPostTranslation } from "@/lib/blog";
import { getViewCount } from "@/lib/views";
import { CtaBand } from "@/components/CtaBand";
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
      <div className="border-b-[1.5px] border-ink px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-1.5 font-ui text-xs font-bold uppercase tracking-wider text-ink/60 hover:text-accent"
        >
          ← Back to blog
        </Link>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
            {formatDate(post.date)}
          </span>
          <span className="text-ink/20">/</span>
          <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
            {post.readingTime}
          </span>
          <span className="text-ink/20">/</span>
          <ViewCounter slug={slug} initialViews={initialViews} />
          <span className="rounded-full border border-accent px-2 py-0.5 font-ui text-[10px] font-bold uppercase tracking-wider text-accent">
            {post.lang}
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

      {translation && !translation.draft && (
        <div className="mx-4 mt-6 border-[1.5px] border-accent/40 bg-accent/5 p-4 sm:mx-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-ui text-xs text-ink">
              <span className="text-base">🌐</span>
              <span className="font-bold">
                {post.lang === "tr"
                  ? "Bu yazının İngilizce versiyonu da mevcut:"
                  : "This article is also available in Turkish:"}
              </span>
            </div>
            <Link
              href={`/blog/${translation.slug}`}
              className="border border-accent bg-accent px-3 py-1 font-ui text-[11px] font-bold uppercase tracking-wider text-accent-ink transition-opacity hover:opacity-90"
            >
              {post.lang === "tr" ? "Read in English →" : "Türkçe Oku →"}
            </Link>
          </div>
        </div>
      )}

      {/* The document is `lang="en"`; a Turkish post has to say so itself, or a
          screen reader reads it with English phonetics. */}
      <article lang={post.lang} className="prose-post px-4 py-10 sm:px-6">
        <MDXRemote source={post.content} />
      </article>

      <CtaBand label="Have thoughts on this?" highlight="Send me a note." />
    </>
  );
}
