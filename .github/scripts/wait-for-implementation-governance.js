#!/usr/bin/env node

const childProcess = require("node:child_process");
const repositoryPolicy = require("./repository-policy.js");

const EXIT_CODES = Object.freeze({
  passed: 0,
  governanceFailed: 1,
  governanceTimeout: 2,
  observerError: 3,
});

const GOVERNANCE_WORKFLOW = Object.freeze({
  name: "Backlog governance",
  path: ".github/workflows/backlog-governance.yml",
});
const GOVERNANCE_CHECKS = Object.freeze([
  Object.freeze({ jobId: "governance-tests", name: "Governance tests" }),
  Object.freeze({ jobId: "validate-pr-policy", name: "validate-pr-policy" }),
  Object.freeze({ jobId: "trusted-pr-sync", name: "trusted-pr-sync" }),
]);
const GOVERNANCE_CHECK_NAMES = new Set(GOVERNANCE_CHECKS.map(({ name }) => name));
const AUTHORITATIVE_GOVERNANCE_EVENTS = Object.freeze(["pull_request", "pull_request_target"]);
const GOVERNANCE_JOBS_BY_EVENT = Object.freeze({
  pull_request: Object.freeze(["Governance tests"]),
  pull_request_target: Object.freeze(GOVERNANCE_CHECKS.map(({ name }) => name)),
});

const FUNCTIONAL_WORKFLOW = Object.freeze({
  name: "Dispatch Cloud Build Playwright",
  path: ".github/workflows/cloud-build-playwright-dispatch.yml",
});
const FUNCTIONAL_CHECKS = Object.freeze([
  Object.freeze({ jobId: "validate-trusted-pr", name: "validate-trusted-pr" }),
  Object.freeze({ jobId: "dispatch-and-wait", name: "dispatch-and-wait" }),
]);
const FUNCTIONAL_CHECK_NAMES = new Set(FUNCTIONAL_CHECKS.map(({ name }) => name));
const FUNCTIONAL_JOBS_BY_EVENT = Object.freeze({
  pull_request_target: Object.freeze(FUNCTIONAL_CHECKS.map(({ name }) => name)),
});

const TERMINAL_FAILURE_BUCKETS = new Set(["fail", "cancel"]);
const KNOWN_BUCKETS = new Set(["pass", "fail", "pending", "skipping", "cancel", "missing"]);
const MAX_API_PAGES = 10;
const OBSERVATION_MODES = Object.freeze(["implementation", "stacked-preview"]);

function parseArguments(argv) {
  const options = { timeoutSeconds: 300, intervalSeconds: 5, mode: "implementation", repo: undefined, reference: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo" || argument === "--timeout-seconds" || argument === "--interval-seconds" || argument === "--mode") {
      const value = argv[++index];
      if (!value) throw new Error(`${argument} requires a value.`);
      if (argument === "--repo") options.repo = value;
      if (argument === "--timeout-seconds") options.timeoutSeconds = parseNonNegativeNumber(value, argument);
      if (argument === "--interval-seconds") options.intervalSeconds = parsePositiveNumber(value, argument);
      if (argument === "--mode") options.mode = value;
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`Unknown option '${argument}'.`);
    if (options.reference) throw new Error("Provide exactly one implementation PR number or URL.");
    options.reference = argument;
  }

  if (!options.reference) throw new Error("Provide an implementation PR number or URL.");
  if (!OBSERVATION_MODES.includes(options.mode)) throw new Error(`--mode must be one of: ${OBSERVATION_MODES.join(", ")}.`);
  validatePullRequestReference(options.reference);
  if (options.repo && !/^[^/\s]+\/[^/\s]+$/.test(options.repo)) throw new Error("--repo must use OWNER/REPO.");
  const urlRepo = repositoryFromPullRequestUrl(options.reference);
  if (urlRepo && options.repo && urlRepo.toLowerCase() !== options.repo.toLowerCase()) {
    throw new Error(`Pull request URL repository '${urlRepo}' does not match --repo '${options.repo}'.`);
  }
  return options;
}

