#!/usr/bin/env node

const fs = require("node:fs");

const BRANCH_TYPES = Object.freeze(["feat", "fix", "chore", "refactor", "docs", "style", "test", "perf", "revert"]);
const DIRECTORIES = Object.freeze(["app", "cms", "tools", "root"]);
const PROMOTION_BRANCHES = Object.freeze(["development", "staging", "main"]);
const COMMIT_TYPES = BRANCH_TYPES;

const COMMIT_SUBJECT_PATTERN = /^(?<type>feat|fix|chore|refactor|docs|style|test|perf|revert)\((?<directory>[a-z-]+)\/(?<scope>[^\s():/]+)\): (?<description>\S.*)$/;
const GIT_MERGE_SUBJECT_PATTERN = /^Merge (?:branch|remote-tracking branch|tag) '[^'\r\n]+'(?: into [a-zA-Z0-9._/-]+)?$/;
const GITHUB_MERGE_SUBJECT_PATTERN = /^Merge pull request #\d+ from [A-Za-z0-9_.-]+\/[A-Za-z0-9._/-]+$/;

function validateImplementationBranchName(branchName) {
  if (typeof branchName !== "string" || !branchName) throw new Error("Branch name is required.");
  if (PROMOTION_BRANCHES.includes(branchName)) return { mode: "promotion", branchName };

  const match = branchName.match(/^(?<type>[a-z]+)\/(?<directory>[a-z-]+)-(?<tracking>tb-\d+|no-backlog)-(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (!match?.groups) {
    throw new Error(`Branch '${branchName}' must use '<type>/<dir>-tb-<digits>-<slug>' or '<type>/<dir>-no-backlog-<slug>'.`);
  }

  const { type, directory, tracking, slug } = match.groups;
  if (!BRANCH_TYPES.includes(type)) throw new Error(`Branch '${branchName}' uses unsupported type '${type}'.`);
  validateDirectory(directory, `Branch '${branchName}'`);
  if (!slug) throw new Error(`Branch '${branchName}' requires a non-empty lowercase kebab-case slug.`);
  if (/(?:^|-)tb(?:$|[-0-9@=%])/.test(slug)) {
    throw new Error(`Branch '${branchName}' must contain exactly one complete Work ID marker or the literal no-backlog marker.`);
  }

  if (tracking === "no-backlog") return { mode: "explicitly-untracked", branchName, type, directory, slug };
  return {
    mode: "tracked",
    branchName,
    type,
    directory,
    slug,
    workId: `TB-${tracking.slice(3).replace(/^0+(?=\d)/, "")}`,
  };
}

function validateDirectory(directory, context) {
  const values = directory.split("-");
  const unknown = values.find((value) => !DIRECTORIES.includes(value));
  if (unknown) throw new Error(`${context} uses unsupported directory '${unknown}'.`);
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate) throw new Error(`${context} repeats directory '${duplicate}'.`);
  const ordered = [...values].sort((left, right) => DIRECTORIES.indexOf(left) - DIRECTORIES.indexOf(right));
  if (values.join("-") !== ordered.join("-")) {
    throw new Error(`${context} must order composite directories as ${DIRECTORIES.join(", ")}.`);
  }
}

function isImplementationBranchCandidate(branchName) {
  return typeof branchName === "string" && BRANCH_TYPES.some((type) => branchName.startsWith(`${type}/`));
}

function classifyPullRequest(headRef, baseRef) {
  if (headRef === "development" && baseRef === "staging") return { type: "promotion-to-staging" };
  if (headRef === "staging" && baseRef === "main") return { type: "promotion-to-main" };
  if (baseRef === "development") return { type: "implementation" };
  if (isImplementationBranchCandidate(headRef)) return { type: "unsupported-implementation-target" };
  return { type: "other" };
}

function validateCommitMessage(message) {
  if (typeof message !== "string" || !message.trim()) throw new Error("Commit message is required.");
  const subject = message.split(/\r?\n/, 1)[0];
  return validateCommitSubject(subject);
}

function validateCommitSubject(subject) {
  const conventional = subject.match(COMMIT_SUBJECT_PATTERN);
  if (conventional?.groups) {
    validateDirectory(conventional.groups.directory, `Commit '${subject}'`);
    return { kind: "conventional", subject, ...conventional.groups };
  }

  if (GIT_MERGE_SUBJECT_PATTERN.test(subject) || GITHUB_MERGE_SUBJECT_PATTERN.test(subject)) {
    return { kind: "git-generated-merge", subject };
  }

  const revert = subject.match(/^Revert "(?<reverted>[^"\r\n]+)"$/);
  if (revert?.groups) {
    validateCommitSubject(revert.groups.reverted);
    return { kind: "git-generated-revert", subject };
  }

  throw new Error(`Commit subject '${subject}' must use '<type>(<dir>/<scope>): <description>'.`);
}

function main() {
  const [command, value] = process.argv.slice(2);
  if (command === "validate-branch") return validateImplementationBranchName(value);
  if (command === "validate-commit-message") return validateCommitMessage(fs.readFileSync(value, "utf8"));
  throw new Error("Use: validate-branch <branch> | validate-commit-message <message-file>");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  BRANCH_TYPES,
  COMMIT_TYPES,
  DIRECTORIES,
  PROMOTION_BRANCHES,
  classifyPullRequest,
  isImplementationBranchCandidate,
  validateCommitMessage,
  validateCommitSubject,
  validateDirectory,
  validateImplementationBranchName,
};
