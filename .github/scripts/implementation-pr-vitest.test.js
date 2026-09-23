const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  APP_ROOT,
  WITHHELD_OUTPUT_NOTE,
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

test("implementation instructions run governance observation before post-PR Vitest", () => {
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");
  const skillExecution = skill.split("## Execution Steps")[1].split("## Output Contract")[0];

  assert.ok(skillExecution.indexOf("wait-for-implementation-governance.js") < skillExecution.indexOf("implementation-pr-vitest.js"));
  assert.ok(skillExecution.includes("regardless of the governance helper's exit code"));
  assert.ok(command.indexOf("wait-for-implementation-governance.js") < command.indexOf("implementation-pr-vitest.js"));
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