function parseNonNegativeNumber(value, option) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${option} must be a non-negative number.`);
  return number;
}

function parsePositiveNumber(value, option) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${option} must be a positive number.`);
  return number;
}

function validatePullRequestReference(reference) {
  if (/^[1-9]\d*$/.test(reference)) return;
  if (repositoryFromPullRequestUrl(reference)) return;
  throw new Error("Implementation PR reference must be a positive number or a https://github.com/OWNER/REPO/pull/NUMBER URL.");
}

function repositoryFromPullRequestUrl(reference) {
  const match = reference.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/([1-9]\d*)\/?$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

function positiveInteger(value, description) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${description} must be a positive integer.`);
  return value;
}

function stringField(value) {
  return typeof value === "string" ? value : "";
}

function bucketFor(status, conclusion) {
  if (status !== "completed") return "pending";
  if (conclusion === "success" || conclusion === "neutral") return "pass";
  if (conclusion === "skipped") return "skipping";
  if (conclusion === "cancelled" || conclusion === "stale") return "cancel";
  return "fail";
}

function normalizeWorkflowRun(run, index, headSha) {
  if (!run || typeof run !== "object") throw new Error(`Workflow run at index ${index} must be an object.`);
  const normalized = {
    id: positiveInteger(run.id, `Workflow run at index ${index} id`),
    workflowId: positiveInteger(run.workflow_id, `Workflow run ${run.id || index} workflow_id`),
    runNumber: positiveInteger(run.run_number, `Workflow run ${run.id || index} run_number`),
    runAttempt: positiveInteger(run.run_attempt, `Workflow run ${run.id || index} run_attempt`),
    name: stringField(run.name),
    path: stringField(run.path),
    event: stringField(run.event),
    status: stringField(run.status),
    conclusion: run.conclusion === null ? null : stringField(run.conclusion),
    headSha: stringField(run.head_sha),
    link: stringField(run.html_url),
  };
  if (normalized.headSha.toLowerCase() !== headSha.toLowerCase()) {
    throw new Error(`Workflow run ${normalized.id} is not bound to PR head SHA '${headSha}'.`);
  }
  if (!normalized.name || !normalized.path || !normalized.event || !normalized.status) {
    throw new Error(`Workflow run ${normalized.id} has incomplete identity metadata.`);
  }
  return normalized;
}

function compareRunIdentity(left, right) {
  return compareTuple(
    [left.runNumber, left.runAttempt, left.id],
    [right.runNumber, right.runAttempt, right.id],
  );
}

function compareTuple(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function selectLatestWorkflowRuns(rawRuns, workflow, events, headSha) {
  if (!Array.isArray(rawRuns)) throw new Error("GitHub workflow-runs response must be an array.");
  const allowedEvents = new Set(events);
  const latest = new Map();
  rawRuns.forEach((rawRun, index) => {
    if (!rawRun || rawRun.path !== workflow.path || !allowedEvents.has(rawRun.event)) return;
    const run = normalizeWorkflowRun(rawRun, index, headSha);
    if (run.name !== workflow.name) throw new Error(`Workflow '${workflow.path}' reported unexpected name '${run.name}'.`);
    const identity = `${run.workflowId}\u0000${run.event}`;
    const previous = latest.get(identity);
    if (!previous || compareRunIdentity(run, previous) > 0) latest.set(identity, run);
  });
  return [...latest.values()];
}

function jobAttemptKey(run) {
  return `${run.id}:${run.runAttempt}`;
}

function normalizeJob(job, run, index) {
  if (!job || typeof job !== "object") throw new Error(`Job at index ${index} for run ${run.id} must be an object.`);
  const normalized = {
    id: positiveInteger(job.id, `Job at index ${index} for run ${run.id} id`),
    runId: positiveInteger(job.run_id, `Job ${job.id || index} run_id`),
    name: stringField(job.name),
    status: stringField(job.status),
    conclusion: job.conclusion === null ? null : stringField(job.conclusion),
    link: stringField(job.html_url),
  };
  if (normalized.runId !== run.id) throw new Error(`Job ${normalized.id} belongs to run ${normalized.runId}, expected ${run.id}.`);
  if (!normalized.name || !normalized.status) throw new Error(`Job ${normalized.id} has incomplete identity metadata.`);
  return normalized;
}

function latestJobByName(rawJobs, run, name) {
  if (!Array.isArray(rawJobs)) throw new Error(`Jobs for run ${run.id} attempt ${run.runAttempt} must be an array.`);
  let latest = null;
  rawJobs.forEach((rawJob, index) => {
    if (!rawJob || rawJob.name !== name) return;
    const job = normalizeJob(rawJob, run, index);
    if (!latest || job.id > latest.id) latest = job;
  });
  return latest;
}

function workflowRunToExecutions(run, rawJobs, expectedNames, workflow) {
  return expectedNames.map((name) => {
    const job = latestJobByName(rawJobs, run, name);
    return {
      name,
      bucket: job ? bucketFor(job.status, job.conclusion) : run.status === "completed" ? "missing" : "pending",
      workflow: workflow.name,
      workflowPath: workflow.path,
      event: run.event,
      link: job?.link || run.link,
      runId: run.id,
      runNumber: run.runNumber,
      runAttempt: run.runAttempt,
      jobId: job?.id || 0,
    };
  });
}

function adaptWorkflowRuns({ rawRuns, jobsByAttempt, workflow, jobsByEvent, events, headSha }) {
  const latestRuns = selectLatestWorkflowRuns(rawRuns, workflow, events, headSha);
  return latestRuns.flatMap((run) => workflowRunToExecutions(
    run,
    jobsByAttempt.get(jobAttemptKey(run)) || [],
    jobsByEvent[run.event] || [],
    workflow,
  ));
}

function normalizeExecution(rawExecution, index) {
  if (!rawExecution || typeof rawExecution !== "object") throw new Error(`Execution at index ${index} must be an object.`);
  const execution = {
    name: stringField(rawExecution.name),
    bucket: stringField(rawExecution.bucket),
    workflow: stringField(rawExecution.workflow),
    workflowPath: stringField(rawExecution.workflowPath),
    event: stringField(rawExecution.event),
    link: stringField(rawExecution.link),
    runId: positiveInteger(rawExecution.runId, `Execution at index ${index} runId`),
    runNumber: positiveInteger(rawExecution.runNumber, `Execution at index ${index} runNumber`),
    runAttempt: positiveInteger(rawExecution.runAttempt, `Execution at index ${index} runAttempt`),
    jobId: Number.isInteger(rawExecution.jobId) && rawExecution.jobId >= 0 ? rawExecution.jobId : -1,
    index,
  };
  if (!execution.name || !execution.workflow || !execution.workflowPath || !execution.event || execution.jobId < 0) {
    throw new Error(`Execution at index ${index} has incomplete stable identity metadata.`);
  }
  if (!KNOWN_BUCKETS.has(execution.bucket)) throw new Error(`Execution '${execution.name}' has unsupported bucket '${execution.bucket || "<empty>"}'.`);
  return execution;
}

function executionIdentity(execution) {
  return `${execution.workflowPath}\u0000${execution.name}\u0000${execution.event}`;
}

function compareExecutionIdentity(left, right) {
  return compareTuple(
    [left.runNumber, left.runAttempt, left.runId, left.jobId],
    [right.runNumber, right.runAttempt, right.runId, right.jobId],
  );
}

function latestExecutions(rawExecutions) {
  const latest = new Map();
  rawExecutions.forEach((rawExecution, index) => {
    const execution = normalizeExecution(rawExecution, index);
    const identity = executionIdentity(execution);
    const previous = latest.get(identity);
    const comparison = previous ? compareExecutionIdentity(execution, previous) : 1;
    if (comparison > 0) latest.set(identity, execution);
    else if (comparison === 0 && (execution.bucket !== previous.bucket || execution.link !== previous.link)) {
      throw new Error(`Execution '${execution.name}' has conflicting data for the same stable run and job identity.`);
    }
  });
  return [...latest.values()];
}

function evaluateGovernance(rawExecutions) {
  if (!Array.isArray(rawExecutions)) throw new Error("GitHub governance executions must be an array.");
  const authoritativeEvents = new Set(AUTHORITATIVE_GOVERNANCE_EVENTS);
  const matching = rawExecutions.filter((execution) => execution
    && execution.workflowPath === GOVERNANCE_WORKFLOW.path
    && authoritativeEvents.has(execution.event)
    && GOVERNANCE_CHECK_NAMES.has(execution.name));
  const latest = latestExecutions(matching);
  const checks = GOVERNANCE_CHECKS.map((contract) => {
    const executions = latest.filter(({ name }) => name === contract.name);
    const skipped = executions.filter(({ bucket }) => bucket === "skipping");
    const applicable = executions.filter(({ bucket }) => bucket !== "skipping");
    let status = "missing";
    if (applicable.some(({ bucket }) => TERMINAL_FAILURE_BUCKETS.has(bucket))) status = "failed";
    else if (applicable.some(({ bucket }) => bucket === "pending")) status = "pending";
    else if (applicable.some(({ bucket }) => bucket === "missing")) status = "missing";
    else if (applicable.length && applicable.every(({ bucket }) => bucket === "pass")) status = "passed";
    return { ...contract, status, applicable, skipped };
  });
  const status = checks.some(({ status }) => status === "failed")
    ? "failed"
    : checks.some(({ status }) => status === "missing" || status === "pending")
      ? "waiting"
      : "passed";
  return { status, checks };
}

function isExternalCloudBuildExecution(execution) {
  return execution.workflowPath === "external/cloud-build" && /^Trigger: \S/.test(execution.name);
}

function evaluateFunctional(rawExecutions, { deferred = false } = {}) {
  if (!Array.isArray(rawExecutions)) throw new Error("GitHub functional executions must be an array.");
  if (deferred) return { status: "deferred", hasFailure: false, hasPending: false, applicable: [], skipped: [] };
  const matching = rawExecutions.filter((execution) => execution && (
    (execution.workflowPath === FUNCTIONAL_WORKFLOW.path && FUNCTIONAL_CHECK_NAMES.has(execution.name))
    || isExternalCloudBuildExecution(execution)
  ));
  const latest = latestExecutions(matching);
  const applicable = latest.filter(({ bucket }) => bucket !== "skipping");
  const skipped = latest.filter(({ bucket }) => bucket === "skipping");
  const hasFailure = applicable.some(({ bucket }) => TERMINAL_FAILURE_BUCKETS.has(bucket));
  const hasPending = applicable.some(({ bucket }) => bucket === "pending" || bucket === "missing");
  const status = hasFailure
    ? "failed"
    : hasPending
      ? "pending"
      : applicable.length && applicable.every(({ bucket }) => bucket === "pass")
        ? "passed"
        : "not-observed";
  return { status, hasFailure, hasPending, applicable, skipped };
}

function adaptExternalCheckRuns(rawCheckRuns) {
  if (!Array.isArray(rawCheckRuns)) throw new Error("GitHub check-runs response must be an array.");
  let latest = null;
  rawCheckRuns.forEach((checkRun, index) => {
    if (!checkRun || typeof checkRun.name !== "string" || !/^Trigger: \S/.test(checkRun.name)) return;
    const id = positiveInteger(checkRun.id, `External check run at index ${index} id`);
    if (!latest || id > latest.id) latest = { ...checkRun, id };
  });
  if (!latest) return [];
  return [{
    name: latest.name,
    bucket: bucketFor(stringField(latest.status), latest.conclusion === null ? null : stringField(latest.conclusion)),
    workflow: "External Cloud Build",
    workflowPath: "external/cloud-build",
    event: "check_run",
    link: stringField(latest.details_url),
    runId: latest.id,
    runNumber: latest.id,
    runAttempt: 1,
    jobId: latest.id,
  }];
}

async function waitForGovernance({ readObservation, timeoutMs, intervalMs, mode = "implementation", now = Date.now, sleep = delay, onWaiting = () => {} }) {
  const startedAt = now();
  while (true) {
    const observation = await readObservation();
    const governance = evaluateGovernance(observation.executions);
    const functional = evaluateFunctional(observation.executions, { deferred: mode === "stacked-preview" });
    if (governance.status === "failed") return { outcome: "governance-failed", observation, governance, functional };
    if (governance.status === "passed") return { outcome: "passed", observation, governance, functional };
    const elapsed = now() - startedAt;
    if (elapsed >= timeoutMs) return { outcome: "governance-timeout", observation, governance, functional };
    onWaiting({ observation, governance, functional, elapsed, timeoutMs });
    await sleep(Math.min(intervalMs, timeoutMs - elapsed));
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatReport(result) {
  const { observation, governance, functional, outcome } = result;
  const lines = [
    `PR: ${observation.pr.url}`,
    `Head SHA: ${observation.pr.headRefOid}`,
    `Base: ${observation.pr.baseRefName}@${observation.pr.baseRefOid}`,
    `Draft: ${observation.pr.isDraft}`,
    `Governance result: ${governanceLabel(outcome)}`,
  ];
  for (const check of governance.checks) {
    lines.push(`- ${check.name}: ${check.status.toUpperCase()} (${check.applicable.length} applicable, ${check.skipped.length} skipped)`);
    for (const execution of check.applicable) {
      lines.push(`  - ${execution.event} run ${execution.runNumber} attempt ${execution.runAttempt}: ${execution.bucket.toUpperCase()}${execution.link ? ` — ${execution.link}` : ""}`);
    }
  }
  lines.push(`Functional / Cloud Build status: ${functional.status.toUpperCase()}`);
  for (const execution of functional.applicable) lines.push(`- ${execution.name}: ${execution.bucket.toUpperCase()}${execution.link ? ` — ${execution.link}` : ""}`);
  if (functional.status === "deferred") lines.push("- Preview mode observes governance only; functional and Cloud Build checks are deferred until retargeting to development.");
  else if (!functional.applicable.length) lines.push("- No applicable functional or Cloud Build check is currently registered.");
  if (functional.hasPending) lines.push("Application tests may continue after this session.");
  if (functional.hasFailure) lines.push("Application tests have failed separately; the governance result and exit status are unchanged.");
  if (outcome === "passed" && functional.hasPending) lines.push("Governance checks passed, but the PR is not fully validated while application tests are still running.");
  else if (outcome === "passed") lines.push("Governance checks passed. Functional checks remain a separate validation category.");
  else if (outcome === "governance-timeout") lines.push("Timed out waiting for every expected governance check to appear and reach a terminal state. Inspect the missing or pending runs above.");
  else lines.push("Governance checks failed. Inspect the failed governance runs before any metadata-only repair or new implementation invocation.");
  return lines.join("\n");
}

function governanceLabel(outcome) {
  if (outcome === "passed") return "PASSED";
  if (outcome === "governance-failed") return "FAILED";
  return "TIMED OUT";
}

function waitingMessage({ governance, elapsed, timeoutMs }) {
  const unresolved = governance.checks.filter(({ status }) => status !== "passed").map(({ name, status }) => `${name}=${status}`).join(", ");
  return `Waiting for governance checks (${Math.floor(elapsed / 1000)}s/${Math.floor(timeoutMs / 1000)}s): ${unresolved}`;
}

function runGhJson(args) {
  const result = childProcess.spawnSync("gh", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 30_000 });
  if (result.error) throw new Error(`Unable to run GitHub CLI: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`GitHub CLI command failed with exit ${result.status}: ${(result.stderr || "").trim() || args.join(" ")}`);
  const output = (result.stdout || "").trim();
  if (!output) throw new Error(`GitHub CLI returned no JSON for: gh ${args.join(" ")}`);
  try { return JSON.parse(output); } catch { throw new Error(`GitHub CLI returned malformed JSON for: gh ${args.join(" ")}`); }
}

