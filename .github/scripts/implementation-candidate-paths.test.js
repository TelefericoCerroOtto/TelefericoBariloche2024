"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const { validateCandidatePath } = require("./implementation-candidate-paths.js");

const helperPath = path.join(__dirname, "implementation-candidate-paths.js");

function invoke(paths) {
  return spawnSync(process.execPath, [helperPath, ...paths], {
    encoding: "utf8",
  });
}

test("allows ordinary paths and exact environment-template basenames without reading files", () => {
  for (const candidate of [
    "src/example.ts",
    "teleferico-app/.env.example",
    "teleferico-app/config/.env.sample",
    "docs/config/.env.template",
  ]) {
    assert.doesNotThrow(() => validateCandidatePath(candidate), candidate);
  }

  const result = invoke(["teleferico-app/.env.example"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '{"status":"ok"}\n');
});

test("rejects secret-like, unknown environment, and unsafe path forms using names only", () => {
  for (const candidate of [
    "../outside",
    ".env",
    ".env.production",
    ".envrc",
    ".ENV.EXAMPLE",
    "secrets/.env.example",
    ".aws/.env.sample",
    ".npmrc",
    ".netrc",
    ".pypirc",
    ".ssh/id_ed25519",
    "credentials.json",
    "service-account.json",
    "auth-token.env.template",
  ]) {
    assert.throws(() => validateCandidatePath(candidate), /sensitive-looking path|invalid candidate path/, candidate);
  }

  const result = invoke([".env.production"]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '{"status":"rejected"}\n');
});

test("rejects empty candidate inventories", () => {
  const result = invoke([]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '{"status":"rejected"}\n');
});
