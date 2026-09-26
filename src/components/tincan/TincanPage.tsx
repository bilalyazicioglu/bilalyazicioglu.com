import type { Metadata } from "next";
import Link from "next/link";
import { Big_Shoulders, Martian_Mono } from "next/font/google";
import { LiveTerminal } from "@/components/tincan/LiveTerminal";
import { InstallTabs } from "@/components/tincan/InstallTabs";
import { StringRail } from "@/components/tincan/StringRail";
import { Meander } from "@/components/tincan/Meander";
import { COPY, PAGES, REPO, type Lang } from "@/components/tincan/copy";
import { siteConfig } from "@/site.config";
import "@/app/tincan/tincan.css";

// Big Shoulders is the lettering stamped on a can; Martian Mono is the
// terminal the can lives in. Two families, clearly apart, and nothing else.
const shoulders = Big_Shoulders({
  variable: "--font-shoulders",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
});

const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

/** Both pages name each other, and English stands in for everyone else. */
const LANGUAGES = { en: PAGES.en, tr: PAGES.tr, "x-default": PAGES.en };

export function tincanMetadata(lang: Lang): Metadata {
  const t = COPY[lang].meta;
  return {
    title: { absolute: t.title },
    description: t.description,
    keywords: t.keywords,
    alternates: {
      canonical: PAGES[lang],
      languages: LANGUAGES,
      // The same facts as plain Markdown, for language models (llmstxt.org).
      types: { "text/markdown": "/tincan/llms.txt" },
    },
    // The app's own icon in the tab, as it appears in the README and on npm.
    icons: {
      icon: [
        { url: "/tincan/icon-48.png", type: "image/png", sizes: "48x48" },
        { url: "/tincan/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/tincan/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/tincan/icon-180.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      url: PAGES[lang],
      siteName: siteConfig.name,
      locale: t.locale,
      alternateLocale: lang === "en" ? ["tr_TR"] : ["en_US"],
      title: t.ogTitle,
      description: t.description,
      images: [{ url: "/tincan/preview.png", width: 1074, height: 680, alt: t.imageAlt }],
      videos: [{ url: "/uploads/blog/tincan-demo.mp4", type: "video/mp4" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.ogTitle,
      description: t.description,
      images: ["/tincan/preview.png"],
    },
  };
}

// One graph, so the page, the program, the video and the questions point at
// each other by @id. The program has the same @id in both languages: it is
// one program with two pages about it. SoftwareSourceCode rather than
// SoftwareApplication: the latter is a Google rich-result type that requires
// ratings or reviews, and without them Search Console reports the page as
// having an invalid item.
function graph(lang: Lang) {
  const { meta: t, faq } = COPY[lang];
  const page = PAGES[lang];
  const software = `${PAGES.en}#software`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${page}#webpage`,
        url: page,
        name: t.pageName,
        description: t.description,
        inLanguage: lang,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        about: { "@id": software },
        mainEntity: { "@id": software },
        author: { "@id": `${siteConfig.url}/#person` },
        primaryImageOfPage: `${siteConfig.url}/tincan/preview.png`,
        video: { "@id": `${page}#demo` },
        breadcrumb: { "@id": `${page}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${page}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.crumbs[0], item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: t.crumbs[1], item: `${siteConfig.url}/projects` },
          { "@type": "ListItem", position: 3, name: "tincan", item: page },
        ],
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": software,
        name: "tincan",
        alternateName: ["tincan-cli", "tincan-chat"],
        description: t.description,
        url: PAGES.en,
        codeRepository: REPO,
        sameAs: [
          REPO,
          "https://crates.io/crates/tincan-chat",
          "https://www.npmjs.com/package/tincan-cli",
        ],
        programmingLanguage: { "@type": "ComputerLanguage", name: "Rust" },
        runtimePlatform: ["macOS", "Linux", "Windows"],
        version: "0.3.1",
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        keywords: t.keywords.join(", "),
        image: `${siteConfig.url}/tincan/preview.png`,
        author: { "@id": `${siteConfig.url}/#person` },
      },
      {
        "@type": "VideoObject",
        "@id": `${page}#demo`,
        name: t.videoName,
        description: t.videoDescription,
        inLanguage: lang,
        contentUrl: `${siteConfig.url}/uploads/blog/tincan-demo.mp4`,
        thumbnailUrl: `${siteConfig.url}/tincan/demo-poster.jpg`,
        uploadDate: "2026-09-17",
        duration: "PT12S",
      },
      {
        "@type": "FAQPage",
        "@id": `${page}#faq`,
        inLanguage: lang,
        isPartOf: { "@id": `${page}#webpage` },
        mainEntity: faq.items.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a.replaceAll("`", "") },
        })),
      },
    ],
  };
}

