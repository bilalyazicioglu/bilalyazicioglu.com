import fs from "node:fs";
import path from "node:path";
import { projects, type Project } from "./projects";

const TINCAN_REPO = "bilalyazicioglu/tincan-cli";
export const TINCAN_FALLBACK_STARS = 114;

const ONE_HOUR_MS = 60 * 60 * 1000;
const FAILURE_BACKOFF_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

type StarCacheData = {
  stars: number;
  updatedAt: number;
};

let memoryCache: StarCacheData | null = null;
let lastFailedAt = 0;
let inflightPromise: Promise<number> | null = null;

function getCacheFilePath(): string {
  if (process.env.GITHUB_STARS_FILE_PATH) {
    return process.env.GITHUB_STARS_FILE_PATH;
  }
  const primaryDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    const testFile = path.join(primaryDir, ".writable_test");
    fs.writeFileSync(testFile, "1");
    fs.unlinkSync(testFile);
    return path.join(primaryDir, "github-stars.json");
  } catch {
    return "/tmp/github-stars.json";
  }
}

function readDiskCache(filePath: string): StarCacheData | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StarCacheData>;
    if (
      typeof parsed.stars === "number" &&
      Number.isFinite(parsed.stars) &&
      parsed.stars >= 0 &&
      typeof parsed.updatedAt === "number" &&
      Number.isFinite(parsed.updatedAt)
    ) {
      return { stars: parsed.stars, updatedAt: parsed.updatedAt };
    }
    return null;
  } catch {
    return null;
  }
}

function saveDiskCacheAtomic(filePath: string, data: StarCacheData): void {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tmpPath, JSON.stringify(data), "utf8");
    fs.renameSync(tmpPath, filePath);
  } catch {
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {
      // ignore cleanup error
    }
  }
}

async function fetchRepoStars(repo: string): Promise<number | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "bilalyazicioglu.com",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { stargazers_count?: unknown };
    if (
      typeof data.stargazers_count === "number" &&
      Number.isFinite(data.stargazers_count) &&
      data.stargazers_count >= 0
    ) {
      return data.stargazers_count;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the GitHub star count for tincan-cli, refreshing at most once per hour.
 * If GitHub is unreachable or rate-limited, returns the last successfully saved
 * count from memory/disk (or TINCAN_FALLBACK_STARS if never fetched yet).
 */
export async function getTincanStars(): Promise<number> {
  const filePath = getCacheFilePath();
  if (!memoryCache) {
    memoryCache = readDiskCache(filePath);
  }

  const now = Date.now();
  const fallbackStars = memoryCache?.stars ?? TINCAN_FALLBACK_STARS;

  if (memoryCache && now - memoryCache.updatedAt < ONE_HOUR_MS) {
    return memoryCache.stars;
  }

  if (lastFailedAt > 0 && now - lastFailedAt < FAILURE_BACKOFF_MS) {
    return fallbackStars;
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      const liveStars = await fetchRepoStars(TINCAN_REPO);
      if (liveStars !== null) {
        const updated: StarCacheData = {
          stars: liveStars,
          updatedAt: Date.now(),
        };
        memoryCache = updated;
        lastFailedAt = 0;
        saveDiskCacheAtomic(filePath, updated);
        return liveStars;
      }

      lastFailedAt = Date.now();
      return fallbackStars;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

/**
 * Returns the projects list with tincan's Stars stat populated from the 1-hour cache.
 */
export async function getProjectsWithLiveStars(): Promise<Project[]> {
  const tincanStars = await getTincanStars();
  return projects.map((project) => {
    if (project.slug !== "tincan") {
      return project;
    }
    return {
      ...project,
      stats: project.stats.map((stat) =>
        stat.label === "Stars"
          ? { ...stat, value: String(tincanStars) }
          : stat
      ),
    };
  });
}
