import fs from "node:fs";
import { execFileSync } from "node:child_process";
let sha = process.env.GIT_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
if (!sha) { try { sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { /* source archives have no git */ } }
const release = { sha: /^[a-f0-9]{40}$/.test(sha || "") ? sha : null, builtAt: new Date().toISOString() };
fs.mkdirSync("src/generated", { recursive: true });
fs.writeFileSync("src/generated/release.json", JSON.stringify(release) + "\n");
