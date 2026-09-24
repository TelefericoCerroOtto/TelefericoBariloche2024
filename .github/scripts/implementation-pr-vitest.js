#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const APP_ROOT = path.join(__dirname, "..", "..", "teleferico-app");
const REPOSITORY_ROOT = path.join(APP_ROOT, "..");
const WITHHELD_OUTPUT_NOTE = "Detailed stdout/stderr intentionally withheld.";
const VITEST_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_REPORT_BYTES = 2 * 1024 * 1024;
const MAX_REPORT_FILES = 500;
const MAX_ASSERTIONS_PER_FILE = 10_000;
const MAX_DIAGNOSTIC_FILES = 10;
const DIAGNOSTICS_UNAVAILABLE_NOTE = "Structured failure diagnostics unavailable; test output remains withheld.";
const CLEANUP_FAILURE_NOTE = "Temporary Vitest diagnostics cleanup failed; path and error details are withheld.";
const FILE_STATUSES = new Set(["failed", "passed", "pending"]);
const ASSERTION_STATUSES = new Set(["failed", "passed", "pending", "todo", "skipped"]);

function parseArguments(argv) {
  const options = { prCreated: false, candidatePaths: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--pr-created" && !options.prCreated) {
      options.prCreated = true;
    } else if (argument === "--candidate-path") {
      const candidatePath = argv[++index];
      if (!candidatePath) throw new Error("--candidate-path requires a repository-relative path.");
      options.candidatePaths.push(candidatePath);
    } else {
      throw new Error(`Unknown or repeated option '${argument}'.`);
    }
  }
  if (!options.prCreated) throw new Error("--pr-created is required; run this check only after PR creation.");
  validateCandidatePaths(options.candidatePaths);
  return options;
}

function validateCandidatePaths(candidatePaths) {
  if (!Array.isArray(candidatePaths) || candidatePaths.length === 0) {
    throw new Error("Provide the complete non-empty candidate path inventory with --candidate-path.");
  }
  const seen = new Set();
  for (const candidatePath of candidatePaths) {
    if (typeof candidatePath !== "string" || candidatePath.length === 0
      || candidatePath.startsWith("/") || candidatePath.includes("\\")
      || candidatePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
      throw new Error("Candidate paths must be normalized repository-relative Git paths.");
    }
    if (seen.has(candidatePath)) throw new Error(`Duplicate candidate path '${candidatePath}'.`);
    seen.add(candidatePath);
  }
}

function isDocumentationPath(candidatePath) {
  return /\.(?:md|mdx)$/i.test(candidatePath);
}

function classifyCandidateScope(candidatePaths) {
  validateCandidatePaths(candidatePaths);
  const appPaths = candidatePaths.filter((candidatePath) => candidatePath.startsWith("teleferico-app/"));
  if (appPaths.length === 0) return "non-app";
  if (appPaths.every(isDocumentationPath)) return "app-docs-only";
  return "app-executable-or-unknown";
}

function failureEvidence(result) {
  return {
    spawn_category: result.error?.code === "ETIMEDOUT" ? "timeout" : result.error ? "spawn-error" : result.signal ? "signaled" : Number.isInteger(result.status) ? "process-exit" : "missing-status",
    signal: result.signal || null,
    exit_code: Number.isInteger(result.status) ? result.status : null,
    note: WITHHELD_OUTPUT_NOTE,
  };
}

function normalizeTestFilePath(reporterPath) {
  if (typeof reporterPath !== "string" || reporterPath.length === 0 || reporterPath.length > 1024
    || reporterPath.includes("\\") || /[\u0000-\u001f\u007f]/.test(reporterPath)) return null;

  let relativePath;
  if (path.isAbsolute(reporterPath)) {
    relativePath = path.relative(REPOSITORY_ROOT, reporterPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;
  } else if (reporterPath.startsWith("teleferico-app/")) {
    relativePath = reporterPath;
  } else if (reporterPath.startsWith("src/")) {
    relativePath = `teleferico-app/${reporterPath}`;
  } else {
    return null;
  }

  if (relativePath.split(path.sep).some((part) => part === "" || part === "." || part === "..")) return null;
  if (!/^teleferico-app\/src\/.+\.(?:test|spec)\.(?:ts|tsx)$/.test(relativePath)) return null;
  return relativePath;
}

function parseFailureDiagnostics(reportPath) {
  let fileDescriptor;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    fileDescriptor = fs.openSync(reportPath, fs.constants.O_RDONLY | noFollow);
    const { size } = fs.fstatSync(fileDescriptor);
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_REPORT_BYTES) return null;

    const buffer = Buffer.alloc(MAX_REPORT_BYTES + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = fs.readSync(fileDescriptor, buffer, bytesRead, buffer.length - bytesRead, null);
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead === 0 || bytesRead > MAX_REPORT_BYTES) return null;

    const report = JSON.parse(buffer.subarray(0, bytesRead).toString("utf8"));
    if (!report || !Array.isArray(report.testResults) || report.testResults.length > MAX_REPORT_FILES) return null;

    const failures = [];
    for (const result of report.testResults) {
      if (!result || !FILE_STATUSES.has(result.status) || !Array.isArray(result.assertionResults)
        || result.assertionResults.length > MAX_ASSERTIONS_PER_FILE) return null;

      let failedTests = 0;
      for (const assertion of result.assertionResults) {
        if (!assertion || !ASSERTION_STATUSES.has(assertion.status)) return null;
        if (assertion.status === "failed") failedTests += 1;
      }

      if (result.status !== "failed") {
        if (failedTests > 0) return null;
        continue;
      }

      const file = normalizeTestFilePath(result.name);
      if (!file) return null;
      failures.push({
        file,
        failed_tests: failedTests,
        failure_kind: failedTests > 0 ? "assertions" : result.assertionResults.length === 0 ? "collection" : "file",
      });
    }

    if (failures.length === 0) return null;
    failures.sort((left, right) => left.file.localeCompare(right.file));
    return {
      status: "available",
      failed_test_files: failures.slice(0, MAX_DIAGNOSTIC_FILES),
      omitted_file_count: Math.max(0, failures.length - MAX_DIAGNOSTIC_FILES),
    };
  } catch {
    return null;
  } finally {
    if (fileDescriptor !== undefined) fs.closeSync(fileDescriptor);
  }
}

