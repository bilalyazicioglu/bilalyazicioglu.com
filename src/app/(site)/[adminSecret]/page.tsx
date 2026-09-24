import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { getAdminConfig, isValidAdminSessionFromCookies, timingSafeCompare } from "@/lib/admin-auth";
import { getAllPosts } from "@/lib/blog";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSecret: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { adminSecret } = await params;
  const { key = "" } = await searchParams;
  const config = getAdminConfig();

  // Stealth gate: Return 404 if the path slug doesn't match configured secret
  if (!config.secretSlug || adminSecret !== config.secretSlug) {
    notFound();
  }

  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSessionFromCookies(cookieStore);

  // If not authenticated, require the access key in query params to render login form; otherwise 404
  if (!isAuthenticated) {
    if (!config.accessKey || !timingSafeCompare(key, config.accessKey)) {
      notFound();
    }
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <AdminLoginForm secretSlug={adminSecret} initialKey={key} />
      </div>
    );
  }

  // Authenticated: Render Studio Post Dashboard
  const posts = getAllPosts(true);
  const drafts = posts.filter((p) => p.draft).length;
  const published = posts.length - drafts;

  return (
    <div className="flex flex-col gap-8 px-4 py-8 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-[1.5px] border-ink pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <p className="font-ui text-[11px] font-bold uppercase tracking-wider text-ink/60">
              STUDIO DASHBOARD · {posts.length} TOPLAM YAZI
            </p>
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">BLOG_STUDIO</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form action="/api/admin/auth/logout" method="POST">
            <button
              type="submit"
              className="border border-ink/30 px-3 py-2 font-ui text-xs font-bold uppercase tracking-wider text-ink/70 hover:bg-ink hover:text-surface transition-colors"
            >
              Çıkış Yap
            </button>
          </form>

          <Link
            href={`/${adminSecret}/new`}
            className="inline-flex items-center border-[1.5px] border-ink bg-ink px-4 py-2 font-ui text-xs font-bold uppercase tracking-wider text-surface transition-colors hover:bg-accent hover:text-accent-ink"
          >
            + Yeni Yazı Ekle
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-ink/20 bg-surface p-4">
          <p className="font-ui text-[10px] font-bold uppercase tracking-wider text-muted">
            Yayındaki Yazılar
          </p>
          <p className="mt-1 font-display text-2xl text-accent sm:text-3xl">
            {published}
          </p>
        </div>
        <div className="border border-ink/20 bg-surface p-4">
          <p className="font-ui text-[10px] font-bold uppercase tracking-wider text-muted">
            Taslaklar
          </p>
          <p className="mt-1 font-display text-2xl text-ink/60 sm:text-3xl">
            {drafts}
          </p>
        </div>
        <div className="border border-ink/20 bg-surface p-4">
          <p className="font-ui text-[10px] font-bold uppercase tracking-wider text-muted">
            Toplam İçerik
          </p>
          <p className="mt-1 font-display text-2xl text-ink sm:text-3xl">
            {posts.length}
          </p>
        </div>
      </div>

      {/* Posts List */}
      <div className="flex flex-col gap-4">
        <h2 className="font-ui text-sm font-bold uppercase tracking-wider text-ink/70">
          İçerikler
        </h2>

        {posts.length === 0 ? (
          <div className="border border-dashed border-ink/30 p-8 text-center">
            <p className="font-ui text-sm text-ink/60">Henüz hiç yazı oluşturulmamış.</p>
            <Link
              href={`/${adminSecret}/new`}
              className="mt-3 inline-block font-ui text-xs font-bold text-accent underline"
            >
              İlk yazıyı oluşturun →
            </Link>
          </div>
        ) : (
          <div className="border-[1.5px] border-ink bg-surface divide-y divide-ink/10">
            {posts.map((post) => (
              <div
                key={post.slug}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 hover:bg-canvas/30 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                      {post.date}
                    </span>
                    <span className="text-ink/20">/</span>
                    <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                      {post.readingTime}
                    </span>
                    <span className="text-ink/20">/</span>
                    <span className="rounded-full border border-accent/40 px-2 py-0.2 font-ui text-[10px] font-bold uppercase text-accent">
                      {post.lang}
                    </span>
                    {post.draft ? (
                      <span className="border border-ink/25 bg-canvas px-2 py-0.2 font-ui text-[10px] uppercase tracking-wider text-ink/50">
                        Taslak
                      </span>
                    ) : (
                      <span className="border border-accent/40 bg-accent/10 px-2 py-0.2 font-ui text-[10px] font-bold uppercase tracking-wider text-accent">
                        Yayında
                      </span>
                    )}
                  </div>
                  <h3 className="font-ui text-base font-bold text-ink">
                    {post.title}
                  </h3>
                  <p className="font-ui text-xs text-ink/50">/{post.slug}</p>
                </div>

                <div className="mt-2 flex items-center gap-2 sm:mt-0">
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="border border-ink/25 bg-canvas px-3 py-1.5 font-ui text-xs font-bold uppercase hover:bg-ink hover:text-surface transition-colors"
                  >
                    Görüntüle ↗
                  </Link>
                  <Link
                    href={`/${adminSecret}/edit/${post.slug}`}
                    className="border border-ink bg-ink px-3 py-1.5 font-ui text-xs font-bold uppercase text-surface hover:bg-accent hover:text-accent-ink transition-colors"
                  >
                    Düzenle →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

