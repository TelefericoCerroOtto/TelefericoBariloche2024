const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const observer = require("./wait-for-implementation-governance.js");

const workflowPath = path.join(__dirname, "..", "workflows", "backlog-governance.yml");
const functionalWorkflowPath = path.join(__dirname, "..", "workflows", "cloud-build-playwright-dispatch.yml");
const scriptPath = path.join(__dirname, "wait-for-implementation-governance.js");
const headSha = "a".repeat(40);
const pr = {
  number: 278,
  url: "https://github.com/acme/teleferico/pull/278",
  headRefOid: headSha,
  headRefName: "fix/root-tb-128-governance-wait",
  baseRefName: "development",
};

function workflowRun(overrides = {}) {
  const workflow = overrides.workflow || observer.GOVERNANCE_WORKFLOW;
  return {
    id: 100,
    workflow_id: workflow === observer.GOVERNANCE_WORKFLOW ? 10 : 20,
    run_number: 1,
    run_attempt: 1,
    name: workflow.name,
    path: workflow.path,
    event: "pull_request_target",
    status: "completed",
    conclusion: "success",
    head_sha: headSha,
    html_url: "https://github.com/acme/teleferico/actions/runs/100",
    ...overrides,
  };
}

function job(name, overrides = {}) {
  return {
    id: overrides.id || 1,
    run_id: overrides.run_id || 100,
    name,
    status: "completed",
    conclusion: "success",
    html_url: `https://github.com/acme/teleferico/actions/runs/${overrides.run_id || 100}/job/${overrides.id || 1}`,
    ...overrides,
  };
}

function execution(name, bucket = "pass", overrides = {}) {
  const { workflow: workflowOverride, ...executionOverrides } = overrides;
  const workflow = workflowOverride || observer.GOVERNANCE_WORKFLOW;
  return {
    name,
    bucket,
    workflow: workflow.name,
    workflowPath: workflow.path,
    event: "pull_request_target",
    link: "https://github.com/acme/teleferico/actions/runs/100",
    runId: 100,
    runNumber: 1,
    runAttempt: 1,
    jobId: 1,
    ...executionOverrides,
  };
}

function governanceSet(bucket = "pass", overrides = {}) {
  return observer.GOVERNANCE_CHECKS.map(({ name }, index) => execution(name, bucket, { jobId: index + 1, ...overrides }));
}

function observation(executions) {
  return { pr, executions };
}

function jobsFor(runId, definitions = {}) {
  return observer.GOVERNANCE_CHECKS.map(({ name }, index) => job(name, {
    id: runId * 10 + index,
    run_id: runId,
    ...(definitions[name] || {}),
  }));
}

function jobBlock(workflow, jobId) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => line === `  ${jobId}:`);
  assert.notEqual(start, -1, `Expected workflow job '${jobId}'.`);
  const nextJob = lines.findIndex((line, index) => index > start && /^  [a-zA-Z0-9_-]+:$/.test(line));
  return lines.slice(start, nextJob === -1 ? undefined : nextJob).join("\n");
}

test("governance identity and authoritative event contracts match the workflow", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /^name: Backlog governance$/m);
  assert.deepEqual(observer.GOVERNANCE_CHECKS, [
    { jobId: "governance-tests", name: "Governance tests" },
    { jobId: "validate-pr-policy", name: "validate-pr-policy" },
    { jobId: "trusted-pr-sync", name: "trusted-pr-sync" },
  ]);
  assert.deepEqual(observer.AUTHORITATIVE_GOVERNANCE_EVENTS, ["pull_request", "pull_request_target"]);
  assert.match(workflow, /^  pull_request:$/m);
  assert.match(workflow, /^  pull_request_target:$/m);
  assert.deepEqual(observer.GOVERNANCE_JOBS_BY_EVENT, {
    pull_request: ["Governance tests"],
    pull_request_target: ["Governance tests", "validate-pr-policy", "trusted-pr-sync"],
  });
  for (const contract of observer.GOVERNANCE_CHECKS) {
    const block = jobBlock(workflow, contract.jobId);
    const explicitName = block.match(/^    name:\s*(.+)$/m)?.[1]?.trim();
    assert.equal(explicitName || contract.jobId, contract.name, `${contract.jobId} check name drifted`);
  }
});

