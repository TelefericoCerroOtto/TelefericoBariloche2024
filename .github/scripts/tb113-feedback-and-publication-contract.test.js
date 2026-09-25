const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

test("app Cloud Build snapshots close feedback on every deploy", () => {
  const staging = read("docs/infra/cloud-build/app-staging.yaml");
  const production = read("docs/infra/cloud-build/app-production.yaml");

  assert.match(staging, /--set-env-vars[\s\S]*FEEDBACK_CAPABILITY_ENABLED=false/);
  assert.match(production, /FEEDBACK_CAPABILITY_ENABLED: "false"/);
  assert.doesNotMatch(staging, /FEEDBACK_CAPABILITY_ENABLED=true/);
  assert.doesNotMatch(production, /FEEDBACK_CAPABILITY_ENABLED: "true"/);
});

test("publication path classifies secrets by path without reading credential files", () => {
  const skill = read(".agents/skills/implementation-pr/SKILL.md");
  const command = read(".opencode/commands/implementation-pr.md");

  assert.match(skill, /unknown or secret-like candidate paths/);
  assert.match(skill, /never read credential files or secret values/i);
  assert.match(command, /unknown or secret-like candidate path/);
  assert.match(command, /Never read `\.env` or other credential\/secret files or their values/i);
  for (const contract of [skill, command]) {
    assert.match(contract, /checks path names only|checks names only/i);
    assert.doesNotMatch(contract, /implementation-candidate-identity/);
  }
});
