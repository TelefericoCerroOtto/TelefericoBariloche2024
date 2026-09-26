import { readFile } from "node:fs/promises";

const VERSION = "survey-worker-config-projection.v1";
const EXPECTED_APIS = [
  "aiplatform.googleapis.com",
  "run.googleapis.com",
  "storage.googleapis.com",
  "cloudtasks.googleapis.com",
];
const SAFE_IDENTITY_ALIAS = /^identity-[a-z0-9-]{1,48}$/;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function hasSecretLikeMaterial(value, depth = 0) {
  if (depth > 8) return true;
  if (Array.isArray(value)) return value.some((entry) => hasSecretLikeMaterial(entry, depth + 1));
  if (!isRecord(value)) {
    if (typeof value !== "string") return false;
    return /-----BEGIN|bearer\s|ya29\.|private[_ -]?key|google_application_credentials|[?&](?:key|token|signature|credential)=/i.test(value);
  }
  return Object.entries(value).some(([key, nested]) =>
    (!new Set(["serviceAccountJsonKeyPresent", "googleApplicationCredentialsPresent", "credentialMode"]).has(key) &&
      /secret|credential|private.?key|token.?value|password|signed.?url/i.test(key)) || hasSecretLikeMaterial(nested, depth + 1));
}

function makeCheck(checks, id, actual, expected, path) {
  if (actual === undefined || actual === null) {
    checks.push({ id, status: "blocked", reason: `Missing or unverifiable ${path}.` });
    return false;
  }
  const matches = typeof expected === "function" ? expected(actual) : Object.is(actual, expected);
  checks.push({
    id,
    status: matches ? "passed" : "blocked",
    reason: matches ? "Redacted projection matches the declared contract." : `Projection does not satisfy ${path}.`,
  });
  return matches;
}

function pathValue(root, path) {
  return path.split(".").reduce((value, key) => isRecord(value) ? value[key] : undefined, root);
}

function matchesExactRecord(value, keys) {
  return exactKeys(value, keys);
}

