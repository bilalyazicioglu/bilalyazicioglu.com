import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";

// Content lives on a runtime volume, so this must never be baked at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  const posts = getAllPosts(true);
  const drafts = posts.filter((post) => post.draft).length;

  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-ui text-[11px] font-bold uppercase tracking-wider text-ink/50">
            {posts.length} yazı · {drafts} taslak
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">YAZI_LAR</h1>
        </div>
        <Link
          href="/admin/new"
          className="inline-flex items-center border-[1.5px] border-ink bg-ink px-4 py-2.5 font-ui text-xs font-bold uppercase tracking-wider text-surface transition-colors hover:bg-accent hover:text-accent-ink"
        >
          + Yeni yazı
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="font-ui text-sm text-ink/60">Henüz yazı yok.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/admin/edit/${post.slug}`}
                className="group flex flex-col gap-1.5 py-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                    {post.date}
                  </span>
                  <span className="text-ink/20">/</span>
                  <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                    {post.readingTime}
                  </span>
                  {post.draft ? (
                    <span className="border border-ink/25 px-2 py-0.5 font-ui text-[10px] uppercase tracking-wider text-ink/50">
                      Taslak
                    </span>
                  ) : null}
                </div>
                <h2 className="font-ui text-base font-bold group-hover:text-accent">
                  {post.title}
                </h2>
                <p className="font-ui text-xs text-ink/50">/{post.slug}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
