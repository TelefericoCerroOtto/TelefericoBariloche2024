const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  APP_ROOT,
  WITHHELD_OUTPUT_NOTE,
  VITEST_TIMEOUT_MS,
  classifyCandidateScope,
  main,
  parseArguments,
  runPostPrVitest,
} = require("./implementation-pr-vitest.js");

const repositoryRoot = path.join(__dirname, "..", "..");
const docsOnlyPaths = ["teleferico-app/README.md", "teleferico-app/docs/setup.mdx"];
const cmsOnlyPaths = ["teleferico-cms/README.md", "teleferico-cms/src/api/page/index.ts"];
const appSourceAndDocsPaths = ["teleferico-app/README.md", "teleferico-app/src/app/page.tsx"];

test("requires PR confirmation and candidate paths; rejects invalid and legacy options", () => {
  assert.throws(() => parseArguments([]), /--pr-created is required/);
  assert.throws(() => parseArguments(["--pr-created", "--pr-created"]), /Unknown or repeated option/);
  assert.throws(() => parseArguments(["--pr-created", "--all"]), /Unknown or repeated option/);
  assert.throws(() => parseArguments(["--pr-created", "--candidate-path"]), /requires a repository-relative path/);
  assert.throws(() => parseArguments(["--pr-created"]), /complete non-empty candidate path inventory/);
  assert.throws(() => parseArguments(["--pr-created", "--app-touched"]), /Unknown or repeated option/);
  assert.throws(() => parseArguments(["--pr-created", "--ci-runs-vitest"]), /Unknown or repeated option/);
});

test("classifies app Markdown-only candidates as documentation and skips Vitest", () => {
  assert.equal(classifyCandidateScope(docsOnlyPaths), "app-docs-only");
  let spawnCount = 0;
  const report = runPostPrVitest({ prCreated: true, candidatePaths: docsOnlyPaths, spawn: () => { spawnCount += 1; } });

  assert.equal(spawnCount, 0);
  assert.equal(report.status, "skipped");
  assert.equal(report.scope, "app-docs-only");
  assert.equal(report.reason, "Candidate inventory contains only app Markdown documentation.");
});

test("skips CMS-only candidates without launching a process", () => {
  assert.equal(classifyCandidateScope(cmsOnlyPaths), "non-app");
  let spawnCount = 0;
  const report = runPostPrVitest({ prCreated: true, candidatePaths: cmsOnlyPaths, spawn: () => { spawnCount += 1; } });

  assert.equal(spawnCount, 0);
  assert.equal(report.status, "skipped");
  assert.equal(report.scope, "non-app");
  assert.equal(report.reason, "Candidate inventory does not include teleferico-app.");
});

test("runs once for app source mixed with documentation and records a pass", () => {
  assert.equal(classifyCandidateScope(appSourceAndDocsPaths), "app-executable-or-unknown");
  const calls = [];
  const report = runPostPrVitest({
    prCreated: true,
    candidatePaths: appSourceAndDocsPaths,
    spawn: (...args) => {
      calls.push(args);
      return { status: 0 };
    },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), ["pnpm", ["run", "test"]]);
  assert.equal(calls[0][2].cwd, APP_ROOT);
  assert.equal(calls[0][2].timeout, VITEST_TIMEOUT_MS);
  assert.equal(report.status, "passed");
  assert.equal(report.runs, 1);
  assert.equal(report.exit_code, 0);
  assert.equal(report.scope, "app-executable-or-unknown");
});

test("unknown app file types conservatively trigger the app suite", () => {
  const report = runPostPrVitest({
    prCreated: true,
    candidatePaths: ["teleferico-app/unknown.data"],
    spawn: () => ({ status: 0 }),
  });

  assert.equal(report.status, "passed");
  assert.equal(report.scope, "app-executable-or-unknown");
  assert.equal(report.runs, 1);
});

test("rejects unsafe, duplicate, or empty candidate paths", () => {
  assert.throws(() => classifyCandidateScope(["teleferico-app/../secret.md"]), /normalized repository-relative/);
  assert.throws(() => classifyCandidateScope(["teleferico-app\\README.md"]), /normalized repository-relative/);
  assert.throws(() => classifyCandidateScope(["teleferico-app/README.md", "teleferico-app/README.md"]), /Duplicate candidate path/);
  assert.throws(() => classifyCandidateScope([]), /complete non-empty candidate path inventory/);
});

