import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Seed guides and their run recordings are read from disk at runtime; make sure they ship with the server bundle.
  outputFileTracingIncludes: { "/**": ["./data/guides/**/*", "./data/replays/**/*"] },
};

export default nextConfig;
