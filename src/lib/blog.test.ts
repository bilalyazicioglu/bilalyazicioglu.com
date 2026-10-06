import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deletePost,
  getAllPosts,
  getAllSlugs,
  getPostBySlug,
  getPostTranslation,
  postExists,
  writePost,
  type PostInput,
} from "./blog";

let root: string;
let dir: string;

function post(overrides: Partial<PostInput> & Pick<PostInput, "slug">): PostInput {
  return {
    title: overrides.slug,
    summary: "",
    date: "2026-01-01",
    tags: [],
    lang: "en",
    draft: false,
    content: "Hello.",
    ...overrides,
  };
}

beforeEach(() => {
  // Posts live one level down, so a slug that escapes lands in `root`, which
  // is fresh per test, rather than in the shared temp directory.
  root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-test-"));
  dir = path.join(root, "posts");
  fs.mkdirSync(dir);
  vi.stubEnv("BLOG_DIR_PATH", dir);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("posts on disk", () => {
  it("round-trips a post through writePost and getPostBySlug", () => {
    writePost(post({ slug: "hello", title: "Hello", tags: ["go"], lang: "tr", content: "  Merhaba.  " }));
    const read = getPostBySlug("hello");
    expect(read).toMatchObject({ slug: "hello", title: "Hello", tags: ["go"], lang: "tr", draft: false });
    expect(read.content.trim()).toBe("Merhaba.");
    expect(fs.readdirSync(dir)).toEqual(["hello.mdx"]);
  });

  it("lists published posts newest first and hides drafts", () => {
    writePost(post({ slug: "old", date: "2025-03-01" }));
    writePost(post({ slug: "new", date: "2026-05-01" }));
    writePost(post({ slug: "wip", date: "2026-09-01", draft: true }));

    expect(getAllSlugs()).toEqual(["new", "old"]);
    expect(getAllPosts(true).map((p) => p.slug)).toEqual(["wip", "new", "old"]);
  });

  it("reads posts without a lang field as English", () => {
    fs.writeFileSync(path.join(dir, "legacy.mdx"), "---\ntitle: Legacy\n---\nBody\n");
    expect(getPostBySlug("legacy").lang).toBe("en");
  });

  it("ignores files that are not valid post slugs", () => {
    writePost(post({ slug: "real" }));
    fs.writeFileSync(path.join(dir, "Bad Name.mdx"), "---\ntitle: x\n---\n");
    fs.writeFileSync(path.join(dir, "notes.txt"), "x");
    expect(getAllSlugs()).toEqual(["real"]);
  });

  it("refuses slugs that would leave the posts directory", () => {
    expect(() => writePost(post({ slug: "../escape" }))).toThrow(/Invalid slug/);
    expect(() => getPostBySlug("../../etc/passwd")).toThrow(/Invalid slug/);
    expect(postExists("../escape")).toBe(false);
    expect(fs.readdirSync(root)).toEqual(["posts"]);
  });

  it("deletes a post", () => {
    writePost(post({ slug: "gone" }));
    deletePost("gone");
    expect(postExists("gone")).toBe(false);
  });
});

describe("translation pairing", () => {
  it("finds the other language's post through translationKey", () => {
    writePost(post({ slug: "tincan-en", lang: "en", translationKey: "tincan" }));
    writePost(post({ slug: "tincan-tr", lang: "tr", translationKey: "tincan" }));
    writePost(post({ slug: "unrelated", translationKey: "other" }));

    expect(getPostTranslation("tincan-en")?.slug).toBe("tincan-tr");
    expect(getPostTranslation("tincan-tr")?.slug).toBe("tincan-en");
    expect(getPostTranslation("unrelated")).toBeNull();
  });

  it("returns nothing for a post without a key", () => {
    writePost(post({ slug: "solo" }));
    expect(getPostTranslation("solo")).toBeNull();
  });
});