test("functional metadata matches the separate Cloud Build workflow", () => {
  const workflow = fs.readFileSync(functionalWorkflowPath, "utf8");
  assert.match(workflow, /^name: Dispatch Cloud Build Playwright$/m);
  assert.deepEqual(observer.FUNCTIONAL_CHECKS, [
    { jobId: "validate-trusted-pr", name: "validate-trusted-pr" },
    { jobId: "dispatch-and-wait", name: "dispatch-and-wait" },
  ]);
  for (const contract of observer.FUNCTIONAL_CHECKS) {
    const block = jobBlock(workflow, contract.jobId);
    const explicitName = block.match(/^    name:\s*(.+)$/m)?.[1]?.trim();
    assert.equal(explicitName || contract.jobId, contract.name, `${contract.jobId} check name drifted`);
  }
});

test("accepts a PR number or URL and bounded polling options", () => {
  assert.deepEqual(observer.parseArguments(["278"]), { timeoutSeconds: 300, intervalSeconds: 5, repo: undefined, reference: "278" });
  assert.deepEqual(observer.parseArguments([pr.url, "--timeout-seconds", "0", "--interval-seconds", "0.25"]), {
    timeoutSeconds: 0,
    intervalSeconds: 0.25,
    repo: undefined,
    reference: pr.url,
  });
  assert.equal(observer.repositoryFromPullRequestUrl(pr.url), "acme/teleferico");
});

test("rejects ambiguous references and invalid polling bounds", () => {
  assert.throws(() => observer.parseArguments([]), /Provide an implementation PR/);
  assert.throws(() => observer.parseArguments(["branch-name"]), /number or a https/);
  assert.throws(() => observer.parseArguments(["0"]), /number or a https/);
  assert.throws(() => observer.parseArguments(["278", "279"]), /exactly one/);
  assert.throws(() => observer.parseArguments(["278", "--timeout-seconds", "-1"]), /non-negative/);
  assert.throws(() => observer.parseArguments(["278", "--interval-seconds", "0"]), /positive/);
  assert.throws(() => observer.parseArguments([pr.url, "--repo", "other/repo"]), /does not match/);
});

test("adapter selects a newly queued rerun with null start metadata over an older pass", () => {
  const oldRun = workflowRun({ id: 100, run_number: 10 });
  const queuedRun = workflowRun({
    id: 200,
    run_number: 11,
    status: "queued",
    conclusion: null,
    created_at: "2026-09-10T11:00:00Z",
    run_started_at: null,
  });
  const jobsByAttempt = new Map([[observer.jobAttemptKey({ id: 100, runAttempt: 1 }), jobsFor(100)]]);
  const executions = observer.adaptWorkflowRuns({
    rawRuns: [oldRun, queuedRun],
    jobsByAttempt,
    workflow: observer.GOVERNANCE_WORKFLOW,
    jobsByEvent: observer.GOVERNANCE_JOBS_BY_EVENT,
    events: observer.AUTHORITATIVE_GOVERNANCE_EVENTS,
    headSha,
  });
  assert.ok(executions.every(({ runId, bucket }) => runId === 200 && bucket === "pending"));
  assert.equal(observer.evaluateGovernance(executions).status, "waiting");
});

test("adapter selects the newest stable run attempt without timestamp ordering", () => {
  const attemptOne = workflowRun({ id: 300, run_number: 12, run_attempt: 1 });
  const attemptTwo = workflowRun({ id: 300, run_number: 12, run_attempt: 2, run_started_at: null });
  const jobsByAttempt = new Map([
    ["300:1", jobsFor(300)],
    ["300:2", jobsFor(300, { "Governance tests": { conclusion: "failure" } })],
  ]);
  const executions = observer.adaptWorkflowRuns({
    rawRuns: [attemptOne, attemptTwo],
    jobsByAttempt,
    workflow: observer.GOVERNANCE_WORKFLOW,
    jobsByEvent: observer.GOVERNANCE_JOBS_BY_EVENT,
    events: observer.AUTHORITATIVE_GOVERNANCE_EVENTS,
    headSha,
  });
  assert.ok(executions.every(({ runAttempt }) => runAttempt === 2));
  assert.equal(observer.evaluateGovernance(executions).status, "failed");
});

