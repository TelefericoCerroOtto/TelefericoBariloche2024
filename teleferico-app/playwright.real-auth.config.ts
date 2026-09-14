import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_REAL_AUTH_BASE_URL;
if (baseURL !== "http://127.0.0.1:3200") {
  throw new Error(
    "PLAYWRIGHT_REAL_AUTH_BASE_URL must identify the harness-owned local Next.js server.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e-real-auth",
  testMatch: "**/real-auth.spec.ts",
  outputDir: "/tmp/playwright-real-auth-results",
  preserveOutput: "never",
  timeout: 180_000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["line"]],
  use: {
    baseURL,
    navigationTimeout: 90_000,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
