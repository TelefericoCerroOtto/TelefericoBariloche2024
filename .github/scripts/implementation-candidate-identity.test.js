"use strict";

const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const helperPath = path.join(repositoryRoot, ".github/scripts/implementation-candidate-identity.js");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, stdio: "pipe" }).toString("utf8").trim();
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "candidate-identity-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, "init", "--quiet");
  git(root, "config", "user.name", "Fixture");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "remote", "add", "origin", "https://example.invalid/no-network");
  return root;
}

function invoke(root, paths) {
  return spawnSync(process.execPath, [helperPath, ...paths], {
    cwd: root,
    encoding: "utf8",
  });
}

function accepted(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(Object.keys(JSON.parse(result.stdout)).sort(), ["fingerprint", "status"]);
  assert.match(JSON.parse(result.stdout).fingerprint, /^[0-9a-f]{64}$/);
  return JSON.parse(result.stdout).fingerprint;
}

function rejected(result) {
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '{"status":"rejected"}\n');
}

test("fingerprints seven modified unstaged files without emitting their contents", (t) => {
  const root = fixture(t);
  const paths = Array.from({ length: 7 }, (_, index) => `src/safe-${index}.txt`);
  for (const file of paths) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), `base ${file}\n`);
  }
  git(root, "add", ...paths);
  git(root, "commit", "--quiet", "-m", "fixture");
  for (const file of paths) fs.appendFileSync(path.join(root, file), "unstaged delta\n");

  const output = invoke(root, paths);
  const first = accepted(output);
  assert.equal(output.stdout.includes("unstaged delta"), false);
  assert.equal(accepted(invoke(root, paths)), first);
});

test("recomputing binds changed bytes and executable mode", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "source.txt"), "initial\n");
  git(root, "add", "source.txt");
  git(root, "commit", "--quiet", "-m", "fixture");
  const first = accepted(invoke(root, ["source.txt"]));

  fs.writeFileSync(path.join(root, "source.txt"), "changed\n");
  const changedBytes = accepted(invoke(root, ["source.txt"]));
  assert.notEqual(changedBytes, first);

  fs.chmodSync(path.join(root, "source.txt"), 0o755);
  assert.notEqual(accepted(invoke(root, ["source.txt"])), changedBytes);
});

test("index blob identity distinguishes staged content from working-tree content", (t) => {
  const root = fixture(t);
  const source = path.join(root, "source.txt");
  fs.writeFileSync(source, "base\n");
  git(root, "add", "source.txt");
  git(root, "commit", "--quiet", "-m", "fixture");

  fs.writeFileSync(source, "working tree\n");
  git(root, "add", "source.txt");
  const stagedFingerprint = accepted(invoke(root, ["source.txt"]));
  fs.writeFileSync(source, "base\n");
  const worktreeChanged = accepted(invoke(root, ["source.txt"]));
  assert.notEqual(stagedFingerprint, worktreeChanged);
});

test("rejects empty, invalid, missing, duplicate, secret-like, and symlink inventories", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "ordinary.txt"), "safe\n");
  fs.symlinkSync("ordinary.txt", path.join(root, "linked.txt"));

  for (const paths of [
    [],
    ["../outside"],
    ["ordinary.txt", "ordinary.txt"],
    ["missing.txt"],
    [".env.local"],
    ["linked.txt"],
  ]) {
    rejected(invoke(root, paths));
  }
});

test("rejects common credential-store path strings without creating those files", (t) => {
  const root = fixture(t);
  const paths = [
    ".npmrc",
    ".netrc",
    ".pypirc",
    ".ssh/id_ed25519",
    ".aws/credentials",
    "service-account.json",
    "token.json",
    ".config/auth-token",
  ];

  for (const candidate of paths) {
    assert.equal(fs.existsSync(path.join(root, candidate)), false);
    const result = invoke(root, [candidate]);
    rejected(result);
    assert.deepEqual(Object.keys(JSON.parse(result.stdout)), ["status"]);
  }
});

test("rejects untracked files outside the explicit inventory", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "authorized.txt"), "included\n");
  fs.writeFileSync(path.join(root, "unexpected.txt"), "not included\n");
  rejected(invoke(root, ["authorized.txt"]));
  accepted(invoke(root, ["authorized.txt", "unexpected.txt"]));
});

test("uses only local Git operations even when an origin is configured", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "local.txt"), "local\n");
  const result = invoke(root, ["local.txt"]);
  accepted(result);
  assert.equal(result.stderr, "");
});
