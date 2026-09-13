import crypto from "node:crypto";

/**
 * Authentication and stealth gate utilities for the Admin Studio.
 *
 * Implements:
 * 1. Stealth route slug and gate key validation
 * 2. Timing-attack safe credential verification (Username + Password + Static PIN)
 * 3. IP-based rate limiting (5 attempts, 15 min lock)
 * 4. HMAC-SHA256 signed stateless session tokens (HttpOnly, SameSite=Strict)
 */

const DEFAULT_DEV_SLUG = "admin-studio";
const DEFAULT_DEV_KEY = "dev-secret-key";
const DEFAULT_DEV_USER = "admin";
const DEFAULT_DEV_PASS = "admin12345";
const DEFAULT_DEV_PIN = "0000";
const DEFAULT_DEV_SECRET = "dev-insecure-secret-key-change-in-production-1234567890";

export const ADMIN_COOKIE_NAME = "admin_session";

export function getAdminConfig() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    secretSlug: (process.env.ADMIN_SECRET_SLUG?.trim() || (isProd ? "" : DEFAULT_DEV_SLUG)),
    accessKey: (process.env.ADMIN_ACCESS_KEY?.trim() || (isProd ? "" : DEFAULT_DEV_KEY)),
    username: (process.env.ADMIN_USERNAME?.trim() || (isProd ? "" : DEFAULT_DEV_USER)),
    password: (process.env.ADMIN_PASSWORD?.trim() || (isProd ? "" : DEFAULT_DEV_PASS)),
    securityPin: (process.env.ADMIN_SECURITY_PIN?.trim() || (isProd ? "" : DEFAULT_DEV_PIN)),
    sessionSecret: (process.env.ADMIN_SESSION_SECRET?.trim() || (isProd ? "" : DEFAULT_DEV_SECRET)),
  };
}

/**
 * Compare two strings in constant time to prevent timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Fake comparison to prevent early return timing leak
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// In-memory rate limiting map for login attempts
type RateRecord = {
  attempts: number;
  lockedUntil: number;
};

const rateLimitMap = new Map<string, RateRecord>();

// Cleanup stale rate limit records every 30 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of rateLimitMap.entries()) {
      if (rec.lockedUntil < now && rec.attempts === 0) {
        rateLimitMap.delete(ip);
      }
    }
  }, 1000 * 60 * 30).unref();
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number; remainingAttempts: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.lockedUntil > now) {
    const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds, remainingAttempts: 0 };
  }

  // Lockout expired, reset attempts
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    record.attempts = 0;
    record.lockedUntil = 0;
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

export function recordFailedAttempt(ip: string): { remainingAttempts: number; waitSeconds?: number } {
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record) {
    record = { attempts: 0, lockedUntil: 0 };
    rateLimitMap.set(ip, record);
  }

  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { remainingAttempts: 0, waitSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  return { remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts) };
}

export function resetRateLimit(ip: string) {
  rateLimitMap.delete(ip);
}

export function verifyAdminCredentials(user: string, pass: string, pin: string): boolean {
  const config = getAdminConfig();
  if (!config.username || !config.password || !config.securityPin) {
    console.error("[admin-auth] Admin credentials not configured in production!");
    return false;
  }

  const userMatches = timingSafeCompare(user.trim(), config.username);
  const passMatches = timingSafeCompare(pass, config.password);
  const pinMatches = timingSafeCompare(pin.trim(), config.securityPin);

  return userMatches && passMatches && pinMatches;
}

export type SessionPayload = {
  user: string;
  iat: number;
  exp: number;
};

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function createSessionToken(username: string): string {
  const config = getAdminConfig();
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    user: username,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", config.sessionSecret);
  hmac.update(encodedPayload);
  const signature = hmac.digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const config = getAdminConfig();

  const hmac = crypto.createHmac("sha256", config.sessionSecret);
  hmac.update(encodedPayload);
  const expectedSig = hmac.digest("base64url");

  if (!timingSafeCompare(signature, expectedSig)) {
    return null;
  }

  try {
    const raw = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload: SessionPayload = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if the request carries a valid admin session cookie.
 */
export function isValidAdminSessionFromCookies(cookies: { get(name: string): { value: string } | undefined }): boolean {
  const token = cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token) !== null;
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(headers: { get(name: string): string | null }): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

