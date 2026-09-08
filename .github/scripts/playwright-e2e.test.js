const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const playwrightWorkflowPath = path.join(__dirname, "..", "workflows", "playwright-e2e.yml");
const cloudBuildExecutorPath = path.join(__dirname, "..", "..", "cloudbuild.playwright-e2e.json");
const cloudBuildNodeImage = "node@sha256:4d676821dff059fd00d277ee4261ef34ea712317fed0737c03941481b5760c96";
const cloudBuildOldNodeImage = "node@sha256:1471ea646673136b8308550ac14b36d847ffb21c24bc31828279e443c924e488";
const cloudBuildGitImage = "alpine/git@sha256:1e9d9a40acbd02aeb3cb005ff43f9e51ac09ba0c241bb2298f811d3f426a2ffd";
const cloudBuildDockerImage = "gcr.io/cloud-builders/docker@sha256:3d00b6c1a9b862621c30fc74d4f2abfc62bcbdee631ed3febd31e7edbdf6252c";
const readinessScriptPath = path.join(__dirname, "..", "..", "scripts", "run-playwright-real-stack-readiness.sh");

test("validates main containment before checking out or executing deployment-selected code", () => {
  const workflow = fs.readFileSync(playwrightWorkflowPath, "utf8");
  const trustedCheckout = workflow.indexOf("name: Check out trusted production branch");
  const validateProvenance = workflow.indexOf("name: Validate production deployment commit provenance");
  const candidateCheckout = workflow.indexOf("ref: ${{ github.event.deployment.sha }}");
  const installDependencies = workflow.indexOf("name: Install locked dependencies", candidateCheckout);

  assert.ok(trustedCheckout >= 0);
  assert.ok(validateProvenance > trustedCheckout);
  assert.match(workflow, /ref: main\n\s+fetch-depth: 0\n\s+persist-credentials: false/);
  assert.match(workflow, /DEPLOYMENT_SHA: \$\{\{ github\.event\.deployment\.sha \}\}/);
  assert.match(workflow, /git fetch --no-tags origin "\$DEPLOYMENT_SHA"/);
  assert.match(workflow, /git merge-base --is-ancestor "\$DEPLOYMENT_SHA" origin\/main/);
  assert.ok(candidateCheckout > validateProvenance);
  assert.ok(installDependencies > candidateCheckout);
});

test("enables pnpm before every Playwright workflow job invokes it", () => {
  const workflow = fs.readFileSync(playwrightWorkflowPath, "utf8");
  const jobs = workflow
    .split(/\n  (?:chromium-smoke|chromium-full|production-public-smoke):\n/)
    .slice(1);

  assert.equal(jobs.length, 3);

  for (const job of jobs) {
    const setupNode = job.indexOf("uses: actions/setup-node@v4");
    const enableCorepack = job.indexOf("name: Enable Corepack");
    const firstPnpmInvocation = job.indexOf("pnpm ");
    const setupNodeBlock = job.slice(setupNode, enableCorepack);

    assert.ok(enableCorepack > setupNode);
    assert.doesNotMatch(setupNodeBlock, /cache:\s*pnpm/);
    assert.ok(firstPnpmInvocation > enableCorepack);
  }
});

test("Cloud Build fixture executor preserves the ordered locked smoke-suite contract", () => {
  const executor = JSON.parse(fs.readFileSync(cloudBuildExecutorPath, "utf8"));
  const [revision, packageManager, dependencies, smoke, readiness] = executor.steps;

  assert.deepEqual(
    executor.steps.map(({ id, name, dir, entrypoint, timeout }) => ({ id, name, dir, entrypoint, timeout })),
    [
      { id: "Verify workspace revision", name: cloudBuildGitImage, dir: undefined, entrypoint: "/bin/sh", timeout: "60s" },
      { id: "Verify repository package manager", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "60s" },
      { id: "Install locked application dependencies", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "420s" },
      { id: "Run fixture-backed Chromium smoke suite", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "480s" },
      { id: "Run real-stack readiness", name: cloudBuildDockerImage, dir: undefined, entrypoint: "bash", timeout: "900s" },
      ],
  );
  assert.equal(executor.timeout, "2100s");
  assert.deepEqual(executor.options, { logging: "CLOUD_LOGGING_ONLY" });
  assert.ok(executor.steps.every((step) => step.name !== cloudBuildOldNodeImage));
  assert.equal(revision.args[0], "-c");
  assert.deepEqual(revision.env, ["EXPECTED_COMMIT_SHA=$COMMIT_SHA"]);
  assert.match(revision.args[1], /test "\$\$EXPECTED_COMMIT_SHA" != "0{40}"/);
  assert.match(revision.args[1], /git --version/);
  assert.match(revision.args[1], /git rev-parse --verify "\$\$EXPECTED_COMMIT_SHA\^\{commit\}"/);
  assert.match(revision.args[1], /actual_sha="\$\$\(git rev-parse HEAD\^\{commit\}\)"/);
  assert.match(revision.args[1], /test "\$\$actual_sha" = "\$\$EXPECTED_COMMIT_SHA"/);
  for (const step of [packageManager, dependencies, smoke]) {
    const command = step.args[1];
    const enableCorepack = command.indexOf("corepack enable");
    const firstPnpmInvocation = command.search(/\bpnpm\b/);

    assert.ok(enableCorepack >= 0, `${step.id} must enable Corepack in its own container.`);
    assert.ok(firstPnpmInvocation > enableCorepack, `${step.id} must enable Corepack before invoking pnpm.`);
  }
  assert.match(packageManager.args[1], /corepack pnpm --version.*10\.33\.0/);
  assert.match(dependencies.args[1], /pnpm install --frozen-lockfile/);
  const chromiumInstall = smoke.args[1].indexOf("pnpm exec playwright install --with-deps chromium");
  const smokeRun = smoke.args[1].indexOf("pnpm run test:e2e:smoke");

  assert.ok(chromiumInstall >= 0, "The smoke container must install Chromium and its system dependencies.");
  assert.ok(smokeRun > chromiumInstall, "The smoke suite must run after Chromium installation in the same container.");
  assert.equal(
    executor.steps.filter((step) => step.args[1].includes("playwright install --with-deps chromium")).length,
    1,
    "Chromium installation must not be split into a separate Cloud Build step.",
  );
  assert.match(smoke.args[1], /command -v pnpm/);
  assert.match(smoke.args[1], /pnpm run test:e2e:smoke/);
  assert.ok(smoke.env.includes("CI=true"));
  assert.match(readiness.args[1], /bash scripts\/run-playwright-real-stack-readiness\.sh/);
  assert.deepEqual(readiness.env, ["BUILD_ID=$BUILD_ID"]);
  assert.ok(executor.steps.every((step) => !Object.hasOwn(step, "secretEnv")));
  assert.ok(executor.steps.every((step) => !Object.hasOwn(step, "waitFor")));
  assert.ok(executor.steps.every((step) => !Object.hasOwn(step, "allowFailure")));
  assert.ok(executor.steps.every((step) => !Object.hasOwn(step, "allowExitCodes")));
  assert.ok(executor.steps.every((step) => !step.args.join("\n").match(/(?:\bnpx\b|\bpnpm\s+dlx\b|\bnpm\s+install\b|\bgcloud\b|\bgsutil\b)/)));
  assert.ok(executor.steps.every((step) => !step.args.join("\n").match(/(?:\|\|\s*true|exit\s+0)/)));
  for (const field of ["artifacts", "availableSecrets", "images", "logsBucket", "serviceAccount"]) {
    assert.equal(Object.hasOwn(executor, field), false, `${field} must remain out of the baseline.`);
  }
});

