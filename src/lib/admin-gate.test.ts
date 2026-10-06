import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "./admin-auth";
import { isAdminPath, isAdminRequestAllowed } from "./admin-gate";

const headers = (values: Record<string, string>) => new Headers(values);
const cookiesWith = (token?: string) => ({
  get: (name: string) =>
    name === "admin_session" && token ? { value: token } : undefined,
});

describe("isAdminPath", () => {
  it.each(["/admin", "/admin/new", "/api/admin", "/api/admin/posts"])("matches %s", (path) => {
    expect(isAdminPath(path)).toBe(true);
  });

  it.each(["/", "/administrator", "/blog/admin", "/api/views"])("ignores %s", (path) => {
    expect(isAdminPath(path)).toBe(false);
  });
});

describe("isAdminRequestAllowed in production", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_SESSION_SECRET", "gate-test-secret");
    vi.stubEnv("ADMIN_TAILNET_HOST", "homeserver.tailnet.ts.net");
    vi.stubEnv("ADMIN_TAILSCALE_LOGIN", "bilal@github");
  });

  it("lets a valid session through from anywhere", () => {
    const token = createSessionToken("bilal");
    expect(
      isAdminRequestAllowed(headers({ "cf-connecting-ip": "203.0.113.7" }), cookiesWith(token))
    ).toBe(true);
  });

  it("treats anything that came through Cloudflare as anonymous", () => {
    expect(
      isAdminRequestAllowed(
        headers({
          "cf-connecting-ip": "203.0.113.7",
          host: "homeserver.tailnet.ts.net",
          "tailscale-user-login": "bilal@github",
        }),
        cookiesWith("forged.token")
      )
    ).toBe(false);
  });

  it("allows the expected tailnet identity on the tailnet host", () => {
    expect(
      isAdminRequestAllowed(
        headers({ host: "HomeServer.tailnet.ts.net:443", "tailscale-user-login": "Bilal@GitHub" })
      )
    ).toBe(true);
  });

  it("rejects another tailnet user", () => {
    expect(
      isAdminRequestAllowed(
        headers({ host: "homeserver.tailnet.ts.net", "tailscale-user-login": "guest@github" })
      )
    ).toBe(false);
  });

  it("rejects the public host even without a Cloudflare header", () => {
    expect(
      isAdminRequestAllowed(
        headers({ host: "bilalyazicioglu.com", "tailscale-user-login": "bilal@github" })
      )
    ).toBe(false);
  });

  it("fails closed when the tailnet host is not configured", () => {
    vi.stubEnv("ADMIN_TAILNET_HOST", "");
    expect(
      isAdminRequestAllowed(
        headers({ host: "homeserver.tailnet.ts.net", "tailscale-user-login": "bilal@github" })
      )
    ).toBe(false);
  });
});
