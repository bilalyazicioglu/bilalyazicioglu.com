/**
 * The site as terminal text — what `curl bilalyazicioglu.com` prints.
 *
 * Every page is a pure function of the data it is handed, so the route only
 * gathers data and these can be tested as strings. Output fits 80 columns.
 * Colour is optional: the route turns it off for `?plain` and for anything
 * that is not a terminal client, and then not a single escape code is written.
 */

import type { InfraData, Series } from "@/lib/infra-types";
import type { PostMeta } from "@/lib/blog";
import type { Project } from "@/lib/projects";
import { TINCAN_INSTALL } from "@/lib/tincan-install";
import { TINCAN_URL } from "@/lib/tincan-host";
import { formatAgo, formatBytes, formatNumber } from "@/components/infra/format";
import { siteConfig } from "@/site.config";

const WIDTH = 76;
const INDENT = "  ";
const SITE = new URL(siteConfig.url).host;
const REPO = `https://github.com/${siteConfig.githubUsername}/bilalyazicioglu.com`;

export type RenderOptions = {
  color: boolean;
  /** ms since epoch — passed in so output is reproducible in tests. */
  now: number;
};

type Paint = (text: string) => string;

/** SGR wrappers, or identity functions when colour is off. */
function palette(color: boolean) {
  const sgr =
    (code: string): Paint =>
    (text) =>
      color && text ? `\x1b[${code}m${text}\x1b[0m` : text;
  return {
    bold: sgr("1"),
    dim: sgr("2"),
    // Closest 256-colour match to the site's teal accent; 256 colours work in
    // every terminal people still use, truecolor does not.
    accent: sgr("38;5;43"),
    heading: sgr("1;38;5;43"),
    ok: sgr("32"),
    bad: sgr("31"),
  };
}

type Palette = ReturnType<typeof palette>;

function pad(text: string, width: number): string {
  return text.length >= width ? `${text} ` : text + " ".repeat(width - text.length);
}