function repoArguments(repo) {
  return repo ? ["--repo", repo] : [];
}

function resolvePullRequest(reference, repo, mode = "implementation") {
  const pr = runGhJson(["pr", "view", reference, ...repoArguments(repo), "--json", "number,url,headRefOid,headRefName,baseRefOid,baseRefName,isDraft"]);
  if (!pr || !Number.isInteger(pr.number) || !pr.url || !/^[a-f\d]{40}$/i.test(pr.headRefOid || "") || !/^[a-f\d]{40}$/i.test(pr.baseRefOid || "") || !pr.headRefName || !pr.baseRefName || typeof pr.isDraft !== "boolean") {
    throw new Error("GitHub CLI returned incomplete pull request identity metadata.");
  }
  if (mode === "implementation" && (pr.baseRefName !== "development" || ["development", "staging", "main"].includes(pr.headRefName))) {
    throw new Error(`Expected an implementation PR into development, received '${pr.headRefName}' -> '${pr.baseRefName}'.`);
  }
  if (mode === "stacked-preview") {
    if (!pr.isDraft) throw new Error("Expected a draft stacked child preview.");
    if (repositoryPolicy.classifyPullRequest(pr.headRefName, pr.baseRefName).type !== "stacked-child-preview") {
      throw new Error(`Expected a governed stacked child preview, received '${pr.headRefName}' -> '${pr.baseRefName}'.`);
    }
  }
  return pr;
}

