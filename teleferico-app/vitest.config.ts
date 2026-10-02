import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./vitest.server-only.ts", import.meta.url),
      ),
      "@google-cloud/storage": fileURLToPath(
        new URL("./node_modules/@google-cloud/storage", import.meta.url),
      ),
      "@teleferico/survey-reporting-core": fileURLToPath(
        new URL(
          "../packages/survey-reporting-core/src/index.ts",
          import.meta.url,
        ),
      ),
      "@teleferico/tb113-private-report-storage": fileURLToPath(
        new URL(
          "../packages/tb113-private-report-storage/src/index.ts",
          import.meta.url,
        ),
      ),
      "@teleferico/tb113-runtime-contracts": fileURLToPath(
        new URL(
          "../packages/tb113-runtime-contracts/src/index.ts",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});
