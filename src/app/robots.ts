import type { MetadataRoute } from "next";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = siteConfig.url;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Cloudflare rewrites every mailto: link on the page into
        // /cdn-cgi/l/email-protection#<hex>. The address is in the fragment,
        // which a crawler never sends, so Googlebot fetches the bare path and
        // gets a 404 — reported in Search Console as a missing page. Nothing
        // under /cdn-cgi/ is ours or worth crawling.
        disallow: ["/cdn-cgi/", "/admin/", "/api/", "/metrics"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
          "meta-externalagent",
        ],
        allow: "/",
        disallow: ["/cdn-cgi/", "/admin/", "/api/", "/metrics"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/",
      },
      {
        userAgent: "Googlebot-Favicon",
        allow: "/",
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
