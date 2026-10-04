import { defineConfig, devices } from "@playwright/test";

/**
 * Tests run against the production build served by `astro preview`: focus,
 * axe, no-JS and CSP behaviour only mean something on the real output.
 * Chromium only. Set PW_CHROMIUM_PATH to use a pre-installed browser.
 */
const executablePath = process.env["PW_CHROMIUM_PATH"];
const port = 4321;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? "list" : "html",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm exec astro preview --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
    env: { PUBLIC_SITE_URL: `http://localhost:${port}` },
  },
});
