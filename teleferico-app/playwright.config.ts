import { defineConfig } from "@playwright/test";
import { createLocalE2EConfig } from "./playwright.base.config";

export default defineConfig(
  createLocalE2EConfig({
    mode: "default",
    appPort: 3100,
    fixturePort: 4100,
    testIgnore: ["**/maintenance.spec.ts", "**/production/**"],
  }),
);
