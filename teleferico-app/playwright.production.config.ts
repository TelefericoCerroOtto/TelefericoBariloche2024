import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PUBLIC_E2E_BASE_URL;

if (!baseURL) {
  throw new Error(
    "PUBLIC_E2E_BASE_URL is required for production-safe E2E smoke checks.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/production/**/*.spec.ts",
  outputDir: "test-results/production",
  forbidOnly: true,
  reporter: [
    ["github"],
    ["html", { open: "never", outputFolder: "playwright-report/production" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
