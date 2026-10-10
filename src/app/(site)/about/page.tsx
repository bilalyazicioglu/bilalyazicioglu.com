import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { ManRows, ManSection, manLink } from "@/components/Man";
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
  { label: "role", value: siteConfig.role },
  { label: "location", value: siteConfig.location },
  { label: "status", value: siteConfig.availability },
];

export default function AboutPage() {
  const github = siteConfig.socials.find((s) => s.label === "GitHub")?.href;
  const linkedin = siteConfig.socials.find((s) => s.label === "LinkedIn")?.href;

  return (
    <div className="font-ui text-[15px] leading-[1.75]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <PageHeader name="about" section={7} kind="Miscellaneous" summary={`who ${siteConfig.heroName.split(" ")[0]} is`}>
        <div className="flex flex-col-reverse gap-5 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-3">
            <p>{siteConfig.bio}</p>
            <p>
              Outside of coursework I contribute translations to Tuta, an open-source privacy-first email
              client, and play competitive basketball — first with Marmara University, and during my Erasmus+
              exchange with Universidad de Oviedo.
            </p>
            <p>
              I write up what I&apos;m building and learning on the{" "}
              <Link href="/blog" className={manLink}>
                blog
              </Link>
              .
            </p>
          </div>
          <Image
            src={siteConfig.heroAvatarUrl}
            alt={siteConfig.name}
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-[6px] object-cover"
          />
        </div>
      </PageHeader>

      <ManSection title="AT A GLANCE">
        <ManRows>
          {facts.map((fact) => (
            <div key={fact.label} className="contents">
              <span className="text-muted">{fact.label}</span>
              <span>{fact.value}</span>
            </div>
          ))}
          <span className="text-muted">email</span>
          <a href={`mailto:${siteConfig.email}`} className={`${manLink} break-all`}>
            {siteConfig.email}
          </a>
        </ManRows>
      </ManSection>

      <ManSection title="EXPERIENCE">
        <div className="flex flex-col gap-5">
          {experience.map((item) => (
            <div key={item.org}>
              <p>
                <span className="font-bold">{item.org}</span>
                <span className="text-muted">, {item.role}</span>
              </p>
              <p className="text-[13.5px] text-muted">
                {item.place}, {item.period}
              </p>
              <ul className="mt-1.5 flex flex-col gap-1 font-body text-[15px] leading-relaxed">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span aria-hidden className="text-muted">
                      -
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ManSection>

      <ManSection title="EDUCATION">
        <div className="flex flex-col gap-3">
          {education.map((item) => (
            <div key={item.program}>
              <p>
                <span className="font-bold">{item.school}</span>
                <span className="text-muted">, {item.program}</span>
              </p>
              <p className="text-[13.5px] text-muted">
                {item.place}, {item.period}
              </p>
            </div>
          ))}
        </div>
      </ManSection>

      <ManSection title="SKILLS">
        <ManRows stack className="gap-y-0.5 sm:gap-y-1">
          {Object.entries(skills).map(([group, items]) => (
            <div key={group} className="contents">
              <span className="text-muted lowercase">{group}</span>
              <span className="mb-2 sm:mb-0">{items.join(", ")}</span>
            </div>
          ))}
        </ManRows>
      </ManSection>

      <ManSection title="LEADERSHIP">
        <div className="flex flex-col gap-4">
          {leadership.map((item) => (
            <div key={item.org}>
              <p>
                <span className="font-bold">{item.org}</span>
                <span className="text-muted">, {item.role}</span>
              </p>
              <p className="text-[13.5px] text-muted">
                {item.place}, {item.period}
              </p>
              <p className="mt-1 font-body leading-relaxed">{item.bullet}</p>
            </div>
          ))}
        </div>
      </ManSection>

      <ManSection title="SEE ALSO">
        <p>
          <a href={siteConfig.resumeUrl} target="_blank" rel="noopener noreferrer" className={manLink}>
            resume.pdf
          </a>
          {github && (
            <>
              ,{" "}
              <a href={github} target="_blank" rel="noopener noreferrer" className={manLink}>
                github
              </a>
              (1)
            </>
          )}
          {linkedin && (
            <>
              ,{" "}
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className={manLink}>
                linkedin
              </a>
              (1)
            </>
          )}
          ,{" "}
          <Link href="/projects" className={manLink}>
            projects
          </Link>
          (1)
        </p>
      </ManSection>
    </div>
  );
}
