import { getAllPosts } from "@/lib/blog";

/** Built from published posts; the in-page terminal reads this JSON asset. */
export const dynamic = "force-static";

export function GET() {
  const posts = getAllPosts().map(({ slug, title, date }) => ({ slug, title, date }));
  return Response.json({ posts });
}
