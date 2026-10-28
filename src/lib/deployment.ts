/** Vercel serves the Git-backed content without a writable content volume. */
export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}