test("withholds all raw process output from failure evidence", () => {
  const secretMarker = "sensitive-test-output-marker";
  const report = runPostPrVitest({
    prCreated: true,
    candidatePaths: appSourceAndDocsPaths,
    spawn: () => ({ status: 1, stdout: `failure ${secretMarker}`, stderr: secretMarker }),
  });

  assert.equal(report.status, "failed");
  assert.equal(report.attribution, "unclassified");
  assert.equal(report.exit_code, 1);
  assert.deepEqual(report.failure_evidence, {
    spawn_category: "process-exit",
    signal: null,
    exit_code: 1,
    note: WITHHELD_OUTPUT_NOTE,
  });
  assert.equal(JSON.stringify(report).includes(secretMarker), false);
});

test("reports Vitest failure in JSON but exits successfully so the workflow can continue", () => {
  let stdout = "";
  const previousWrite = process.stdout.write;
  process.stdout.write = (chunk) => { stdout += chunk; return true; };
  try {
    const exitCode = main(["--pr-created", "--candidate-path", "teleferico-app/src/app/page.tsx"], {
      spawn: () => ({ status: 1, stdout: "test detail", stderr: "private detail" }),
    });
    assert.equal(exitCode, 0);
  } finally {
    process.stdout.write = previousWrite;
  }

  const report = JSON.parse(stdout);
  assert.equal(report.status, "failed");
  assert.equal(report.exit_code, 1);
  assert.equal(report.runs, 1);
  assert.equal(stdout.includes("private detail"), false);
});

test("keeps execution infrastructure errors distinct and non-zero", () => {
  let stdout = "";
  const previousWrite = process.stdout.write;
  process.stdout.write = (chunk) => { stdout += chunk; return true; };
  try {
    assert.equal(main(["--pr-created", "--candidate-path", "teleferico-app/src/app/page.tsx"], {
      spawn: () => ({ status: null, signal: "SIGTERM", stdout: "", stderr: "" }),
    }), 2);
  } finally {
    process.stdout.write = previousWrite;
  }
  const report = JSON.parse(stdout);
  assert.equal(report.status, "error");
  assert.deepEqual(report.failure_evidence, {
    spawn_category: "signaled",
    signal: "SIGTERM",
    exit_code: null,
    note: WITHHELD_OUTPUT_NOTE,
  });
});

test("classifies a bounded Vitest timeout as infrastructure error without retrying", () => {
  let calls = 0;
  const report = runPostPrVitest({
    prCreated: true,
    candidatePaths: appSourceAndDocsPaths,
    spawn: () => {
      calls += 1;
      return { status: null, signal: "SIGTERM", error: Object.assign(new Error("private timeout detail"), { code: "ETIMEDOUT" }) };
    },
  });

  assert.equal(calls, 1);
  assert.equal(report.status, "error");
  assert.deepEqual(report.failure_evidence, {
    spawn_category: "timeout",
    signal: "SIGTERM",
    exit_code: null,
    note: WITHHELD_OUTPUT_NOTE,
  });
  assert.equal(JSON.stringify(report).includes("private timeout detail"), false);
});

test("implementation instructions run governance observation before post-PR Vitest", () => {
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");
  const skillExecution = skill.split("## Execution Steps")[1].split("## Output Contract")[0];

  assert.ok(skillExecution.indexOf("wait-for-implementation-governance.js") < skillExecution.indexOf("implementation-pr-vitest.js"));
  assert.ok(skillExecution.includes("regardless of the governance helper's exit code"));
  assert.ok(command.indexOf("wait-for-implementation-governance.js") < command.indexOf("implementation-pr-vitest.js"));
  assert.ok(skillExecution.indexOf("Apply any required PR metadata") < skillExecution.indexOf("wait-for-implementation-governance.js"));
  assert.ok(command.indexOf("apply any required PR metadata") < command.indexOf("wait-for-implementation-governance.js"));
  assert.match(skillExecution, /active branch still equals the branch captured in the snapshot/);
  assert.match(skillExecution, /captured typed plan/);
});

