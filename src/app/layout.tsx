import type { Metadata } from "next";
import { Silkscreen, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeScript } from "@/components/ThemeProvider";
import { siteConfig } from "@/site.config";

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Plex Sans and Plex Mono are drawn on the same skeleton, so the labels and the
// prose read as one voice instead of two borrowed ones. Only 400 and 700 are
// loaded because those are the only weights the site actually sets.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  title: {
    default: `${siteConfig.name} — ${siteConfig.role}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.bio,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    siteConfig.name,
    ...siteConfig.alternateNames,
    "Ahmet Bilal Yazıcıoğlu kimdir",
    "Bilal Yazıcıoğlu kimdir",
    "Bilal Yazıcıoğlu yazılımcı",
    "Bilal Yazıcıoğlu Marmara Üniversitesi",
    "Bilal Yazıcıoğlu ARpoly",
    "Bilal Yazıcıoğlu tincan",
    "Bilal Yazıcıoğlu basketbol",
    "Ahmet Bilal Yazıcıoğlu FIBA",
    "Computer Engineering",
    "Business Administration",
    "Marmara University",
    "Universidad de Oviedo",
    "Rust developer",
    "Distributed Systems",
    "Portfolio",
    "Blog",
  ],
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["tr_TR"],
    url: siteConfig.url,
    title: `${siteConfig.name} — ${siteConfig.role}`,
    description: siteConfig.bio,
    siteName: siteConfig.name,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.role}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.role}`,
    description: siteConfig.bio,
    images: ["/og-image.png"],
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${siteConfig.url}/#person`,
  name: siteConfig.name,
  alternateName: siteConfig.alternateNames,
  url: siteConfig.url,
  image: `${siteConfig.url}/icon-512.png`,
  jobTitle: siteConfig.role,
  description: siteConfig.bio,
  disambiguatingDescription:
    "Ahmet Bilal Yazıcıoğlu (Bilal Yazıcıoğlu) is a Turkish software engineer, computer engineering and business administration student at Marmara University (and Erasmus alumnus at Universidad de Oviedo), creator of ARpoly and tincan-cli, and a competitive basketball player registered in FIBA 3x3.",
  knowsLanguage: ["en", "tr", "es"],
  email: siteConfig.email,
  sameAs: [
    "https://github.com/bilalyazicioglu",
    "https://www.linkedin.com/in/bilal-yazicioglu/",
    "https://play.fiba3x3.com/players/search?q=Ahmet%20Bilal%20Yazicioglu",
    "https://www.npmjs.com/package/@arpoly/react",
    "https://github.com/bilalyazicioglu/tincan-cli",
    "https://github.com/bilalyazicioglu/bilalyazicioglu.com",
  ],
  memberOf: [
    {
      "@type": "SportsTeam",
      name: "Marmara University Basketball Team",
    },
    {
      "@type": "SportsTeam",
      name: "Universidad de Oviedo Basketball Team",
    },
  ],
  hasOccupation: {
    "@type": "Occupation",
    name: "Software Engineer",
    occupationalCategory: "15-1252.00",
    skills: "Rust, TypeScript, Next.js, QUIC, P2P Networks, Distributed Systems, Docker, Go, Java",
  },
  knowsAbout: [
    "Rust",
    "TypeScript",
    "Next.js",
    "Peer-to-Peer Networks",
    "QUIC Protocol",
    "Distributed Systems",
    "Augmented Reality",
    "Three.js",
    "Docker",
    "Go",
    "Java",
    "Spring Boot",
    "Observability",
    "Prometheus",
    "Grafana",
    "Computer Engineering",
  ],
  alumniOf: [
    {
      "@type": "EducationalOrganization",
      name: "Marmara University",
    },
    {
      "@type": "EducationalOrganization",
      name: "Universidad de Oviedo",
    },
  ],
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteConfig.url}/#website`,
  name: siteConfig.name,
  url: siteConfig.url,
  image: `${siteConfig.url}/og-image.png`,
};

const profilePageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${siteConfig.url}/#profilepage`,
  url: siteConfig.url,
  name: `${siteConfig.name} — Profile`,
  mainEntity: {
    "@id": `${siteConfig.url}/#person`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${silkscreen.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
      // `data-theme` is written by the inline script below before React ever
      // sees this element, which is exactly the mismatch React would warn about.
      suppressHydrationWarning
    >
      <head>
        {/* First thing in <head>, so the palette is settled before the first
            paint rather than after it. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Icons come from `metadata.icons` above, so a page can swap them. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([personJsonLd, webSiteJsonLd, profilePageJsonLd]),
          }}
        />
      </head>
      {/* The site's frame lives in (site)/layout.tsx; the tincan showcase
          brings its own, so the root only owns what every page shares. */}
      <body className="min-h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
