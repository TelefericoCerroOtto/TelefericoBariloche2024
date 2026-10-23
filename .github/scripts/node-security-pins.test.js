const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "../..");
const slimNode = "node@sha256:ea11b74b986d520137cdef9a5346e447a00f275ecc4abc0055b7151226231e09";
const bookwormNode = "node@sha256:de636e50060a9908cf40a20a50d027ed74a99b2e31d2635f3b13e9e4e5e97e74";
const source = (path) => readFileSync(join(root, path), "utf8");

test("GCP Node build and runtime pins use the patched Node 22 release", () => {
  const app = source("teleferico-app/Dockerfile");
  const cms = source("teleferico-cms/Dockerfile");
  const worker = source("services/survey-report-worker/Dockerfile");
  const workerManifest = JSON.parse(source("services/survey-report-worker/package.json"));
  const stagingApp = source("docs/infra/cloud-build/app-staging.yaml");
  const productionApp = source("docs/infra/cloud-build/app-production.yaml");
  const stagingCms = source("docs/infra/cloud-build/cms-staging.yaml");
  const productionCms = source("docs/infra/cloud-build/cms-production.yaml");
  const stagingWorker = source("docs/infra/cloud-build/worker-staging.yaml");
  const executor = JSON.parse(source("cloudbuild.playwright-e2e.json"));
  const readiness = source("scripts/run-playwright-real-stack-readiness.sh");

  for (const dockerfile of [app, cms, worker]) {
    assert.ok(dockerfile.includes(`FROM --platform=linux/amd64 ${slimNode}`));
  }
  assert.equal(workerManifest.engines.node, "22.23.4");
  for (const snapshot of [stagingApp, productionApp]) {
    assert.equal(snapshot.split(`name: ${slimNode}`).length - 1, 2);
  }
  for (const snapshot of [stagingCms, productionCms]) {
    assert.ok(snapshot.includes("- teleferico-cms/Dockerfile"));
    assert.ok(snapshot.includes("- .\n    id: Build"));
  }
  assert.ok(stagingWorker.includes(`name: ${slimNode}`));
  assert.ok(stagingWorker.includes('node --version)" = "v22.23.4'));
  assert.equal(executor.steps.filter((step) => step.name === bookwormNode).length, 5);
  assert.ok(readiness.includes(`RUNNER_IMAGE="${bookwormNode}"`));
});

test("worker handoff distinguishes deployed staging from unverified live URL", () => {
  const handoff = source("docs/infra/cloud-build/README.md");
  assert.match(handoff, /2026-10-23[\s\S]*feedback-worker-staging-00012-ms8/);
  assert.match(handoff, /No production worker service is listed/);
  assert.doesNotMatch(handoff, /not a deployed service URL/);
});