export function verifyWorkerConfigProjection(input) {
  const checks = [];
  if (!isRecord(input)) {
    return { contractVersion: VERSION, status: "blocked", checks: [{ id: "projection", status: "blocked", reason: "Projection must be a JSON object." }] };
  }
  if (hasSecretLikeMaterial(input)) {
    return { contractVersion: VERSION, status: "blocked", checks: [{ id: "redaction", status: "blocked", reason: "Projection contains secret-like material; supply aliases and booleans only." }] };
  }

  const shape = [
    ["projection", input, ["contractVersion", "project", "vertex", "apis", "queue", "worker", "storage", "labels", "budget"]],
    ["project", input.project, ["operationalProjectId", "quotaProjectId", "billingProjectId", "telemetryProjectId"]],
    ["vertex", input.vertex, ["projectId", "location", "endpoint", "model"]],
    ["queue", input.queue, ["location", "oidcAudience", "oidcIssuer", "taskInvokerIdentity", "invokerScope"]],
    ["worker", input.worker, ["origin", "ingress", "runtimeIdentity", "attachedIdentity", "runtimeScopes", "credentialMode", "serviceAccountJsonKeyPresent", "googleApplicationCredentialsPresent"]],
    ["storage", input.storage, ["reportPrefix", "diagnosticsPrefix", "diagnosticsLifecycleDays", "reportRetention"]],
    ["labels", input.labels, ["feature", "service"]],
    ["budget", input.budget, ["currency", "terminalCostAlertUsd", "monthlyHardCapEnabled", "usageSource"]],
  ];
  for (const [id, value, keys] of shape) {
    checks.push({ id: `shape:${id}`, status: matchesExactRecord(value, keys) ? "passed" : "blocked", reason: matchesExactRecord(value, keys) ? "Closed projection shape." : `Missing, unknown, or malformed fields in ${id}.` });
  }

  makeCheck(checks, "version", input.contractVersion, VERSION, "contractVersion");
  for (const field of ["operationalProjectId", "quotaProjectId", "billingProjectId", "telemetryProjectId"])
    makeCheck(checks, `project:${field}`, pathValue(input, `project.${field}`), "teleferico-bariloche-2024", `project.${field}`);
  makeCheck(checks, "vertex:project", pathValue(input, "vertex.projectId"), "teleferico-bariloche-2024", "vertex.projectId");
  makeCheck(checks, "vertex:location", pathValue(input, "vertex.location"), "us", "vertex.location");
  makeCheck(checks, "vertex:endpoint", pathValue(input, "vertex.endpoint"), "aiplatform.us.rep.googleapis.com", "vertex.endpoint");
  makeCheck(checks, "vertex:model", pathValue(input, "vertex.model"), "gemini-3.8-flash", "vertex.model");
  makeCheck(checks, "apis", input.apis, (value) => Array.isArray(value) && value.length === EXPECTED_APIS.length && EXPECTED_APIS.every((api) => value.includes(api)), "apis");
  makeCheck(checks, "queue:location", pathValue(input, "queue.location"), "southamerica-east1", "queue.location");
  makeCheck(checks, "oidc:issuer", pathValue(input, "queue.oidcIssuer"), "https://accounts.google.com", "queue.oidcIssuer");

  const origin = pathValue(input, "worker.origin");
  const audience = pathValue(input, "queue.oidcAudience");
  makeCheck(checks, "worker:private-origin", origin, (value) => {
    if (typeof value !== "string") return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" && parsed.origin === value && parsed.pathname === "/" && !parsed.search && !parsed.hash;
    } catch { return false; }
  }, "worker.origin");
  makeCheck(checks, "oidc:audience", audience, (value) => value === origin, "queue.oidcAudience exact worker origin");
  makeCheck(checks, "worker:ingress", pathValue(input, "worker.ingress"), "private", "worker.ingress");
  makeCheck(checks, "worker:attached-identity", pathValue(input, "worker.attachedIdentity"), (value) => value === pathValue(input, "worker.runtimeIdentity"), "worker.attachedIdentity");
  makeCheck(checks, "identity:runtime-alias", pathValue(input, "worker.runtimeIdentity"), (value) => typeof value === "string" && SAFE_IDENTITY_ALIAS.test(value), "worker.runtimeIdentity redacted alias");
  makeCheck(checks, "identity:invoker-alias", pathValue(input, "queue.taskInvokerIdentity"), (value) => typeof value === "string" && SAFE_IDENTITY_ALIAS.test(value) && value !== pathValue(input, "worker.runtimeIdentity"), "queue.taskInvokerIdentity distinct redacted alias");
  makeCheck(checks, "identity:invoker-scope", pathValue(input, "queue.invokerScope"), "single-worker-invocation", "queue.invokerScope");
  makeCheck(checks, "identity:runtime-scopes", pathValue(input, "worker.runtimeScopes"), (value) => Array.isArray(value) && value.length === 5 && ["vertex.generateContent", "cms.worker-actions", "storage.private-prefixes", "logging.write", "metrics.write"].every((scope) => value.includes(scope)), "worker.runtimeScopes least-privilege projection");
  makeCheck(checks, "worker:keyless", pathValue(input, "worker.credentialMode"), "metadata", "worker.credentialMode");
  makeCheck(checks, "worker:no-service-account-key", pathValue(input, "worker.serviceAccountJsonKeyPresent"), false, "worker.serviceAccountJsonKeyPresent");
  makeCheck(checks, "worker:no-credential-env", pathValue(input, "worker.googleApplicationCredentialsPresent"), false, "worker.googleApplicationCredentialsPresent");
  makeCheck(checks, "storage:report-prefix", pathValue(input, "storage.reportPrefix"), "private/feedback-reports/", "storage.reportPrefix");
  makeCheck(checks, "storage:diagnostics-prefix", pathValue(input, "storage.diagnosticsPrefix"), "private/report-diagnostics/", "storage.diagnosticsPrefix");
  makeCheck(checks, "storage:diagnostics-retention", pathValue(input, "storage.diagnosticsLifecycleDays"), 30, "storage.diagnosticsLifecycleDays");
  makeCheck(checks, "storage:report-retention", pathValue(input, "storage.reportRetention"), "indefinite", "storage.reportRetention");
  makeCheck(checks, "labels:feature", pathValue(input, "labels.feature"), "survey-reporting", "labels.feature");
  makeCheck(checks, "labels:service", pathValue(input, "labels.service"), "survey-report-worker", "labels.service");
  makeCheck(checks, "budget:currency", pathValue(input, "budget.currency"), "USD", "budget.currency");
  makeCheck(checks, "budget:terminal-alert", pathValue(input, "budget.terminalCostAlertUsd"), 10, "budget.terminalCostAlertUsd");
  makeCheck(checks, "budget:no-hard-cap", pathValue(input, "budget.monthlyHardCapEnabled"), false, "budget.monthlyHardCapEnabled");
  makeCheck(checks, "budget:returned-usage", pathValue(input, "budget.usageSource"), "provider-usageMetadata", "budget.usageSource");

  return {
    contractVersion: VERSION,
    status: checks.every(({ status }) => status === "passed") ? "projection_valid" : "blocked",
    checks,
  };
}

async function main() {
  const [, , filePath] = process.argv;
  if (!filePath || process.argv.length !== 3) {
    process.stderr.write("Usage: node docs/infra/survey-reporting/verify-config.mjs <redacted-projection.json>\n");
    process.exitCode = 2;
    return;
  }
  try {
    const input = JSON.parse(await readFile(filePath, "utf8"));
    const result = verifyWorkerConfigProjection(input);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status !== "projection_valid") process.exitCode = 1;
  } catch {
    process.stdout.write(`${JSON.stringify({ contractVersion: VERSION, status: "blocked", checks: [{ id: "input", status: "blocked", reason: "Input is unreadable or is not valid JSON." }] }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) await main();
