import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Playwright runs outside Next's environment loader. Keep test credentials and
// the app server on the same configured values.
config({ path: ".env" });

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  // The suite mutates shared fixtures in one database, so parallel workers can
  // race each other and exhaust a hosted connection pool. Opt in explicitly
  // when the test environment provides isolated data per worker.
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? 1),
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : [["list"]],
  expect: { timeout: 10_000 },
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "public",
      testMatch: /(public|access-control)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "student",
      testMatch: /(student)\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/student.json",
      },
    },
    {
      name: "admin",
      testMatch: /(admin|chrome|journey)\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/admin.json",
      },
    },
    {
      name: "agency",
      testMatch: /agency-flows\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/agency.json",
      },
    },
  ],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
