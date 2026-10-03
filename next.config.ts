import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs .next/standalone/server.js with no node_modules install.
  output: "standalone",
};

export default nextConfig;