test("workflow_dispatch governance previews are never authoritative", () => {
  const preview = workflowRun({ id: 999, run_number: 999, event: "workflow_dispatch", status: "in_progress", conclusion: null });
  assert.deepEqual(observer.selectLatestWorkflowRuns(
    [preview],
    observer.GOVERNANCE_WORKFLOW,
    observer.AUTHORITATIVE_GOVERNANCE_EVENTS,
    headSha,
  ), []);
  assert.equal(observer.evaluateGovernance([
    ...governanceSet(),
    execution("Governance tests", "fail", { event: "workflow_dispatch", runId: 999, runNumber: 999 }),
  ]).status, "passed");
});

test("latest skipped rerun replaces an older pass without creating false success", () => {
  const oldRun = workflowRun({ id: 100, run_number: 10 });
  const newRun = workflowRun({ id: 200, run_number: 11 });
  const jobsByAttempt = new Map([
    ["100:1", jobsFor(100)],
    ["200:1", jobsFor(200, { "validate-pr-policy": { conclusion: "skipped" } })],
  ]);
  const executions = observer.adaptWorkflowRuns({
    rawRuns: [oldRun, newRun],
    jobsByAttempt,
    workflow: observer.GOVERNANCE_WORKFLOW,
    jobsByEvent: observer.GOVERNANCE_JOBS_BY_EVENT,
    events: observer.AUTHORITATIVE_GOVERNANCE_EVENTS,
    headSha,
  });
  const result = observer.evaluateGovernance(executions);
  assert.equal(result.status, "waiting");
  assert.equal(result.checks.find(({ name }) => name === "validate-pr-policy").status, "missing");
  assert.ok(executions.every(({ runId }) => runId === 200));
});

test("duplicate pull_request and pull_request_target executions both count", () => {
  const target = governanceSet();
  const pullRequest = execution("Governance tests", "pending", { event: "pull_request", runId: 200, runNumber: 2 });
  assert.equal(observer.evaluateGovernance([...target, pullRequest]).status, "waiting");
  pullRequest.bucket = "fail";
  assert.equal(observer.evaluateGovernance([...target, pullRequest]).status, "failed");
});

test("missing checks wait; pending checks block; failure and cancellation fail", () => {
  assert.equal(observer.evaluateGovernance([]).status, "waiting");
  assert.deepEqual(observer.evaluateGovernance([]).checks.map(({ status }) => status), ["missing", "missing", "missing"]);
  const pending = governanceSet();
  pending[1] = execution("validate-pr-policy", "pending", { jobId: 2 });
  assert.equal(observer.evaluateGovernance(pending).status, "waiting");
  for (const bucket of ["fail", "cancel"]) {
    const failed = governanceSet();
    failed[2] = execution("trusted-pr-sync", bucket, { jobId: 3 });
    assert.equal(observer.evaluateGovernance(failed).status, "failed");
  }
});

test("a skipped duplicate does not satisfy a missing check or fail an applicable pass", () => {
  const skippedOnly = [execution("Governance tests"), execution("validate-pr-policy", "skipping"), execution("trusted-pr-sync", "skipping")];
  assert.deepEqual(observer.evaluateGovernance(skippedOnly).checks.map(({ status }) => status), ["passed", "missing", "missing"]);
  assert.equal(observer.evaluateGovernance([
    ...governanceSet(),
    execution("validate-pr-policy", "skipping", { event: "pull_request", runId: 200, runNumber: 2 }),
  ]).status, "passed");
});

test("pending dispatch-and-wait is reported without blocking governance", async () => {
  const functional = execution("dispatch-and-wait", "pending", { workflow: observer.FUNCTIONAL_WORKFLOW, jobId: 5 });
  const result = await observer.waitForGovernance({
    readObservation: async () => observation([...governanceSet(), functional]),
    timeoutMs: 100,
    intervalMs: 10,
  });
  assert.equal(result.outcome, "passed");
  assert.equal(result.functional.status, "pending");
  assert.match(observer.formatReport(result), /Application tests may continue after this session/);
  assert.match(observer.formatReport(result), /not fully validated/);
});

