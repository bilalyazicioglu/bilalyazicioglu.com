"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Project, ProjectCategory } from "@/lib/projects";
import { ManSection, manLink } from "@/components/Man";

const categories: (ProjectCategory | "All")[] = ["All", "Open Source", "Private"];

/** "https://github.com/a/b" → "github.com/a/b": what the link is, at a glance. */
const bare = (href: string) => href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function ProjectLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = /^https?:\/\//.test(href);
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${manLink} break-all`}
    >
      {children}
    </Link>
  );
}

function Entry({ project }: { project: Project }) {
  const meta = [
    project.private ? "private" : "open source",
    ...project.badges,
  ]
    .map((m) => m.toLowerCase())
    .filter((m, i, all) => all.indexOf(m) === i);

  return (
    <li className="flex flex-col gap-1.5 border-t border-ink/15 py-5 first:border-t-0 first:pt-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="font-bold">{project.name}</h2>
        <p className="text-[13px] text-muted">{meta.join(", ")}</p>
      </div>
      <p className="max-w-[64ch] font-body text-[15px] leading-relaxed">{project.description}</p>
      <dl className="flex flex-wrap gap-x-5 gap-y-0.5 text-[13px]">
        {project.stats.map((stat) => (
          <div key={stat.label} className="flex gap-1.5">
            <dt className="text-muted lowercase">{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
      {(project.href || project.repo) && (
        <p className="flex flex-wrap gap-x-5 text-[13.5px]">
          {project.href && <ProjectLink href={project.href}>{bare(project.href)}</ProjectLink>}
          {project.repo && project.repo !== project.href && (
            <ProjectLink href={project.repo}>source</ProjectLink>
          )}
        </p>
      )}
      {!project.href && <p className="text-[13.5px] text-muted">Private, so there is no public link.</p>}
    </li>
  );
}

export function ProjectsExplorer({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () =>
      Object.fromEntries(
        categories.map((cat) => [cat, cat === "All" ? projects.length : projects.filter((p) => p.category === cat).length])
      ) as Record<(typeof categories)[number], number>,
    [projects]
  );

  // The featured project leads, whatever the filter; the rest keep their order.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...projects]
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      .filter((project) => category === "All" || project.category === category)
      .filter((project) => project.name.toLowerCase().includes(q));
  }, [category, query, projects]);

  return (
    <ManSection title="PROJECTS">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-[13.5px]">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-x-4 gap-y-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={`underline-offset-4 transition-colors ${
                category === cat ? "text-ink underline decoration-accent" : "text-muted hover:text-ink"
              }`}
            >
              {cat.toLowerCase()} ({counts[cat]})
            </button>
          ))}
        </div>
        <label className="flex items-baseline gap-2 text-muted">
          grep
          <input
            id="project-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="name"
            className="w-36 border-b border-ink/25 bg-transparent px-0.5 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      {filtered.length > 0 ? (
        <ul>
          {filtered.map((project) => (
            <Entry key={project.slug} project={project} />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-muted">
          No project matches &ldquo;{query}&rdquo;. Clear the search or pick another category.
        </p>
      )}
    </ManSection>
  );
}
