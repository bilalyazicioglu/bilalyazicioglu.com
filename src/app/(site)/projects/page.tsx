import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProjectsExplorer } from "@/components/ProjectsExplorer";
import { CtaBand } from "@/components/CtaBand";
import { projects } from "@/lib/projects";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Projects",
  description: "A selection of products, open source, and experiments.",
  alternates: {
    canonical: `${siteConfig.url}/projects`,
  },
};

const projectsJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `Software Projects by ${siteConfig.name}`,
  description: "Products, open source software, and distributed systems.",
  itemListElement: projects.map((project, index) => ({
    "@type": "ListItem",
    position: index + 1,
    // SoftwareApplication would ask Google for ratings or reviews these projects
    // don't have, and flag every item without them as invalid. Source code is
    // what the open-source ones are; the rest are plain creative works.
    item: {
      "@type": project.category === "Open Source" ? "SoftwareSourceCode" : "CreativeWork",
      name: project.name,
      description: project.description,
      ...(project.category === "Open Source" && {
        codeRepository: project.repo ?? project.href,
        programmingLanguage: project.stats.find((s) => s.label === "Language")?.value,
      }),
      url: project.href
        ? new URL(project.href, siteConfig.url).toString()
        : `${siteConfig.url}/projects`,
      author: {
        "@type": "Person",
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
  })),
};

export default function ProjectsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectsJsonLd) }}
      />
      <PageHeader
        eyebrow={`Projects [${String(projects.length).padStart(2, "0")}]`}
        titleLines={["PRO_", "JECTS"]}
        backHref="/"
        backLabel="Back to home"
      >
        <p className="max-w-lg text-sm leading-relaxed text-ink/70">
          Products, open source libraries, and experiments I&apos;ve built
          and shipped. Filter by category or search by name.
        </p>
      </PageHeader>
      <ProjectsExplorer projects={projects} />
      <CtaBand
        label="Have something in mind?"
        highlight="Let's build it together."
      />
    </>
  );
}