function Can({ who, flipped = false }: { who: string; flipped?: boolean }) {
  // The string leaves your can from underneath and enters theirs from above.
  const lines = flipped
    ? ["┌──┴──┐", "│     │", "└─────┘", " ( o ) "]
    : [" ( o ) ", "┌─────┐", "│     │", "└──┬──┘"];
  return (
    <div className={`tc-can${flipped ? " tc-can--them" : ""}`}>
      {!flipped && <span className="tc-can-who">{who}</span>}
      <pre aria-hidden="true">
        {lines.map((line, i) => (
          <span key={i} className={line.includes("( o )") ? "i-brass" : undefined}>
            {line}
            {"\n"}
          </span>
        ))}
      </pre>
      {flipped && <span className="tc-can-who">{who}</span>}
    </div>
  );
}

/** The paths share a 100×100 box stretched over the leg; x=50 is the gutter's middle. */
const SAG_CONTROL_X = 0;
const STRAND_PATHS: Record<string, string[]> = {
  taut: ["M50 0 L50 100"],
  // A quadratic bow: y stays linear in t, which is what lets StringRail keep
  // the pulse on the curve (see `sagAt` there).
  slack: [`M50 0 Q${SAG_CONTROL_X} 50 50 100`],
  frayed: ["M50 0 L50 100", "M50 34 l-9 2.5", "M50 35 l7 3", "M50 71 l8 -2", "M50 72 l-6 3.5"],
};

/**
 * Each leg draws its own stretch of the string and says, in the app's words,
 * what state it is in — the reading the header chip gives in the terminal.
 */
function Reading({
  chip,
  ms,
  strand,
  glass,
}: {
  chip: string;
  ms: string;
  strand: string;
  /**
   * Let this leg's string wander behind the copy instead of running down the
   * gutter, looping behind the element this selector names — the leg's glass.
   */
  glass?: string;
}) {
  return (
    <>
      {glass ? <Meander glass={glass} /> : <svg className="tc-strand" data-strand={strand} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {STRAND_PATHS[strand].map((d, i) => (
          <path key={d} d={d} className={i > 0 ? "tc-fibre" : undefined} />
        ))}
      </svg>}
      <p className="tc-reading" data-strand={strand}>
        <span className="tc-chip">{chip}</span>
        <span>{ms}</span>
      </p>
    </>
  );
}

/**
 * The string, leg by leg: what state each stretch is in, in the same order
 * on every page. The words for each leg come from the page's copy.
 */
const LEGS = [
  { id: "open", strand: "taut", chip: "DIRECT", ms: "18ms" },
  // The second stretch wanders behind the copy and its glass panel.
  { id: "planes", strand: "taut", chip: "DIRECT", ms: "18ms", glass: ".tc-figure pre" },
  { id: "secret", strand: "taut", chip: "DIRECT", ms: "18ms" },
  { id: "relay", strand: "slack", chip: "RELAY", ms: "84ms" },
  { id: "limits", strand: "frayed", chip: "CHOPPY", ms: "84ms" },
  { id: "real", strand: "taut", chip: "DIRECT", ms: "18ms" },
  { id: "blocked", strand: "taut", chip: "DIRECT", ms: "18ms" },
] as const;

/** Backticks in an answer mark a command. */
function Answer({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </>
  );
}

