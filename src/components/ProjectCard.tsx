import Link from "next/link";
import type { Project } from "@/lib/projects";
import { Badge } from "@/components/Badge";

function LockIcon() {
  return (
    <span
      aria-label="Private project"
      title="Private / confidential — no public repository"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/30 text-ink/40"
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <rect
          x="2.5"
          y="6.5"
          width="9"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M4.5 6.5V4.5a2.5 2.5 0 0 1 5 0v2"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    </span>
  );
}

function ArrowLink({ href }: { href?: string }) {
  if (!href) return <LockIcon />;
  // Only a project that lives elsewhere opens a new tab; one with its own page
  // on this site (tincan) is an ordinary link.
  const external = /^https?:\/\//.test(href);
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      aria-label="Open project"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink text-ink transition-colors hover:bg-ink hover:text-surface"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M3 11L11 3M11 3H4.5M11 3V9.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-ui text-[10px] uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="font-ui text-sm font-bold">{value}</p>
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  if (project.featured) {
    return (
      <div className="grid gap-6 rounded-xl border border-ink/15 bg-canvas/40 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-ink/20 bg-surface font-display text-lg">
          {project.tag}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {project.badges.map((badge) => (
              <Badge
                key={badge}
                tone={badge === "New" || badge === "Featured" ? "accent" : "default"}
              >
                {badge}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-ui text-lg font-bold">{project.name}</h3>
              <p className="mt-1 max-w-xl text-sm text-ink/70">
                {project.description}
              </p>
            </div>
            <ArrowLink href={project.href} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 border-t border-ink/10 pt-4 sm:grid-cols-4">
            {project.stats.map((stat) => (
              <Stat key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-ink/15 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge>{project.category}</Badge>
        {project.live && <Badge tone="accent">Live</Badge>}
      </div>
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/20 font-display text-[10px]">
          {project.tag}
        </span>
        <h3 className="font-ui text-sm font-bold">{project.name}</h3>
      </div>
      <div className="card-copy mb-4 flex-1 pr-2">
        <p className="text-sm leading-relaxed text-ink/70">
          {project.description}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-ink/10 pt-4">
        {project.stats.slice(0, 4).map((stat) => (
          <Stat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <ArrowLink href={project.href} />
      </div>
    </div>
  );
}
