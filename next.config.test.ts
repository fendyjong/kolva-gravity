import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("builds the standalone server that the Dockerfile runs", () => {
    expect(nextConfig.output).toBe("standalone");
  });

  it("ships the triage prompt text with the /mcp route", () => {
    expect(nextConfig.outputFileTracingIncludes?.["/mcp"]).toContain("./lib/mcp/triage.md");
  });
});
