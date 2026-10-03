import test from "node:test";
import assert from "node:assert/strict";
import { verifyWorkerConfigProjection } from "./verify-config.mjs";

function validProjection() {
  return {
    contractVersion: "survey-worker-config-projection.v1",
    project: {
      operationalProjectId: "teleferico-bariloche-2024",
      quotaProjectId: "teleferico-bariloche-2024",
      billingProjectId: "teleferico-bariloche-2024",
      telemetryProjectId: "teleferico-bariloche-2024",
    },
    vertex: {
      projectId: "teleferico-bariloche-2024",
      location: "us",
      endpoint: "aiplatform.us.rep.googleapis.com",
      model: "gemini-3.8-flash",
    },
    apis: [
      "aiplatform.googleapis.com",
      "run.googleapis.com",
      "storage.googleapis.com",
      "cloudtasks.googleapis.com",
    ],
    queue: {
      location: "southamerica-east1",
      oidcAudience: "https://worker.example.invalid",
      oidcIssuer: "https://accounts.google.com",
      taskInvokerIdentity: "identity-task-invoker",
      invokerScope: "single-worker-invocation",
    },
    worker: {
      origin: "https://worker.example.invalid",
      ingress: "private",
      runtimeIdentity: "identity-worker-runtime",
      attachedIdentity: "identity-worker-runtime",
      runtimeScopes: ["vertex.generateContent", "cms.worker-actions", "storage.private-prefixes", "logging.write", "metrics.write"],
      credentialMode: "metadata",
      serviceAccountJsonKeyPresent: false,
      googleApplicationCredentialsPresent: false,
    },
    storage: {
      reportPrefix: "private/feedback-reports/",
      diagnosticsPrefix: "private/report-diagnostics/",
      diagnosticsLifecycleDays: 30,
      reportRetention: "indefinite",
    },
    labels: { feature: "survey-reporting", service: "survey-report-worker" },
    budget: {
      currency: "USD",
      terminalCostAlertUsd: 10,
      monthlyHardCapEnabled: false,
      usageSource: "provider-usageMetadata",
    },
  };
}

function check(result, id) {
  return result.checks.find((entry) => entry.id === id);
}

test("accepts a complete redacted declarative projection without asserting live readiness", () => {
  const result = verifyWorkerConfigProjection(validProjection());
  assert.equal(result.status, "projection_valid");
  assert.ok(result.checks.every(({ status }) => status === "passed"));
});

test("blocks missing and mismatched required configuration instead of reporting pass", () => {
  const missing = validProjection();
  delete missing.worker.ingress;
  const missingResult = verifyWorkerConfigProjection(missing);
  assert.equal(missingResult.status, "blocked");
  assert.equal(check(missingResult, "worker:ingress").status, "blocked");
  assert.match(check(missingResult, "worker:ingress").reason, /Missing or unverifiable/);

  const mismatched = validProjection();
  mismatched.vertex.location = "southamerica-east1";
  mismatched.queue.taskInvokerIdentity = mismatched.worker.runtimeIdentity;
  const mismatchResult = verifyWorkerConfigProjection(mismatched);
  assert.equal(mismatchResult.status, "blocked");
  assert.equal(check(mismatchResult, "vertex:location").status, "blocked");
  assert.equal(check(mismatchResult, "identity:invoker-alias").status, "blocked");
});

test("rejects secret-like fields and values before normal gate evaluation", () => {
  const field = validProjection();
  field.worker.privateKey = "redacted";
  const value = verifyWorkerConfigProjection(field);
  assert.equal(value.status, "blocked");
  assert.equal(value.checks[0].id, "redaction");

  const signed = validProjection();
  signed.storage.objectUrl = "https://storage.example.invalid/object?signature=example";
  assert.equal(verifyWorkerConfigProjection(signed).status, "blocked");
});

test("requires exact audience, issuer, product APIs, retention, labels, and returned-usage budget controls", () => {
  const projection = validProjection();
  projection.queue.oidcAudience = "https://worker.example.invalid/path";
  projection.queue.oidcIssuer = "https://issuer.example.invalid";
  projection.apis.pop();
  projection.storage.diagnosticsLifecycleDays = 7;
  projection.budget.usageSource = "estimated";
  const result = verifyWorkerConfigProjection(projection);
  assert.equal(result.status, "blocked");
  for (const id of ["oidc:audience", "oidc:issuer", "apis", "storage:diagnostics-retention", "budget:returned-usage"])
    assert.equal(check(result, id).status, "blocked", id);
});
