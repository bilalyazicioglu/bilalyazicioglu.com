/**
 * tincan has its own domain, served by this same app: the proxy rewrites
 * tincan.rs/ to /tincan and tincan.rs/tr to /tincan/tr, and every other
 * address for the page 301s here.
 */
export const TINCAN_URL = "https://tincan.rs";

const TINCAN_HOST = new URL(TINCAN_URL).host;

/**
 * Whether a request arrived for tincan's domain. `tincan.localhost` stands in
 * for it in development — browsers resolve *.localhost to this machine, so
 * http://tincan.localhost:3000 behaves like the real thing.
 */
export function isTincanHost(hostHeader: string | null): boolean {
  const host = (hostHeader ?? "").toLowerCase().split(":")[0];
  return host === TINCAN_HOST || host === "tincan.localhost";
}
