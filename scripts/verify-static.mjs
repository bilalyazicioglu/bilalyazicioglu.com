import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const output = path.resolve("out");
const read = (name) => fs.readFileSync(path.join(output, name), "utf8");
for (const name of ["index.html", "about.html", "projects.html", "blog.html", "offline.html", "infra.html", "404.html", "resume.pdf", "robots.txt", "sitemap.xml", "tincan.html", "tincan/tr.html", "tincan/robots.txt", "tincan/sitemap.xml"]) {
  assert(fs.statSync(path.join(output, name)).size > 0, `Missing or empty public asset: ${name}`);
}
assert(read("infra.html").includes("Cloudflare Workers"));
assert(read("index.html").includes("Cloudflare"));
const posts = JSON.parse(read("api/posts")).posts;
for (const name of fs.readdirSync("src/content/blog").filter((name) => name.endsWith(".mdx"))) {
  const slug = name.slice(0, -4);
  const { data } = matter(fs.readFileSync(path.join("src/content/blog", name), "utf8"));
  assert.equal(fs.existsSync(path.join(output, "blog", `${slug}.html`)), data.draft !== true, `Draft/published export mismatch: ${slug}`);
  assert.equal(posts.some((post) => post.slug === slug), data.draft !== true, `Post index mismatch: ${slug}`);
}
for (const page of ["home", "infra", "projects", "blog", "offline", "tincan"]) {
  assert(read(`cli/${page}`).length > 0, `Missing terminal page: ${page}`);
  assert(!read(`cli/${page}-plain`).includes("\x1b"), `ANSI escaped plain page: ${page}`);
}
for (const name of ["admin.html", "admin", "api/admin", "api/views", "api/infra", "metrics", ".env", "src", "node_modules"]) {
  assert(!fs.existsSync(path.join(output, name)), `Private/server-only asset was exported: ${name}`);
}
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(file);
    else assert(fs.statSync(file).size < 25 * 1024 * 1024, `Asset exceeds Cloudflare's 25 MiB limit: ${file}`);
  }
}
inspect(output);
console.log(`Static export verified: ${posts.length} published posts, public pages, CV, both domains and terminal variants; no admin/server assets.`);
