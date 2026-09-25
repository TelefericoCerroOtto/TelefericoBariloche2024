const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  APP_ROOT,
  CLEANUP_FAILURE_NOTE,
  DIAGNOSTICS_UNAVAILABLE_NOTE,
  MAX_ASSERTIONS_PER_FILE,
  MAX_DIAGNOSTIC_FILES,
  MAX_REPORT_BYTES,
  MAX_REPORT_FILES,
  WITHHELD_OUTPUT_NOTE,
  VITEST_TIMEOUT_MS,
  classifyCandidateScope,
  main,
  parseFailureDiagnostics,
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
      fs.writeFileSync(args[1].at(-1).slice("--outputFile=".length), JSON.stringify({ testResults: [] }));
      return { status: 0 };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "pnpm");
  assert.deepEqual(calls[0][1].slice(0, 3), ["run", "test", "--reporter=json"]);
  assert.ok(calls[0][1][3].startsWith("--outputFile="));
  assert.equal(calls[0][2].cwd, APP_ROOT);
  assert.equal(calls[0][2].timeout, VITEST_TIMEOUT_MS);
  assert.equal(report.status, "passed");
  assert.equal(report.runs, 1);
  assert.equal(report.exit_code, 0);
  assert.equal(report.scope, "app-executable-or-unknown");
  assert.equal(fs.existsSync(calls[0][1][3].slice("--outputFile=".length)), false);
});