function runPostPrVitest({
  prCreated,
  candidatePaths,
  spawn = childProcess.spawnSync,
  removeTemporaryDirectory = fs.rmSync,
}) {
  if (!prCreated) throw new Error("Refusing to run Vitest before PR creation.");
  const scope = classifyCandidateScope(candidatePaths);
  if (scope !== "app-executable-or-unknown") {
    return {
      schema_version: "implementation-pr-vitest.v1",
      status: "skipped",
      reason: scope === "app-docs-only" ? "Candidate inventory contains only app Markdown documentation." : "Candidate inventory does not include teleferico-app.",
      scope,
      candidate_path_count: candidatePaths.length,
      command: "pnpm run test",
      runs: 0,
    };
  }

  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "implementation-pr-vitest-"));
  let result;
  let diagnostics = null;
  let cleanupFailed = false;
  try {
    fs.chmodSync(tempDirectory, 0o700);
    const reportPath = path.join(tempDirectory, "vitest-report.json");
    result = spawn("pnpm", ["run", "test", `--reporter=json`, `--outputFile=${reportPath}`], {
      cwd: APP_ROOT,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: VITEST_TIMEOUT_MS,
    });
    if (!result.error && !result.signal && Number.isInteger(result.status) && result.status !== 0) {
      diagnostics = parseFailureDiagnostics(reportPath);
    }
  } finally {
    try {
      removeTemporaryDirectory(tempDirectory, { recursive: true, force: true });
    } catch {
      cleanupFailed = true;
    }
  }
  const completed = !result.error && !result.signal && Number.isInteger(result.status);
  const succeeded = completed && result.status === 0;
  return {
    schema_version: "implementation-pr-vitest.v1",
    status: !completed ? "error" : succeeded ? "passed" : "failed",
    scope,
    candidate_path_count: candidatePaths.length,
    command: "pnpm run test",
    cwd: "teleferico-app",
    runs: 1,
    exit_code: Number.isInteger(result.status) ? result.status : null,
    ...(cleanupFailed ? { cleanup_warning: CLEANUP_FAILURE_NOTE } : {}),
    attribution: succeeded ? "not-applicable" : "unclassified",
    ...(succeeded ? {} : {
      failure_evidence: {
        ...failureEvidence(result),
        diagnostics: diagnostics || {
          status: "unavailable",
          note: DIAGNOSTICS_UNAVAILABLE_NOTE,
        },
      },
    }),
  };
}

function main(argv = process.argv.slice(2), dependencies = {}) {
  try {
    const options = parseArguments(argv);
    const report = runPostPrVitest({
      ...options,
      spawn: dependencies.spawn,
      removeTemporaryDirectory: dependencies.removeTemporaryDirectory,
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return report.status === "error" ? 2 : 0;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      schema_version: "implementation-pr-vitest.v1",
      status: "error",
      runs: 0,
      error: error.message,
    })}\n`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main();

module.exports = {
  APP_ROOT,
  CLEANUP_FAILURE_NOTE,
  DIAGNOSTICS_UNAVAILABLE_NOTE,
  MAX_DIAGNOSTIC_FILES,
  MAX_ASSERTIONS_PER_FILE,
  MAX_REPORT_BYTES,
  MAX_REPORT_FILES,
  REPOSITORY_ROOT,
  WITHHELD_OUTPUT_NOTE,
  VITEST_TIMEOUT_MS,
  classifyCandidateScope,
  failureEvidence,
  isDocumentationPath,
  main,
  normalizeTestFilePath,
  parseFailureDiagnostics,
  parseArguments,
  runPostPrVitest,
  validateCandidatePaths,
};
