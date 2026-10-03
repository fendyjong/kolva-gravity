import { describe, expect, it } from "vitest";
import { DELETE, GET } from "./route";

describe("/mcp", () => {
  it("answers GET and DELETE with 405 because the server is stateless", async () => {
    for (const handler of [GET, DELETE]) {
      const response = await handler();
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
    }
  });
});
