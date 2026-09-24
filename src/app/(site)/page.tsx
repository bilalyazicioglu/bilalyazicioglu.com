import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ProjectCard } from "@/components/ProjectCard";
import { CtaBand } from "@/components/CtaBand";
import { DecorativePlus } from "@/components/DecorativePlus";
import { projects } from "@/lib/projects";
import { getAllPosts } from "@/lib/blog";
import { siteConfig } from "@/site.config";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const featuredProjects = projects.slice(0, 3);
  const recentPosts = getAllPosts().slice(0, 3);
  const [firstName, ...rest] = siteConfig.heroName.split(" ");
  const lastName = rest.join(" ");

  return (
    <>
      {/* Hero */}
      <section className="grid gap-8 border-b-[1.5px] border-ink px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink/20 px-3 py-1 font-ui text-[11px] font-bold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {siteConfig.availability}
          </span>

          <h1 className="font-display text-4xl leading-[1.15] sm:text-6xl">
            <span className="block">{firstName}_</span>
            {lastName && <span className="block">{lastName}</span>}
          </h1>

          <p className="mt-5 font-ui text-sm font-bold uppercase tracking-wider text-accent">
            {siteConfig.role} · {siteConfig.location}
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/70">
            {siteConfig.bio}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/projects" variant="primary">
              View projects
            </Button>
            <Button href="/blog" variant="outline">
              Read the blog
            </Button>
            <Button href={siteConfig.resumeUrl} variant="ghost" external>
              Download CV ↓
            </Button>
          </div>
        </div>

        <div className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-ink bg-canvas/50 p-2 sm:h-48 sm:w-48">
          <Image
            src={siteConfig.heroAvatarUrl}
            alt={siteConfig.name}
            width={192}
            height={192}
            priority
            className="h-full w-full rounded-xl object-cover"
          />
        </div>
      </section>

      {/* Selected work */}
      <section className="border-b-[1.5px] border-ink px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-ui text-xs font-bold uppercase tracking-wider text-accent">
              Selected work
            </p>
            <h2 className="font-display text-3xl sm:text-4xl">PRO_JECTS</h2>
          </div>
          <Link
            href="/projects"
            className="font-ui text-xs font-bold uppercase tracking-wider text-ink/60 hover:text-accent"
          >
            View all →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project) => (
            <ProjectCard
              key={project.slug}
              project={{ ...project, featured: false }}
            />
          ))}
        </div>
      </section>

      {/* Latest writing */}
      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-ui text-xs font-bold uppercase tracking-wider text-accent">
              From the blog
            </p>
            <h2 className="font-display text-3xl sm:text-4xl">WRIT_INGS</h2>
          </div>
          <Link
            href="/blog"
            className="font-ui text-xs font-bold uppercase tracking-wider text-ink/60 hover:text-accent"
          >
            View all →
          </Link>
        </div>

        <ul className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-1.5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div>
                  <span className="font-ui text-[11px] uppercase tracking-wider text-muted">
                    {formatDate(post.date)}
                  </span>
                  <h3 className="font-ui text-base font-bold group-hover:text-accent">
                    {post.title}
                  </h3>
                </div>
                <span className="font-ui text-[11px] uppercase tracking-wider text-ink/40 group-hover:text-ink">
                  {post.readingTime}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-center">
          <DecorativePlus />
        </div>
      </section>

      <CtaBand
        label="Ready to work together?"
        highlight="Let's talk about your project."
      />
    </>
  );
}
