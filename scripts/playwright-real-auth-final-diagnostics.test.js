"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("the operator password is included in final redacted diagnostics", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "playwright-real-auth-lifecycle.js"),
    "utf8",
  );
  const diagnostics = source.match(
    /printDiagnostics\(effectivePrimary, cleanup, services, \[([\s\S]*?)\]\)/,
  )?.[1];

  assert.ok(diagnostics, "final diagnostics handoff must exist");
  assert.match(diagnostics, /\boperatorPassword\b/);
  assert.doesNotMatch(source, /\bmediaPassword\b/);
});
