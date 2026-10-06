"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/site.config";
import { TerminalButton } from "@/components/terminal/TerminalButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/infra", label: "Infra" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-ink px-4 py-4 sm:px-6">
      <Link href="/" className="group flex items-center gap-2.5">
        <div className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-ink/20 bg-ink">
          <Image
            src="/icon.png"
            alt={siteConfig.name}
            width={28}
            height={28}
            priority
            className="h-full w-full object-cover"
          />
        </div>
        <span className="font-ui text-sm font-bold uppercase tracking-wider group-hover:text-accent transition-colors">
          {siteConfig.name}
        </span>
      </Link>

      <nav className="flex items-center gap-4 sm:gap-6">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`font-ui text-xs font-bold uppercase tracking-wider transition-colors ${
                active ? "text-accent" : "text-ink/60 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <TerminalButton />
        <Link
          href={`mailto:${siteConfig.email}`}
          className="inline-flex items-center rounded-full bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-wider text-accent-ink hover:bg-ink transition-colors"
        >
          Get in touch
        </Link>
      </div>
    </header>
  );
}
