"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/site.config";
import { TerminalButton } from "@/components/terminal/TerminalButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "home" },
  { href: "/about", label: "about" },
  { href: "/projects", label: "projects" },
  { href: "/blog", label: "blog" },
  { href: "/infra", label: "infra" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-6 font-ui text-[13.5px]">
      <nav aria-label="Site" className="flex flex-wrap gap-x-5 gap-y-1">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`underline-offset-4 transition-colors ${
                active ? "text-ink underline decoration-accent" : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <TerminalButton labelled />
        <a
          href={`mailto:${siteConfig.email}`}
          className="rounded-[4px] bg-accent px-2.5 py-1 text-[12px] text-accent-ink transition-colors hover:bg-ink hover:text-canvas"
        >
          contact
        </a>
      </div>
    </header>
  );
}
