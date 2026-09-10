const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const playwrightWorkflowPath = path.join(__dirname, "..", "workflows", "playwright-e2e.yml");
const dispatcherWorkflowPath = path.join(__dirname, "..", "workflows", "cloud-build-playwright-dispatch.yml");
const cloudBuildExecutorPath = path.join(__dirname, "..", "..", "cloudbuild.playwright-e2e.json");
const appPackagePath = path.join(__dirname, "..", "..", "teleferico-app", "package.json");
const standardConfigPath = path.join(__dirname, "..", "..", "teleferico-app", "playwright.config.ts");
const maintenanceConfigPath = path.join(__dirname, "..", "..", "teleferico-app", "playwright.maintenance.config.ts");
const productionConfigPath = path.join(__dirname, "..", "..", "teleferico-app", "playwright.production.config.ts");
const cloudBuildNodeImage = "node@sha256:4d676821dff059fd00d277ee4261ef34ea712317fed0737c03941481b5760c96";
const cloudBuildOldNodeImage = "node@sha256:1471ea646673136b8308550ac14b36d847ffb21c24bc31828279e443c924e488";
const cloudBuildGitImage = "alpine/git@sha256:1e9d9a40acbd02aeb3cb005ff43f9e51ac09ba0c241bb2298f811d3f426a2ffd";
const cloudBuildDockerImage = "gcr.io/cloud-builders/docker@sha256:3d00b6c1a9b862621c30fc74d4f2abfc62bcbdee631ed3febd31e7edbdf6252c";
const readinessScriptPath = path.join(__dirname, "..", "..", "scripts", "run-playwright-real-stack-readiness.sh");
const lifecycleScriptPath = path.join(__dirname, "..", "..", "scripts", "playwright-real-stack-lifecycle.js");

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
  const jobs = workflow.split(/\n  production-public-smoke:\n/).slice(1);

  assert.equal(jobs.length, 1);

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