test("cleanup failures do not replace completed Vitest results or expose cleanup details", () => {
  const secretMarker = "private-cleanup-error-marker";
  for (const [vitestStatus, expectedStatus, expectedVitestExit] of [
    [1, "failed", 1],
    [0, "passed", 0],
  ]) {
    let stdout = "";
    let temporaryDirectory;
    const previousWrite = process.stdout.write;
    process.stdout.write = (chunk) => { stdout += chunk; return true; };
    try {
      const helperExit = main(["--pr-created", "--candidate-path", "teleferico-app/src/app/page.tsx"], {
        spawn: () => ({ status: vitestStatus, stderr: secretMarker }),
        removeTemporaryDirectory: (directory) => {
          temporaryDirectory = directory;
          throw new Error(`${secretMarker}: ${directory}`);
        },
      });
      assert.equal(helperExit, 0);
    } finally {
      process.stdout.write = previousWrite;
      if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }

    const report = JSON.parse(stdout);
    assert.equal(report.status, expectedStatus);
    assert.equal(report.exit_code, expectedVitestExit);
    assert.equal(report.cleanup_warning, CLEANUP_FAILURE_NOTE);
    assert.equal(stdout.includes(secretMarker), false);
    assert.equal(stdout.includes(temporaryDirectory), false);
    assert.equal(fs.existsSync(temporaryDirectory), false);
    if (expectedStatus === "passed") assert.equal("failure_evidence" in report, false);
  }
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

test("reports only failed test file paths and counts, withholding process output and dynamic failure strings", () => {
  const secretMarker = "sensitive-test-output-marker";
  let reportPath;
  const report = runPostPrVitest({
    prCreated: true,
    candidatePaths: appSourceAndDocsPaths,
    spawn: (_command, args) => {
      reportPath = args.at(-1).slice("--outputFile=".length);
      assert.equal(fs.statSync(path.dirname(reportPath)).mode & 0o777, 0o700);
      fs.writeFileSync(reportPath, JSON.stringify({
        testResults: [
          {
            name: path.join(APP_ROOT, "src", "lib", "passing.test.ts"),
            status: "passed",
            assertionResults: [{ status: "passed", title: secretMarker }],
          },
          {
            name: path.join(APP_ROOT, "src", "lib", "failure.test.ts"),
            status: "failed",
            assertionResults: [
              { status: "failed", title: secretMarker, failureMessages: [secretMarker] },
              { status: "failed", title: secretMarker, failureMessages: [secretMarker] },
            ],
          },
        ],
      }));
      return { status: 1, stdout: `failure ${secretMarker}`, stderr: secretMarker };
    },
  });

  assert.equal(report.status, "failed");
  assert.equal(report.attribution, "unclassified");
  assert.equal(report.exit_code, 1);
  assert.equal(report.failure_evidence.spawn_category, "process-exit");
  assert.equal(report.failure_evidence.signal, null);
  assert.equal(report.failure_evidence.exit_code, 1);
  assert.equal(report.failure_evidence.note, WITHHELD_OUTPUT_NOTE);
  assert.deepEqual(report.failure_evidence.diagnostics, {
    status: "available",
    failed_test_files: [{
      file: "teleferico-app/src/lib/failure.test.ts",
      failed_tests: 2,
      failure_kind: "assertions",
    }],
    omitted_file_count: 0,
  });
  assert.equal(JSON.stringify(report).includes(secretMarker), false);
  assert.equal(fs.existsSync(reportPath), false);
});

test("rejects diagnostic paths outside the repository without exposing path contents", () => {
  const secretMarker = "private-runtime-value";
  const report = runPostPrVitest({
    prCreated: true,
    candidatePaths: appSourceAndDocsPaths,
    spawn: (_command, args) => {
      fs.writeFileSync(args.at(-1).slice("--outputFile=".length), JSON.stringify({
        testResults: [{
          name: `/tmp/${secretMarker}.test.ts`,
          status: "failed",
          assertionResults: [{ status: "failed" }],
        }],
      }));
      return { status: 1 };
    },
  });

  assert.equal(report.failure_evidence.diagnostics.status, "unavailable");
  assert.equal(JSON.stringify(report).includes(secretMarker), false);
});

test("reports failed files with zero assertions as collection failures and ignores passing files", () => {
  const report = runPostPrVitest({
    prCreated: true,
    candidatePaths: appSourceAndDocsPaths,
    spawn: (_command, args) => {
      fs.writeFileSync(args.at(-1).slice("--outputFile=".length), JSON.stringify({
        testResults: [
          {
            name: "teleferico-app/src/collection-error.test.ts",
            status: "failed",
            message: "Do not expose this arbitrary collection error text.",
            assertionResults: [],
          },
          {
            name: "teleferico-app/src/passing.test.ts",
            status: "passed",
            assertionResults: [{ status: "passed", title: "passed test" }],
          },
        ],
      }));
      return { status: 1 };
    },
  });

  assert.deepEqual(report.failure_evidence.diagnostics.failed_test_files, [{
    file: "teleferico-app/src/collection-error.test.ts",
    failed_tests: 0,
    failure_kind: "collection",
  }]);
  assert.equal(JSON.stringify(report).includes("arbitrary collection error text"), false);
});

test("marks missing and malformed failure reports unavailable while preserving the failed exit", () => {
  for (const writeReport of [null, (reportPath) => fs.writeFileSync(reportPath, "not-json")]) {
    const report = runPostPrVitest({
      prCreated: true,
      candidatePaths: appSourceAndDocsPaths,
      spawn: (_command, args) => {
        const reportPath = args.at(-1).slice("--outputFile=".length);
        writeReport?.(reportPath);
        return { status: 1 };
      },
    });

    assert.equal(report.status, "failed");
    assert.equal(report.exit_code, 1);
    assert.deepEqual(report.failure_evidence.diagnostics, {
      status: "unavailable",
      note: DIAGNOSTICS_UNAVAILABLE_NOTE,
    });
  }
});

test("bounds diagnostic report size, file entries, and emitted failure paths", () => {
  const oversizedReportPath = path.join(os.tmpdir(), `implementation-pr-vitest-oversized-${process.pid}.json`);
  fs.writeFileSync(oversizedReportPath, " ".repeat(MAX_REPORT_BYTES + 1));
  try {
    assert.equal(parseFailureDiagnostics(oversizedReportPath), null);
  } finally {
    fs.rmSync(oversizedReportPath, { force: true });
  }

  const tooManyFilesPath = path.join(os.tmpdir(), `implementation-pr-vitest-many-${process.pid}.json`);
  fs.writeFileSync(tooManyFilesPath, JSON.stringify({
    testResults: Array.from({ length: MAX_REPORT_FILES + 1 }, (_, index) => ({
      name: `teleferico-app/src/test-${index}.test.ts`,
      status: "failed",
      assertionResults: [{ status: "failed" }],
    })),
  }));
  try {
    assert.equal(parseFailureDiagnostics(tooManyFilesPath), null);
  } finally {
    fs.rmSync(tooManyFilesPath, { force: true });
  }

  const diagnostics = runPostPrVitest({
    prCreated: true,
    candidatePaths: appSourceAndDocsPaths,
    spawn: (_command, args) => {
      fs.writeFileSync(args.at(-1).slice("--outputFile=".length), JSON.stringify({
        testResults: Array.from({ length: MAX_DIAGNOSTIC_FILES + 2 }, (_, index) => ({
          name: `teleferico-app/src/failure-${index}.test.ts`,
          status: "failed",
          assertionResults: Array.from({ length: index + 1 }, () => ({ status: "failed" })),
        })),
      }));
      return { status: 1 };
    },
  }).failure_evidence.diagnostics;

  assert.equal(diagnostics.failed_test_files.length, MAX_DIAGNOSTIC_FILES);
  assert.equal(diagnostics.omitted_file_count, 2);

  const excessiveAssertionsPath = path.join(os.tmpdir(), `implementation-pr-vitest-assertions-${process.pid}.json`);
  fs.writeFileSync(excessiveAssertionsPath, JSON.stringify({
    testResults: [{
      name: "teleferico-app/src/many-assertions.test.ts",
      status: "failed",
      assertionResults: Array.from({ length: MAX_ASSERTIONS_PER_FILE + 1 }, () => ({ status: "failed" })),
    }],
  }));
  try {
    assert.equal(parseFailureDiagnostics(excessiveAssertionsPath), null);
  } finally {
    fs.rmSync(excessiveAssertionsPath, { force: true });
  }
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
  assert.deepEqual(report.failure_evidence.diagnostics, {
    status: "unavailable",
    note: DIAGNOSTICS_UNAVAILABLE_NOTE,
  });
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
    diagnostics: {
      status: "unavailable",
      note: DIAGNOSTICS_UNAVAILABLE_NOTE,
    },
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
    diagnostics: {
      status: "unavailable",
      note: DIAGNOSTICS_UNAVAILABLE_NOTE,
    },
  });
  assert.equal(JSON.stringify(report).includes("private timeout detail"), false);
});

