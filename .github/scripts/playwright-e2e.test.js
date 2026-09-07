const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const playwrightWorkflowPath = path.join(__dirname, "..", "workflows", "playwright-e2e.yml");
const cloudBuildExecutorPath = path.join(__dirname, "..", "..", "cloudbuild.playwright-e2e.json");
const cloudBuildNodeImage = "node@sha256:1471ea646673136b8308550ac14b36d847ffb21c24bc31828279e443c924e488";
const cloudBuildGitImage = "alpine/git@sha256:1e9d9a40acbd02aeb3cb005ff43f9e51ac09ba0c241bb2298f811d3f426a2ffd";

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
  const [revision, packageManager, dependencies, chromium, smoke] = executor.steps;

  assert.deepEqual(
    executor.steps.map(({ id, name, dir, entrypoint, timeout }) => ({ id, name, dir, entrypoint, timeout })),
    [
      { id: "Verify workspace revision", name: cloudBuildGitImage, dir: undefined, entrypoint: "/bin/sh", timeout: "60s" },
      { id: "Verify repository package manager", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "60s" },
      { id: "Install locked application dependencies", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "420s" },
      { id: "Install locked Chromium and system dependencies", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "360s" },
      { id: "Run fixture-backed Chromium smoke suite", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "480s" },
    ],
  );
  assert.equal(executor.timeout, "1200s");
  assert.deepEqual(executor.options, { logging: "CLOUD_LOGGING_ONLY" });
  assert.equal(revision.args[0], "-c");
  assert.deepEqual(revision.env, ["EXPECTED_COMMIT_SHA=$COMMIT_SHA"]);
  assert.match(revision.args[1], /test "\$\$EXPECTED_COMMIT_SHA" != "0{40}"/);
  assert.match(revision.args[1], /git --version/);
  assert.match(revision.args[1], /git rev-parse --verify "\$\$EXPECTED_COMMIT_SHA\^\{commit\}"/);
  assert.match(revision.args[1], /actual_sha="\$\$\(git rev-parse HEAD\^\{commit\}\)"/);
  assert.match(revision.args[1], /test "\$\$actual_sha" = "\$\$EXPECTED_COMMIT_SHA"/);
  assert.match(packageManager.args[1], /corepack enable/);
  assert.match(packageManager.args[1], /corepack pnpm --version.*10\.33\.0/);
  assert.match(dependencies.args[1], /corepack pnpm install --frozen-lockfile/);
  assert.match(chromium.args[1], /corepack pnpm exec playwright install --with-deps chromium/);
  assert.match(smoke.args[1], /corepack pnpm run test:e2e:smoke/);
  assert.ok(smoke.env.includes("CI=true"));
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
