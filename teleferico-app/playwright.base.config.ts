import { devices, type PlaywrightTestConfig } from "@playwright/test";

const appHost = "localhost";
const fixtureHost = "127.0.0.1";

type LocalSuiteOptions = {
  mode: "default" | "maintenance";
  appPort: number;
  fixturePort: number;
  testMatch?: string | RegExp;
  testIgnore?: string | RegExp | (string | RegExp)[];
};

function createTestEnvironment(
  fixturePort: number,
  appPort: number,
  maintenance: boolean,
) {
  const baseURL = `http://${appHost}:${appPort}`;

  return {
    APP_INTERNAL_BASE_URL: baseURL,
    AUTH_SECRET: "e2e-auth-secret-not-for-production-use",
    AUTH_TRUST_HOST: "true",
    BUILD_STRAPI_BASE_URL: `http://${fixtureHost}:${fixturePort}`,
    BUILD_STRAPI_BUCKET_HOSTNAME: fixtureHost,
    BUILD_STRAPI_BUCKET_PATHNAME: "/uploads/**",
    BUILD_STRAPI_CONTENT_TOKEN: "e2e-content-token",
    MAINTENANCE_MODE: maintenance ? "true" : "false",
    NEXT_PUBLIC_SITE_URL: baseURL,
  };
}

export function createLocalE2EConfig({
  mode,
  appPort,
  fixturePort,
  testMatch,
  testIgnore,
}: LocalSuiteOptions): PlaywrightTestConfig {
  const baseURL = `http://${appHost}:${appPort}`;
  const fixtureURL = `http://${fixtureHost}:${fixturePort}/health`;
  const testEnvironment = createTestEnvironment(
    fixturePort,
    appPort,
    mode === "maintenance",
  );

  return {
    testDir: "./tests/e2e",
    testMatch,
    testIgnore,
    outputDir: `test-results/${mode}`,
    timeout: 120_000,
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI
      ? [
          ["github"],
          [
            "html",
            { open: "never", outputFolder: `playwright-report/${mode}` },
          ],
        ]
      : [
          ["list"],
          [
            "html",
            { open: "never", outputFolder: `playwright-report/${mode}` },
          ],
        ],
    use: {
      baseURL,
      navigationTimeout: 90_000,
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
    webServer: [
      {
        command: "node tests/e2e/server/strapi-fixture.mjs",
        url: fixtureURL,
        reuseExistingServer: !process.env.CI,
        env: { E2E_FIXTURE_PORT: String(fixturePort) },
      },
      {
        command: `pnpm exec next dev --hostname ${appHost} --port ${appPort}`,
        url: `${baseURL}/api/auth/providers`,
        reuseExistingServer: !process.env.CI,
        env: testEnvironment,
      },
    ],
  };
}
