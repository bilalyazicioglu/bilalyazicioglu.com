"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PostLang, PostMeta } from "@/lib/blog";
import { ViewCounter } from "@/components/ViewCounter";

/** A post plus the view count read on the server, so no request is made per row. */
export type BlogListPost = PostMeta & { views: number };

type Filter = "all" | PostLang;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tr", label: "TR" },
  { value: "en", label: "EN" },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-2 px-4 pb-2 pt-6 sm:px-6">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={`rounded-full px-4 py-2 font-ui text-xs font-bold uppercase tracking-wider transition-colors ${
              filter === option.value
                ? "bg-ink text-surface"
                : "border border-ink/20 text-ink/60 hover:border-ink hover:text-ink"
            }`}
          >
            {option.label} ({counts[option.value]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center font-ui text-xs uppercase tracking-wider text-muted sm:px-6">
          No posts in this language yet
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 px-4 sm:px-6">
          {visible.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-2 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                      {formatDate(post.date)}
                    </span>
                    <span className="text-ink/20">/</span>
                    <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                      {post.readingTime}
                    </span>
                    <span className="text-ink/20">/</span>
                    <ViewCounter
                      slug={post.slug}
                      initialViews={post.views}
                      trackView={false}
                    />
                    <span className="rounded-full border border-accent px-2 py-0.5 font-ui text-[10px] font-bold uppercase tracking-wider text-accent">
                      {post.availableLangs && post.availableLangs.length > 1
                        ? post.availableLangs.map((l) => l.toUpperCase()).join(" · ")
                        : post.lang.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-ui text-lg font-bold group-hover:text-accent">
                    {post.title}
                  </h2>
                  <p className="max-w-xl text-sm leading-relaxed text-ink/70">
                    {post.summary}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
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
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink text-ink transition-colors group-hover:bg-ink group-hover:text-surface">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 11L11 3M11 3H4.5M11 3V9.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
