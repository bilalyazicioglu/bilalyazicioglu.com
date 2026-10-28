export const dynamic = "force-static";
export function GET() {
  return new Response("User-agent: *\nAllow: /\nSitemap: https://tincan.rs/sitemap.xml\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
