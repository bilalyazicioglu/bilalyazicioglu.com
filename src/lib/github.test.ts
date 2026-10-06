import { describe, expect, it } from "vitest";
import {
  STAR_RETRY_INTERVAL_MS,
  STAR_SYNC_INTERVAL_MS,
  getProjectsWithLiveStars,
  getScheduleDelay,
  getTincanStars,
} from "./github";

describe("github star sync scheduler", () => {
  it("marks as stale and 0 delay if never fetched before", () => {
    const now = 1_000_000_000_000;
    const res = getScheduleDelay(now, 0);
    expect(res.isStale).toBe(true);
    expect(res.nextDelayMs).toBe(0);
  });

  it("schedules next delay if cache is fresh (e.g. 20 minutes old)", () => {
    const now = 1_000_000_000_000;
    const twentyMinsAgo = now - 20 * 60 * 1000;
    const res = getScheduleDelay(now, twentyMinsAgo);

    expect(res.isStale).toBe(false);
    // Remaining time should be 40 minutes (40 * 60 * 1000 = 2_400_000 ms)
    expect(res.nextDelayMs).toBe(40 * 60 * 1000);
  });

  it("marks as stale if cache is 1 hour or older", () => {
    const now = 1_000_000_000_000;
    const oneHourAgo = now - STAR_SYNC_INTERVAL_MS;
    const res = getScheduleDelay(now, oneHourAgo);

    expect(res.isStale).toBe(true);
    expect(res.nextDelayMs).toBe(0);

    const twoHoursAgo = now - 2 * STAR_SYNC_INTERVAL_MS;
    const res2 = getScheduleDelay(now, twoHoursAgo);
    expect(res2.isStale).toBe(true);
    expect(res2.nextDelayMs).toBe(0);
  });

  it("exports correct 1-hour and 10-minute constants", () => {
    expect(STAR_SYNC_INTERVAL_MS).toBe(60 * 60 * 1000);
    expect(STAR_RETRY_INTERVAL_MS).toBe(10 * 60 * 1000);
  });

  it("returns a finite positive star count from getTincanStars()", async () => {
    const stars = await getTincanStars();
    expect(typeof stars).toBe("number");
    expect(Number.isFinite(stars)).toBe(true);
    expect(stars).toBeGreaterThan(0);
  });

  it("populates live stars in getProjectsWithLiveStars()", async () => {
    const projects = await getProjectsWithLiveStars();
    const tincan = projects.find((p) => p.slug === "tincan");
    expect(tincan).toBeDefined();

    const starStat = tincan?.stats.find((s) => s.label === "Stars");
    expect(starStat).toBeDefined();
    expect(Number(starStat?.value)).toBeGreaterThan(0);
  });
});
