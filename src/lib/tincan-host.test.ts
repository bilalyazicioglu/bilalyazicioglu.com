import { describe, expect, it } from "vitest";
import { isTincanHost } from "./tincan-host";

describe("isTincanHost", () => {
  it.each(["tincan.rs", "TINCAN.RS", "tincan.rs:443", "tincan.localhost:3000"])(
    "recognises %s",
    (host) => {
      expect(isTincanHost(host)).toBe(true);
    }
  );

  it.each([null, "", "www.tincan.rs", "tincan.bilalyazicioglu.com", "tincan.rs.evil.com", "bilalyazicioglu.com"])(
    "rejects %j",
    (host) => {
      expect(isTincanHost(host)).toBe(false);
    }
  );
});
