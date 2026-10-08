import { describe, expect, it } from "vitest";
import { isTerminalClient, wantsText } from "./client";

describe("isTerminalClient", () => {
  it.each(["curl/8.7.1", "Wget/1.21.4", "HTTPie/3.2.2", "xh/0.22.0"])("knows %s", (ua) => {
    expect(isTerminalClient(ua)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    // A browser extension or bot that merely mentions curl is not curl.
    "Mozilla/5.0 curl/8.0",
    "",
  ])("ignores %j", (ua) => {
    expect(isTerminalClient(ua)).toBe(false);
  });

  it("ignores a missing header", () => {
    expect(isTerminalClient(null)).toBe(false);
  });
});

describe("wantsText", () => {
  it("is true for curl's default */*", () => {
    expect(wantsText(new Headers({ "user-agent": "curl/8.7.1", accept: "*/*" }))).toBe(true);
  });

  it("respects a terminal that explicitly asks for HTML", () => {
    expect(wantsText(new Headers({ "user-agent": "curl/8.7.1", accept: "text/html" }))).toBe(false);
  });
});
