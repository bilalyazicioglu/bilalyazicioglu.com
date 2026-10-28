import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAllViewCounts, getViewCount, recordView } from "./views";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "views-test-"));
  vi.stubEnv("VIEWS_FILE_PATH", path.join(dir, "views.json"));
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("view counter", () => {
  it("counts a visitor once per day per post", () => {
    expect(recordView("tincan", "1.1.1.1")).toBe(1);
    expect(recordView("tincan", "1.1.1.1")).toBe(1);
    expect(recordView("tincan", "2.2.2.2")).toBe(2);
    expect(recordView("xteink-x4", "1.1.1.1")).toBe(1);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(recordView("tincan", "1.1.1.1")).toBe(3);
  });

  it("persists counts across reads", () => {
    recordView("tincan", "1.1.1.1");
    recordView("xteink-x4", "1.1.1.1");
    expect(getViewCount("tincan")).toBe(1);
    expect(getViewCount("never-seen")).toBe(0);
    expect(getAllViewCounts()).toEqual({ tincan: 1, "xteink-x4": 1 });
  });

  it("starts from zero when the file is corrupt", () => {
    fs.writeFileSync(path.join(dir, "views.json"), "{not json");
    expect(getViewCount("tincan")).toBe(0);
    expect(recordView("tincan", "1.1.1.1")).toBe(1);
  });

  it("leaves no temp files behind", () => {
    recordView("tincan", "1.1.1.1");
    expect(fs.readdirSync(dir)).toEqual(["views.json"]);
  });
});