/** Greedy word wrap. A word longer than the width gets a line to itself. */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (current && current.length + 1 + word.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const paragraph = (text: string, indent = INDENT, paint: Paint = (t) => t) =>
  wrap(text, WIDTH - indent.length).map((l) => indent + paint(l));

const TICKS = "▁▂▃▄▅▆▇█";

/**
 * A text sparkline: one block per point, height by value, a space for a gap.
 * `every` thins the series so 24 hours fits beside the numbers.
 */
export function sparkline(series: Series, { max, every = 1 }: { max?: number; every?: number } = {}): string {
  const values = series.values.filter((_, i) => i % every === 0);
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return "";
  const lo = max === undefined ? Math.min(...known) : 0;
  const hi = max ?? Math.max(...known);
  const span = hi - lo || 1;
  return values
    .map((v) => {
      if (v === null) return " ";
      const level = Math.round(((Math.min(v, hi) - lo) / span) * (TICKS.length - 1));
      return TICKS[Math.max(0, level)];
    })
    .join("");
}

function heading(p: Palette, title: string): string[] {
  return ["", `${INDENT}${p.heading(title.toUpperCase())}`, ""];
}

function box(p: Palette, rows: { text: string; paint?: Paint }[]): string[] {
  const inner = WIDTH - 2;
  const edge = "─".repeat(inner);
  return [
    `${INDENT}${p.accent(`╭${edge}╮`)}`,
    ...rows.map(({ text, paint = (t) => t }) => {
      const body = `  ${text}`;
      return `${INDENT}${p.accent("│")}${paint(body)}${" ".repeat(Math.max(0, inner - body.length))}${p.accent("│")}`;
    }),
    `${INDENT}${p.accent(`╰${edge}╯`)}`,
  ];
}

/** "https://bilalyazicioglu.com/x" → "bilalyazicioglu.com/x": shorter, and still a link in most terminals. */
const bare = (href: string) => new URL(href, siteConfig.url).href.replace(/^https?:\/\//, "").replace(/\/$/, "");

const MORE = [
  [SITE, "home"],
  [`${SITE}/projects`, "everything I have shipped"],
  [`${SITE}/blog`, "writing"],
  [`${SITE}/infra`, "the machine answering you, live"],
  ["tincan.rs", "voice chat for the terminal"],
] as const;

function footer(p: Palette, browserUrl: string): string[] {
  return [
    ...heading(p, "More"),
    ...MORE.map(([url, about]) => `${INDENT}${p.accent(pad(`curl ${url}`, 36))}${p.dim(about)}`),
    "",
    `${INDENT}${p.dim(`Terminal edition. Full site: ${browserUrl}`)}`,
    `${INDENT}${p.dim("No colours? Add ?plain to the URL.")}`,
    "",
  ];
}

const finish = (lines: string[]) => `${lines.join("\n")}\n`;

const ago = (then: number, now: number) => `${formatAgo(then, now)} ago`;

/** One-line status of the host, or null when Prometheus is down. */
function vitals(infra: InfraData): string | null {
  if (!infra.online) return null;
  const { live } = infra;
  const parts = [
    live.cpuPercent === null ? null : `cpu ${formatNumber(live.cpuPercent)}%`,
    live.memoryPercent === null ? null : `mem ${formatNumber(live.memoryPercent)}%`,
    live.temperatureC === null ? null : `${formatNumber(live.temperatureC)}°C`,
    live.requestsPerMinute === null ? null : `${formatNumber(live.requestsPerMinute, live.requestsPerMinute < 10 ? 1 : 0)} req/min`,
  ].filter(Boolean);
  return parts.length ? parts.join("  ·  ") : null;
}

function buildLine(p: Palette, infra: InfraData, now: number): string | null {
  const { sha, subject, committedAt } = infra.deploy;
  if (!sha) return null;
  const when = committedAt === null ? "" : p.dim(` · committed ${ago(committedAt * 1000, now)}`);
  return `${INDENT}build ${p.accent(sha.slice(0, 7))}${subject ? ` ${subject}` : ""}${when}`;
}

/** Cut to `width` columns, with an ellipsis when something was cut. */
function truncate(text: string, width: number): string {
  return text.length <= width ? text : `${text.slice(0, width - 1).trimEnd()}…`;
}

/** Translated posts once each, in English when there is an English copy. */
export function oneLanguage(posts: PostMeta[]): PostMeta[] {
  const english = new Set(posts.filter((post) => post.lang === "en" && post.translationKey).map((post) => post.translationKey));
  return posts.filter((post) => post.lang === "en" || !english.has(post.translationKey));
}

function firstSentence(text: string): string {
  return text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
}

export function renderHome(
  data: { projects: Project[]; posts: PostMeta[]; infra: InfraData },
  { color, now }: RenderOptions
): string {
  const p = palette(color);
  const { infra } = data;
  const lines = [
    "",
    ...box(p, [
      { text: "" },
      { text: siteConfig.name, paint: p.bold },
      { text: siteConfig.role },
      { text: `${siteConfig.location} · ${siteConfig.availability}`, paint: p.dim },
      { text: "" },
    ]),
  ];

  lines.push(...heading(p, "What I build"));
  // The home page features the first three, so the terminal does too.
  for (const project of data.projects.slice(0, 3)) {
    const meta = [project.private ? "private" : "open source", ...project.badges.filter((b) => b !== "Featured")];
    lines.push(`${INDENT}${p.bold(pad(project.name, 14))}${p.dim(meta.join(" · ").toLowerCase())}`);
    lines.push(...paragraph(project.short ?? firstSentence(project.description), INDENT + " ".repeat(14)));
    if (project.href) lines.push(`${INDENT}${" ".repeat(14)}${p.accent(bare(project.href))}`);
    lines.push("");
  }
  lines.push(`${INDENT}${p.dim(`and ${data.projects.length - 3} more →`)} ${p.accent(`curl ${SITE}/projects`)}`);

  lines.push(...heading(p, "Served from"));
  const cpu = infra.specs.cpuModel ? `an ${infra.specs.cpuModel}` : "a small machine";
  lines.push(
    ...paragraph(
      `This text was rendered a moment ago by ${cpu} in a homelab in Istanbul, and reached you through a Cloudflare Tunnel — no open ports at home.`
    )
  );
  const status = vitals(infra);
  if (status) lines.push("", `${INDENT}${status}`);
  const build = buildLine(p, infra, now);
  if (build) lines.push(build);
  lines.push("", `${INDENT}${p.dim("details →")} ${p.accent(`curl ${SITE}/infra`)}`);

  if (data.posts.length) {
    lines.push(...heading(p, "Latest writing"));
    for (const post of oneLanguage(data.posts).slice(0, 5)) {
      lines.push(`${INDENT}${p.dim(post.date.slice(0, 10))}  ${truncate(post.title, WIDTH - 12)}`);
    }
    lines.push("", `${INDENT}${p.dim("all posts →")} ${p.accent(`curl ${SITE}/blog`)}`);
  }

  lines.push(...heading(p, "Contact"));
  lines.push(`${INDENT}${pad("email", 10)}${p.accent(siteConfig.email)}`);
  for (const social of siteConfig.socials.filter((s) => !s.href.startsWith("mailto:"))) {
    lines.push(`${INDENT}${pad(social.label.toLowerCase(), 10)}${p.accent(bare(social.href))}`);
  }
  lines.push(`${INDENT}${pad("cv", 10)}${p.accent(bare(siteConfig.resumeUrl))}`);

  return finish([...lines, ...footer(p, siteConfig.url)]);
}

export function renderInfra(infra: InfraData, { color, now, colo }: RenderOptions & { colo: string | null }): string {
  const p = palette(color);
  const { live, specs, history, deploy } = infra;
  const time = new Date(infra.generatedAt).toISOString().slice(11, 19);
  const lines = [
    "",
    `${INDENT}${p.heading("THIS MACHINE")}  ${p.dim(infra.online ? `live · ${time} UTC` : "metrics offline")}`,
    "",
    ...paragraph(
      "The server answering this request is a home server in Istanbul. These numbers come from its own Prometheus, read when you asked."
    ),
  ];

  if (!infra.online) {
    lines.push("", ...paragraph("Prometheus isn't answering right now, so the host numbers are blank. This page still came from the machine — that part works."));
  }

  const value = (v: number | null, fmt: (n: number) => string) => (v === null ? "—" : fmt(v));
  const pct = (n: number) => `${formatNumber(n)}%`;
  const spark = (series: Series | undefined, max?: number) =>
    series ? p.accent(sparkline(series, { max, every: 2 })) : "";
  const rows: [string, string, string][] = [
    ["cpu", value(live.cpuPercent, pct), spark(history?.cpu, 100)],
    ["memory", value(live.memoryPercent, pct), spark(history?.memory, 100)],
    ["temperature", value(live.temperatureC, (n) => `${formatNumber(n)}°C`), spark(history?.temperature)],
    [
      "traffic",
      value(live.requestsPerMinute, (n) => `${formatNumber(n, n < 10 ? 1 : 0)}/min`),
      spark(history?.requests),
    ],
  ];
  // Offline, every number is a dash; skip the sections rather than print a wall of them.
  if (infra.online) {
    lines.push(...heading(p, "Right now"));
    if (history) lines.push(`${INDENT}${" ".repeat(22)}${p.dim("last 24 hours →")}`);
    for (const [label, current, chart] of rows) {
      lines.push(`${INDENT}${p.dim(pad(label, 13))}${p.bold(pad(current, 9))}${chart}`);
    }
  }
  const notes = [
    live.loadPerCore === null ? null : `load ${formatNumber(live.loadPerCore, 2)} per core`,
    live.requests24h === null ? null : `${formatNumber(live.requests24h)} requests in 24h`,
    live.errors24h === null ? null : `${formatNumber(live.errors24h)} errors in 24h`,
  ].filter(Boolean);
  if (infra.online && notes.length) lines.push("", `${INDENT}${p.dim(notes.join("  ·  "))}`);

  const facts = (rows: [string, string | null][]) =>
    rows.map(([term, detail]) => `${INDENT}${p.dim(pad(term, 13))}${detail ?? "—"}`);

  if (infra.online) {
    lines.push(...heading(p, "The machine"));
    lines.push(
      ...facts([
        ["cpu", specs.cpuModel ? `${specs.cpuModel}${specs.cores ? ` · ${specs.cores} threads` : ""}` : null],
        ["memory", specs.memoryBytes === null ? null : `${formatBytes(specs.memoryBytes)} usable`],
        [
          "root volume",
          specs.diskBytes === null
            ? null
            : `${formatBytes(specs.diskBytes)}${live.diskPercent === null ? "" : ` · ${pct(live.diskPercent)} used`}`,
        ],
        ["os", specs.os],
        ["network", "Cloudflare Tunnel · Tailscale for admin"],
      ])
    );
  }

  lines.push(...heading(p, "Running build"));
  lines.push(
    ...facts([
      ["commit", deploy.sha ? `${p.accent(deploy.sha.slice(0, 7))}${deploy.subject ? ` ${deploy.subject}` : ""}` : null],
      // The link to the exact source that is running, under the commit it names.
      ...(deploy.sha ? [["", p.dim(bare(`${REPO}/commit/${deploy.sha}`))] as [string, string]] : []),
      ["committed", deploy.committedAt === null ? null : ago(deploy.committedAt * 1000, now)],
      ["live for", formatAgo(deploy.startedAt, now)],
      [
        "app",
        `${formatBytes(live.appMemoryBytes)} RSS${live.eventLoopLagMs === null ? "" : ` · ${formatNumber(live.eventLoopLagMs, 1)} ms event-loop p99`}`,
      ],
    ])
  );

  lines.push(...heading(p, "Services"));
  for (const service of infra.services) {
    const state =
      service.up === null ? p.dim("○ unknown") : service.up ? p.ok("● up     ") : p.bad("● down   ");
    lines.push(`${INDENT}${state}  ${pad(service.label, 15)}${p.dim(service.role)}`);
  }

  lines.push(...heading(p, "How this reached you"));
  const hops = ["you", colo ? `cloudflare ${colo}` : "cloudflare", "tunnel", "homeserver", "docker", "next.js"];
  lines.push(...paragraph(hops.join(" → ")));
  lines.push(...paragraph("The tunnel is dialled out from home, so the router has no open ports.", INDENT, p.dim));

  return finish([...lines, ...footer(p, `${siteConfig.url}/infra`)]);
}

export function renderProjects(projects: Project[], { color }: RenderOptions): string {
  const p = palette(color);
  const lines = ["", `${INDENT}${p.heading("PROJECTS")}  ${p.dim(`${projects.length} of them`)}`];
  for (const project of projects) {
    const meta = [project.private ? "private" : "open source", ...project.badges.filter((b) => b !== "Featured")];
    lines.push("", `${INDENT}${p.bold(project.name)}  ${p.dim(meta.join(" · ").toLowerCase())}`);
    lines.push(...paragraph(project.description, INDENT + "  "));
    const stats = project.stats.map((s) => `${s.label.toLowerCase()} ${s.value}`).join("  ·  ");
    lines.push(...paragraph(stats, INDENT + "  ", p.dim));
    const links = [project.href, project.repo].filter((h): h is string => Boolean(h)).map(bare);
    if (links.length) lines.push(`${INDENT}  ${links.map((l) => p.accent(l)).join("  ")}`);
  }
  return finish([...lines, ...footer(p, `${siteConfig.url}/projects`)]);
}

export function renderBlog(posts: PostMeta[], { color }: RenderOptions): string {
  const p = palette(color);
  const lines = ["", `${INDENT}${p.heading("WRITING")}  ${p.dim(`${posts.length} posts`)}`];
  if (!posts.length) lines.push("", `${INDENT}${p.dim("Nothing published yet.")}`);
  for (const post of posts) {
    const column = INDENT + " ".repeat(16);
    const [first, ...rest] = wrap(post.title, WIDTH - column.length);
    lines.push("", `${INDENT}${p.dim(`${post.date.slice(0, 10)}  ${post.lang}`)}  ${p.bold(first)}`);
    lines.push(...rest.map((l) => column + p.bold(l)));
    lines.push(...paragraph(post.summary, column));
    lines.push(`${column}${p.accent(bare(`/blog/${post.slug}`))}`);
  }
  return finish([...lines, ...footer(p, `${siteConfig.url}/blog`)]);
}

export function renderTincan(project: Project, { color }: RenderOptions): string {
  const p = palette(color);
  const stars = project.stats.find((s) => s.label === "Stars")?.value;
  const lines = [
    "",
    `${INDENT}${p.heading("tincan")}  ${p.dim(stars ? `★ ${stars} on GitHub` : "open source")}`,
    "",
    ...paragraph(project.description),
    ...heading(p, "Install"),
  ];
  for (const way of TINCAN_INSTALL) {
    // Commands are never wrapped: a broken line is a broken paste.
    lines.push(`${INDENT}${p.dim(way.label.toLowerCase())}`, `${INDENT}  ${p.accent(way.command)}`, "");
  }
  if (project.repo) lines.push(`${INDENT}${pad("source", 10)}${p.accent(bare(project.repo))}`);
  lines.push(`${INDENT}${pad("author", 10)}${p.accent(SITE)} ${p.dim(`— try curl ${SITE}`)}`);
  lines.push("", `${INDENT}${p.dim(`Terminal edition. Full page: ${TINCAN_URL}`)}`, `${INDENT}${p.dim("No colours? Add ?plain to the URL.")}`, "");
  return finish(lines);
}
