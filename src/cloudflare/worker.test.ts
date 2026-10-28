import { describe, expect, it, vi } from "vitest";
import worker from "./worker";

function assets(files: Record<string, string>) {
  return {
    fetch: vi.fn(async (request: Request) => {
      const body = files[new URL(request.url).pathname];
      return new Response(body ?? "not found", { status: body === undefined ? 404 : 200 });
    }),
  };
}

describe("static worker", () => {
  it("serves HTML while keeping unknown paths as genuine 404s", async () => {
    const ASSETS = assets({ "/index.html": "home", "/blog/post.html": "article" });
    for (const [path, body] of [["/", "home"], ["/blog/post", "article"]]) {
      const response = await worker.fetch(new Request(`https://bilalyazicioglu.com${path}`), { ASSETS });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(body);
    }
    expect((await worker.fetch(new Request("https://bilalyazicioglu.com/missing"), { ASSETS })).status).toBe(404);
  });

  it("keeps HTML and curl responses separate and supports plain text", async () => {
    const ASSETS = assets({ "/index.html": "html", "/cli/home": "\x1b[1mterminal", "/cli/home-plain": "terminal" });
    for (const [query, expected] of [["", "\x1b[1mterminal"], ["?plain", "terminal"]]) {
      const response = await worker.fetch(new Request(`https://bilalyazicioglu.com/${query}`, {
        headers: { "User-Agent": "curl/8.0" },
      }), { ASSETS });
      expect(await response.text()).toBe(expected);
      expect(response.headers.get("Content-Type")).toContain("text/plain");
      expect(response.headers.get("Vary")).toContain("User-Agent");
    }
    const browser = await worker.fetch(new Request("https://bilalyazicioglu.com/", {
      headers: { "User-Agent": "curl/8.0", Accept: "text/html" },
    }), { ASSETS });
    expect(await browser.text()).toBe("html");
  });

  it.each(["/admin", "/api/admin/posts", "/api/admin/auth/login", "/metrics", "/api/views/post"])(
    "does not expose %s", async (path) => {
      const ASSETS = assets({ [path]: "should not be served" });
      expect((await worker.fetch(new Request(`https://bilalyazicioglu.com${path}`), { ASSETS })).status).toBe(404);
      expect(ASSETS.fetch).not.toHaveBeenCalled();
    }
  );

  it("refuses writes but serves the generated public post index", async () => {
    const ASSETS = assets({ "/api/posts": '{"posts":[]}' });
    const response = await worker.fetch(new Request("https://bilalyazicioglu.com/api/posts"), { ASSETS });
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual({ posts: [] });
    expect((await worker.fetch(new Request("https://bilalyazicioglu.com/api/posts", { method: "POST" }), { ASSETS })).status).toBe(404);
  });

  it("serves each domain's own pages and crawler files", async () => {
    const ASSETS = assets({ "/tincan.html": "en", "/tincan/tr.html": "tr", "/tincan/sitemap.xml": "sitemap" });
    for (const [path, body] of [["/", "en"], ["/tr", "tr"], ["/sitemap.xml", "sitemap"]]) {
      expect(await (await worker.fetch(new Request(`https://tincan.rs${path}`), { ASSETS })).text()).toBe(body);
    }
  });

  it.each([
    ["https://www.bilalyazicioglu.com/blog?a=1", "https://bilalyazicioglu.com/blog?a=1"],
    ["https://bilalyazicioglu.com/tincan/tr", "https://tincan.rs/tr"],
    ["https://tincan.rs/blog", "https://bilalyazicioglu.com/blog"],
    ["https://www.tincan.rs/tr", "https://tincan.rs/tr"],
  ])("redirects %s to %s", async (from, to) => {
    const response = await worker.fetch(new Request(from), { ASSETS: assets({}) });
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(to);
  });

  it("returns headers without a response body for HEAD", async () => {
    const response = await worker.fetch(new Request("https://bilalyazicioglu.com/", { method: "HEAD" }), {
      ASSETS: assets({ "/index.html": "home" }),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });
});
