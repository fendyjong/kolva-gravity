import { defineConfig, devices } from "@playwright/test";

// 17017 is portctl's claim for gravity-e2e (`portctl resolve gravity-e2e`). Never pick a port by hand.
const PORT = 17017;

export default defineConfig({
  testDir: "./e2e",
  // One server and one database for the whole run, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone-375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } } },
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // The production build, served the way the container serves it, on a fresh database.
    command: `rm -rf .e2e && pnpm build && scripts/serve-standalone.sh ${PORT} .e2e/gravity.db`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
