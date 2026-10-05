import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = resolve(packageDirectory, "../..");
const dockerfile = await readFile(resolve(packageDirectory, "Dockerfile"), "utf8");
const dockerignore = await readFile(
  resolve(packageDirectory, "Dockerfile.dockerignore"),
  "utf8",
);
const cloudBuildConfig = await readFile(
  resolve(repositoryDirectory, "docs/infra/cloud-build/worker-staging.yaml"),
  "utf8",
);
const packageManifest = JSON.parse(
  await readFile(resolve(packageDirectory, "package.json"), "utf8"),
);
const buildScript = await readFile(
  resolve(packageDirectory, "scripts/build.mjs"),
  "utf8",
);
const runtimePdf = await readFile(
  resolve(packageDirectory, "src/pdf.ts"),
  "utf8",
);
const workerReadme = await readFile(
  resolve(packageDirectory, "README.md"),
  "utf8",
);

test("worker image pins its Node 22.22.0 Linux/amd64 base and runtime command", () => {
  assert.match(
    dockerfile,
    /^FROM --platform=linux\/amd64 node@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3$/m,
  );
  assert.match(dockerfile, /PORT=8080/);
  assert.match(
    dockerfile,
    /CMD \["node", "--conditions=react-server", "dist\/run-worker\.mjs"\]/,
  );
  assert.match(dockerfile, /USER node/);
});

