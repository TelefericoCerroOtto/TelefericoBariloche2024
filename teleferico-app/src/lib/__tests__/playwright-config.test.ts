import { describe, expect, it } from "vitest";
import { createLocalE2EConfig } from "../../../playwright.base.config";

describe("local Playwright web server readiness", () => {
  it.each([
    ["default", 3100, 4100],
    ["maintenance", 3101, 4101],
  ] as const)("keeps named, bounded startup probes for %s mode", (mode, appPort, fixturePort) => {
    const config = createLocalE2EConfig({ mode, appPort, fixturePort });
    const servers = Array.isArray(config.webServer)
      ? config.webServer
      : config.webServer
        ? [config.webServer]
        : [];
    const [fixture, app] = servers;

    expect(fixture).toMatchObject({
      name: "Strapi E2E fixture readiness",
      timeout: 60_000,
      url: `http://127.0.0.1:${fixturePort}/health`,
    });
    expect(app).toMatchObject({
      name: "Next.js E2E login readiness",
      timeout: 180_000,
      url: `http://localhost:${appPort}/es-AR/login`,
    });
  });
});
