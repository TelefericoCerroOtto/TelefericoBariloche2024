import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readCloudBuildSnapshot(snapshotName: string): string {
  return readFileSync(
    join(process.cwd(), "..", "docs", "infra", "cloud-build", snapshotName),
    "utf8",
  );
}

const environmentSnapshots = [
  {
    name: "staging",
    file: "app-staging.yaml",
    runtimeFlag: "FEEDBACK_CAPABILITY_ENABLED=true",
    secretEnvironment: "APP__STAGING__BUILD_STRAPI_CONTENT_TOKEN",
    usesRuntimeEnvFile: false,
  },
  {
    name: "production",
    file: "app-production.yaml",
    runtimeFlag: 'FEEDBACK_CAPABILITY_ENABLED: "false"',
    secretEnvironment: "APP__PRODUCTION__BUILD_STRAPI_CONTENT_TOKEN",
    usesRuntimeEnvFile: true,
  },
];

const allowedAppRootFiles = new Set([
  "teleferico-app/package.json",
  "teleferico-app/pnpm-lock.yaml",
  "teleferico-app/pnpm-workspace.yaml",
  "teleferico-app/next.config.mjs",
  "teleferico-app/tsconfig.json",
  "teleferico-app/tailwind.config.ts",
  "teleferico-app/postcss.config.mjs",
  "teleferico-app/.eslintrc.json",
]);

function isAllowedContextPath(path: string): boolean {
  if (
    allowedAppRootFiles.has(path) ||
    path.startsWith("teleferico-app/src/") ||
    path.startsWith("teleferico-app/public/")
  ) {
    return true;
  }

  const packageRoots = [
    "packages/survey-reporting-core",
    "packages/tb113-runtime-contracts",
    "packages/tb113-private-report-storage",
  ];
  return packageRoots.some(
    (root) =>
      path === `${root}/package.json` ||
      path.startsWith(`${root}/src/`) ||
      (root === "packages/tb113-runtime-contracts" &&
        path === `${root}/config/report-generation.json`),
  );
}

function isSensitiveContextPath(path: string): boolean {
  return path.split("/").some((segment) => {
    const normalized = segment.toLowerCase();
    return (
      normalized.startsWith(".env") ||
      [".npmrc", ".netrc", ".ssh", ".aws", ".kube", ".docker", ".git"].includes(
        normalized,
      ) ||
      normalized === "secrets" ||
      /credential|service[-_]?account|private[-_]key|^id_(?:rsa|ed25519)/.test(
        normalized,
      ) ||
      /\.(?:pem|key|p12|pfx)$/i.test(normalized)
    );
  });
}

function isTestOnlyContextPath(path: string): boolean {
  return (
    path.startsWith("teleferico-app/tests/") ||
    (path.startsWith("teleferico-app/src/") &&
      /\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path))
  );
}

function shouldIncludeContextPath(path: string): boolean {
  return (
    isAllowedContextPath(path) &&
    !isSensitiveContextPath(path) &&
    !isTestOnlyContextPath(path)
  );
}

