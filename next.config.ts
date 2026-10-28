import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Seed guides are read from disk at runtime; make sure they ship with the server bundle.
  outputFileTracingIncludes: { "/**": ["./data/guides/**/*"] },
};

export default nextConfig;
