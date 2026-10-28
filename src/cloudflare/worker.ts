import { CLI_PAGES, wantsText } from "../lib/cli/client";
import { isTincanHost, TINCAN_URL } from "../lib/tincan-host";

type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };
const MAIN = "https://bilalyazicioglu.com";
const ROOT_FILES: Record<string, string> = {
  "/favicon.ico": "/tincan/icon-48.png",
  "/manifest.webmanifest": "/tincan/manifest.webmanifest",
  "/llms.txt": "/tincan/llms.txt",
  "/llms-full.txt": "/tincan/llms-full.txt",
  "/robots.txt": "/tincan/robots.txt",
  "/sitemap.xml": "/tincan/sitemap.xml",
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const host = url.hostname;
    const redirect = (origin: string, pathname = path) =>
      Response.redirect(new URL(`${pathname}${url.search}`, origin).toString(), 301);

    if (host === "www.bilalyazicioglu.com") return redirect(MAIN);
    if (host === "www.tincan.rs") return redirect(TINCAN_URL);
    if (host === "tincan.bilalyazicioglu.com") return redirect(TINCAN_URL, "/");
    if (host === "bilalyazicioglu.com" && (path === "/tincan" || path === "/tincan/tr")) {
      return redirect(TINCAN_URL, path.slice("/tincan".length) || "/");
    }

    // No server-side admin, metrics or writes are part of this deployment.
    if (!["GET", "HEAD"].includes(request.method) ||
        /^\/(admin|metrics)(\/|$)/.test(path) ||
        (path.startsWith("/api/") && path !== "/api/posts")) {
      return new Response("Not found", { status: 404 });
    }

    let asset = path;
    let terminal = false;
    if (isTincanHost(host)) {
      if (path === "/" && wantsText(request.headers)) {
        asset = "/cli/tincan";
        terminal = true;
      } else if (path === "/") asset = "/tincan.html";
      else if (path === "/tr") asset = "/tincan/tr.html";
      else if (path === "/tincan" || path === "/tincan/tr") {
        return redirect(TINCAN_URL, path.slice("/tincan".length) || "/");
      } else if (ROOT_FILES[path]) asset = ROOT_FILES[path];
      else if (!path.startsWith("/tincan/") && !path.startsWith("/uploads/") && !path.startsWith("/_next/")) {
        return redirect(MAIN);
      }
    } else if (CLI_PAGES[path] && wantsText(request.headers)) {
      asset = path === "/" ? "/cli/home" : CLI_PAGES[path];
      terminal = true;
    } else if (path === "/cli") {
      asset = "/cli/home-plain";
      terminal = true;
    }
    if (terminal && url.searchParams.has("plain") && !asset.endsWith("-plain")) asset += "-plain";
    if (asset === "/") asset = "/index.html";

    const fetchAsset = (pathname: string) => {
      const target = new URL(url);
      target.pathname = pathname;
      return env.ASSETS.fetch(new Request(target, request));
    };
    let response = await fetchAsset(asset);
    if (response.status === 404 && !asset.split("/").at(-1)?.includes(".")) {
      response = await fetchAsset(`${asset.replace(/\/$/, "")}.html`);
    }
    const headers = new Headers(response.headers);
    // Each public URL can have HTML and terminal variants: never mix them in cache.
    headers.set("Vary", "User-Agent, Accept");
    headers.set("X-Content-Type-Options", "nosniff");
    if (terminal || asset.startsWith("/cli/")) {
      headers.set("Content-Type", "text/plain; charset=utf-8");
      headers.set("X-Robots-Tag", "noindex");
    }
    if (path === "/api/posts") headers.set("Content-Type", "application/json; charset=utf-8");
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status, statusText: response.statusText, headers,
    });
  },
};

export default worker;