test("Cloud Build real-stack readiness uses isolated immutable containers and bounded cleanup", () => {
  const script = fs.readFileSync(readinessScriptPath, "utf8");
  const normalizedBuildIdCheck = script.indexOf('if [[ -z "$safe_build_id" ]]');
  const postgresContainer = script.indexOf("readonly POSTGRES_CONTAINER");
  const npmCi = script.indexOf("\nnpm ci\n");
  const testEnvironment = script.indexOf("NODE_ENV=test");
  const strapiBuild = script.indexOf("\nnpm run build\n");
  const strapiStart = script.indexOf("\nnpm run start ");

  assert.match(script, /postgres:16-bookworm@sha256:[a-f0-9]{64}/);
  assert.match(script, /node@sha256:[a-f0-9]{64}/);
  assert.match(script, /BUILD_ID:\?BUILD_ID is required/);
  assert.ok(normalizedBuildIdCheck >= 0 && normalizedBuildIdCheck < postgresContainer);
  assert.match(script, /BUILD_ID must contain at least one alphanumeric character/);
  assert.match(script, /tb122-readiness-postgres-\$\{safe_build_id:0:32\}/);
  assert.match(script, /docker run --detach --name "\$POSTGRES_CONTAINER" --network cloudbuild/);
  assert.doesNotMatch(script, /(?:--publish(?:-all)?(?:=|\s|$)|(?:^|\s)-p(?:\s|=|\d)|(?:^|\s)-P(?:\s|$))/m);
  assert.match(script, /trap cleanup_postgres EXIT/);
  assert.match(script, /docker rm --force "\$POSTGRES_CONTAINER"/);
  assert.match(script, /trap stop_processes EXIT/);
  assert.match(script, /kill "\$pid"/);
  assert.match(script, /seq 1 30/);
  assert.match(script, /seq 1 45/);
  assert.match(script, /docker logs --tail 40/);
  assert.match(script, /for log_path in \/tmp\/strapi-readiness\.log \/tmp\/next-readiness\.log; do/);
  assert.match(script, /if \[\[ -f "\$log_path" \]\]; then\n\s+tail -n 40 "\$log_path" >&2 \|\| :/);
  assert.doesNotMatch(script, /tail -n 40 \/tmp\/(?:strapi|next)-readiness\.log/);
  assert.ok(npmCi >= 0 && testEnvironment > npmCi && strapiBuild > testEnvironment && strapiStart > strapiBuild);
  assert.doesNotMatch(script, /NODE_ENV=production/);
  assert.doesNotMatch(script, /\bnpm\s+install\b/);
  assert.doesNotMatch(script, /\b(?:npx|pnpm\s+dlx)\b/);
  assert.match(script, /DATABASE_CLIENT=postgres/);
  assert.match(script, /COREPACK_DEFAULT_TO_LATEST=0/);
  assert.match(script, /corepack pnpm --version\)" = "10\.33\.0"/);
  assert.match(script, /pnpm install --frozen-lockfile/);
  assert.match(script, /pnpm exec next dev --hostname 0\.0\.0\.0 --port 3000 >\/tmp\/next-readiness\.log 2>&1 &/);
  assert.doesNotMatch(script, /pnpm run dev -- --hostname 0\.0\.0\.0 --port 3000/);
  assert.match(script, /\/api\/auth\/providers/);
  assert.doesNotMatch(script, /(?:gcloud|gsutil|secretEnv|availableSecrets|GCS_|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_CLOUD_PROJECT|CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE|AWS_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY)|AZURE_(?:CLIENT_ID|CLIENT_SECRET|TENANT_ID)|GITHUB_|NPM_TOKEN|PNPM_TOKEN|docker compose)/);
});
