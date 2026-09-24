import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { CtaBand } from "@/components/CtaBand";
import { DecorativePlus } from "@/components/DecorativePlus";
import { SiteChrome } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <SiteChrome>
      <PageHeader
        eyebrow="Error 404"
        titleLines={["404_", "NOT_FOUND"]}
        backHref="/"
        backLabel="Back to home"
      >
        <p className="max-w-lg text-sm leading-relaxed text-ink/70">
          The page you are looking for doesn&apos;t exist, has been moved, or is
          temporarily unavailable.
        </p>
      </PageHeader>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center text-center">
          <div className="mb-8 rounded-2xl border border-ink/15 bg-canvas/60 p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-accent mb-2">
              [SYSTEM_RESPONSE: 404]
            </p>
            <p className="font-mono text-sm text-ink/80">
              &gt; GET /requested-page HTTP/1.1 → 404 Not Found
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/" variant="primary">
              Back to home
            </Button>
            <Button href="/blog" variant="outline">
              Read the blog
            </Button>
            <Button href="/projects" variant="ghost">
              View projects
            </Button>
          </div>

          <div className="mt-12">
            <DecorativePlus />
          </div>
        </div>
      </section>

      <CtaBand
        label="Lost or looking for something specific?"
        highlight="Get in touch."
      />
    </SiteChrome>
  );
}
