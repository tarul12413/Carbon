import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  /* Timing runs on a quiet machine, one test at a time: npm run measure:inp (playwright.measure.config.ts). */
  testIgnore: "**/inp.spec.ts",
  outputDir: "tests/e2e/.results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    /* The service worker caches pages; only the offline test turns it on (tests/e2e/site.spec.ts). */
    serviceWorkers: "block",
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  projects: [
    {
      name: "phone-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true },
    },
    {
      name: "tablet-744",
      use: { ...devices["Desktop Chrome"], viewport: { width: 744, height: 1133 }, isMobile: true, hasTouch: true },
    },
    { name: "laptop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
