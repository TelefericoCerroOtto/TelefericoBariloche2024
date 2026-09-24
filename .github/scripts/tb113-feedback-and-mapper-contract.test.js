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

test("mapper remote inventory is a third authorized scope with a read-only contract", () => {
  const mapper = read(".opencode/agents/delivery-state-mapper.md");

  assert.match(mapper, /"\*": deny/);
  assert.match(mapper, /authorized-remote-inventory/);
  assert.match(mapper, /explicit current-session authorization naming the destination repository, read-only operation, and credential\/session/);
  assert.match(mapper, /do not fetch, run other Git remote commands, inspect credential state, or mutate remote\/local delivery state/);
  assert.match(mapper, /authorized-publication-preflight/);
  assert.match(mapper, /specifically authorized fetch/);
  assert.match(
    mapper,
    /scope: "local-boundary" \| "authorized-publication-preflight" \| "authorized-remote-inventory"/,
  );

  for (const command of [
    '"gh pr list*": allow',
    '"gh pr view*": allow',
    '"gh issue list*": allow',
    '"gh issue view*": allow',
    '"gh repo view*": allow',
    '"gh run list*": allow',
    '"gh run view*": allow',
    '"git status --short": allow',
    '"git rev-parse *": allow',
    '"git merge-base *": allow',
    '"git for-each-ref *": allow',
  ]) {
    assert.ok(mapper.includes(command), `missing safe read command: ${command}`);
  }

  for (const forbidden of [
    '"gh *": allow',
    '"gh api *": allow',
    '"gh pr merge*": allow',
    '"gh pr edit*": allow',
    '"git *": allow',
    '"git push*": allow',
    '"git commit*": allow',
    '"git reset*": allow',
    '"--method GET *": allow',
  ]) {
    assert.ok(!mapper.includes(forbidden), `unsafe allow pattern present: ${forbidden}`);
  }
  assert.doesNotMatch(mapper, /"gh auth status[^\n]*: allow/);
  assert.match(mapper, /"\*": deny[\s\S]*"gh pr list\*": allow/);
});

test("mapper Bash allow rules remain a finite read-oriented subset", () => {
  const mapper = read(".opencode/agents/delivery-state-mapper.md");
  const bashPolicy = mapper.match(/  bash:\n([\s\S]*?)^---$/m)?.[1];
  assert.ok(bashPolicy, "expected a Bash permission policy in frontmatter");
  const allowedCommands = [...bashPolicy.matchAll(/^    "([^"]+)": allow$/gm)].map(
    ([, command]) => command,
  );

  assert.ok(allowedCommands.length > 0);
  assert.ok(allowedCommands.every((command) => !/[;&|`]/.test(command)));
  assert.ok(allowedCommands.every((command) =>
    command.startsWith("gh pr list") ||
    command.startsWith("gh pr view") ||
    command.startsWith("gh issue list") ||
    command.startsWith("gh issue view") ||
    command.startsWith("gh repo view") ||
    command.startsWith("gh run list") ||
    command.startsWith("gh run view") ||
    command.startsWith("git ") ||
    command === "pwd" ||
    command.startsWith("date -u"),
  ));
  assert.match(mapper, /"\*": deny/);
});

function parseBashRules(mapper) {
  const bashPolicy = mapper.match(/  bash:\n([\s\S]*?)^---$/m)?.[1];
  assert.ok(bashPolicy, "expected a Bash permission policy in frontmatter");
  return [...bashPolicy.matchAll(/^    "([^"]+)": (allow|ask|deny)$/gm)].map(
    ([, pattern, action]) => ({ pattern, action }),
  );
}

function matchesOpenCodePattern(pattern, value) {
  const expression = [...pattern].map((character) => {
    if (character === "*") return ".*";
    if (character === "?") return ".";
    return character.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
  }).join("");
  return new RegExp(`^${expression}$`).test(value);
}

function modeledBashAction(rules, command) {
  const matchingRules = rules.filter(({ pattern }) =>
    matchesOpenCodePattern(pattern, command),
  );
  return matchingRules.at(-1)?.action;
}

test("modeled OpenCode glob rules allow only the exact publication fetch", () => {
  const mapper = read(".opencode/agents/delivery-state-mapper.md");
  const rules = parseBashRules(mapper);
  assert.deepEqual(
    rules.filter(({ pattern, action }) => pattern.startsWith("git fetch") && action === "allow")
      .map(({ pattern }) => pattern),
    ["git fetch origin"],
  );

  assert.equal(modeledBashAction(rules, "git fetch origin"), "allow");
  for (const command of [
    "git fetch upstream",
    "git fetch origin main",
    "git fetch origin refs/heads/topic:refs/heads/topic",
    "git fetch origin --prune",
    "git fetch --all",
    "git fetch --dry-run origin",
  ]) {
    assert.equal(modeledBashAction(rules, command), "deny", command);
  }

  for (const command of [
    "git push origin",
    "git commit -m message",
    "git reset --hard",
    "gh pr edit 42",
    "gh pr merge 42",
    "gh api repos/example/project --method POST",
    "gh api repos/example/project --method PATCH",
    "gh api repos/example/project --input payload.json",
  ]) {
    assert.equal(modeledBashAction(rules, command), "deny", command);
  }

  // This is matcher evidence, not an ACL: the prompt must reject foreign repo targets.
  assert.equal(
    modeledBashAction(rules, "gh pr view 42 --repo foreign/repository"),
    "allow",
  );
  assert.match(mapper, /Bash allowlist is not a repository ACL/);
  assert.match(mapper, /explicit repository target equals the currently authorized destination/);
  assert.match(mapper, /If the target is absent, dynamic, foreign, or otherwise unverifiable, do not run the command and fail closed/);
});
