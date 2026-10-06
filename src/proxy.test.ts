import { NextRequest } from "next/server";
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/lib/admin-auth";
import { config, proxy } from "./proxy";

function run(url: string, headers: Record<string, string> = {}) {
  const { host } = new URL(url);
  return proxy(new NextRequest(url, { headers: { host, ...headers } }));
}

/** NextResponse.next() — the request continues to the page untouched. */
const passesThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("canonical host", () => {
  it("301s www to the apex, keeping path and query", () => {
    const res = run("https://www.bilalyazicioglu.com/blog/xteink-x4?ref=hn");
    expect(res.status).toBe(301);
    expect(getRedirectUrl(res)).toBe("https://bilalyazicioglu.com/blog/xteink-x4?ref=hn");
  });

  it("leaves the apex alone", () => {
    expect(passesThrough(run("https://bilalyazicioglu.com/blog"))).toBe(true);
  });
});

describe("tincan.rs", () => {
  it("serves the English page at its root", () => {
    expect(getRewrittenUrl(run("https://tincan.rs/?utm_source=x"))).toBe(
      "https://tincan.rs/tincan?utm_source=x"
    );
  });

  it("serves the Turkish page at /tr", () => {
    expect(getRewrittenUrl(run("https://tincan.rs/tr"))).toBe("https://tincan.rs/tincan/tr");
  });

  it.each([
    ["https://tincan.rs/tincan", "https://tincan.rs/"],
    ["https://tincan.rs/tincan/tr", "https://tincan.rs/tr"],
    ["https://www.tincan.rs/tr?a=1", "https://tincan.rs/tr?a=1"],
    ["https://tincan.bilalyazicioglu.com/anything", "https://tincan.rs/"],
    ["https://bilalyazicioglu.com/tincan", "https://tincan.rs/"],
    ["https://bilalyazicioglu.com/tincan/tr?ref=blog", "https://tincan.rs/tr?ref=blog"],
  ])("301s %s to %s", (from, to) => {
    const res = run(from);
    expect(res.status).toBe(301);
    expect(getRedirectUrl(res)).toBe(to);
  });

  it("sends the main site's pages back to the main site", () => {
    const res = run("https://tincan.rs/blog?x=1");
    expect(res.status).toBe(301);
    expect(getRedirectUrl(res)).toBe("https://bilalyazicioglu.com/blog?x=1");
  });

  it("serves its own root files instead of the main site's", () => {
    expect(getRewrittenUrl(run("https://tincan.rs/favicon.ico"))).toBe(
      "https://tincan.rs/tincan/icon-48.png"
    );
    expect(getRewrittenUrl(run("https://tincan.rs/llms.txt"))).toBe(
      "https://tincan.rs/tincan/llms.txt"
    );
  });

  it("lets the page's own assets through", () => {
    expect(passesThrough(run("https://tincan.rs/tincan/demo.mp4"))).toBe(true);
    expect(passesThrough(run("https://tincan.rs/uploads/x.png"))).toBe(true);
  });

  it("treats tincan.localhost as tincan.rs in development", () => {
    expect(getRewrittenUrl(run("http://tincan.localhost:3000/"))).toBe(
      "http://tincan.localhost:3000/tincan"
    );
  });
});

describe("admin surface", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SECRET_SLUG", "hidden-door");
    vi.stubEnv("ADMIN_ACCESS_KEY", "open-sesame");
    vi.stubEnv("ADMIN_SESSION_SECRET", "proxy-test-secret");
  });

  it.each(["/admin", "/admin/new", "/admin/edit/x"])("hides %s as a 404", (path) => {
    expect(run(`https://bilalyazicioglu.com${path}`).status).toBe(404);
  });

  it("hides the studio without the key", () => {
    expect(run("https://bilalyazicioglu.com/hidden-door").status).toBe(404);
    expect(run("https://bilalyazicioglu.com/hidden-door?key=wrong").status).toBe(404);
  });

  it("shows the studio login with the key", () => {
    expect(passesThrough(run("https://bilalyazicioglu.com/hidden-door?key=open-sesame"))).toBe(true);
  });

  it("does not accept the key on studio sub-pages", () => {
    expect(run("https://bilalyazicioglu.com/hidden-door/new?key=open-sesame").status).toBe(404);
  });

  it("lets a signed-in session into the studio", () => {
    const cookie = `admin_session=${createSessionToken("bilal")}`;
    expect(passesThrough(run("https://bilalyazicioglu.com/hidden-door/new", { cookie }))).toBe(true);
  });

  it("hides the login endpoint without the key", () => {
    expect(run("https://bilalyazicioglu.com/api/admin/auth/login").status).toBe(404);
    expect(
      passesThrough(
        run("https://bilalyazicioglu.com/api/admin/auth/login", { "x-admin-key": "open-sesame" })
      )
    ).toBe(true);
  });

  it("hides admin APIs from anonymous public requests in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = run("https://bilalyazicioglu.com/api/admin/posts", {
      "cf-connecting-ip": "203.0.113.7",
    });
    expect(res.status).toBe(404);
  });
});

describe("matcher", () => {
  it.each(["/metrics", "/_next/static/chunks/app.js", "/robots.txt", "/sitemap.xml"])(
    "skips %s on the main site",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    }
  );

  it.each(["/", "/blog/xteink-x4", "/admin", "/api/admin/posts"])("runs on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it("runs on the root files only for tincan's domain", () => {
    expect(
      unstable_doesMiddlewareMatch({ config, url: "/favicon.ico", headers: { host: "tincan.rs" } })
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/favicon.ico",
        headers: { host: "bilalyazicioglu.com" },
      })
    ).toBe(false);
  });
});
