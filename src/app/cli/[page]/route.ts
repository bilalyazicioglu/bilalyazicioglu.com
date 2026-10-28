import { getAllPosts } from "@/lib/blog";
import { renderBlog, renderHome, renderOffline, renderProjects, renderTincan } from "@/lib/cli/render";
import { readOffline } from "@/lib/offline/store";
import { getProjectsWithLiveStars } from "@/lib/github";

export const dynamic = "force-static";
export const dynamicParams = false;
const pages = ["home", "infra", "projects", "blog", "offline", "tincan"];

export function generateStaticParams() {
  return pages.flatMap((page) => [{ page }, { page: `${page}-plain` }]);
}

export async function GET(_request: Request, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const name = page.replace(/-plain$/, "");
  const options = { color: !page.endsWith("-plain"), now: Date.now() };
  const projects = await getProjectsWithLiveStars();
  let body: string;
  switch (name) {
    case "home": body = renderHome({ projects, posts: getAllPosts() }, options); break;
    case "projects": body = renderProjects(projects, options); break;
    case "blog": body = renderBlog(getAllPosts(), options); break;
    case "offline": body = renderOffline(readOffline(), options); break;
    case "tincan": body = renderTincan(projects.find((project) => project.slug === "tincan")!, options); break;
    case "infra":
      body = "INFRA\n\nNormally hosted in Docker on my homeserver in Istanbul.\nAfter the home internet outage lasted over an hour, the site moved\ntemporarily to Cloudflare Workers, serving prebuilt static assets.\n\nHomelab metrics are unavailable on this deployment.\n";
      break;
    default: return new Response("not found\n", { status: 404 });
  }
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