function readApiPages(repo, endpoint, arrayProperty) {
  const values = [];
  for (let page = 1; page <= MAX_API_PAGES; page += 1) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = runGhJson(["api", `repos/${repo}/${endpoint}${separator}per_page=100&page=${page}`]);
    const current = response?.[arrayProperty];
    if (!Array.isArray(current)) throw new Error(`GitHub API response for '${endpoint}' has no '${arrayProperty}' array.`);
    values.push(...current);
    if (current.length < 100) return values;
  }
  throw new Error(`GitHub API response for '${endpoint}' exceeds the ${MAX_API_PAGES}-page observation limit.`);
}

function readWorkflowRuns(repo, headSha) {
  return readApiPages(repo, `actions/runs?head_sha=${encodeURIComponent(headSha)}`, "workflow_runs");
}

function readJobsForRuns(repo, runs) {
  const jobsByAttempt = new Map();
  for (const run of runs) {
    const jobs = run.status === "queued"
      ? []
      : readApiPages(repo, `actions/runs/${run.id}/attempts/${run.runAttempt}/jobs`, "jobs");
    jobsByAttempt.set(jobAttemptKey(run), jobs);
  }
  return jobsByAttempt;
}

function readExternalCheckRuns(repo, headSha) {
  return readApiPages(repo, `commits/${headSha}/check-runs`, "check_runs");
}

