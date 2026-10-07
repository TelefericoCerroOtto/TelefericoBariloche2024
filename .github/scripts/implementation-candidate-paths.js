#!/usr/bin/env node
"use strict";

function validateCandidatePath(candidate) {
  if (
    typeof candidate !== "string" ||
    candidate.length === 0 ||
    candidate.includes("\0") ||
    candidate.startsWith("/") ||
    candidate.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error("invalid candidate path");
  }

  const lower = candidate.toLowerCase();
  const segments = lower.split("/");
  const basename = segments.at(-1);
  const exactBasename = candidate.split("/").at(-1);
  const safeTemplate = /^\.env\.(?:example|sample|template)$/.test(exactBasename);
  const ancestors = segments.slice(0, -1);

  if (
    segments.some((segment) => /^(?:\.npmrc|\.netrc|\.pypirc|\.ssh|\.aws)$/.test(segment)) ||
    segments.some((segment) => /^(?:credentials?|secrets?)(?:[._-].*)?$/.test(segment)) ||
    segments.some((segment) => /^(?:private[-_]?keys?|id_rsa|id_ed25519)$/.test(segment)) ||
    ancestors.some((segment) => /^\.env/.test(segment)) ||
    (!safeTemplate && /^\.env/.test(basename)) ||
    /(?:^|[._-])(?:secret|credential|private[-_]?key|service[-_]?account|access[-_]?token|refresh[-_]?token|auth[-_]?token|token)(?:[._-]|$)/.test(basename)
  ) {
    throw new Error("sensitive-looking path");
  }
}

module.exports = { validateCandidatePath };

if (require.main === module) {
  try {
    const paths = process.argv.slice(2);
    if (paths.length === 0) throw new Error("empty candidate inventory");
    paths.forEach(validateCandidatePath);
    process.stdout.write('{"status":"ok"}\n');
  } catch {
    process.stdout.write('{"status":"rejected"}\n');
    process.exitCode = 1;
  }
}