test("implementation instructions run governance observation before post-PR Vitest", () => {
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");
  const skillExecution = skill.split("## Execution")[1].split("## Output Contract")[0];

  assert.ok(skill.indexOf("wait-for-implementation-governance.js") < skill.indexOf("implementation-pr-vitest.js"));
  assert.ok(command.indexOf("wait-for-implementation-governance.js") < command.indexOf("implementation-pr-vitest.js"));
  for (const contract of [skill, command]) {
    assert.match(contract, /After (?:it returns|that helper returns)[\s\S]*exactly once/);
    assert.match(contract, /(?:governance passed, failed, timed out, or returned an observer error|whether it passes, fails, times out, or reports an observer error)/);
    assert.match(contract, /never (?:a )?publication (?:authorization )?gate|not treat advisory evidence as a publication gate/);
  }
  assert.match(skillExecution, /published head equals local `HEAD`/);
  assert.match(skillExecution, /verify its head\/base and exact scope disclosure/);
});

test("implementation publication uses a single local preflight without mapper or fingerprint ceremony", () => {
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");

  assert.match(skill, /local Git facts once/);
  assert.match(skill, /Validate the path list once with `\.github\/scripts\/implementation-candidate-paths\.js`/);
  assert.match(command, /candidate paths, and intended base facts once with native Git/);
  assert.match(command, /implementation-candidate-paths\.js <candidate-path\.\.\./);
  for (const contract of [skill, command]) {
    assert.match(contract, /unknown or secret-like candidate paths?/);
    assert.match(contract, /never read credential files or secret values|Never read `\.env` or other credential\/secret files or their values/i);
    assert.match(contract, /existing open PR/);
    assert.match(contract, /failed or unknown commit\/push|ambiguous\/failing commit or push/);
    assert.match(contract, /Do not use or delegate to `delivery-state-mapper`|Do not invoke `delivery-state-mapper`/);
    assert.doesNotMatch(contract, /implementation-candidate-identity/);
  }
});

