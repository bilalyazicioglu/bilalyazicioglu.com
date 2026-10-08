import { getAllPosts } from "@/lib/blog";
import { isTerminalClient } from "@/lib/cli/client";
import { renderBlog, renderHome, renderInfra, renderProjects, renderTincan } from "@/lib/cli/render";
import { getProjectsWithLiveStars } from "@/lib/github";
import { cloudflareColo, getInfra } from "@/lib/infra";

/**
 * The terminal edition. The proxy rewrites curl's requests for /, /infra,
 * /projects, /blog and tincan.rs here; see lib/cli/client.ts.
 */
export const dynamic = "force-dynamic";

const notFound = () => new Response("not found\n", { status: 404, headers: { "Content-Type": "text/plain" } });

export async function GET(request: Request, ctx: RouteContext<"/cli/[[...page]]">) {
  const { page = [] } = await ctx.params;
  const url = new URL(request.url);
  const options = {
    // Escape codes only for a terminal that hasn't asked for ?plain. Opened in
    // a browser, /cli is readable text rather than a mess of ^[[1m.
    color: isTerminalClient(request.headers.get("user-agent")) && !url.searchParams.has("plain"),
    now: Date.now(),
  };

  let body: string;
  switch (page.join("/")) {
    case "":
      body = renderHome(
        { projects: await getProjectsWithLiveStars(), posts: getAllPosts(), infra: await getInfra() },
        options
      );
      break;
    case "infra":
      body = renderInfra(await getInfra(), { ...options, colo: cloudflareColo(request.headers.get("cf-ray")) });
      break;
    case "projects":
      body = renderProjects(await getProjectsWithLiveStars(), options);
      break;
    case "blog":
      body = renderBlog(getAllPosts(), options);
      break;
    case "tincan": {
      const tincan = (await getProjectsWithLiveStars()).find((p) => p.slug === "tincan");
      if (!tincan) return notFound();
      body = renderTincan(tincan, options);
      break;
    }
    default:
      return notFound();
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // The same URL is HTML for a browser; no cache in between may mix them up.
      Vary: "User-Agent, Accept",
      "X-Robots-Tag": "noindex",
    },
  });
}
