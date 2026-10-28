import Link from "next/link";
import { ManPrompt, ManRows, ManSection, ManTitle, manLink } from "@/components/Man";
import { HeroPrompt } from "@/components/terminal/HeroPrompt";
import { firstSentence, oneLanguage } from "@/lib/cli/render";
import { getProjectsWithLiveStars } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export default async function Home() {
  const projects = await getProjectsWithLiveStars();
  const featured = projects.slice(0, 3);
  const posts = oneLanguage(getAllPosts()).slice(0, 5);
  const github = siteConfig.socials.find((s) => s.label === "GitHub")?.href;
  const linkedin = siteConfig.socials.find((s) => s.label === "LinkedIn")?.href;

  return (
    <div className="font-ui text-[15px] leading-[1.75]">
      <ManPrompt command="man bilal" />
      <ManTitle name="bilal" section={1} kind="User Commands" />

      <ManSection title="NAME">
        <h1 className="font-normal">
          {siteConfig.name}, {siteConfig.role.toLowerCase()} in {siteConfig.location.split(",")[0]}
        </h1>
      </ManSection>

      <ManSection title="DESCRIPTION">
        <p className="max-w-[64ch]">{siteConfig.bio}</p>
        <p className="mt-2 text-muted">{siteConfig.availability}.</p>
      </ManSection>

      <ManSection title="PROJECTS">
        <ManRows stack className="gap-y-0.5 sm:gap-y-2">
          {featured.map((project) => {
            const stars = project.stats.find((s) => s.label === "Stars")?.value;
            const external = project.href && /^https?:\/\//.test(project.href);
            return (
              <div key={project.slug} className="contents">
                {project.href ? (
                  <Link
                    href={project.href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`${manLink} lowercase`}
                  >
                    {project.name}
                  </Link>
                ) : (
                  <span className="lowercase">{project.name}</span>
                )}
                <span className="mb-2 sm:mb-0">
                  {project.short ?? firstSentence(project.description)}
                  {stars && <span className="whitespace-nowrap text-muted"> ★ {stars}</span>}
                </span>
              </div>
            );
          })}
        </ManRows>
        <p className="mt-2 text-muted">
          and {projects.length - featured.length} more in{" "}
          <Link href="/projects" className={manLink}>
            projects
          </Link>
        </p>
      </ManSection>

      <ManSection title="WRITING">
        <ManRows>
          {posts.map((post) => (
            <div key={post.slug} className="contents">
              <time dateTime={post.date} className="tabular-nums text-muted">
                {post.date.slice(0, 10)}
              </time>
              <Link href={`/blog/${post.slug}`} lang={post.lang} className={manLink}>
                {post.title}
              </Link>
            </div>
          ))}
        </ManRows>
      </ManSection>

      <ManSection title="HOST">
        <p className="max-w-[64ch]">
          Temporarily served from Cloudflare while the home internet connection is unavailable.
          <Link href="/infra" className={manLink}>
            infra
          </Link>{" "}
          has the rest.
        </p>
      </ManSection>

      <ManSection title="SEE ALSO">
        <p>
          {github && (
            <>
              <a href={github} target="_blank" rel="noopener noreferrer" className={manLink}>
                github
              </a>
              ,{" "}
            </>
          )}
          {linkedin && (
            <>
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className={manLink}>
                linkedin
              </a>
              ,{" "}
            </>
          )}
          <a href={siteConfig.resumeUrl} target="_blank" rel="noopener noreferrer" className={manLink}>
            resume.pdf
          </a>
          ,{" "}
          <Link href="/about" className={manLink}>
            about
          </Link>
          ,{" "}
          <a href={`mailto:${siteConfig.email}`} className={`${manLink} break-all`}>
            {siteConfig.email}
          </a>
        </p>
      </ManSection>

      <HeroPrompt />
    </div>
  );
}
