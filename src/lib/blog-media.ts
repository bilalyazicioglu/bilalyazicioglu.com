import path from "node:path";
export function blogMediaDirectory() {
  return path.join(process.env.BLOG_DIR_PATH ? path.dirname(process.env.BLOG_DIR_PATH) : path.join(process.cwd(), "src/content"), "uploads/blog");
}
