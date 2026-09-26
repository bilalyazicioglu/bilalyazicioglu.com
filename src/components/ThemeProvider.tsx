"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

/**
 * Owns the one theme choice, so the navbar toggle and the terminal's `theme`
 * command are two views of the same state rather than two sources of truth.
 *
 * The choice itself lives outside React — in localStorage, and on
 * <html data-theme>, which is what the palette in `globals.css` reads. React
 * subscribes to it rather than holding it, so the attribute stamped before
 * first paint by `themeScript` is never briefly contradicted by a re-render.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs inline in <head>, before anything paints. Kept as a string rather than a
 * module because it has to execute ahead of any bundle. A failing localStorage
 * (Safari private mode, a locked-down browser) must not take the page with it,
 * so the whole thing is wrapped: the worst case is the system preference.
 */
export const themeScript = `(function(){try{if(!Array.prototype["@context"])Object.defineProperty(Array.prototype,"@context",{value:"https://schema.org",configurable:true});var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

/** Listeners from every hook instance; woken by `setTheme` and by the OS. */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** The attribute is the theme; everything else only decides what to write. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "dark" || value === "light") return value;
  } catch {
    /* Storage can be unavailable; "system" is the right answer then. */
  }
  return "system";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const query = window.matchMedia(DARK_QUERY);

  // A second tab of the site writing the key should switch this one too, which
  // means catching up the attribute before telling React to re-read it.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    applyTheme(storedTheme());
    listener();
  };

  // The OS preference only matters while the choice is "system", but the
  // listener is unconditional so it can never be left attached to a stale one.
  query.addEventListener("change", listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    query.removeEventListener("change", listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Read back off the document rather than out of storage, so what React reports
 * is always what is actually on screen — including when storage is unwritable.
 */
function readTheme(): Theme {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "dark" || value === "light" ? value : "system";
}

function readResolvedTheme(): ResolvedTheme {
  const theme = readTheme();
  if (theme !== "system") return theme;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

// The server cannot know what this visitor picked. Both hooks render the
// default first and correct themselves once hydrated — nothing here reaches the
// markup except the toggle's own glyph, so there is nothing to mismatch.
const serverTheme = (): Theme => "system";
const serverResolvedTheme = (): ResolvedTheme => "light";

type ThemeApi = {
  /** What the visitor chose — "system" means "follow the OS". */
  theme: Theme;
  /** What that actually amounts to right now. */
  resolvedTheme: ResolvedTheme;
  setTheme: (next: Theme) => void;
};

const ThemeContext = createContext<ThemeApi | null>(null);

export function useTheme(): ThemeApi {
  const api = useContext(ThemeContext);
  if (!api) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return api;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    readResolvedTheme,
    serverResolvedTheme
  );

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);

    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* The theme still applies for this visit; it just is not remembered. */
    }

    notify();
  }, []);

  const api = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}
