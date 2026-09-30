import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { projects, type Project } from "./projects";

const TINCAN_REPO = "bilalyazicioglu/tincan-cli";
export const TINCAN_FALLBACK_STARS = 126;

/** Turkey is permanently on UTC+3 (Europe/Istanbul). */
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
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
 * Computes schedule boundaries in Europe/Istanbul (UTC+3):
 * - Daily check target: 09:00 Istanbul time.
 * - On failure between 09:00 and 12:00: retry every 30 minutes.
 * - On failure between 12:00 and 24:00: retry every 2 hours (capped at midnight;
 *   if next retry crosses 00:00, wait until 09:00).
 * - Between 00:00 and 09:00: 0 requests (wait until 09:00).
 */
export function getScheduleInfo(nowMs: number) {
  const istDate = new Date(nowMs + ISTANBUL_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  const istHour = istDate.getUTCHours();

  const todayNineAmMs =
    Date.UTC(year, month, day, 9, 0, 0, 0) - ISTANBUL_OFFSET_MS;
  const tomorrowNineAmMs = todayNineAmMs + DAY_MS;
  const todayMidnightEndMs =
    Date.UTC(year, month, day + 1, 0, 0, 0, 0) - ISTANBUL_OFFSET_MS;

  const nextNineAmMs = nowMs < todayNineAmMs ? todayNineAmMs : tomorrowNineAmMs;

  let retryDelayMs: number;
  if (istHour < 9) {
    // 00:00 - 08:59 -> 0 requests until 09:00
    retryDelayMs = Math.max(1000, todayNineAmMs - nowMs);
  } else if (istHour < 12) {
    // 09:00 - 11:59 -> retry in 30 minutes
    retryDelayMs = THIRTY_MINUTES_MS;
  } else {
    // 12:00 - 23:59 -> retry in 2 hours, unless that crosses 00:00 midnight
    const candidateMs = nowMs + TWO_HOURS_MS;
    if (candidateMs >= todayMidnightEndMs) {
      retryDelayMs = Math.max(1000, tomorrowNineAmMs - nowMs);
    } else {
      retryDelayMs = TWO_HOURS_MS;
    }
  }

  return {
    istHour,
    todayNineAmMs,
    nextNineAmMs,
    nextDailyDelayMs: Math.max(1000, nextNineAmMs - nowMs),
    retryDelayMs,
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
      const schedule = getScheduleInfo(now);

      if (liveStars !== null) {
        const updated: StarCacheData = {
          stars: liveStars,
          updatedAt: now,
        };
        state.cache = updated;
        saveDiskCacheAtomic(filePath, updated);
        scheduleNextRun(schedule.nextDailyDelayMs);
      } else {
        // Keep current.stars untouched so it stays on the last active number
        scheduleNextRun(schedule.retryDelayMs);
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
 * Starts the background daily 09:00 scheduler once per server process.
 * If the cache has never been fetched or missed today's 09:00 window (and it is
 * not between 00:00 and 09:00), performs an immediate sync.
 */
export function startStarSyncScheduler(): void {
  const state = getState();
  if (state.schedulerStarted) {
    return;
  }
  state.schedulerStarted = true;

  const current = ensureLoaded();
  const now = Date.now();
  const { istHour, todayNineAmMs, nextDailyDelayMs } = getScheduleInfo(now);

  const neverFetched = current.updatedAt === 0;
  const missedTodayNineAm = istHour >= 9 && current.updatedAt < todayNineAmMs;

  if (neverFetched || missedTodayNineAm) {
    void runSyncCycle();
  } else {
    scheduleNextRun(nextDailyDelayMs);
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
