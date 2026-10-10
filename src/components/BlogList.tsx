"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PostLang, PostMeta } from "@/lib/blog";
import { ViewCounter } from "@/components/ViewCounter";
import { ManSection } from "@/components/Man";

/** A post plus the view count read on the server, so no request is made per row. */
export type BlogListPost = PostMeta & { views: number };

type Filter = "all" | PostLang;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "all" },
  { value: "tr", label: "türkçe" },
  { value: "en", label: "english" },
];

/**
 * The post list, with a language filter.
 *
 * Half of what I write is Turkish and half is English, and the two barely
 * overlap in readership — the filter is here so a reader can skip the half they
 * cannot read. It defaults to showing everything: nothing is hidden from anyone
 * unless they ask for it.
 */
export function BlogList({ posts }: { posts: BlogListPost[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  // Group posts for "all" view:
  // If multiple posts share the same translationKey, only show one row (preferring Turkish as primary)
  const allGrouped = useMemo(() => {
    const seenKeys = new Set<string>();
    const result: (BlogListPost & { availableLangs: PostLang[] })[] = [];

    const keyLangs = new Map<string, PostLang[]>();
    for (const post of posts) {
      if (post.translationKey) {
        const list = keyLangs.get(post.translationKey) || [];
        if (!list.includes(post.lang)) list.push(post.lang);
        keyLangs.set(post.translationKey, list);
      }
    }

    // Sort so 'tr' comes before 'en' for primary representative
    const sorted = [...posts].sort((a, b) => {
      if (a.translationKey && b.translationKey && a.translationKey === b.translationKey) {
        return a.lang === "tr" ? -1 : 1;
      }
      return 0;
    });

    for (const post of sorted) {
      if (post.translationKey) {
        if (seenKeys.has(post.translationKey)) continue;
        seenKeys.add(post.translationKey);
        result.push({
          ...post,
          availableLangs: keyLangs.get(post.translationKey) || [post.lang],
        });
      } else {
        result.push({
          ...post,
          availableLangs: [post.lang],
        });
      }
    }

    return result;
  }, [posts]);

  // Counts come off the unique articles in 'all', and explicit lang counts
  const counts = useMemo(
    () => ({
      all: allGrouped.length,
      tr: posts.filter((post) => post.lang === "tr").length,
      en: posts.filter((post) => post.lang === "en").length,
    }),
    [posts, allGrouped]
  );

  const visible = useMemo(() => {
    if (filter === "all") return allGrouped;
    return posts
      .filter((post) => post.lang === filter)
      .map((p) => ({ ...p, availableLangs: [p.lang] }));
  }, [filter, posts, allGrouped]);

  return (
    <ManSection title="POSTS">
      <div role="group" aria-label="Filter by language" className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={`underline-offset-4 transition-colors ${
              filter === option.value ? "text-ink underline decoration-accent" : "text-muted hover:text-ink"
            }`}
          >
            {option.label} ({counts[option.value]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-muted">No posts in this language yet. Pick another one above.</p>
      ) : (
        <ul>
          {visible.map((post) => (
            <li key={post.slug} lang={post.lang} className="border-t border-ink/15 py-5 first:border-t-0 first:pt-1">
              <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-1">
                <p className="flex flex-wrap gap-x-4 text-[13px] text-muted" lang="en">
                  <time dateTime={post.date} className="tabular-nums">
                    {post.date.slice(0, 10)}
                  </time>
                  <span>{post.readingTime}</span>
                  <ViewCounter slug={post.slug} initialViews={post.views} trackView={false} />
                  <span>
                    {(post.availableLangs.length > 1 ? post.availableLangs : [post.lang]).join(" + ")}
                  </span>
                </p>
                <h2 className="font-bold text-accent group-hover:underline group-hover:underline-offset-[3px]">
                  {post.title}
                </h2>
                <p className="max-w-[64ch] font-body text-[15px] leading-relaxed">{post.summary}</p>
                {post.tags.length > 0 && (
                  <p className="text-[13px] text-muted">{post.tags.map((tag) => `#${tag}`).join(" ")}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ManSection>
  );
}