test("publication contract preserves explicit authorization, publication stops, and one scope disclosure", () => {
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");
  const governance = fs.readFileSync(path.join(repositoryRoot, "AGENTS.md"), "utf8");
  const policy = fs.readFileSync(path.join(repositoryRoot, "docs", "backlog-branch-pr-policy.md"), "utf8");

  assert.match(policy, /natural-language/);
  for (const contract of [skill, command, policy]) assert.match(contract, /non-sensitive/);
  assert.match(skill, /current request must authorize commit of the current candidate/);
  assert.match(skill, /Never infer authorization from a generic continuation/);
  assert.match(skill, /Authorization expires when the candidate, target, session, or publication outcome changes/);
  assert.match(skill, /Do not invoke the standalone `branch-pr` preflight/);
  assert.match(skill, /must not repeat discovery, branch\/base setup, authorization checks/);
  assert.match(skill, /complete candidate list is known/);
  assert.match(skill, /do not ask or validate path-by-path/);
  assert.match(skill, /published head equals local `HEAD`/);
  assert.match(skill, /repository-scoped GitHub reads/);
  assert.match(skill, /Do not replace it with unfiltered `gh pr checks --watch`/);
  assert.match(skill, /result and other CI status are advisory evidence/);
  assert.match(command, /Do not invoke standalone `branch-pr` preflight/);
  assert.match(command, /plus the destination and credential\/session authorization/);
  assert.match(command, /do not retry an unknown\/failed observation/);
  assert.match(governance, /Do not autonomously repair metadata or repeat the governance observation in the same `\/implementation-pr` invocation/);
});

test("implementation-pr slash syntax keeps strict scope as the sole default and rejects malformed overrides", () => {
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");
  const conventions = fs.readFileSync(path.join(repositoryRoot, "docs", "CONVENTIONS.md"), "utf8");
  const policy = fs.readFileSync(path.join(repositoryRoot, "docs", "backlog-branch-pr-policy.md"), "utf8");

  for (const contract of [skill, command, conventions]) {
    assert.match(contract, /strict-scope (?:by default when bare|default)/i);
    assert.match(contract, /exactly `?\/implementation-pr --allow-mixed-scope "<nonblank reason>"`?/);
    assert.match(contract, /missing or blank reasons?[^\n]*(?:unknown or extra arguments|alternate spellings)|missing or blank CLI reasons?[^\n]*(?:unknown or extra arguments|alternate spellings)/i);
    assert.match(contract, /natural-language authorization[^\n]*valid|natural-language authorization may authorize mixed scope/i);
  }
  assert.match(policy, /exact `\/implementation-pr --allow-mixed-scope "<reason>"` syntax/);
  assert.match(policy, /Missing\/blank CLI reasons, unknown or extra arguments/);
});

test("publication uses one known mixed-scope approval and preserves only required boundaries", () => {
  const skill = fs.readFileSync(path.join(repositoryRoot, ".agents", "skills", "implementation-pr", "SKILL.md"), "utf8");
  const command = fs.readFileSync(path.join(repositoryRoot, ".opencode", "commands", "implementation-pr.md"), "utf8");
  const policy = fs.readFileSync(path.join(repositoryRoot, "docs", "backlog-branch-pr-policy.md"), "utf8");

  assert.match(skill, /one explicit mixed-scope approval covering the complete inventory/);
  assert.match(command, /one approval for the complete known non-sensitive inventory/);
  assert.match(policy, /One explicit approval covers the complete known non-sensitive/);
  for (const contract of [skill, command]) {
    assert.match(contract, /path[- ]by[- ]path|per path/);
    assert.match(contract, /visible English `## Scope Exception`/);
    assert.match(contract, /unknown or secret-like/);
  }
  assert.match(policy, /do not ask for separate approval per path/);
  assert.match(policy, /visible English `## Scope Exception`/);
  assert.match(policy, /sensitive or unknown paths/);
  assert.match(skill, /Do not use or delegate to `delivery-state-mapper`/);
  assert.match(skill, /Do not run a second local fingerprint helper/);
  assert.match(skill, /Direct routes do not trigger generic OpenSpec\/SDD discovery/);
  assert.match(command, /Do not invoke `delivery-state-mapper`/);
  assert.match(policy, /Do not use a delegated mapper, run candidate fingerprint helpers, retry discovery/);
  assert.doesNotMatch(policy, /delivery-state-snapshot\.v2/);
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
