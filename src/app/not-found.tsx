import type { Metadata } from "next";
import Link from "next/link";
import { ManPrompt, manLink } from "@/components/Man";
import { SiteChrome } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <SiteChrome>
      <div className="font-ui text-[15px] leading-[1.75]">
        <ManPrompt command="man this-page" />
        <h1 className="mt-6 font-bold">No manual entry for this page</h1>
        <p className="mt-2 max-w-[64ch]">
          It doesn&apos;t exist, or it has moved. Everything on the site is reachable from one of these:
        </p>
        <p className="mt-4 pl-[2ch] sm:pl-[4ch]">
          <Link href="/" className={manLink}>
            home
          </Link>
          ,{" "}
          <Link href="/projects" className={manLink}>
            projects
          </Link>
          ,{" "}
          <Link href="/blog" className={manLink}>
            blog
          </Link>
          ,{" "}
          <Link href="/about" className={manLink}>
            about
          </Link>
        </p>
      </div>
    </SiteChrome>
  );
}
