import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const outputDir = resolve(tmpdir(), `tb113-local-feedback-playwright-${process.pid}`);
process.env.FEEDBACK_LOCAL_OUTPUT_DIR = outputDir;

export default defineConfig({
  testDir: "./tests/local-feedback",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/local-feedback/global-setup.mjs",
  outputDir,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["line"]],
  use: {
    baseURL: "http://localhost:3200",
    navigationTimeout: 90_000,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium-local-feedback",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
