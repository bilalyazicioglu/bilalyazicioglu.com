import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminRequestAllowed, isSessionAuthorized } from "@/lib/admin-gate";
import { getAdminConfig, timingSafeCompare } from "@/lib/admin-auth";
import { siteConfig } from "@/site.config";
import { TINCAN_URL, isTincanHost } from "@/lib/tincan-host";
import { httpRequests } from "@/lib/metrics";
import { INFRA_API_PATH } from "@/lib/infra-types";

/** The one host every page declares as its canonical — see `siteConfig.url`. */
const CANONICAL_HOST = new URL(siteConfig.url).host;

/** tincan.rs's answers for the root files, which live under /tincan/. */
const TINCAN_ROOT_FILES: Record<string, string> = {
  "/favicon.ico": "/tincan/icon-48.png",
  "/manifest.webmanifest": "/tincan/manifest.webmanifest",
  "/llms.txt": "/tincan/llms.txt",
  "/llms-full.txt": "/tincan/llms-full.txt",
};

export function proxy(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip =
    request.headers.get("cf-connecting-ip") ||
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "-";
  const method = request.method;
  const path = request.nextUrl.pathname;
  const ua = request.headers.get("user-agent") ?? "-";

  console.log(`[access] ip=${ip} method=${method} path=${path} ua=${ua}`);

  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];

  // /infra polls its own API every few seconds; counting that would make an
  // open tab look like traffic on the very page that reports it.
  if (path !== INFRA_API_PATH) {
    httpRequests.inc({ site: isTincanHost(host) ? "tincan" : "main" });
  }

  // A page must live at exactly one address. www and the apex serve the same
  // app, so send www to the apex instead of letting search engines collect two
  // copies of every URL. Tailnet hostnames are untouched — they never match.
  if (host === `www.${CANONICAL_HOST}`) {
    return NextResponse.redirect(
      new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, siteConfig.url),
      301
    );
  }

  // tincan lives at tincan.rs. The domain shows only the tincan page and the
  // files it loads; anything else on it belongs to the main site and goes
  // there. Every other address for the page — tincan.<domain>, /tincan on
  // the main domain — 301s to tincan.rs, so search engines keep one URL per
  // language. Query strings survive, so a link tagged for a campaign still
  // says where it came from.
  const search = request.nextUrl.search;
  if (host === `www.${new URL(TINCAN_URL).host}`) {
    return NextResponse.redirect(new URL(`${path}${search}`, TINCAN_URL), 301);
  }
  if (isTincanHost(host)) {
    if (path === "/") {
      return NextResponse.rewrite(new URL(`/tincan${search}`, request.url));
    }
    if (path === "/tr") {
      return NextResponse.rewrite(new URL(`/tincan/tr${search}`, request.url));
    }
    if (path === "/tincan" || path === "/tincan/tr") {
      return NextResponse.redirect(new URL(`${path.slice("/tincan".length) || "/"}${search}`, TINCAN_URL), 301);
    }
    if (path.startsWith("/tincan/") || path.startsWith("/uploads/")) {
      return NextResponse.next();
    }
    // The root files every crawler and browser asks a domain for. Left alone
    // they would be the main site's — its favicon beside tincan in search
    // results, its llms.txt describing a person instead of a program.
    const ownFile = TINCAN_ROOT_FILES[path];
    if (ownFile) {
      return NextResponse.rewrite(new URL(ownFile, request.url));
    }
    return NextResponse.redirect(new URL(`${path}${search}`, siteConfig.url), 301);
  }
  if (host === `tincan.${CANONICAL_HOST}`) {
    return NextResponse.redirect(new URL(`/${search}`, TINCAN_URL), 301);
  }
  if (host === CANONICAL_HOST && (path === "/tincan" || path === "/tincan/tr")) {
    return NextResponse.redirect(new URL(`${path.slice("/tincan".length) || "/"}${search}`, TINCAN_URL), 301);
  }

  // 1. Standard /admin is completely blocked and masked as 404 for public internet
  if (path === "/admin" || path.startsWith("/admin/")) {
    return new NextResponse(null, { status: 404 });
  }

  // 2. Admin API routes:
  if (path.startsWith("/api/admin")) {
    const config = getAdminConfig();
    // Allow login endpoint only when accompanied by the secret access key
    if (path === "/api/admin/auth/login") {
      const providedKey =
        request.nextUrl.searchParams.get("key") ||
        request.headers.get("x-admin-key") ||
        "";
      if (!config.accessKey || !timingSafeCompare(providedKey, config.accessKey)) {
        return new NextResponse(null, { status: 404 });
      }
      return NextResponse.next();
    }

    if (path === "/api/admin/auth/logout") {
      return NextResponse.next();
    }

    // All other /api/admin endpoints require an authenticated session or tailnet authorization
    if (!isAdminRequestAllowed(request.headers, request.cookies)) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  // 3. Stealth Studio routes
  const config = getAdminConfig();
  if (config.secretSlug) {
    const isExactStealth = path === `/${config.secretSlug}`;
    const isSubStealth = path.startsWith(`/${config.secretSlug}/`);

    if (isExactStealth || isSubStealth) {
      // Authenticated session: let them through
      if (isSessionAuthorized(request.cookies)) {
        return NextResponse.next();
      }

      // Not authenticated: only render login form if correct ?key= is given on root stealth path
      if (isExactStealth) {
        const key = request.nextUrl.searchParams.get("key") || "";
        if (config.accessKey && timingSafeCompare(key, config.accessKey)) {
          return NextResponse.next();
        }
      }

      // In any other case, act as a completely non-existent route (404)
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!metrics|_next/static|_next/image|favicon.ico|favicon-48x48.png|icon.png|icon-48.png|icon-192.png|icon-512.png|apple-touch-icon.png|apple-icon.png|og-image.png|opengraph-image.png|robots.txt|sitemap.xml|llms.txt|manifest.webmanifest).*)",
    // The root files skipped above, but only on tincan's domain — see
    // TINCAN_ROOT_FILES.
    {
      source: "/(favicon.ico|manifest.webmanifest|llms.txt)",
      has: [{ type: "header", key: "host", value: "tincan\\.(rs|localhost)(:\\d+)?" }],
    },
  ],
};
