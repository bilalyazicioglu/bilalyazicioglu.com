"use client";

import { useRef } from "react";
import { useTerminal } from "./TerminalProvider";
import { useShortcutLabel } from "./shortcut";

/**
 * A `>_` trigger. Both placements — navbar and footer — go through the same
 * provider, so wherever it is opened from it is the same window.
 *
 * `labelled` spells the word out beside the glyph: on its own `>_` sits next to
 * the theme toggle looking like one more setting, and only developers read it
 * as a shell. The key hint is desktop-only — a phone has no key to press.
 */
export function TerminalButton({
  className = "",
  labelled = false,
}: {
  className?: string;
  labelled?: boolean;
}) {
  const { open } = useTerminal();
  const ref = useRef<HTMLButtonElement>(null);
  const key = useShortcutLabel();

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => open(ref.current)}
      title={`Terminal (${key})`}
      aria-label="Open terminal"
      aria-keyshortcuts={key}
      className={`group inline-flex items-center gap-1.5 rounded-[4px] border border-ink/25 px-2 py-0.5 font-ui text-[12px] text-ink/70 transition-colors hover:border-ink/60 hover:text-accent ${className}`}
    >
      <span aria-hidden>&gt;_</span>
      {labelled && (
        <>
          <span aria-hidden>
            terminal
          </span>
          <kbd
            aria-hidden
            className="hidden rounded-[3px] border border-ink/20 px-1 font-ui text-[10px] leading-[1.3] text-ink/50 transition-colors group-hover:border-ink/40 sm:inline"
          >
            {key}
          </kbd>
        </>
      )}
    </button>
  );
}
