import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "./slug";

describe("isValidSlug", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    expect(isValidSlug("tincan-serverless-voice-chat")).toBe(true);
    expect(isValidSlug("xteink-x4")).toBe(true);
  });

  // Every slug that reaches the filesystem passes through here, so anything
  // that could escape the posts directory has to be refused.
  it.each([
    "",
    "../etc/passwd",
    "..",
    "posts/secret",
    "a\\b",
    "post.mdx",
    "Uppercase",
    "-leading",
    "trailing-",
    "double--hyphen",
    "with space",
    "a".repeat(121),
  ])("rejects %j", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });

  it("accepts the maximum length", () => {
    expect(isValidSlug("a".repeat(120))).toBe(true);
  });
});

describe("slugify", () => {
  it("transliterates Turkish letters instead of dropping them", () => {
    expect(slugify("Terminalde Sesli Sohbet: Çığır mı?")).toBe(
      "terminalde-sesli-sohbet-cigir-mi"
    );
    expect(slugify("Güvenlik Öğütleri")).toBe("guvenlik-ogutleri");
  });

  it("strips other accents", () => {
    expect(slugify("Café Señor")).toBe("cafe-senor");
  });

  it("collapses punctuation and trims hyphens", () => {
    expect(slugify("  --Hello,   World!--  ")).toBe("hello-world");
  });

  it("never ends in a hyphen after truncation", () => {
    const slug = slugify(`${"a".repeat(119)} b`);
    expect(slug.length).toBeLessThanOrEqual(120);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("always produces a valid slug for non-empty word input", () => {
    for (const title of ["Notes on Shipping Slow", "Stealth Admin & Güvenlik", "v0.3.3 — release"]) {
      expect(isValidSlug(slugify(title))).toBe(true);
    }
  });
});