export function TincanPage({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  return (
    <div className={`tc ${shoulders.variable} ${martian.variable}`} lang={lang}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph(lang)) }}
      />

      <header className="tc-top">
        <a href="#tc-title" className="tc-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 32px mark; nothing for next/image to optimise */}
          <img src="/tincan/logo-224.png" alt="" width={32} height={32} />
          <span>tincan</span>
        </a>
        <nav className="tc-top-links" aria-label={t.ui.nav}>
          <Link
            href={t.ui.other.href}
            hrefLang={t.ui.other.lang}
            lang={t.ui.other.lang}
            className="tc-lang"
          >
            {t.ui.other.label}
          </Link>
          <a href={REPO} className="tc-github">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
              />
            </svg>
            <span>GitHub</span>
            {/* Leaving the site: a box with the arrow breaking out of its corner. */}
            <svg className="tc-out" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M7 3.5H2.5v10h10V9M9.5 2.5h4v4M13.5 2.5 7 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
              />
            </svg>
            <span className="tc-sr">{t.ui.leaving}</span>
          </a>
        </nav>
      </header>

      <main>
        <section className="tc-hero" aria-labelledby="tc-title">
          <div className="tc-hero-intro">
            <h1 id="tc-title">
              <span>{t.hero.title[0]}</span> <span>{t.hero.title[1]}</span>{" "}
              {/* The words people search for, in the heading search engines
                  read first, set as the line that says what the picture is. */}
              <span className="tc-h1-says">{t.hero.says}</span>
            </h1>
            <p className="tc-lead">{t.hero.lead}</p>
          </div>
          <LiveTerminal lang={lang} />
          <div className="tc-hero-install">
            <InstallTabs lang={lang} />
            <p className="tc-facts">
              <a href="https://crates.io/crates/tincan-chat">v0.3.1</a>
              <a href={`${REPO}/blob/main/LICENSE`}>{t.ui.license}</a>
              <a href="https://ratatui.rs/">{t.ui.ratatui}</a>
            </p>
          </div>
        </section>

        <StringRail>
          <Can who={t.cans[0]} />

          {LEGS.map((leg) => (
            <section
              key={leg.id}
              className="tc-leg"
              data-strand={leg.strand}
              data-meander={"glass" in leg ? "" : undefined}
              aria-labelledby={`tc-${leg.id}`}
            >
              <Reading
                chip={leg.chip}
                ms={leg.ms}
                strand={leg.strand}
                glass={"glass" in leg ? leg.glass : undefined}
              />
              <h2 id={`tc-${leg.id}`}>{t.legs[leg.id].title}</h2>
              {t.legs[leg.id].body}
            </section>
          ))}

          <Can who={t.cans[1]} flipped />
        </StringRail>

        <section className="tc-compare" aria-labelledby="tc-compare-title">
          <h2 id="tc-compare-title">{t.compare.title}</h2>
          <p>{t.compare.lead}</p>
          <div className="tc-table-wrap">
            <table className="tc-table">
              <caption className="tc-sr">{t.compare.caption}</caption>
              <thead>
                <tr>
                  <td />
                  <th scope="col" className="tc-col-tincan">tincan</th>
                  <th scope="col">Discord</th>
                  <th scope="col">TeamSpeak / Mumble</th>
                </tr>
              </thead>
              <tbody>
                {t.compare.rows.map(([label, tincan, discord, others]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td className="tc-col-tincan">{tincan}</td>
                    <td>{discord}</td>
                    <td>{others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="tc-faq" aria-labelledby="tc-faq-title">
          <h2 id="tc-faq-title">{t.faq.title}</h2>
          {/* Closed until asked, and only one open at a time (`name`), so the
              list stays the height of its questions. The answers are still in
              the page, where search engines and find-in-page reach them. */}
          <div className="tc-faq-list">
            {t.faq.items.map(({ q, a }) => (
              <details key={q} name="tc-faq" className="tc-faq-item">
                <summary>
                  <h3>{q}</h3>
                </summary>
                <p>
                  <Answer text={a} />
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="tc-end" aria-labelledby="tc-their-end">
          <h2 id="tc-their-end">{t.end.title}</h2>
          <p className="tc-lead">{t.end.lead}</p>
          <InstallTabs lang={lang} />
          <ul className="tc-links">{t.end.links}</ul>
        </section>
      </main>

      <footer className="tc-foot">
        <p>{t.foot}</p>
      </footer>
    </div>
  );
}
