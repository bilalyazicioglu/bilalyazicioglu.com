"use client";

import { useRef } from "react";
import { useTerminal } from "./TerminalProvider";
import { useShortcutLabel } from "./shortcut";

/**
 * The last line of the home page's man page: the prompt it returns to, which
 * really does open the terminal. One blinking caret is the only thing on the
 * page that moves, and it holds still for anyone who has asked for less motion.
 */
export function HeroPrompt() {
  const { open } = useTerminal();
  const ref = useRef<HTMLButtonElement>(null);
  const key = useShortcutLabel();

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => open(ref.current)}
      aria-keyshortcuts={key}
      className="group mt-8 inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 self-start rounded-sm text-left font-ui text-sm text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <span aria-hidden className="text-accent">
        bilal@web ~ %
      </span>
      <span aria-hidden className="hero-caret inline-block h-[1.05em] w-[0.6em] translate-y-[0.15em] bg-ink/70" />
      <span className="underline decoration-ink/20 underline-offset-4 transition-colors group-hover:decoration-accent">
        Open the terminal
      </span>
      <span className="hidden text-ink/40 sm:inline">
        or press <kbd className="rounded-[3px] border border-ink/20 px-1 font-terminal text-[11px]">{key}</kbd>
      </span>
    </button>
  );
}
