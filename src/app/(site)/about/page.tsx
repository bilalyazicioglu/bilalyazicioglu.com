import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { CtaBand } from "@/components/CtaBand";
import { Button } from "@/components/Button";
import { siteConfig } from "@/site.config";
import { education, experience, leadership, skills } from "@/lib/resume";

export const metadata: Metadata = {
  title: "About",
  description: `About ${siteConfig.name}, ${siteConfig.role}.`,
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
  keywords: [
    `About ${siteConfig.name}`,
    `About ${siteConfig.heroName}`,
    "Ahmet Bilal Yazıcıoğlu kimdir",
    "Bilal Yazıcıoğlu kimdir",
    "Bilal Yazıcıoğlu CV",
    "Bilal Yazıcıoğlu resume",
    "Marmara University",
    "Universidad de Oviedo",
    "Software Engineer",
    "FIBA 3x3",
  ],
  openGraph: {
    type: "profile",
    title: `About ${siteConfig.name}`,
    description: `About ${siteConfig.name}, ${siteConfig.role}.`,
    url: `${siteConfig.url}/about`,
    images: ["/og-image.png"],
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${siteConfig.url}/about#webpage`,
  url: `${siteConfig.url}/about`,
  name: `About ${siteConfig.name}`,
  description: siteConfig.bio,
  mainEntity: {
    "@id": `${siteConfig.url}/#person`,
  },
};

const facts = [
  { label: "Role", value: siteConfig.role },
  { label: "Location", value: siteConfig.location },
  { label: "Status", value: siteConfig.availability },
  { label: "Email", value: siteConfig.email },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 font-display text-2xl sm:text-3xl">{children}</h2>
  );
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <PageHeader
        eyebrow="About"
        titleLines={["WHO_", "I AM"]}
        backHref="/"
        backLabel="Back to home"
      >
        <div className="flex flex-wrap items-center gap-5">
          <Image
            src={siteConfig.avatarUrl}
            alt={siteConfig.name}
            width={72}
            height={72}
            className="h-18 w-18 rounded-xl border border-ink/15 object-cover"
          />
          <div className="flex flex-wrap gap-3">
            <Button href={siteConfig.resumeUrl} variant="primary" external>
              Download CV
            </Button>
            <Button
              href={
                siteConfig.socials.find((s) => s.label === "GitHub")?.href ??
                "#"
              }
              variant="outline"
              external
            >
              GitHub profile
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="grid gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-5 text-base leading-relaxed text-ink/70">
          <p>{siteConfig.bio}</p>
          <p>
            Outside of coursework I contribute translations to{" "}
            <span className="font-bold text-ink">Tuta</span>, an open-source
            privacy-first email client, and play competitive basketball —
            first with Marmara University, and during my Erasmus+ exchange
            with Universidad de Oviedo.
          </p>
          <p>
            I write up what I&apos;m building and learning on the{" "}
            <Link
              href="/blog"
              className="underline decoration-accent decoration-2 underline-offset-4"
            >
              blog
            </Link>
            .
          </p>
        </div>

        <aside className="flex flex-col gap-4 rounded-xl border border-ink/15 p-5">
          <p className="font-ui text-xs font-bold uppercase tracking-wider text-accent">
            At a glance
          </p>
          <dl className="flex flex-col gap-4">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="font-ui text-[10px] uppercase tracking-wider text-muted">
                  {fact.label}
                </dt>
                <dd className="font-ui text-sm font-bold break-words">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      {/* Experience */}
      <div className="border-t-[1.5px] border-ink px-4 py-10 sm:px-6 sm:py-12">
        <SectionLabel>EXPE_RIENCE</SectionLabel>
        <div className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
          {experience.map((item) => (
            <div key={item.org} className="grid gap-2 py-6 sm:grid-cols-[220px_1fr]">
              <div>
                <p className="font-ui text-sm font-bold">{item.org}</p>
                <p className="font-ui text-xs uppercase tracking-wider text-accent">
                  {item.role}
                </p>
                <p className="font-ui text-[11px] uppercase tracking-wider text-muted">
                  {item.place} · {item.period}
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-ink/70">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 text-accent">▪</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="border-t-[1.5px] border-ink px-4 py-10 sm:px-6 sm:py-12">
        <SectionLabel>EDU_CATION</SectionLabel>
        <div className="grid gap-5 sm:grid-cols-3">
          {education.map((item) => (
            <div key={item.program} className="rounded-xl border border-ink/15 p-5">
              <p className="font-ui text-sm font-bold">{item.school}</p>
              <p className="mt-1 text-sm text-ink/70">{item.program}</p>
              <p className="mt-3 font-ui text-[11px] uppercase tracking-wider text-muted">
                {item.place} · {item.period}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="border-t-[1.5px] border-ink px-4 py-10 sm:px-6 sm:py-12">
        <SectionLabel>SKI_LLS</SectionLabel>
        <div className="grid gap-6 sm:grid-cols-2">
          {Object.entries(skills).map(([group, items]) => (
            <div key={group}>
              <p className="mb-3 font-ui text-[11px] font-bold uppercase tracking-wider text-muted">
                {group}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-ink/15 px-3 py-1 font-ui text-xs font-bold uppercase tracking-wider text-ink/80"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leadership */}
      <div className="border-t-[1.5px] border-ink px-4 py-10 sm:px-6 sm:py-12">
        <SectionLabel>LEADER_SHIP</SectionLabel>
        <div className="grid gap-5 sm:grid-cols-3">
          {leadership.map((item) => (
            <div key={item.org} className="rounded-xl border border-ink/15 p-5">
              <p className="font-ui text-sm font-bold">{item.org}</p>
              <p className="font-ui text-xs uppercase tracking-wider text-accent">
                {item.role}
              </p>
              <p className="mb-3 font-ui text-[11px] uppercase tracking-wider text-muted">
                {item.place} · {item.period}
              </p>
              <p className="text-sm leading-relaxed text-ink/70">
                {item.bullet}
              </p>
            </div>
          ))}
        </div>
      </div>

      <CtaBand label="Want to know more?" highlight="Reach out any time." />
    </>
  );
}
