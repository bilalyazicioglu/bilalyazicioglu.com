/**
 * Who gets the plain-text site, and at which addresses.
 *
 * `curl bilalyazicioglu.com` should print something a person can read in a
 * terminal, not 60 KB of HTML. The proxy asks `wantsText()` and, for the paths
 * below, rewrites the request to the /cli route, which renders the same
 * content as ANSI text. Browsers, crawlers and link previews never match, so
 * nothing changes for them.
 *
 * Kept free of imports: the proxy loads it on every request.
 */

/** HTTP clients people type by hand in a terminal. Matched at the start of the User-Agent. */
const TERMINAL_CLIENTS = /^(curl|wget|httpie|xh|aria2)\//i;

/** Path on the main site → the /cli page that answers it. */
export const CLI_PAGES: Record<string, string> = {
  "/": "/cli",
  "/infra": "/cli/infra",
  "/projects": "/cli/projects",
  "/blog": "/cli/blog",
};

/** tincan.rs's root, for the same clients. */
export const CLI_TINCAN_PAGE = "/cli/tincan";

export function isTerminalClient(userAgent: string | null): boolean {
  return TERMINAL_CLIENTS.test(userAgent ?? "");
}

/**
 * A terminal client, unless it explicitly asked for HTML — `curl -H 'Accept:
 * text/html'` is someone who wants the real page, and gets it.
 */
export function wantsText(headers: Headers): boolean {
  return isTerminalClient(headers.get("user-agent")) && !/text\/html/i.test(headers.get("accept") ?? "");
}
