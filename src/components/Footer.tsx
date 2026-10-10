import { siteConfig } from "@/site.config";
import { TerminalButton } from "@/components/terminal/TerminalButton";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 pt-5 font-ui text-[12.5px] text-muted">
      <p>
        © {year} {siteConfig.name}
      </p>
      <nav aria-label="Elsewhere" className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <TerminalButton />
        {siteConfig.socials.map((social) => {
          const external = social.href.startsWith("http");
          return (
            <a
              key={social.label}
              href={social.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="lowercase hover:text-accent"
            >
              {social.label}
            </a>
          );
        })}
      </nav>
    </footer>
  );
}