test("image installs frozen production dependencies without downloading browsers", () => {
  assert.match(
    dockerfile,
    /pnpm install --prod --frozen-lockfile --ignore-scripts/,
  );
  assert.match(dockerfile, /PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1/);
  assert.match(dockerfile, /playwright install-deps chromium/);
  assert.doesNotMatch(dockerfile, /playwright install(?:\s|$)/m);
  assert.match(dockerfile, /COPY services\/survey-report-worker\/dist\/ \.\/dist\//);
  for (const sharedPackage of [
    "survey-reporting-core",
    "tb113-private-report-storage",
    "tb113-runtime-contracts",
  ]) {
    assert.match(dockerfile, new RegExp(`COPY packages/${sharedPackage}/`));
  }
});

test("Docker context allows only worker runtime inputs and shared packages", () => {
  assert.ok(dockerignore.startsWith("**\n"));
  for (const secretOrAmbientInput of [
    "**/.env",
    "**/.env.*",
    "**/.npmrc",
    "**/.ssh/**",
    "**/.secrets/**",
    "**/*.pem",
    "**/*.key",
    "**/*.p12",
    "**/*.pfx",
    "**/*service-account*.json",
    "**/*credentials*.json",
    "**/node_modules",
    "**/.git",
  ]) {
    assert.ok(dockerignore.split("\n").includes(secretOrAmbientInput));
  }
  assert.match(dockerignore, /!services\/survey-report-worker\/dist\/\*\*/);
  for (const sharedPackage of [
    "survey-reporting-core",
    "tb113-private-report-storage",
    "tb113-runtime-contracts",
  ]) {
    assert.ok(dockerignore.includes(`!packages/${sharedPackage}/package.json`));
  }
  assert.ok(dockerignore.includes("!packages/tb113-runtime-contracts/config/report-generation.json"));
  assert.ok(!dockerignore.includes("!packages/survey-reporting-core/src/reporting-core.test.ts"));
  assert.ok(!dockerignore.includes("!packages/survey-reporting-core/src/*.test.ts"));
  assert.ok(!dockerignore.includes("!services/survey-report-worker/test/"));
  assert.ok(!dockerignore.includes("!services/survey-report-worker/README.md"));
});

test("Cloud Build prepares and verifies Chromium/font assets before building the image", () => {
  const nodeBuilder =
    "node@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3";
  const dockerBuilder =
    "gcr.io/cloud-builders/docker@sha256:3d00b6c1a9b862621c30fc74d4f2abfc62bcbdee631ed3febd31e7edbdf6252c";
  const gcloudBuilder =
    "gcr.io/google.com/cloudsdktool/google-cloud-cli@sha256:cf49fc2128c4b140379aeb7532be42fefb5616e59952a99d4b548ca472752a74";
  assert.ok(cloudBuildConfig.includes(nodeBuilder));
  assert.ok(cloudBuildConfig.includes(dockerBuilder));
  assert.ok(cloudBuildConfig.includes(gcloudBuilder));
  assert.ok(cloudBuildConfig.includes('node --version)" = "v22.22.0'));
  assert.ok(cloudBuildConfig.includes('pnpm --version)" = "10.33.0'));
  assert.ok(cloudBuildConfig.includes("pnpm install --frozen-lockfile"));
  assert.ok(cloudBuildConfig.includes("pnpm exec playwright install --with-deps chromium"));
  assert.ok(cloudBuildConfig.includes("fonts-dejavu-core"));
  assert.ok(cloudBuildConfig.includes("pnpm run build"));
  assert.ok(cloudBuildConfig.indexOf("pnpm run build") < cloudBuildConfig.indexOf("id: Build worker image"));
  assert.ok(cloudBuildConfig.indexOf("id: Build worker image") < cloudBuildConfig.indexOf("id: Push worker image"));
  assert.ok(cloudBuildConfig.indexOf("id: Push worker image") < cloudBuildConfig.indexOf("id: Deploy private staging worker"));
  assert.ok(cloudBuildConfig.includes("${_AR_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_AR_REPOSITORY}/survey-report-worker:$COMMIT_SHA"));
  assert.ok(cloudBuildConfig.includes("CLOUD_BUILD_PROJECT_NUMBER=$PROJECT_NUMBER"));
  const projectNumberGuard = cloudBuildConfig.indexOf(
    'test "$$CLOUD_BUILD_PROJECT_NUMBER" = "384535443802"',
  );
  assert.notEqual(projectNumberGuard, -1);
  assert.ok(projectNumberGuard < cloudBuildConfig.indexOf("worker_host_label="));
  assert.ok(projectNumberGuard < cloudBuildConfig.indexOf("pnpm install --frozen-lockfile"));
  assert.ok(projectNumberGuard < cloudBuildConfig.indexOf("id: Build worker image"));
  assert.ok(cloudBuildConfig.includes('worker_host_label="$$WORKER_SERVICE_NAME-$$CLOUD_BUILD_PROJECT_NUMBER"'));
  assert.ok(cloudBuildConfig.includes('worker_origin="https://$$worker_host_label.$$WORKER_REGION.run.app"'));
  assert.ok(cloudBuildConfig.includes('[[ "$$SOURCE_COMMIT_SHA" =~ ^[a-f0-9]{40}$$ ]]'));
  assert.ok(cloudBuildConfig.includes("Task invoker and worker runtime service accounts must be distinct."));
  assert.ok(cloudBuildConfig.indexOf("unset AR_LOCATION") < cloudBuildConfig.indexOf("pnpm install --frozen-lockfile"));
  assert.ok(cloudBuildConfig.includes("_WORKER_SERVICE_NAME: feedback-worker-staging"));
  assert.ok(cloudBuildConfig.includes("_WORKER_REGION: southamerica-east1"));
  for (const [name, value] of [
    ["_AR_LOCATION", "southamerica-east1"],
    ["_AR_REPOSITORY", "feedback-worker-staging"],
    ["_STRAPI_BASE_URL", "https://cms-staging-teleferico-ra2cbgog2a-rj.a.run.app"],
    ["_CMS_ALLOWED_ORIGIN", "https://cms-staging-teleferico-ra2cbgog2a-rj.a.run.app"],
    ["_TASK_INVOKER_SERVICE_ACCOUNT", "feedback-task-invoker-staging@teleferico-bariloche-2024.iam.gserviceaccount.com"],
    ["_WORKER_RUNTIME_SERVICE_ACCOUNT", "feedback-worker-staging@teleferico-bariloche-2024.iam.gserviceaccount.com"],
    ["_PRIVATE_BUCKET", "feedback-reports-staging-384535443802"],
  ]) {
    assert.ok(cloudBuildConfig.includes(`  ${name}: ${value}\n`));
  }
  assert.doesNotMatch(
    cloudBuildConfig,
    /(?:_WORKER_CMS_TOKEN_SECRET_VERSION|_EVIDENCE_KEY_RESOURCE|^\s*_FEEDBACK_WORKER_(?:CMS_TOKEN_SECRET_VERSION|EVIDENCE_KEY):|\$\{_FEEDBACK_WORKER_(?:CMS_TOKEN_SECRET_VERSION|EVIDENCE_KEY)\}|\$\$FEEDBACK_WORKER_(?:CMS_TOKEN_SECRET_VERSION|EVIDENCE_KEY)\b|^\s*- FEEDBACK_WORKER_CMS_TOKEN_SECRET_VERSION=|^\s*- FEEDBACK_WORKER_EVIDENCE_KEY=)/m,
  );
  assert.ok(cloudBuildConfig.includes("WORKER__STAGING__FEEDBACK_WORKER_CMS_TOKEN:latest"));
  assert.doesNotMatch(
    cloudBuildConfig,
    /WORKER__STAGING__FEEDBACK_WORKER_CMS_TOKEN:(?:REQUIRED_OPERATOR_VALUE|[1-9][0-9]*)/,
  );
  assert.ok(cloudBuildConfig.includes("projects/teleferico-bariloche-2024/secrets/WORKER__STAGING__FEEDBACK_WORKER_EVIDENCE_KEY/versions/1"));
  for (const deployFlag of [
    "--no-allow-unauthenticated",
    "--ingress=internal",
    "--service-account=",
    "--cpu=1",
    "--memory=2Gi",
    "--concurrency=1",
    "--min-instances=0",
    "--max-instances=1",
    "--cpu-throttling",
    "--timeout=1800s",
  ]) {
    assert.ok(cloudBuildConfig.includes(deployFlag));
  }
  assert.ok(cloudBuildConfig.includes("--set-secrets=\"FEEDBACK_WORKER_CMS_TOKEN=WORKER__STAGING__FEEDBACK_WORKER_CMS_TOKEN:latest\""));
  assert.ok(cloudBuildConfig.includes("FEEDBACK_WORKER_EVIDENCE_KEY=projects/teleferico-bariloche-2024/secrets/WORKER__STAGING__FEEDBACK_WORKER_EVIDENCE_KEY/versions/1"));
  assert.doesNotMatch(
    cloudBuildConfig,
    /\[\[ "WORKER__STAGING__FEEDBACK_WORKER_CMS_TOKEN:/,
  );
  assert.ok(cloudBuildConfig.includes('[[ "projects/teleferico-bariloche-2024/secrets/WORKER__STAGING__FEEDBACK_WORKER_EVIDENCE_KEY/versions/1" =~'));
  assert.doesNotMatch(cloudBuildConfig, /secretEnv:|availableSecrets:/);
  assert.ok(cloudBuildConfig.includes("FEEDBACK_TASK_INVOKER_EMAIL=$$TASK_INVOKER_SERVICE_ACCOUNT"));
  assert.ok(cloudBuildConfig.includes("FEEDBACK_WORKER_OIDC_PRINCIPAL=$$TASK_INVOKER_SERVICE_ACCOUNT"));
  assert.ok(cloudBuildConfig.includes("FEEDBACK_WORKER_URL=$$worker_url"));
  assert.ok(cloudBuildConfig.includes("FEEDBACK_WORKER_OIDC_AUDIENCE=$$worker_origin"));
  assert.ok(cloudBuildConfig.includes("FEEDBACK_VERTEX_PROJECT_ID=$$CLOUD_BUILD_PROJECT_ID"));
  assert.doesNotMatch(cloudBuildConfig, /secretEnv:|availableSecrets:|FEEDBACK_TASK_QUEUE_PATH/);
  assert.match(buildScript, /2d18db9d8608b052b6a552ee00ec1e830f93692e928b65ecc67d693bd33fe801/);
  assert.match(buildScript, /670ba079b75107746ba41abad131180a31a7c7219aa1bd4061fb471f4535d541/);
  assert.match(buildScript, /abdc775b21b1bc470d50c97e790d276f2054b7504e56e5bd3e64f48d68582322/);
  assert.equal(packageManifest.engines.node, "22.22.0");
  assert.equal(packageManifest.packageManager, "pnpm@10.33.0");
  assert.equal(packageManifest.dependencies["@playwright/test"], "1.61.0");
});

test("worker font package version and digest pins stay aligned", () => {
  const fontPackageVersion = "2.37-6";
  const fontDigest =
    "abdc775b21b1bc470d50c97e790d276f2054b7504e56e5bd3e64f48d68582322";

  assert.ok(
    cloudBuildConfig.includes(
      `apt-get install --yes --no-install-recommends fonts-dejavu-core=${fontPackageVersion}`,
    ),
  );
  for (const [sourceName, source] of [
    ["build script", buildScript],
    ["runtime renderer", runtimePdf],
    ["worker README", workerReadme],
  ]) {
    assert.ok(
      source.includes(fontDigest),
      `${sourceName} has the pinned font digest`,
    );
  }
});