test("mapper snapshot contract preserves v2 compatibility and validates known arrays", () => {
  const mapper = fs.readFileSync(path.join(repositoryRoot, ".opencode", "agents", "delivery-state-mapper.md"), "utf8");
  assert.match(mapper, /^reasoningEffort: medium$/m);
  assert.match(mapper, /paths: string\[\]/);
  assert.match(mapper, /ambiguity_codes: string\[\]/);
  assert.match(mapper, /blocker_codes: string\[\]/);
  assert.match(mapper, /evidence: Array</);
  assert.match(mapper, /capability: object, remote_head: object/);
  assert.match(mapper, /tracking: \{ mode: "tracked" \| "no-backlog" \| "none" \| "ambiguous", work_id, evidence_state \}/);
  assert.doesNotMatch(mapper, /evidence_state:\s*"/);
  assert.doesNotMatch(mapper, /never add or omit fields/);
  assert.match(mapper, /verify that the output parses as one `delivery-state-snapshot\.v2` JSON object/);
  assert.match(mapper, /keep previously unspecified fields flexible/);
  assert.match(mapper, /complete exact sorted inventory/);
  assert.match(mapper, /path_count` equals `paths\.length`/);
  assert.match(mapper, /candidate paths are unique and lexicographically sorted/);
  assert.match(mapper, /at most 12 entries/);
  assert.match(mapper, /only once, narrowly/);
});

test("publication contract permits only explicit natural-language scope approval and safe continuation", () => {
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");
  const governance = fs.readFileSync(path.join(repositoryRoot, "AGENTS.md"), "utf8");
  const policy = fs.readFileSync(path.join(repositoryRoot, "docs", "backlog-branch-pr-policy.md"), "utf8");

  for (const contract of [skill, command, governance, policy]) {
    assert.match(contract, /natural-language/);
    assert.match(contract, /non-sensitive/);
    assert.match(contract, /fresh classification and (?:fresh )?(?:explicit )?authorization/);
  }
  assert.match(skill, /commit the captured candidate, non-force-push `HEAD` to `origin`, and create one implementation PR/);
  assert.match(skill, /destination, target, and operation details may be established by unambiguous context in that same request/);
  assert.match(skill, /never infer consent from an instruction to merely continue/i);
  assert.match(skill, /concrete explanation/);
  assert.match(skill, /resume before mutation only/);
  assert.match(skill, /terminal publication outcome/);
  assert.match(skill, /`branch-pr` regenerate/);
  assert.match(skill, /not a separate-agent mandate/);
  assert.match(skill, /Do not create a delegation loop/);
  assert.match(skill, /repository-scoped GitHub CLI reads/);
  assert.match(skill, /never substitute unfiltered `gh pr checks --watch`/);
  assert.match(skill, /do not repair metadata, retry observation, or recreate the PR here/);
  assert.match(command, /one bounded publication actor/i);
  assert.match(command, /destination and target may be identified unambiguously by context in the same current request/);
  assert.match(command, /A failed, timed-out, or errored observation is terminal/);
  assert.match(governance, /Do not autonomously repair metadata or repeat the governance observation in the same `\/implementation-pr` invocation/);
});

test("stacked-chain instructions use a visible Markdown full-SHA commit link", () => {
  const conventions = fs.readFileSync(path.join(repositoryRoot, "docs", "CONVENTIONS.md"), "utf8");
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");
  const linkedShaShape = "Parent head SHA: [<full SHA>](https://github.com/<owner>/<repo>/commit/<full SHA>)";

  for (const instruction of [conventions, skill, command]) {
    assert.ok(instruction.includes(linkedShaShape), "expected the exact visible commit-link shape");
    assert.ok(instruction.includes("Chain Context"));
  }
  assert.ok(conventions.includes("GitHub-rendered visible content"));
  assert.ok(conventions.includes("Parent PR: #<number>"));
  assert.ok(conventions.includes("same-repository"));
});

test("the CLI rejects execution without the post-creation signal", () => {
  let stdout = "";
  const previousWrite = process.stdout.write;
  process.stdout.write = (chunk) => { stdout += chunk; return true; };
  try {
    assert.equal(main([]), 2);
  } finally {
    process.stdout.write = previousWrite;
  }
  assert.equal(JSON.parse(stdout).status, "error");
  assert.equal(JSON.parse(stdout).runs, 0);
});
