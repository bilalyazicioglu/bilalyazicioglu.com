"use client";

import { useEffect, useState } from "react";

/**
 * When a keystroke should open the terminal.
 *
 * Two ways in. The tilde itself, however the layout gets there — Option on a
 * Mac, AltGr on Windows, which is why Alt and Ctrl are not filtered out. And the
 * physical key left of 1, where the tilde lives on a US board: on Turkish Q
 * that key is `"` and the tilde is a dead key behind AltGr, so the position is
 * the shortcut that actually works there.
 *
 * Cmd stays out: Cmd+Shift+` is the macOS window switcher, and it reports "~".
 */
export function isTerminalShortcut(
  event: Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey">
): boolean {
  if (event.metaKey) return false;
  if (event.key === "~") return true;
  return event.code === "Backquote" && !event.ctrlKey && !event.altKey;
}

type LayoutMap = { get(code: string): string | undefined };
type KeyboardApi = { getLayoutMap(): Promise<LayoutMap> };

let layoutKey: Promise<string | undefined> | null = null;

/**
 * The character the visitor's own keyboard prints on that key, so the hint says
 * `"` to someone on Turkish Q rather than a tilde they cannot find. Only
 * Chromium can tell; everywhere else the hint stays the tilde, which the
 * shortcut still accepts.
 */
export function useShortcutLabel(): string {
  const [label, setLabel] = useState("~");

  useEffect(() => {
    const keyboard = (navigator as Navigator & { keyboard?: KeyboardApi }).keyboard;
    if (!keyboard?.getLayoutMap) return;

    layoutKey ??= keyboard
      .getLayoutMap()
      .then((map) => map.get("Backquote"))
      .catch(() => undefined);

    let active = true;
    layoutKey.then((key) => {
      if (active && key) setLabel(key);
    });
    return () => {
      active = false;
    };
  }, []);

  return label;
}
