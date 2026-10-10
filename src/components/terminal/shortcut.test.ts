import { describe, expect, it } from "vitest";
import { isTerminalShortcut } from "./shortcut";

const press = (over: Partial<Parameters<typeof isTerminalShortcut>[0]>) => ({
  key: "",
  code: "",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...over,
});

describe("isTerminalShortcut", () => {
  it("opens on a US tilde and on the bare key under it", () => {
    expect(isTerminalShortcut(press({ key: "~", code: "Backquote" }))).toBe(true);
    expect(isTerminalShortcut(press({ key: "`", code: "Backquote" }))).toBe(true);
  });

  // Turkish Q: the key left of 1 prints `"`, and the tilde needs AltGr
  // (Ctrl+Alt to the browser) on Windows or Option on a Mac.
  it("opens on Turkish Q, by position or by a modified tilde", () => {
    expect(isTerminalShortcut(press({ key: '"', code: "Backquote" }))).toBe(true);
    expect(isTerminalShortcut(press({ key: "~", code: "BracketLeft", ctrlKey: true, altKey: true }))).toBe(true);
    expect(isTerminalShortcut(press({ key: "~", code: "BracketLeft", altKey: true }))).toBe(true);
  });

  it("leaves the macOS window switcher alone", () => {
    expect(isTerminalShortcut(press({ key: "~", code: "Backquote", metaKey: true }))).toBe(false);
    expect(isTerminalShortcut(press({ key: "`", code: "Backquote", metaKey: true }))).toBe(false);
  });

  it("ignores the position key under a modifier, and every other key", () => {
    expect(isTerminalShortcut(press({ key: "é", code: "Backquote", altKey: true }))).toBe(false);
    expect(isTerminalShortcut(press({ key: "`", code: "Backquote", ctrlKey: true }))).toBe(false);
    expect(isTerminalShortcut(press({ key: "a", code: "KeyA" }))).toBe(false);
  });
});