describe("pnpm build policy", () => {
  it("declares the HeroUI theme scanned by Tailwind as a direct dependency", () => {
    const packageManifest = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    );
    const lockfile = readFileSync(
      join(process.cwd(), "pnpm-lock.yaml"),
      "utf8",
    );
    const tailwindConfig = readFileSync(
      join(process.cwd(), "tailwind.config.ts"),
      "utf8",
    );

    expect(packageManifest.dependencies["@heroui/theme"]).toBe("2.4.26");
    expect(lockfile).toMatch(
      /'@heroui\/theme':\s*\n\s+specifier: 2\.4\.26\n\s+version: 2\.4\.26\(tailwindcss@3\.4\.19\)/,
    );
    expect(tailwindConfig).toContain(
      '"./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"',
    );
  });

  it("keeps strictDepBuilds enabled", () => {
    const workspaceYaml = readFileSync(
      join(process.cwd(), "pnpm-workspace.yaml"),
      "utf8",
    );

    expect(workspaceYaml).toContain("strictDepBuilds: true");
  });

  it("approves required transitive build scripts", () => {
    const workspaceYaml = readFileSync(
      join(process.cwd(), "pnpm-workspace.yaml"),
      "utf8",
    );

    expect(workspaceYaml).toContain("'@heroui/shared-utils': true");
    expect(workspaceYaml).toContain("unrs-resolver: true");
  });

  it.each(environmentSnapshots)(
    "builds the $name app snapshot from the constrained repository-root Docker context",
    ({ file, runtimeFlag, secretEnvironment, usesRuntimeEnvFile }) => {
      const snapshotYaml = readCloudBuildSnapshot(file);

      expect(snapshotYaml).toContain(
        "gcr.io/cloud-builders/docker@sha256:3d00b6c1a9b862621c30fc74d4f2abfc62bcbdee631ed3febd31e7edbdf6252c",
      );
      expect(snapshotYaml).toContain("--file teleferico-app/Dockerfile");
      expect(snapshotYaml).toContain("DOCKER_BUILDKIT=1 docker build");
      expect(snapshotYaml).toContain(
        'image="$_AR_HOSTNAME/$PROJECT_ID/cloud-run-source-deploy/$REPO_NAME/$_SERVICE_NAME:$COMMIT_SHA"',
      );
      expect(snapshotYaml).toContain(
        `--secret="id=BUILD_STRAPI_CONTENT_TOKEN,env=${secretEnvironment}"`,
      );
      expect(snapshotYaml).toContain('--tag "$image"');
      expect(snapshotYaml).toContain('docker push "$image"');
      expect(snapshotYaml).toContain(
        '--build-arg="BUILD_STRAPI_BASE_URL=${_BUILD_STRAPI_BASE_URL}"',
      );
      expect(snapshotYaml).toContain(
        '--build-arg="NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${_BUILD_NEXT_PUBLIC_RECAPTCHA_SITE_KEY}"',
      );
      expect(snapshotYaml).toContain(runtimeFlag);
      expect(snapshotYaml).toContain("id: GitHub deployment start");
      expect(snapshotYaml).toContain("id: GitHub deployment finish");
      expect(snapshotYaml).toContain("id: Deploy");
      expect(snapshotYaml).toContain("--set-secrets");
      if (usesRuntimeEnvFile) {
        expect(snapshotYaml).toContain("/tmp/runtime-env.yaml");
      } else {
        expect(snapshotYaml).toContain("--set-env-vars");
      }
      expect(snapshotYaml).not.toContain("pack build");
      expect(snapshotYaml).not.toContain(
        '--build-arg="BUILD_STRAPI_CONTENT_TOKEN=',
      );
    },
  );

  it("builds with the app and exactly the three required shared packages", () => {
    const appDockerfile = readFileSync(
      join(process.cwd(), "Dockerfile"),
      "utf8",
    );
    const appDockerfileIgnore = readFileSync(
      join(process.cwd(), "Dockerfile.dockerignore"),
      "utf8",
    );

    expect(appDockerfileIgnore).toContain("*");
    expect(appDockerfileIgnore).toContain("!teleferico-app/");
    expect(appDockerfileIgnore).toContain("!packages/survey-reporting-core/");
    expect(appDockerfileIgnore).toContain("!packages/tb113-runtime-contracts/");
    expect(appDockerfileIgnore).toContain(
      "!packages/tb113-private-report-storage/",
    );
    expect(appDockerfileIgnore).not.toContain("!teleferico-cms/");
    expect(appDockerfileIgnore).not.toContain("!services/");
    expect(appDockerfileIgnore).not.toContain("!teleferico-app/**");
    expect(appDockerfileIgnore).toContain("!teleferico-app/src/**");
    expect(appDockerfileIgnore).toContain("!teleferico-app/public/**");
    expect(appDockerfileIgnore).toContain("!teleferico-app/package.json");
    expect(appDockerfileIgnore).toContain("!teleferico-app/pnpm-lock.yaml");
    expect(appDockerfileIgnore).toContain("!teleferico-app/next.config.mjs");
    expect(appDockerfileIgnore).toContain("teleferico-app/tests/**");
    for (const testExtension of [
      "test.ts",
      "test.tsx",
      "spec.ts",
      "spec.tsx",
      "test.js",
      "test.jsx",
      "test.mjs",
      "test.cjs",
      "spec.js",
      "spec.jsx",
      "spec.mjs",
      "spec.cjs",
    ]) {
      expect(appDockerfileIgnore).toContain(
        `teleferico-app/src/**/*.${testExtension}`,
      );
    }
    expect(appDockerfileIgnore).toContain(
      "!packages/survey-reporting-core/src/**",
    );
    expect(appDockerfileIgnore).toContain(
      "!packages/tb113-runtime-contracts/src/**",
    );
    expect(appDockerfileIgnore).toContain(
      "!packages/tb113-runtime-contracts/config/report-generation.json",
    );
    expect(appDockerfileIgnore).toContain(
      "!packages/tb113-private-report-storage/src/**",
    );
    expect(appDockerfileIgnore).not.toContain(
      "!packages/survey-reporting-core/**",
    );
    expect(appDockerfileIgnore).toContain("**/.env*");
    expect(appDockerfileIgnore).toContain("**/.npmrc");
    expect(appDockerfileIgnore).toContain("**/.netrc");
    expect(appDockerfileIgnore).toContain("**/.ssh/**");
    expect(appDockerfileIgnore).toContain("**/.aws/**");
    expect(appDockerfileIgnore).toContain("**/.config/gcloud/**");
    expect(appDockerfileIgnore).toContain("**/secrets/**");
    expect(appDockerfileIgnore).toContain("**/*.pem");
    expect(appDockerfileIgnore).toContain("**/*credential*");
    expect(appDockerfileIgnore).toContain("**/*service-account*");
    expect(appDockerfileIgnore).toContain("**/*private-key*");
    expect(appDockerfileIgnore).toContain("**/*id_ed25519*");
    expect(appDockerfileIgnore).not.toContain("!.env");
    expect(appDockerfileIgnore).not.toContain("!.npmrc");
    expect(appDockerfile).toContain(
      "FROM --platform=linux/amd64 node@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3",
    );
    expect(appDockerfile).toContain("pnpm@10.33.0");
    expect(appDockerfile).toContain("pnpm install --frozen-lockfile");
    expect(appDockerfile).toContain("ARG NPM_CONFIG_OPTIONAL=true");
    expect(appDockerfile).toContain("ARG NPM_CONFIG_PREFER_OFFLINE=true");
    expect(appDockerfile).toContain("ARG NPM_CONFIG_CPU=x64");
    expect(appDockerfile).toContain("ARG NPM_CONFIG_OS=linux");
    expect(appDockerfile).toContain("ARG NPM_CONFIG_LIBC=glibc");
    expect(appDockerfile).toContain("COPY teleferico-app/ ./");
    expect(appDockerfile).toContain(
      "COPY packages/survey-reporting-core /workspace/packages/survey-reporting-core",
    );
    expect(appDockerfile).toContain(
      "COPY packages/tb113-runtime-contracts /workspace/packages/tb113-runtime-contracts",
    );
    expect(appDockerfile).toContain(
      "COPY packages/tb113-private-report-storage /workspace/packages/tb113-private-report-storage",
    );
    expect(appDockerfile).toContain(
      "RUN --mount=type=secret,id=BUILD_STRAPI_CONTENT_TOKEN,required=true",
    );
    expect(appDockerfile).toContain(
      'export BUILD_STRAPI_CONTENT_TOKEN="$(cat /run/secrets/BUILD_STRAPI_CONTENT_TOKEN)"',
    );
    expect(appDockerfile).not.toMatch(/^ARG .*BUILD_STRAPI_CONTENT_TOKEN/m);
    expect(appDockerfile).not.toMatch(/^ENV .*BUILD_STRAPI_CONTENT_TOKEN/m);
    expect(appDockerfile).toContain("EXPOSE 8080");
    expect(appDockerfile).toContain('CMD ["pnpm", "start"]');
    expect(appDockerfile).toContain(
      "ARG NODE_OPTIONS=--max-old-space-size=3072",
    );
    expect(appDockerfile).not.toMatch(/^ENV NODE_OPTIONS/m);
  });

  it("limits the context to approved filenames without reading file contents", () => {
    const repositoryRoot = join(process.cwd(), "..");
    const pathspecs = [
      "--",
      "teleferico-app",
      "packages/survey-reporting-core",
      "packages/tb113-runtime-contracts",
      "packages/tb113-private-report-storage",
    ];
    const trackedPaths = execFileSync(
      "git",
      ["ls-files", "--cached", "-z", ...pathspecs],
      { cwd: repositoryRoot },
    );
    const untrackedAndIgnoredPaths = execFileSync(
      "git",
      [
        "ls-files",
        "--others",
        "--ignored",
        "--exclude-standard",
        "--directory",
        "-z",
        ...pathspecs,
      ],
      { cwd: repositoryRoot },
    );
    const candidateFiles = Buffer.concat([
      trackedPaths,
      untrackedAndIgnoredPaths,
    ])
      .toString("utf8")
      .split("\0")
      .filter((path) => path && !path.endsWith("/"));

    expect(candidateFiles).toContain(
      "teleferico-app/src/lib/__tests__/pnpm-build-policy.test.ts",
    );
    expect(candidateFiles).toContain("teleferico-app/src/auth.test.ts");
    expect(candidateFiles).toContain(
      "teleferico-app/tests/tb113/renderer-poc.ts",
    );
    expect(candidateFiles).toContain(
      "packages/tb113-runtime-contracts/config/report-generation.json",
    );
    const selectedFileNames = candidateFiles.filter(shouldIncludeContextPath);
    expect(selectedFileNames.length).toBeGreaterThan(0);
    expect(selectedFileNames.every(shouldIncludeContextPath)).toBe(true);
    expect(selectedFileNames).not.toContain(
      "teleferico-app/src/lib/__tests__/pnpm-build-policy.test.ts",
    );
    expect(selectedFileNames).not.toContain("teleferico-app/src/auth.test.ts");
    expect(selectedFileNames).not.toContain(
      "teleferico-app/tests/tb113/renderer-poc.ts",
    );

    const sensitiveExamples = [
      "teleferico-app/src/.env.production",
      "teleferico-app/src/private/client.pem",
      "teleferico-app/.npmrc",
      "packages/tb113-runtime-contracts/src/service-account.json",
      "packages/tb113-runtime-contracts/src/.aws/credentials",
    ];
    for (const path of sensitiveExamples) {
      expect(shouldIncludeContextPath(path)).toBe(false);
    }
  });
});
