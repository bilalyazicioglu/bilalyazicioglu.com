"use client";

import { useTheme, type Theme } from "@/components/ThemeProvider";

/**
 * The visible half of the theme switch — the terminal's `theme` command is the
 * other. Cycles all three states rather than flipping two, so a visitor who
 * once picked a side can still hand the decision back to their OS.
 */

const NEXT: Record<Theme, Theme> = {
  system: "dark",
  dark: "light",
  light: "system",
};

/** Glyphs rather than icons, to sit beside the `>_` button in the same face. */
const FACE: Record<Theme, { glyph: string; label: string }> = {
  system: { glyph: "◐", label: "System theme" },
  dark: { glyph: "☾", label: "Dark theme" },
  light: { glyph: "☀", label: "Light theme" },
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const face = FACE[theme];
  const next = NEXT[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`${face.label} — switch to ${FACE[next].label.toLowerCase()}`}
      aria-label={`${face.label}. Switch to ${FACE[next].label.toLowerCase()}`}
      className={`rounded-[4px] border border-ink/25 px-2 py-0.5 font-ui text-[12px] leading-[1.5] text-ink/70 transition-colors hover:border-ink/60 hover:text-accent ${className}`}
    >
      {/* The glyphs draw thinner than the `>_` next door; a point of extra size
          brings the two buttons back to the same visual weight. */}
      <span aria-hidden className="text-[13px]">
        {face.glyph}
      </span>
    </button>
  );
}
