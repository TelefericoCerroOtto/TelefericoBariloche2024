const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

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