function samePullRequest(left, right) {
  return left.number === right.number
    && left.url === right.url
    && left.headRefOid.toLowerCase() === right.headRefOid.toLowerCase()
    && left.headRefName === right.headRefName
    && left.baseRefOid.toLowerCase() === right.baseRefOid.toLowerCase()
    && left.baseRefName === right.baseRefName
    && left.isDraft === right.isDraft;
}

function createLiveObservationReader(reference, repo, initialPr, adapter = {}, mode = "implementation") {
  const dependencies = {
    resolvePullRequest: adapter.resolvePullRequest || resolvePullRequest,
    readWorkflowRuns: adapter.readWorkflowRuns || readWorkflowRuns,
    readJobsForRuns: adapter.readJobsForRuns || readJobsForRuns,
    readExternalCheckRuns: adapter.readExternalCheckRuns || readExternalCheckRuns,
  };
  return async () => {
    const before = dependencies.resolvePullRequest(reference, repo, mode);
    if (!samePullRequest(initialPr, before)) throw new Error("Pull request head, base, or draft state changed before governance observation. Start a new finalization invocation for the new snapshot.");
    const rawRuns = dependencies.readWorkflowRuns(repo, before.headRefOid);
    const governanceRuns = selectLatestWorkflowRuns(rawRuns, GOVERNANCE_WORKFLOW, AUTHORITATIVE_GOVERNANCE_EVENTS, before.headRefOid);
    const functionalRuns = mode === "stacked-preview" ? [] : selectLatestWorkflowRuns(rawRuns, FUNCTIONAL_WORKFLOW, Object.keys(FUNCTIONAL_JOBS_BY_EVENT), before.headRefOid);
    const jobsByAttempt = dependencies.readJobsForRuns(repo, [...governanceRuns, ...functionalRuns]);
    const executions = [
      ...adaptWorkflowRuns({ rawRuns, jobsByAttempt, workflow: GOVERNANCE_WORKFLOW, jobsByEvent: GOVERNANCE_JOBS_BY_EVENT, events: AUTHORITATIVE_GOVERNANCE_EVENTS, headSha: before.headRefOid }),
      ...(mode === "stacked-preview" ? [] : adaptWorkflowRuns({ rawRuns, jobsByAttempt, workflow: FUNCTIONAL_WORKFLOW, jobsByEvent: FUNCTIONAL_JOBS_BY_EVENT, events: Object.keys(FUNCTIONAL_JOBS_BY_EVENT), headSha: before.headRefOid })),
      ...(mode === "stacked-preview" ? [] : adaptExternalCheckRuns(dependencies.readExternalCheckRuns(repo, before.headRefOid))),
    ];
    const after = dependencies.resolvePullRequest(reference, repo, mode);
    if (!samePullRequest(before, after)) throw new Error("Pull request head, base, or draft state changed while GitHub run identities were being read. Start a new finalization invocation for the new snapshot.");
    return { pr: after, executions };
  };
}

