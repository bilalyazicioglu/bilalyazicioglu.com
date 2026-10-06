import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  createSessionToken,
  getAdminConfig,
  recordFailedAttempt,
  resetRateLimit,
  timingSafeCompare,
  verifyAdminCredentials,
  verifySessionToken,
} from "./admin-auth";

describe("timingSafeCompare", () => {
  it("matches only identical strings", () => {
    expect(timingSafeCompare("secret", "secret")).toBe(true);
    expect(timingSafeCompare("secret", "secreT")).toBe(false);
    expect(timingSafeCompare("secret", "secret!")).toBe(false);
    expect(timingSafeCompare("", "secret")).toBe(false);
  });

  it("compares multi-byte strings by their bytes", () => {
    expect(timingSafeCompare("şifre", "şifre")).toBe(true);
    expect(timingSafeCompare("şifre", "sifre")).toBe(false);
  });
});

describe("session tokens", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret-one");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips the username", () => {
    const payload = verifySessionToken(createSessionToken("bilal"));
    expect(payload?.user).toBe("bilal");
    expect(payload!.exp - payload!.iat).toBe(7 * 24 * 60 * 60);
  });

  it("rejects a token whose payload was edited", () => {
    const [, signature] = createSessionToken("bilal").split(".");
    const forged = Buffer.from(
      JSON.stringify({ user: "attacker", iat: 0, exp: 9_999_999_999 })
    ).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = createSessionToken("bilal");
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret-two");
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = createSessionToken("bilal");

    vi.setSystemTime(new Date("2026-01-07T23:59:00Z"));
    expect(verifySessionToken(token)).not.toBeNull();

    vi.setSystemTime(new Date("2026-01-08T00:00:01Z"));
    expect(verifySessionToken(token)).toBeNull();
  });

  it.each([undefined, null, "", "no-dot", "a.b.c", "!!!.???"])(
    "rejects malformed token %j",
    (token) => {
      expect(verifySessionToken(token)).toBeNull();
    }
  );
});

describe("login rate limit", () => {
  const ip = "203.0.113.7";

  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimit(ip);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks an address out after five failures for fifteen minutes", () => {
    for (let i = 0; i < 4; i++) recordFailedAttempt(ip);
    expect(checkRateLimit(ip)).toMatchObject({ allowed: true, remainingAttempts: 1 });

    expect(recordFailedAttempt(ip)).toEqual({ remainingAttempts: 0, waitSeconds: 900 });
    expect(checkRateLimit(ip).allowed).toBe(false);

    vi.advanceTimersByTime(15 * 60 * 1000 - 1000);
    expect(checkRateLimit(ip)).toMatchObject({ allowed: false, waitSeconds: 1 });

    vi.advanceTimersByTime(1000);
    expect(checkRateLimit(ip)).toEqual({ allowed: true, remainingAttempts: 5 });
  });

  it("counts each address separately", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
    expect(checkRateLimit("198.51.100.1").allowed).toBe(true);
    resetRateLimit("198.51.100.1");
  });
});

describe("production configuration", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    for (const name of [
      "ADMIN_SECRET_SLUG",
      "ADMIN_ACCESS_KEY",
      "ADMIN_USERNAME",
      "ADMIN_PASSWORD",
      "ADMIN_SECURITY_PIN",
      "ADMIN_SESSION_SECRET",
    ]) {
      vi.stubEnv(name, "");
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("never falls back to the development defaults", () => {
    expect(Object.values(getAdminConfig()).every((value) => value === "")).toBe(true);
  });

  it("refuses every login when credentials are unset", () => {
    expect(verifyAdminCredentials("", "", "")).toBe(false);
    expect(verifyAdminCredentials("admin", "admin12345", "0000")).toBe(false);
  });

  it("checks all three factors", () => {
    vi.stubEnv("ADMIN_USERNAME", "bilal");
    vi.stubEnv("ADMIN_PASSWORD", "correct horse");
    vi.stubEnv("ADMIN_SECURITY_PIN", "4821");

    expect(verifyAdminCredentials(" bilal ", "correct horse", "4821 ")).toBe(true);
    expect(verifyAdminCredentials("bilal", "correct horse", "0000")).toBe(false);
    expect(verifyAdminCredentials("bilal", "wrong", "4821")).toBe(false);
    expect(verifyAdminCredentials("root", "correct horse", "4821")).toBe(false);
  });
});
