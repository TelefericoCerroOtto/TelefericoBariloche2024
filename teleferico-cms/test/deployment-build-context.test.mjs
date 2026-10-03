import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../../", import.meta.url);

async function readRepositoryFile(relativePath) {
  return readFile(new URL(relativePath, repositoryRoot), "utf8");
}

test("CMS image uses the monorepo root context and packages only its shared profile", async () => {
  const dockerfile = await readRepositoryFile("teleferico-cms/Dockerfile");
  const ignore = await readRepositoryFile("teleferico-cms/Dockerfile.dockerignore");

  assert.match(dockerfile, /WORKDIR \/workspace\/teleferico-cms/);
  assert.match(dockerfile, /COPY teleferico-cms\/package\.json teleferico-cms\/package-lock\.json \.\//);
  assert.match(dockerfile, /RUN npm ci/);
  assert.match(dockerfile, /COPY teleferico-cms\/ \.\//);
  assert.match(dockerfile, /COPY packages\/tb113-runtime-contracts \/workspace\/packages\/tb113-runtime-contracts/);

  const rules = ignore.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  assert.ok(rules.includes("**"), "all repository paths must be excluded by default");
  assert.ok(rules.includes("!teleferico-cms/**"));
  assert.ok(rules.includes("!packages/tb113-runtime-contracts/**"));
  for (const pattern of ["**/.env", "**/.env.*", "**/.npmrc", "**/.git/**", "**/node_modules/**", "**/*.pem", "**/*.key"]) {
    assert.ok(rules.includes(pattern), `credential or generated path must be excluded: ${pattern}`);
  }
});

test("CMS trigger snapshots remain documentary and identify the legacy package-only context", async () => {
  const [staging, production, documentation] = await Promise.all([
    readRepositoryFile("docs/infra/cloud-build/cms-staging.yaml"),
    readRepositoryFile("docs/infra/cloud-build/cms-production.yaml"),
    readRepositoryFile("docs/infra/cloud-build/README.md"),
  ]);

  assert.match(staging, /- teleferico-cms\s*\n\s*id: Build/);
  assert.match(production, /- teleferico-cms\s*\n\s*id: Build/);
  assert.match(documentation, /proposed CMS build context:.*repository root/i);
  assert.match(documentation, /staging and production trigger snapshots.*show their legacy `teleferico-cms`-only context/i);
  assert.match(documentation, /separate operator change/i);
});
