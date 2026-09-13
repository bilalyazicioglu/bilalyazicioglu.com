import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { isValidSlug } from "./slug";

export { isValidSlug, slugify } from "./slug";

export function getBlogDir(): string {
  if (process.env.BLOG_DIR_PATH) {
    return process.env.BLOG_DIR_PATH;
  }
  return path.join(process.cwd(), "src/content/blog");
}

/** Posts are written in one language or the other, never both. */
export type PostLang = "tr" | "en";

export type PostMeta = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  lang: PostLang;
  draft: boolean;
  readingTime: string;
  translationKey?: string;
};

export type Post = PostMeta & {
  content: string;
};

export type PostInput = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  lang: PostLang;
  draft: boolean;
  content: string;
  translationKey?: string;
};

function postPath(slug: string): string {
  if (!isValidSlug(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }
  return path.join(getBlogDir(), `${slug}.mdx`);
}

function readSlugs(): string[] {
  const dir = getBlogDir();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""))
    .filter(isValidSlug);
}

function toMeta(slug: string, data: matter.GrayMatterFile<string>["data"], content: string): PostMeta {
  return {
    slug,
    title: (data.title as string) ?? slug,
    summary: (data.summary as string) ?? "",
    date: (data.date as string) ?? "",
    tags: (data.tags as string[]) ?? [],
    // Anything but an explicit "tr" reads as English, so posts written before
    // this field existed keep the language they were already served as.
    lang: data.lang === "tr" ? "tr" : "en",
    draft: data.draft === true,
    readingTime: readingTime(content).text,
    translationKey: typeof data.translationKey === "string" ? data.translationKey.trim() : undefined,
  };
}

/** Published posts, newest first. Pass `true` to include drafts (admin only). */
export function getAllPosts(includeDrafts = false): PostMeta[] {
  return readSlugs()
    .map((slug) => getPostMeta(slug))
    .filter((post) => includeDrafts || !post.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostMeta(slug: string): PostMeta {
  const raw = fs.readFileSync(postPath(slug), "utf8");
  const { data, content } = matter(raw);
  return toMeta(slug, data, content);
}

export function getPostBySlug(slug: string): Post {
  const raw = fs.readFileSync(postPath(slug), "utf8");
  const { data, content } = matter(raw);
  return { ...toMeta(slug, data, content), content };
}

/** Slugs for `generateStaticParams` — drafts are never prerendered. */
export function getAllSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}

export function postExists(slug: string): boolean {
  return isValidSlug(slug) && fs.existsSync(postPath(slug));
}

/** Writes atomically via tmp + rename, mirroring `saveFileAtomic` in lib/views.ts. */
export function writePost(input: PostInput): void {
  const filePath = postPath(input.slug);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const serialized = matter.stringify(`\n${input.content.trim()}\n`, {
    title: input.title,
    summary: input.summary,
    date: input.date,
    tags: input.tags,
    lang: input.lang,
    ...(input.draft ? { draft: true } : {}),
    ...(input.translationKey ? { translationKey: input.translationKey } : {}),
  });

  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
  fs.writeFileSync(tmpPath, serialized, "utf8");
  fs.renameSync(tmpPath, filePath);
}

export function deletePost(slug: string): void {
  fs.rmSync(postPath(slug), { force: true });
}

/** Returns the translation pair for a given slug if one exists. */
export function getPostTranslation(slug: string): PostMeta | null {
  const current = getPostMeta(slug);
  if (!current.translationKey) return null;
  const all = getAllPosts(true);
  return all.find((p) => p.slug !== slug && p.translationKey === current.translationKey) ?? null;
}
