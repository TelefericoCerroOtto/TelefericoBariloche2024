import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readCloudBuildSnapshot(snapshotName: string): string {
  return readFileSync(
    join(process.cwd(), "..", "docs", "infra", "cloud-build", snapshotName),
    "utf8",
  );
}

const expectedPnpmBuildpackEnvFlags = [
  '--env="NPM_CONFIG_OPTIONAL=true"',
  '--env="NPM_CONFIG_PREFER_OFFLINE=true"',
  '--env="NPM_CONFIG_CPU=x64"',
  '--env="NPM_CONFIG_OS=linux"',
  '--env="NPM_CONFIG_LIBC=glibc"',
];

function expectSnapshotToContainPnpmHardening(snapshotYaml: string): void {
  for (const envFlag of expectedPnpmBuildpackEnvFlags) {
    expect(snapshotYaml).toContain(envFlag);
  }
}

describe("pnpm build policy", () => {
  it("keeps strictDepBuilds enabled", () => {
    const workspaceYaml = readFileSync(join(process.cwd(), "pnpm-workspace.yaml"), "utf8");

    expect(workspaceYaml).toContain("strictDepBuilds: true");
  });

  it("approves required transitive build scripts", () => {
    const workspaceYaml = readFileSync(join(process.cwd(), "pnpm-workspace.yaml"), "utf8");

    expect(workspaceYaml).toContain("'@heroui/shared-utils': true");
    expect(workspaceYaml).toContain("unrs-resolver: true");
  });

  it("keeps staging buildpack snapshot pinned to predictable pnpm install settings", () => {
    const snapshotYaml = readCloudBuildSnapshot("app-staging.yaml");

    expectSnapshotToContainPnpmHardening(snapshotYaml);
  });

  it("keeps production buildpack snapshot pinned to predictable pnpm install settings", () => {
    const snapshotYaml = readCloudBuildSnapshot("app-production.yaml");

    expectSnapshotToContainPnpmHardening(snapshotYaml);
  });
});
