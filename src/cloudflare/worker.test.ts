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
  it("passes healthy requests through, then serves static pages and refuses writes during an outage", async () => {
    let healthy = true;
    const fetchOrigin = vi.spyOn(globalThis, "fetch").mockImplementation(async (req) => {
      if (!healthy) return new Response("tunnel offline", { status: 530 });
      return new Response("primary", { status: (req as Request).method === "POST" ? 201 : 200 });
    });
    const env = { ASSETS: assets({ "/index.html": "static" }), PRIMARY_ENABLED: "true" };
    const primary = await worker.fetch(new Request("https://bilalyazicioglu.com/"), env);
    expect(primary.headers.get("X-Blog-Backend")).toBe("homeserver");
    expect(await primary.text()).toBe("primary");
    const write = await worker.fetch(new Request("https://bilalyazicioglu.com/api/views/post", { method: "POST", body: "view" }), env);
    expect(write.status).toBe(201);
    healthy = false;
    const fallback = await worker.fetch(new Request("https://bilalyazicioglu.com/"), env);
    expect(await fallback.text()).toBe("static");
    expect(fallback.headers.get("X-Blog-Backend")).toBe("static-fallback");
    const failedWrite = await worker.fetch(new Request("https://bilalyazicioglu.com/api/views/post", { method: "POST", body: "view" }), env);
    expect(failedWrite.status).toBe(503);
    expect(fetchOrigin).toHaveBeenCalledTimes(3);
  });

  it("keeps the diagnostic workers.dev URL on static assets even with primary enabled", async () => {
    const fetchOrigin = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request("https://bilal-blog.example.workers.dev/"), {
      ASSETS: assets({ "/index.html": "static" }), PRIMARY_ENABLED: "true",
    });
    expect(await response.text()).toBe("static");
    expect(response.headers.get("X-Blog-Backend")).toBe("static-fallback");
    expect(fetchOrigin).not.toHaveBeenCalled();
  });

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


describe("public delivery status", () => {
  it("reports snapshot identity without infrastructure details or caching", async () => {
    const ASSETS = assets({});
    const response = await worker.fetch(new Request("https://bilal-blog.example.workers.dev/api/status"), { ASSETS, PRIMARY_ENABLED: "true" });
    const status = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(status.backend).toBe("static-fallback");
    expect(Object.keys(status).sort()).toEqual(["backend", "checkedAt", "release"]);
    expect(Object.keys(status.release).sort()).toEqual(["activatedAt", "builtAt", "sha"]);
    expect(status.release.activatedAt).toBeNull();
    expect(ASSETS.fetch).not.toHaveBeenCalled();
    const head = await worker.fetch(new Request("https://bilal-blog.example.workers.dev/api/status", { method: "HEAD" }), { ASSETS });
    expect(await head.text()).toBe("");
  });
});
