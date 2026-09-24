import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminRequestAllowed, isSessionAuthorized } from "@/lib/admin-gate";
import { getAdminConfig, timingSafeCompare } from "@/lib/admin-auth";
import { siteConfig } from "@/site.config";

/** The one host every page declares as its canonical — see `siteConfig.url`. */
const CANONICAL_HOST = new URL(siteConfig.url).host;

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

  // A page must live at exactly one address. www and the apex serve the same
  // app, so send www to the apex instead of letting search engines collect two
  // copies of every URL. Tailnet hostnames are untouched — they never match.
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (host === `www.${CANONICAL_HOST}`) {
    return NextResponse.redirect(
      new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, siteConfig.url),
      301
    );
  }

  // tincan.<domain> is a short address to hand out, not a second site: every
  // path on it lands on the one page, so search engines keep a single URL and
  // the page keeps the main domain's standing. The query string survives, so
  // a link tagged for a campaign still says where it came from.
  if (host === `tincan.${CANONICAL_HOST}`) {
    return NextResponse.redirect(new URL(`/tincan${request.nextUrl.search}`, siteConfig.url), 301);
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
  matcher:
    "/((?!metrics|_next/static|_next/image|favicon.ico|favicon-48x48.png|icon.png|icon-48.png|icon-192.png|icon-512.png|apple-touch-icon.png|apple-icon.png|og-image.png|opengraph-image.png|robots.txt|sitemap.xml|llms.txt|manifest.webmanifest).*)",
};