test("failed dispatch-and-wait is separate from governance exit status", async () => {
  const functional = execution("dispatch-and-wait", "fail", { workflow: observer.FUNCTIONAL_WORKFLOW, jobId: 5 });
  const result = await observer.waitForGovernance({
    readObservation: async () => observation([...governanceSet(), functional]),
    timeoutMs: 100,
    intervalMs: 10,
  });
  assert.equal(result.outcome, "passed");
  assert.equal(result.functional.status, "failed");
  assert.match(observer.formatReport(result), /failed separately/);
  assert.match(observer.formatReport(result), /Governance result: PASSED/);
});

test("external Cloud Build adapter selects the greatest stable check-run id", () => {
  const executions = observer.adaptExternalCheckRuns([
    { id: 100, name: "Trigger: old", status: "completed", conclusion: "failure", started_at: "2026-09-10T12:00:00Z" },
    { id: 200, name: "Trigger: new", status: "queued", conclusion: null, started_at: null },
  ]);
  assert.equal(executions.length, 1);
  assert.equal(executions[0].runId, 200);
  assert.equal(executions[0].bucket, "pending");
});

test("polling waits through partial registration until governance passes", async () => {
  const observations = [observation([]), observation(governanceSet("pending")), observation(governanceSet())];
  let reads = 0;
  let time = 0;
  const result = await observer.waitForGovernance({
    readObservation: async () => observations[reads++],
    timeoutMs: 100,
    intervalMs: 10,
    now: () => time,
    sleep: async (milliseconds) => { time += milliseconds; },
  });
  assert.equal(result.outcome, "passed");
  assert.equal(reads, 3);
});

test("bounded timeout reports undiscovered or nonterminal governance", async () => {
  let time = 0;
  const result = await observer.waitForGovernance({
    readObservation: async () => observation([]),
    timeoutMs: 25,
    intervalMs: 10,
    now: () => time,
    sleep: async (milliseconds) => { time += milliseconds; },
  });
  assert.equal(result.outcome, "governance-timeout");
  assert.equal(time, 25);
  assert.match(observer.formatReport(result), /Timed out waiting/);
});

test("live reader rejects a head change before observation", async () => {
  let workflowReads = 0;
  const changed = { ...pr, headRefOid: "b".repeat(40) };
  const read = observer.createLiveObservationReader("278", "acme/teleferico", pr, {
    resolvePullRequest: () => changed,
    readWorkflowRuns: () => { workflowReads += 1; return []; },
    readJobsForRuns: () => new Map(),
    readExternalCheckRuns: () => [],
  });
  await assert.rejects(read(), /head changed before governance observation/);
  assert.equal(workflowReads, 0);
});

test("live reader rejects a head change between observation and final identity read", async () => {
  const changed = { ...pr, headRefOid: "b".repeat(40) };
  const identities = [pr, changed];
  const read = observer.createLiveObservationReader("278", "acme/teleferico", pr, {
    resolvePullRequest: () => identities.shift(),
    readWorkflowRuns: () => [],
    readJobsForRuns: () => new Map(),
    readExternalCheckRuns: () => [],
  });
  await assert.rejects(read(), /head changed while GitHub run identities were being read/);
});

test("malformed stable identities fail closed", () => {
  assert.throws(() => observer.selectLatestWorkflowRuns([
    workflowRun({ id: null }),
  ], observer.GOVERNANCE_WORKFLOW, observer.AUTHORITATIVE_GOVERNANCE_EVENTS, headSha), /positive integer/);
  assert.throws(() => observer.evaluateGovernance([
    execution("Governance tests", "pass", { runId: 0 }),
  ]), /positive integer/);
});

test("machine-stable exit codes remain unchanged", () => {
  assert.deepEqual(observer.EXIT_CODES, { passed: 0, governanceFailed: 1, governanceTimeout: 2, observerError: 3 });
});

test("the executable CLI returns observer-error for invalid usage", () => {
  assert.notEqual(fs.statSync(scriptPath).mode & 0o111, 0);
  const result = childProcess.spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
  assert.equal(result.status, observer.EXIT_CODES.observerError);
  assert.match(result.stderr, /^Governance observer error: Provide an implementation PR number or URL\./);
});
