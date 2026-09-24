#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error("git command failed");
  return result.stdout;
}

function rejectSensitivePath(candidate) {
  const lower = candidate.toLowerCase();
  const segments = lower.split("/");
  const basename = segments.at(-1);
  const safeEnvExample = /^\.env\.(?:example|sample|template)$/.test(basename);
  if (
    segments.some((segment) => /^(?:\.npmrc|\.netrc|\.pypirc|\.ssh|\.aws)$/.test(segment)) ||
    segments.some((segment) =>
      /^(?:credentials?|secrets?|private[-_]?keys?|id_rsa|id_ed25519)$/.test(segment),
    ) ||
    (!safeEnvExample && segments.some((segment) => /^\.env(?:\.|$)/.test(segment))) ||
    /(?:^|[._-])(?:secret|credential|private[-_]?key|service[-_]?account|access[-_]?token|refresh[-_]?token|auth[-_]?token|token)(?:[._-]|$)/.test(basename)
  ) {
    throw new Error("sensitive-looking path");
  }
}

function validatePath(candidate, root) {
  if (
    typeof candidate !== "string" ||
    candidate.length === 0 ||
    candidate.includes("\0") ||
    path.posix.isAbsolute(candidate) ||
    candidate.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error("invalid candidate path");
  }
  rejectSensitivePath(candidate);

  let current = root;
  const parts = candidate.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    const stat = fs.lstatSync(current, { bigint: true });
    if (stat.isSymbolicLink()) throw new Error("symlink candidate path");
    if (index < parts.length - 1 && !stat.isDirectory()) {
      throw new Error("non-directory candidate parent");
    }
    if (index === parts.length - 1 && !stat.isFile()) {
      throw new Error("unsupported candidate file type");
    }
  }
  const relative = path.relative(root, current);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("candidate path escapes repository");
  }
  return current;
}

function statIdentity(filePath) {
  const stat = fs.lstatSync(filePath, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("unsupported candidate file");
  const mode = stat.mode & 0o111n ? "100755" : "100644";
  return {
    mode,
    raceKey: [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].join(":"),
  };
}

function readIndexEntry(candidate) {
  const output = runGit(["ls-files", "--stage", "-z", "--", `:(literal)${candidate}`]);
  if (output === "") return "absent";
  const entries = output.split("\0").filter(Boolean);
  if (entries.length !== 1) throw new Error("ambiguous index entry");
  const separator = entries[0].indexOf("\t");
  if (separator < 0 || entries[0].slice(separator + 1) !== candidate) {
    throw new Error("unexpected index path");
  }
  const match = /^(100644|100755) ([0-9a-f]+) 0$/.exec(entries[0].slice(0, separator));
  if (!match) throw new Error("unsupported index mode or conflict stage");
  return `${match[1]}:${match[2]}`;
}

function fingerprint(paths) {
  if (!Array.isArray(paths) || paths.length === 0 || paths.some((item) => typeof item !== "string")) {
    throw new Error("candidate inventory must be a non-empty string array");
  }
  const sorted = [...paths].sort();
  if (new Set(sorted).size !== sorted.length) throw new Error("duplicate candidate path");

  const root = path.resolve(runGit(["rev-parse", "--show-toplevel"]).trim());
  if (process.cwd() !== root) throw new Error("run from repository root");
  const authorizedPaths = new Set(sorted);
  const unexpectedUntracked = runGit(["ls-files", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean)
    .some((candidate) => !authorizedPaths.has(candidate));
  if (unexpectedUntracked) throw new Error("untracked path is outside authorized inventory");

  const records = sorted.map((candidate) => {
    const filePath = validatePath(candidate, root);
    const before = statIdentity(filePath);
    const workingBlob = runGit(["hash-object", "--no-filters", "--", candidate]).trim();
    if (!/^[0-9a-f]+$/.test(workingBlob)) throw new Error("invalid Git blob identity");
    const indexEntry = readIndexEntry(candidate);
    const after = statIdentity(filePath);
    if (before.raceKey !== after.raceKey || before.mode !== after.mode) {
      throw new Error("candidate changed while fingerprinting");
    }
    return `${candidate}\0${after.mode}:${workingBlob}\0${indexEntry}`;
  });

  return crypto.createHash("sha256").update(records.join("\n")).digest("hex");
}

try {
  const paths = process.argv.slice(2);
  const digest = fingerprint(paths);
  process.stdout.write(`${JSON.stringify({ status: "ok", fingerprint: digest })}\n`);
} catch {
  process.stdout.write('{"status":"rejected"}\n');
  process.exitCode = 1;
}
