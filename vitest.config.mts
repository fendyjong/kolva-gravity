import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["e2e/**", "**/node_modules/**", ".claude/**", ".next/**"],
  },
});