test("Cloud Build dispatcher is path-filtered, provenance-guarded, and cannot execute pull-request code", () => {
  const dispatcher = fs.readFileSync(dispatcherWorkflowPath, "utf8");
  const nativeWorkflow = fs.readFileSync(playwrightWorkflowPath, "utf8");
  const guard = dispatcher.indexOf("name: Validate trusted pull request provenance");
  const auth = dispatcher.indexOf("google-github-actions/auth@");

  assert.match(dispatcher, /pull_request_target:\n\s+types: \[opened, reopened, synchronize, ready_for_review\]\n\s+branches: \[development, staging\]/);
  for (const pathFilter of [
    "teleferico-app/**",
    "teleferico-cms/**",
    "cloudbuild.playwright-e2e.json",
    "scripts/run-playwright-real-stack-readiness.sh",
    "scripts/playwright-real-stack-lifecycle.js",
    ".github/workflows/cloud-build-playwright-dispatch.yml",
    ".github/workflows/playwright-e2e.yml",
    ".github/scripts/playwright-e2e.test.js",
    ".github/scripts/playwright-real-stack-lifecycle.test.js",
  ]) {
    assert.match(dispatcher, new RegExp(`- "${pathFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.doesNotMatch(dispatcher, /(?:docs|tools)\/\*\*/);
  assert.match(dispatcher, /permissions:\n\s+contents: read\n\nconcurrency:/);
  assert.match(dispatcher, /dispatch-and-wait:\n\s+needs: validate-trusted-pr\n\s+if: needs\.validate-trusted-pr\.outputs\.dispatch_allowed == 'true'\n\s+runs-on: ubuntu-latest\n\s+timeout-minutes: 50\n\s+permissions:\n\s+contents: read\n\s+id-token: write/);
  assert.match(dispatcher, /group: cloud-build-playwright-dispatch-\$\{\{ github\.event\.pull_request\.number \}\}\n\s+cancel-in-progress: true/);
  assert.ok(guard >= 0 && auth > guard);
  for (const value of ["BASE_REF", "CURRENT_REPOSITORY", "HEAD_REF", "HEAD_REPOSITORY", "HEAD_SHA"]) assert.match(dispatcher, new RegExp(`${value}: \\$\\{\\{`));
  assert.match(dispatcher, /HEAD_REPOSITORY" != "\$CURRENT_REPOSITORY"/);
  assert.match(dispatcher, /HEAD_SHA" =~ \^\[0-9a-f\]\{40\}\$/);
  assert.match(dispatcher, /case "\$BASE_REF:\$HEAD_REF" in[\s\S]*development:\*\)[\s\S]*suite="smoke"[\s\S]*staging:development\)[\s\S]*suite="full"[\s\S]*staging:\*\)[\s\S]*dispatch_allowed=false/);
  assert.match(dispatcher, /printf 'suite=%s\\n' "\$suite" >> "\$GITHUB_OUTPUT"/);
  assert.doesNotMatch(dispatcher, /(?:github\.event\.inputs|workflow_dispatch|secrets\.|service_account_key|credentials_json)/);
  assert.doesNotMatch(dispatcher, /actions\/checkout|\b(?:pnpm|npm|npx)\b|gcloud builds cancel|\b(?:source|eval)\b/);
  for (const action of dispatcher.matchAll(/^\s*uses:\s*(\S+)/gm)) {
    assert.match(action[1], /@[0-9a-f]{40}$/, `Privileged dispatcher action must be pinned by full commit SHA: ${action[1]}`);
  }
  assert.match(dispatcher, /google-github-actions\/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093 # v3/);
  assert.match(dispatcher, /google-github-actions\/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db # v3/);
  assert.match(dispatcher, /create_credentials_file: false\n\s+token_format: access_token/);
  assert.match(dispatcher, /version: 567\.0\.0/);
  for (const variable of ["CLOUD_BUILD_PROJECT_ID", "CLOUD_BUILD_REGION", "CLOUD_BUILD_WIF_PROVIDER", "CLOUD_BUILD_DISPATCHER_SERVICE_ACCOUNT", "CLOUD_BUILD_PLAYWRIGHT_MANUAL_TRIGGER_ID"]) {
    assert.match(dispatcher, new RegExp(`vars\\.${variable}`));
  }
  assert.match(dispatcher, /CLOUD_BUILD_ACCESS_TOKEN: \$\{\{ steps\.auth\.outputs\.access_token \}\}/);
  assert.match(dispatcher, /umask 077\n\s+token_file="\$RUNNER_TEMP\/cloud-build-dispatch-access-token"/);
  assert.match(dispatcher, /gcloud --access-token-file="\$token_file" builds triggers run "\$CLOUD_BUILD_PLAYWRIGHT_MANUAL_TRIGGER_ID".*--sha="\$PR_HEAD_SHA".*--substitutions="_PLAYWRIGHT_SUITE=\$PLAYWRIGHT_SUITE"/);
  assert.match(dispatcher, /gcloud --access-token-file="\$token_file" builds describe "\$build_id"/);
  assert.match(dispatcher, /GITHUB_STEP_SUMMARY/);
  assert.equal(crypto.createHash("sha256").update(nativeWorkflow).digest("hex"), "ce053b507efcfae66a7e0629acbdeff6e87fdc736655ddfc4b14655be51535af");
});

test("Cloud Build fixture executor preserves the ordered locked selectable-suite contract", () => {
  const executor = JSON.parse(fs.readFileSync(cloudBuildExecutorPath, "utf8"));
  const [revision, packageManager, dependencies, suite, readiness] = executor.steps;

  assert.deepEqual(
    executor.steps.map(({ id, name, dir, entrypoint, timeout }) => ({ id, name, dir, entrypoint, timeout })),
    [
      { id: "Verify workspace revision", name: cloudBuildGitImage, dir: undefined, entrypoint: "/bin/sh", timeout: "60s" },
      { id: "Verify repository package manager", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "60s" },
      { id: "Install locked application dependencies", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "420s" },
      { id: "Run fixture-backed Chromium suite", name: cloudBuildNodeImage, dir: "teleferico-app", entrypoint: "bash", timeout: "900s" },
      { id: "Run real-stack readiness", name: cloudBuildDockerImage, dir: undefined, entrypoint: "bash", timeout: "900s" },
      ],
  );
  assert.equal(executor.timeout, "2700s");
  assert.deepEqual(executor.substitutions, { _PLAYWRIGHT_SUITE: "smoke" });
  assert.deepEqual(executor.options, { logging: "CLOUD_LOGGING_ONLY" });
  assert.ok(executor.steps.every((step) => step.name !== cloudBuildOldNodeImage));
  assert.equal(revision.args[0], "-c");
  assert.deepEqual(revision.env, ["EXPECTED_COMMIT_SHA=$COMMIT_SHA", "PLAYWRIGHT_SUITE=$_PLAYWRIGHT_SUITE"]);
  assert.match(revision.args[1], /test "\$\$EXPECTED_COMMIT_SHA" != "0{40}"/);
  assert.match(revision.args[1], /case "\$\$PLAYWRIGHT_SUITE" in smoke\|full\)/);
  assert.match(revision.args[1], /_PLAYWRIGHT_SUITE must be exactly smoke or full/);
  assert.match(revision.args[1], /git --version/);
  assert.match(revision.args[1], /git rev-parse --verify "\$\$EXPECTED_COMMIT_SHA\^\{commit\}"/);
  assert.match(revision.args[1], /actual_sha="\$\$\(git rev-parse HEAD\^\{commit\}\)"/);
  assert.match(revision.args[1], /test "\$\$actual_sha" = "\$\$EXPECTED_COMMIT_SHA"/);
  for (const step of [packageManager, dependencies, suite]) {
    const command = step.args[1];
    const enableCorepack = command.indexOf("corepack enable");
    const firstPnpmInvocation = command.search(/\bpnpm\b/);

    assert.ok(enableCorepack >= 0, `${step.id} must enable Corepack in its own container.`);
    assert.ok(firstPnpmInvocation > enableCorepack, `${step.id} must enable Corepack before invoking pnpm.`);
  }
  assert.match(packageManager.args[1], /corepack pnpm --version.*10\.33\.0/);
  assert.match(dependencies.args[1], /pnpm install --frozen-lockfile/);
  const chromiumInstall = suite.args[1].indexOf("pnpm exec playwright install --with-deps chromium");
  const suiteRun = suite.args[1].indexOf('pnpm run "$$suite_command"');

  assert.ok(chromiumInstall >= 0, "The suite container must install Chromium and its system dependencies.");
  assert.ok(suiteRun > chromiumInstall, "The selected suite must run after Chromium installation in the same container.");
  assert.equal(
    executor.steps.filter((step) => step.args[1].includes("playwright install --with-deps chromium")).length,
    1,
    "Chromium installation must not be split into a separate Cloud Build step.",
  );
  assert.match(suite.args[1], /case "\$\$PLAYWRIGHT_SUITE" in/);
  assert.match(suite.args[1], /smoke\) suite_command="test:e2e:smoke"/);
  assert.match(suite.args[1], /full\) suite_command="test:e2e"/);
  assert.match(suite.args[1], /_PLAYWRIGHT_SUITE must be exactly smoke or full/);
  assert.match(suite.args[1], /command -v pnpm/);
  assert.ok(suite.env.includes("CI=true"));
  assert.ok(suite.env.includes("PLAYWRIGHT_SUITE=$_PLAYWRIGHT_SUITE"));
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

test("GitHub fixture-backed pull-request parity jobs are absent after cutover", () => {
  const workflow = fs.readFileSync(playwrightWorkflowPath, "utf8");

  assert.doesNotMatch(workflow, /\bpull_request:/);
  assert.doesNotMatch(workflow, /\bchromium-(?:smoke|full):/);
  assert.doesNotMatch(workflow, /pnpm run test:e2e(?::smoke)?(?:\s|$)/m);
  assert.match(workflow, /\n  production-public-smoke:\n/);
});

test("Playwright script composition preserves automatic suite discovery boundaries", () => {
  const appPackage = JSON.parse(fs.readFileSync(appPackagePath, "utf8"));
  const standardConfig = fs.readFileSync(standardConfigPath, "utf8");
  const maintenanceConfig = fs.readFileSync(maintenanceConfigPath, "utf8");
  const productionConfig = fs.readFileSync(productionConfigPath, "utf8");

  assert.equal(appPackage.packageManager, "pnpm@10.33.0");
  assert.equal(appPackage.scripts["test:e2e"], "pnpm run test:e2e:smoke && pnpm run test:e2e:maintenance");
  assert.equal(appPackage.scripts["test:e2e:smoke"], "playwright test");
  assert.equal(appPackage.scripts["test:e2e:maintenance"], "playwright test --config=playwright.maintenance.config.ts");
  assert.equal(appPackage.scripts["test:e2e:production"], "playwright test --config=playwright.production.config.ts");
  assert.match(standardConfig, /testIgnore: \["\*\*\/maintenance\.spec\.ts", "\*\*\/production\/\*\*"\]/);
  assert.match(maintenanceConfig, /testMatch: "\*\*\/maintenance\.spec\.ts"/);
  assert.match(productionConfig, /testMatch: "\*\*\/production\/\*\*\/\*\.spec\.ts"/);
});

test("production public smoke workflow remains unchanged by the full-suite cutover", () => {
  const workflow = fs.readFileSync(playwrightWorkflowPath, "utf8");
  const productionJob = workflow.slice(workflow.indexOf("  production-public-smoke:"));

  assert.equal(crypto.createHash("sha256").update(productionJob).digest("hex"), "64522e1b88186003bb9f540fbe486d36b3cebe8af7c5db1efb0474151db5f4ae");
});

test("Cloud Build real-stack readiness uses isolated immutable containers and deterministic cleanup", () => {
  const script = fs.readFileSync(readinessScriptPath, "utf8");
  const lifecycle = fs.readFileSync(lifecycleScriptPath, "utf8");
  const normalizedBuildIdCheck = script.indexOf('if [[ -z "$normalized_build_id" ]]');
  const postgresContainer = script.indexOf("readonly POSTGRES_CONTAINER");
  const npmCi = lifecycle.indexOf('["ci"]');
  const testEnvironment = lifecycle.indexOf('NODE_ENV: "test"');
  const strapiBuild = lifecycle.indexOf('["run", "build"]');
  const strapiStart = lifecycle.indexOf('args: ["run", "start"]');
  const nextStart = lifecycle.indexOf('args: ["exec", "next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]');

  assert.match(script, /postgres:16-bookworm@sha256:[a-f0-9]{64}/);
  assert.match(script, /node@sha256:[a-f0-9]{64}/);
  assert.match(script, /BUILD_ID:\?BUILD_ID is required/);
  assert.ok(normalizedBuildIdCheck >= 0 && normalizedBuildIdCheck < postgresContainer);
  assert.match(script, /BUILD_ID must use only/);
  assert.match(script, /sha256sum/);
  assert.match(script, /build_id_digest=.*:0:24/);
  assert.match(script, /build_namespace="\$\{build_id_digest\}"/);
  assert.match(script, /tb122-readiness-postgres-\$\{build_namespace\}/);
  assert.match(script, /docker create --name "\$POSTGRES_CONTAINER" --network cloudbuild/);
  assert.doesNotMatch(script, /(?:--publish(?:-all)?(?:=|\s|$)|(?:^|\s)-p(?:\s|=|\d)|(?:^|\s)-P(?:\s|$))/m);
  assert.match(script, /docker create --name "\$RUNNER_CONTAINER" --network cloudbuild/);
  assert.match(script, /--label "\$OWNERSHIP_LABEL"/);
  assert.match(script, /container_owned/);
  assert.match(script, /cleanup_container "runner"[\s\S]*cleanup_container "postgres"/);
  assert.match(script, /timeout --signal=TERM --kill-after=5s/);
  assert.match(script, /POSTGRES_READINESS_DEADLINE_SECONDS=55/);
  assert.match(script, /run_bounded_until/);
  assert.match(script, /CLEANUP_RESERVE_DEADLINE_SECONDS=720/);
  assert.match(script, /runner_timeout_seconds=\$\(\(CLEANUP_RESERVE_DEADLINE_SECONDS - SECONDS\)\)/);
  assert.match(script, /timeout --signal=TERM --kill-after=15s "\$\{runner_timeout_seconds\}s" docker start --attach/);
  assert.match(script, /docker stop --time 5/);
  assert.match(script, /docker rm --force/);
  assert.match(script, /record_cleanup "\$resource" "verify-removed"/);
  assert.match(script, /Error: No such object:/);
  assert.match(script, /inspect-exit-\$\{inspect_status\}/);
  assert.doesNotMatch(script, /trap - EXIT INT TERM/);
  assert.match(script, /trap - EXIT/);
  assert.match(script, /if \[\[ -z "\$received_signal" \]\]/);
  assert.match(script, /postgres_create_status=\$\?/);
  assert.match(script, /postgres_start_status=\$\?/);
  assert.match(script, /runner_create_status=\$\?/);
  assert.match(script, /DIAGNOSTIC_LINES=80/);
  assert.match(script, /DIAGNOSTIC_BYTES=32768/);
  assert.match(script, /docker logs --tail "\$DIAGNOSTIC_LINES"[\s\S]*tail -c "\$DIAGNOSTIC_BYTES"/);
  assert.doesNotMatch(script, /\|\|\s*:|>\s*\/dev\/null\s+2>&1/);
  assert.ok(npmCi >= 0 && testEnvironment >= 0 && strapiBuild > npmCi && strapiStart > strapiBuild);
  assert.doesNotMatch(lifecycle, /NODE_ENV[=:]\s*["']?production/);
  assert.doesNotMatch(lifecycle, /\bnpm\s+install\b/);
  assert.doesNotMatch(lifecycle, /\b(?:npx|pnpm\s+dlx)\b/);
  assert.match(lifecycle, /DATABASE_CLIENT: "postgres"/);
  assert.match(script, /COREPACK_DEFAULT_TO_LATEST=0/);
  assert.match(lifecycle, /corepack pnpm --version/);
  assert.match(lifecycle, /runCommand\("app-install", "pnpm", \["install", "--frozen-lockfile"\]/);
  assert.ok(nextStart > lifecycle.indexOf('BUILD_STRAPI_BUCKET_HOSTNAME: "127.0.0.1"'));
  assert.ok(nextStart > lifecycle.indexOf('BUILD_STRAPI_BUCKET_PATHNAME: "\/uploads\/\*\*"'));
  assert.match(lifecycle, /\/admin\/init/);
  assert.match(lifecycle, /\/api\/auth\/providers/);
  assert.match(lifecycle, /process\.kill\(-this\.child\.pid, signal\)/);
  assert.match(lifecycle, /signal-term/);
  assert.match(lifecycle, /signal-kill/);
  assert.match(lifecycle, /leader-reaped/);
  assert.match(lifecycle, /installSignalHandlers/);
  const mainLifecycle = lifecycle.slice(lifecycle.indexOf("async function main()"));
  const cleanupIndex = mainLifecycle.indexOf("cleanupRegistry.cleanup()");
  const signalDisposeIndex = mainLifecycle.indexOf("signalHandlers.dispose()");
  assert.ok(cleanupIndex >= 0 && signalDisposeIndex > cleanupIndex);
  assert.match(lifecycle, /verifyFinalReadiness/);
  assert.match(lifecycle, /`\$\{name\}-final-process`/);
  assert.match(lifecycle, /assertManagedProcessLive\("strapi"/);
  assert.match(lifecycle, /assertManagedProcessLive\("next"/);
  assert.match(lifecycle, /postgres-final-readiness/);
  assert.match(lifecycle, /LOG_LIMITS = Object\.freeze\(\{ maxBytes: 32 \* 1024, maxLines: 80 \}\)/);
  assert.match(lifecycle, /isSymbolicLink\(\)/);
  assert.match(lifecycle, /\[REDACTED\]/);
  assert.doesNotMatch(`${script}\n${lifecycle}`, /(?:gcloud|gsutil|secretEnv|availableSecrets|GCS_|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_CLOUD_PROJECT|CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE|AWS_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY)|AZURE_(?:CLIENT_ID|CLIENT_SECRET|TENANT_ID)|GITHUB_|NPM_TOKEN|PNPM_TOKEN|docker compose)/);
});
