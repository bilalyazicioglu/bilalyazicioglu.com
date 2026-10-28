import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  outputFileTracingIncludes: {
    "/*": ["./src/content/blog/**/*.mdx"],
  },
  env: {
    NEXT_PUBLIC_VIEW_COUNTER_ENABLED: process.env.VERCEL === "1" ? "0" : "1",
  },
};

export default nextConfig;