async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArguments(argv);
    let repo = options.repo || repositoryFromPullRequestUrl(options.reference) || undefined;
    const initialPr = resolvePullRequest(options.reference, repo, options.mode);
    repo ||= repositoryFromPullRequestUrl(initialPr.url);
    if (!repo) throw new Error("Unable to resolve OWNER/REPO from pull request metadata.");
    const result = await waitForGovernance({
      readObservation: createLiveObservationReader(options.reference, repo, initialPr, {}, options.mode),
      timeoutMs: options.timeoutSeconds * 1000,
      intervalMs: options.intervalSeconds * 1000,
      mode: options.mode,
      onWaiting: (state) => console.error(waitingMessage(state)),
    });
    console.log(formatReport(result));
    if (result.outcome === "passed") return EXIT_CODES.passed;
    if (result.outcome === "governance-failed") return EXIT_CODES.governanceFailed;
    return EXIT_CODES.governanceTimeout;
  } catch (error) {
    console.error(`Governance observer error: ${error.message}`);
    return EXIT_CODES.observerError;
  }
}

if (require.main === module) main().then((exitCode) => { process.exitCode = exitCode; });

module.exports = {
  AUTHORITATIVE_GOVERNANCE_EVENTS,
  EXIT_CODES,
  FUNCTIONAL_CHECKS,
  FUNCTIONAL_JOBS_BY_EVENT,
  FUNCTIONAL_WORKFLOW,
  GOVERNANCE_CHECKS,
  GOVERNANCE_JOBS_BY_EVENT,
  GOVERNANCE_WORKFLOW,
  OBSERVATION_MODES,
  adaptExternalCheckRuns,
  adaptWorkflowRuns,
  bucketFor,
  createLiveObservationReader,
  evaluateFunctional,
  evaluateGovernance,
  formatReport,
  jobAttemptKey,
  latestExecutions,
  main,
  parseArguments,
  repositoryFromPullRequestUrl,
  resolvePullRequest,
  samePullRequest,
  selectLatestWorkflowRuns,
  waitForGovernance,
  waitingMessage,
};
