import { tincanSitemap } from "@/lib/tincan-sitemap";

export const dynamic = "force-static";
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

export function GET() {
  const urls = tincanSitemap().map((page) => {
    const languages = Object.entries(page.alternates?.languages ?? {}).map(([lang, href]) =>
      `<xhtml:link rel="alternate" hreflang="${escape(lang)}" href="${escape(String(href))}"/>`
    ).join("");
    return `<url><loc>${escape(page.url)}</loc>${languages}</url>`;
  }).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
