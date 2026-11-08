import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GET } from "@/app/uploads/blog/[file]/route";
import { blogMediaDirectory } from "./blog-media";
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(p => fs.rm(p, { recursive: true, force: true }))); });
describe("persistent blog media", () => {
  it("serves uploads from the content volume with browser isolation", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "blog-media-")); directories.push(root);
    vi.stubEnv("BLOG_DIR_PATH", path.join(root, "blog"));
    await fs.mkdir(blogMediaDirectory(), { recursive: true });
    await fs.writeFile(path.join(blogMediaDirectory(), "image.svg"), "<svg></svg>");
    const response = await GET(new Request("https://example.test/uploads/blog/image.svg"), { params: Promise.resolve({ file: "image.svg" }) });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<svg></svg>");
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.headers.get("Content-Security-Policy")).toContain("sandbox");
  });
  it("refuses traversal and unrecognized files", async () => {
    for (const file of ["../secret.png", "config.json", "image.exe", "a/b.png"]) {
      expect((await GET(new Request("https://example.test/"), { params: Promise.resolve({ file }) })).status).toBe(404);
    }
  });
});
