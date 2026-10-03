import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("builds the standalone server that the Dockerfile runs", () => {
    expect(nextConfig.output).toBe("standalone");
  });
});
