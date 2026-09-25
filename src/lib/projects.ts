export type ProjectCategory = "Open Source" | "Private";

export type ProjectStat = {
  label: string;
  value: string;
};

export type Project = {
  slug: string;
  name: string;
  tag: string;
  category: ProjectCategory;
  badges: string[];
  description: string;
  href?: string;
  /** The source repository, when `href` points somewhere else (a project page). */
  repo?: string;
  featured?: boolean;
  private?: boolean;
  live?: boolean;
  stats: ProjectStat[];
};

/**
 * ARpoly (platform + m3nu vertical) is private/confidential — no public
 * repository link. The rest are the most notable of
 * github.com/bilalyazicioglu's public repos (smaller CLI/course exercises are
 * left off the site).
 *
 * Order matters: the home page features the first three entries.
 */
export const projects: Project[] = [
  {
    slug: "arpoly",
    name: "ARpoly",
    tag: "AR",
    category: "Private",
    badges: ["Featured", "Live"],
    description:
      "One product in two halves. The platform is a sector-agnostic AR service: someone films an object with an ordinary phone camera, the server reconstructs it into a real-scale 3D model (GLB + USDZ) and hands it to the OS AR viewer, so a 30 cm pizza shows up 30 cm wide on the customer's own table — no app install, and no camera permission to view. It is sold as a multi-tenant REST API plus @arpoly/react, the client SDK published on npm. The other half is m3nu, the cafe vertical running on top of it: menus, categories, QR links and table orders with split payment, talking to the platform over HTTP with an API key exactly as an outside customer would — which is the point, because anything m3nu needs that a third party could not have is a bug in the platform.",
    href: "https://arpoly.com",
    featured: true,
    live: true,
    private: true,
    stats: [
      { label: "Platform", value: "Node + MongoDB" },
      { label: "Vertical", value: "m3nu (cafes)" },
      { label: "SDK", value: "@arpoly/react" },
      { label: "Tests", value: "280+" },
    ],
  },
  {
    slug: "yovi",
    name: "YOVI",
    tag: "YV",
    category: "Open Source",
    badges: ["Live", "Team project"],
    live: true,
    description:
      "A full-stack strategy game built for my Software Architecture course — React frontend, Node.js users service, and a Rust game engine, with bots, leaderboards, and a full CI/CD pipeline to production. I worked on game logic & bots.",
    href: "https://github.com/Arquisoft/yovi_en1b",
    stats: [
      { label: "Role", value: "Game Logic & Bots" },
      { label: "Stack", value: "Rust + React" },
      { label: "Stars", value: "6" },
      { label: "Status", value: "Live" },
    ],
  },
  {
    slug: "tincan",
    name: "tincan",
    tag: "TC",
    category: "Open Source",
    badges: ["Live", "CLI", "P2P"],
    live: true,
    description:
      "Serverless voice chat that lives in the terminal. Whoever starts it becomes the room's coordinator and hands out an invite code — friends join from anywhere with no VPN, no port forwarding and no account. Control traffic goes through the coordinator, but audio is a direct peer-to-peer mesh of QUIC datagrams, so the host's uplink never becomes the bottleneck.",
    href: "/tincan",
    repo: "https://github.com/bilalyazicioglu/tincan-cli",
    stats: [
      { label: "Language", value: "Rust" },
      { label: "Transport", value: "iroh / QUIC" },
      { label: "Audio", value: "Opus mesh" },
      { label: "Tests", value: "93" },
    ],
  },
  {
    slug: "portfolio",
    name: "bilalyazicioglu.com",
    tag: "PF",
    category: "Open Source",
    badges: ["Live", "This site"],
    live: true,
    description:
      "This site. A bilingual Next.js and MDX blog with an interactive terminal and an authenticated publishing studio. Self-hosted with Docker, with Prometheus, Loki and Grafana for monitoring.",
    href: "https://github.com/bilalyazicioglu/bilalyazicioglu.com",
    stats: [
      { label: "Stack", value: "Next.js 16 + TS" },
      { label: "Content", value: "MDX" },
      { label: "Ops", value: "Docker + Grafana" },
      { label: "Editor", value: "MDX Studio" },
    ],
  },
  {
    slug: "cashcard-backend",
    name: "CashCard Backend",
    tag: "CC",
    category: "Open Source",
    badges: ["Spring Boot"],
    description: "A Spring Boot REST API for a cash-card ledger service.",
    href: "https://github.com/bilalyazicioglu/CashCard-Backend",
    stats: [
      { label: "Language", value: "Java" },
      { label: "Stars", value: "3" },
      { label: "Forks", value: "0" },
      { label: "Since", value: "2025" },
    ],
  },
  {
    slug: "moneyhandler",
    name: "moneyhandler",
    tag: "MH",
    category: "Open Source",
    badges: ["Open Source"],
    description: "A personal finance tracking app, built around my own needs.",
    href: "https://github.com/bilalyazicioglu/moneyhandler",
    stats: [
      { label: "Language", value: "Python" },
      { label: "Stars", value: "3" },
      { label: "Forks", value: "0" },
      { label: "Since", value: "2026" },
    ],
  },
  {
    slug: "community-portal",
    name: "Community Portal",
    tag: "CP",
    category: "Open Source",
    badges: ["Full-stack"],
    description:
      "A full-stack community portal — TypeScript frontend paired with a Go REST API backend.",
    href: "https://github.com/bilalyazicioglu/Community-Portal-",
    stats: [
      { label: "Frontend", value: "TypeScript" },
      { label: "Backend", value: "Go" },
      { label: "Stars", value: "2" },
      { label: "Since", value: "2025" },
    ],
  },
  {
    slug: "outofmatrix",
    name: "outofmatrix",
    tag: "OM",
    category: "Open Source",
    badges: ["In progress"],
    description:
      "A self-hosted media stasher, currently under active development.",
    href: "https://github.com/bilalyazicioglu/outofmatrix",
    stats: [
      { label: "Language", value: "Go" },
      { label: "Stars", value: "0" },
      { label: "Forks", value: "0" },
      { label: "Since", value: "2026" },
    ],
  },
  {
    slug: "currency-converter",
    name: "Currency Converter",
    tag: "CV",
    category: "Open Source",
    badges: ["CLI"],
    description: "A CLI currency converter built with BubbleTea and Go.",
    href: "https://github.com/bilalyazicioglu/Currency-converter",
    stats: [
      { label: "Language", value: "Go" },
      { label: "Stars", value: "2" },
      { label: "Forks", value: "0" },
      { label: "Since", value: "2025" },
    ],
  },
];
