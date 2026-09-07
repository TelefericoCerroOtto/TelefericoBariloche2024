const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const playwrightWorkflowPath = path.join(__dirname, "..", "workflows", "playwright-e2e.yml");

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
