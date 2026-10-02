"use client";

import type { Lang } from "@/components/tincan/copy";

export function TincanBrand({ lang = "en" }: { lang?: Lang }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    window.location.href = window.location.pathname;
  };

  const defaultHref = lang === "tr" ? "/tr" : "/";

  return (
    <a href={defaultHref} onClick={handleClick} className="tc-brand" aria-label="tincan">
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 32px mark; nothing for next/image to optimise */}
      <img src="/tincan/logo-224.png" alt="" width={32} height={32} />
      <span>tincan</span>
    </a>
  );
}
