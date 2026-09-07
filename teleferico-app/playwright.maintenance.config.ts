import { defineConfig } from "@playwright/test";
import { createLocalE2EConfig } from "./playwright.base.config";

export default defineConfig(
  createLocalE2EConfig({
    mode: "maintenance",
    appPort: 3101,
    fixturePort: 4101,
    testMatch: "**/maintenance.spec.ts",
  }),
);
