#!/usr/bin/env node

const childProcess = require("node:child_process");
const path = require("node:path");

const APP_ROOT = path.join(__dirname, "..", "..", "teleferico-app");
const WITHHELD_OUTPUT_NOTE = "Detailed stdout/stderr intentionally withheld.";
const VITEST_TIMEOUT_MS = 15 * 60 * 1000;

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

function runPostPrVitest({ prCreated, candidatePaths, spawn = childProcess.spawnSync }) {
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

  const result = spawn("pnpm", ["run", "test"], {
    cwd: APP_ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: VITEST_TIMEOUT_MS,
  });
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
    attribution: succeeded ? "not-applicable" : "unclassified",
    ...(succeeded ? {} : { failure_evidence: failureEvidence(result) }),
  };
}

function main(argv = process.argv.slice(2), dependencies = {}) {
  try {
    const options = parseArguments(argv);
    const report = runPostPrVitest({ ...options, spawn: dependencies.spawn });
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
  WITHHELD_OUTPUT_NOTE,
  VITEST_TIMEOUT_MS,
  classifyCandidateScope,
  failureEvidence,
  isDocumentationPath,
  main,
  parseArguments,
  runPostPrVitest,
  validateCandidatePaths,
};
