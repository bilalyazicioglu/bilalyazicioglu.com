import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { projects, type Project } from "./projects";

const TINCAN_REPO = "bilalyazicioglu/tincan-cli";
export const TINCAN_FALLBACK_STARS = 126;

/** Check and refresh stars every 1 hour. */
export const STAR_SYNC_INTERVAL_MS = 60 * 60 * 1000;
/** On network or API failure, retry after 10 minutes. */
export const STAR_RETRY_INTERVAL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

type StarCacheData = {
  stars: number;
  updatedAt: number;
};

// Keep state on globalThis so Next.js module reloads / route bundles within
// the same Node.js process always share the exact same active star count and timer.
type GlobalStarState = {
  cache: StarCacheData | null;
  inflight: Promise<void> | null;
  timer: ReturnType<typeof setTimeout> | null;
  schedulerStarted: boolean;
};

const globalForStars = globalThis as unknown as {
  __tincanStarState?: GlobalStarState;
};

function getState(): GlobalStarState {
  if (!globalForStars.__tincanStarState) {
    globalForStars.__tincanStarState = {
      cache: null,
      inflight: null,
      timer: null,
      schedulerStarted: false,
    };
  }
  return globalForStars.__tincanStarState;
}

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

/**
 * Uses node:https directly so Next.js's patched global fetch never intercepts
 * the call or throws DynamicServerError during build/render.
 */
function fetchRepoStarsHttps(repo: string): Promise<number | null> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "bilalyazicioglu.com",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const req = https.get(
      `https://api.github.com/repos/${repo}`,
      { headers, timeout: FETCH_TIMEOUT_MS },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }

        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            const data = JSON.parse(body) as { stargazers_count?: unknown };
            if (
              typeof data.stargazers_count === "number" &&
              Number.isFinite(data.stargazers_count) &&
              data.stargazers_count >= 0
            ) {
              resolve(data.stargazers_count);
              return;
            }
          } catch {
            // fall through
          }
          resolve(null);
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });

    req.on("error", () => {
      resolve(null);
    });
  });
}

/**
 * Computes whether the star cache is stale (older than 1 hour or never fetched)
 * and determines the delay in milliseconds until the next scheduled check.
 */
export function getScheduleDelay(nowMs: number, lastUpdatedMs: number): {
  isStale: boolean;
  nextDelayMs: number;
} {
  if (lastUpdatedMs <= 0) {
    return { isStale: true, nextDelayMs: 0 };
  }
  const age = nowMs - lastUpdatedMs;
  if (age >= STAR_SYNC_INTERVAL_MS) {
    return { isStale: true, nextDelayMs: 0 };
  }
  return {
    isStale: false,
    nextDelayMs: Math.max(1000, STAR_SYNC_INTERVAL_MS - age),
  };
}

function ensureLoaded(): StarCacheData {
  const state = getState();
  if (!state.cache) {
    const filePath = getCacheFilePath();
    const disk = readDiskCache(filePath);
    if (disk) {
      state.cache = disk;
    } else {
      state.cache = { stars: TINCAN_FALLBACK_STARS, updatedAt: 0 };
    }
  }
  return state.cache;
}

async function runSyncCycle(): Promise<void> {
  const state = getState();
  if (state.inflight) {
    return state.inflight;
  }

  state.inflight = (async () => {
    try {
      const filePath = getCacheFilePath();
      ensureLoaded();
      const liveStars = await fetchRepoStarsHttps(TINCAN_REPO);

      const now = Date.now();
      if (liveStars !== null) {
        const updated: StarCacheData = {
          stars: liveStars,
          updatedAt: now,
        };
        state.cache = updated;
        saveDiskCacheAtomic(filePath, updated);
        scheduleNextRun(STAR_SYNC_INTERVAL_MS);
      } else {
        // Keep current.stars untouched so it stays on the last active number; retry in 10 minutes
        scheduleNextRun(STAR_RETRY_INTERVAL_MS);
      }
    } finally {
      state.inflight = null;
    }
  })();

  return state.inflight;
}

function scheduleNextRun(delayMs: number): void {
  const state = getState();
  if (state.timer) {
    clearTimeout(state.timer);
  }
  state.timer = setTimeout(() => {
    void runSyncCycle();
  }, delayMs);
  if (typeof state.timer.unref === "function") {
    state.timer.unref();
  }
}

/**
 * Starts the background 1-hour star sync scheduler once per server process.
 * If the cache is stale (older than 1 hour or never fetched), triggers an immediate background sync.
 * Otherwise, schedules the next run after the remaining time until the 1-hour mark.
 */
export function startStarSyncScheduler(): void {
  const state = getState();
  if (state.schedulerStarted) {
    return;
  }
  state.schedulerStarted = true;

  const current = ensureLoaded();
  const now = Date.now();
  const { isStale, nextDelayMs } = getScheduleDelay(now, current.updatedAt);

  if (isStale) {
    void runSyncCycle();
  } else {
    scheduleNextRun(nextDelayMs);
  }
}

/**
 * Returns the current active GitHub star count for tincan-cli.
 * Reads from the shared memory/disk state so all routes (/, /projects, /tincan, /tincan/tr)
 * always display the exact same number.
 */
export async function getTincanStars(): Promise<number> {
  const state = getState();
  const current = ensureLoaded();

  if (!state.schedulerStarted) {
    startStarSyncScheduler();
  }

  // On very first boot if disk cache doesn't exist yet, wait briefly for initial sync
  if (current.updatedAt === 0 && state.inflight) {
    await state.inflight;
  }

  return ensureLoaded().stars;
}

/**
 * Returns the projects list with tincan's Stars stat populated from the shared active count.
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
