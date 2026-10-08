import { describe, expect, it } from "vitest";
import type { InfraData } from "@/lib/infra-types";
import type { PostMeta } from "@/lib/blog";
import { projects } from "@/lib/projects";
import { oneLanguage, renderBlog, renderHome, renderInfra, renderProjects, renderTincan, sparkline, wrap } from "./render";

const NOW = Date.parse("2026-10-08T12:00:00Z");
const plain = { color: false, now: NOW };
const color = { color: true, now: NOW };

const ESC = "\x1b";
const stripAnsi = (text: string) => text.replace(/\x1b\[[\d;]*m/g, "");
const widest = (text: string) => Math.max(...stripAnsi(text).split("\n").map((l) => [...l].length));

const series = (values: (number | null)[]) => ({ start: 0, step: 900, values });

const infra: InfraData = {
  generatedAt: NOW,
  online: true,
  live: {
    cpuPercent: 12.4,
    memoryPercent: 41,
    loadPerCore: 0.31,
    temperatureC: 47,
    diskPercent: 23,
    requestsPerMinute: 6.5,
    requests24h: 8400,
    errors24h: 0,
    eventLoopLagMs: 11.2,
    appMemoryBytes: 180 * 1024 ** 2,
  },
  specs: { cpuModel: "AMD Ryzen 3 3200U", cores: 4, memoryBytes: 5.2 * 1024 ** 3, diskBytes: 98 * 1024 ** 3, os: "Ubuntu 26.04" },
  services: [
    { id: "blog", label: "Next.js app", role: "Renders this page", up: true },
    { id: "loki", label: "Loki", role: "Stores logs", up: false },
    { id: "grafana", label: "Grafana", role: "Private dashboards", up: null },
  ],
  history: {
    cpu: series(Array.from({ length: 97 }, (_, i) => (i % 10) * 10)),
    memory: series(Array.from({ length: 97 }, () => 40)),
    requests: series(Array.from({ length: 97 }, (_, i) => (i < 4 ? null : i))),
    temperature: series(Array.from({ length: 97 }, () => 45)),
  },
  deploy: { sha: "c4ea4b2d00f", subject: "fix(ci): run deploys from the checkout", committedAt: NOW / 1000 - 3 * 3600, startedAt: NOW - 600_000 },
};

const post = (slug: string, lang: "en" | "tr", key?: string, title = `Post ${slug}`): PostMeta => ({
  slug,
  title,
  summary: `About ${slug}.`,
  date: "2026-09-14",
  tags: [],
  lang,
  draft: false,
  readingTime: "3 min",
  translationKey: key,
});

const offline: InfraData = {
  ...infra,
  online: false,
  history: null,
  specs: { cpuModel: null, cores: null, memoryBytes: null, diskBytes: null, os: null },
};

describe("wrap", () => {
  it("breaks on words and never exceeds the width", () => {
    const lines = wrap("the quick brown fox jumps over the lazy dog", 10);
    expect(lines).toEqual(["the quick", "brown fox", "jumps over", "the lazy", "dog"]);
  });

  it("gives an over-long word its own line instead of cutting it", () => {
    expect(wrap("see https://example.com/a/very/long/path now", 12)).toEqual([
      "see",
      "https://example.com/a/very/long/path",
      "now",
    ]);
  });
});

describe("sparkline", () => {
  it("maps the range onto eight heights and gaps onto spaces", () => {
    expect(sparkline(series([0, 50, 100, null]), { max: 100 })).toBe("▁▅█ ");
  });

  it("scales to its own range without a max", () => {
    expect(sparkline(series([10, 20]))).toBe("▁█");
  });

  it("is empty when there is no data at all", () => {
    expect(sparkline(series([null, null]))).toBe("");
  });

  it("thins the series", () => {
    expect(sparkline(series(Array.from({ length: 97 }, () => 1)), { every: 2 })).toHaveLength(49);
  });
});

describe("oneLanguage", () => {
  it("keeps the English copy of a translated post and every untranslated one", () => {
    const posts = [post("a-tr", "tr", "a"), post("a-en", "en", "a"), post("b-tr", "tr"), post("c-tr", "tr", "c")];
    expect(oneLanguage(posts).map((p) => p.slug)).toEqual(["a-en", "b-tr", "c-tr"]);
  });
});

describe("pages", () => {
  const posts = [post("hello", "en", undefined, "A title long enough that it would run straight past the eightieth column of a terminal")];
  const pages = {
    home: (opts: typeof plain) => renderHome({ projects, posts, infra }, opts),
    infra: (opts: typeof plain) => renderInfra(infra, { ...opts, colo: "IST" }),
    projects: (opts: typeof plain) => renderProjects(projects, opts),
    blog: (opts: typeof plain) => renderBlog(posts, opts),
    tincan: (opts: typeof plain) => renderTincan(projects.find((p) => p.slug === "tincan")!, opts),
  };

  it.each(Object.entries(pages))("%s fits an 80-column terminal", (name, render) => {
    const text = render(color);
    // The tincan shell installer is one command and is not wrapped on purpose.
    const limit = name === "tincan" ? 100 : 80;
    expect(widest(text)).toBeLessThanOrEqual(limit);
    expect(text.endsWith("\n")).toBe(true);
  });

  it.each(Object.entries(pages))("%s writes no escape codes when colour is off", (_, render) => {
    expect(render(plain)).not.toContain(ESC);
  });

  it.each(Object.entries(pages))("%s says the same thing with and without colour", (_, render) => {
    expect(stripAnsi(render(color))).toBe(render(plain));
  });

  it("home shows the featured projects, the live host and the running build", () => {
    const text = pages.home(plain);
    expect(text).toContain("ARpoly");
    expect(text).toContain("an AMD Ryzen 3 3200U");
    expect(text).toContain("cpu 12%  ·  mem 41%  ·  47°C  ·  6.5 req/min");
    expect(text).toContain("build c4ea4b2 fix(ci): run deploys from the checkout · committed 3h 0m ago");
    expect(text).toContain("curl bilalyazicioglu.com/infra");
  });

  it("home still renders, without numbers, when Prometheus is down", () => {
    const text = renderHome({ projects, posts, infra: { ...offline, deploy: { ...infra.deploy, sha: null } } }, plain);
    expect(text).toContain("a small machine");
    expect(text).not.toContain("cpu ");
    expect(text).not.toContain("build ");
  });

  it("infra shows numbers, sparklines, services and the request path", () => {
    const text = pages.infra(plain);
    expect(text).toMatch(/cpu\s+12%\s+[▁-█]{49}/);
    expect(text).toContain("● up       Next.js app");
    expect(text).toContain("● down     Loki");
    expect(text).toContain("○ unknown  Grafana");
    expect(text).toContain("you → cloudflare IST → tunnel → homeserver → docker → next.js");
    expect(text).toContain("github.com/bilalyazicioglu/bilalyazicioglu.com/commit/c4ea4b2d00f");
  });

  it("infra drops the number sections when offline instead of printing dashes", () => {
    const text = renderInfra(offline, { ...plain, colo: null });
    expect(text).toContain("metrics offline");
    expect(text).not.toContain("RIGHT NOW");
    expect(text).not.toContain("THE MACHINE");
    expect(text).toContain("RUNNING BUILD");
  });

  it("projects lists every project with its links", () => {
    const text = pages.projects(plain);
    for (const project of projects) expect(text).toContain(project.name);
    expect(text).toContain("github.com/bilalyazicioglu/tincan-cli");
  });

  it("tincan prints every install command whole, so it can be pasted", () => {
    const text = pages.tincan(plain);
    expect(text).toContain("  curl -fsSL https://raw.githubusercontent.com/bilalyazicioglu/tincan-cli/main/install.sh | sh\n");
    expect(text).toContain("cargo install tincan-chat");
  });
});
