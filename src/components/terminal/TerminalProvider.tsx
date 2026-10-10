"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isTerminalShortcut } from "./shortcut";

/**
 * Owns the one terminal window, so the buttons that open it — one in the navbar,
 * one in the footer — are just triggers rather than separate terminals with
 * separate histories. It also owns the keyboard shortcut and remembers which trigger
 * was used, to hand focus back on close.
 *
 * `#terminal` on any URL arrives with the window already open, so the terminal
 * can be linked to directly — from a CV, a post, a profile.
 *
 * The window itself, with the ASCII engine and the command set, is only fetched
 * the first time someone opens it: a visitor who never does pays nothing.
 */
const Terminal = dynamic(() => import("./Terminal").then((mod) => mod.Terminal), {
  ssr: false,
});

type TerminalApi = {
  open: (trigger?: HTMLElement | null) => void;
};

const HASH = "#terminal";

const TerminalContext = createContext<TerminalApi | null>(null);

export function useTerminal(): TerminalApi {
  const api = useContext(TerminalContext);
  if (!api) {
    throw new Error("useTerminal must be used inside <TerminalProvider>");
  }
  return api;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  const api: TerminalApi = {
    open: useCallback((element?: HTMLElement | null) => {
      trigger.current = element ?? null;
      setOpen(true);
    }, []),
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Never steal the key from someone filling in a field — the projects
      // search box and the admin editor both live under this provider.
      if (!isTerminalShortcut(event)) return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      trigger.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The provider outlives page changes, so the hash is checked on every
  // navigation as well as on load; `hashchange` covers a link on the same page.
  useEffect(() => {
    function fromHash() {
      if (window.location.hash === HASH) setOpen(true);
    }

    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [pathname]);

  return (
    <TerminalContext.Provider value={api}>
      {children}
      {open && (
        <Terminal
          onClose={() => {
            setOpen(false);
            // Drop the hash so a reload, or a shared copy of the URL, does not
            // reopen a window the visitor just closed.
            if (window.location.hash === HASH) {
              const { pathname: path, search } = window.location;
              window.history.replaceState(window.history.state, "", path + search);
            }
            trigger.current?.focus();
          }}
        />
      )}
    </TerminalContext.Provider>
  );
}
