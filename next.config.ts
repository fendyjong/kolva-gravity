import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs .next/standalone/server.js with no node_modules install.
  output: "standalone",
  // lib/mcp/triage.ts reads the prompt text at runtime.
  outputFileTracingIncludes: {
    "/mcp": ["./lib/mcp/triage.md"],
  },
};

export default nextConfig;
