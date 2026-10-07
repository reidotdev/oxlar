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
    // The specs assert the demo content in src/lib/sanity/fixtures.ts. An
    // empty SANITY_PROJECT_ID wins over the one `pnpm scaffold` writes to .env
    // (process.loadEnvFile never overrides a variable that is set, even to ""),
    // so a fresh, empty Sanity project cannot fail the suite.
    env: { PUBLIC_SITE_URL: `http://localhost:${port}`, SANITY_PROJECT_ID: "" },
  },
});
