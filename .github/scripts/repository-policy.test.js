const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const policy = require("./repository-policy.js");

const repositoryRoot = path.join(__dirname, "..", "..");

test("accepts tracked and explicitly untracked implementation branch grammars", () => {
  assert.deepEqual(policy.validateImplementationBranchName("fix/app-tb-082-login-refresh"), {
    mode: "tracked",
    branchName: "fix/app-tb-082-login-refresh",
    type: "fix",
    directory: "app",
    slug: "login-refresh",
    workId: "TB-82",
  });
  assert.equal(policy.validateImplementationBranchName("chore/app-cms-root-no-backlog-policy-docs").mode, "explicitly-untracked");
  assert.equal(policy.validateImplementationBranchName("development").mode, "promotion");
});

test("rejects bypass-shaped branches and invalid directory grammar", () => {
  const cases = [
    "fix/root-legacy-governance",
    "fix/root-tb103-governance",
    "fix/root-tb-82",
    "fix/root-no-backlog",
    "Fix/root-tb-82-governance",
    "fix/root-tb-82-Governance",
    "fix/root-tb-82-tb-82-governance",
    "fix/root-tb-82-tb-83-governance",
    "fix/root-tb-82-tb82-governance",
    "fix/infra-tb-82-governance",
    "fix/cms-app-tb-82-governance",
    "fix/app-app-tb-82-governance",
    "feature/root-tb-82-governance",
  ];
  for (const branch of cases) assert.throws(() => policy.validateImplementationBranchName(branch), undefined, branch);
});

test("classifies every non-promotion PR targeting development as implementation", () => {
  assert.equal(policy.classifyPullRequest("feature/root-tb-82-governance", "development").type, "implementation");
  assert.equal(policy.classifyPullRequest("legacy-branch", "development").type, "implementation");
  assert.equal(policy.classifyPullRequest("development", "staging").type, "promotion-to-staging");
  assert.equal(policy.classifyPullRequest("staging", "main").type, "promotion-to-main");
  assert.equal(policy.classifyPullRequest("fix/root-tb-82-governance", "staging").type, "unsupported-implementation-target");
});

test("validates conventional commit messages without enforcing recommended length", () => {
  assert.equal(policy.validateCommitMessage("fix(app/auth): Repair session refresh").kind, "conventional");
  assert.equal(policy.validateCommitMessage("fix(root/Policy): Preserve documented scope freedom").kind, "conventional");
  assert.equal(policy.validateCommitMessage(`docs(app-cms-root/policy): ${"A".repeat(150)}`).kind, "conventional");
});

test("rejects malformed commit messages and invalid commit directories", () => {
  for (const message of [
    "fix: missing scope",
    "Fix(root/policy): uppercase type",
    "fix(infra/policy): unknown directory",
    "fix(cms-app/policy): unordered composite",
    "fix(root/policy): ",
  ]) assert.throws(() => policy.validateCommitMessage(message), undefined, message);
});

test("allows only explicit Git-generated merge and revert subjects", () => {
  assert.equal(policy.validateCommitMessage("Merge branch 'development' into fix/root-tb-82-governance").kind, "git-generated-merge");
  assert.equal(policy.validateCommitMessage("Merge pull request #251 from acme/fix/root-tb-82-governance").kind, "git-generated-merge");
  assert.equal(policy.validateCommitMessage('Revert "fix(root/policy): Enforce branch grammar"').kind, "git-generated-revert");
  assert.throws(() => policy.validateCommitMessage("Merge important work"));
  assert.throws(() => policy.validateCommitMessage('Revert "important work"'));
});

function copyHookFiles(repositoryRoot, targetRoot) {
  fs.mkdirSync(path.join(targetRoot, ".github", "scripts"), { recursive: true });
  fs.mkdirSync(path.join(targetRoot, ".githooks"), { recursive: true });
  fs.mkdirSync(path.join(targetRoot, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(repositoryRoot, ".github", "scripts", "repository-policy.js"), path.join(targetRoot, ".github", "scripts", "repository-policy.js"));
  for (const hook of ["pre-commit", "commit-msg", "pre-push"]) {
    const destination = path.join(targetRoot, ".githooks", hook);
    fs.copyFileSync(path.join(repositoryRoot, ".githooks", hook), destination);
    fs.chmodSync(destination, 0o755);
  }
  const setup = path.join(targetRoot, "scripts", "setup-git-hooks.sh");
  fs.copyFileSync(path.join(repositoryRoot, "scripts", "setup-git-hooks.sh"), setup);
  fs.chmodSync(setup, 0o755);
  return setup;
}

test("worktree-safe setup and native hooks validate happy and failure paths without commits or pushes", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "repository-policy-"));
  const linkedWorktree = path.join(temporaryRoot, "linked-worktree");
  try {
    childProcess.execFileSync("git", ["init", temporaryRoot], { stdio: "ignore" });
    const globalConfig = path.join(temporaryRoot, "global-config");
    fs.writeFileSync(globalConfig, "");
    const setupEnvironment = { ...process.env, GIT_CONFIG_GLOBAL: globalConfig };
    const setup = copyHookFiles(repositoryRoot, temporaryRoot);
    childProcess.execFileSync("git", ["-C", temporaryRoot, "symbolic-ref", "HEAD", "refs/heads/fix/root-tb-82-governance"]);
    childProcess.execFileSync("git", ["-C", temporaryRoot, "worktree", "add", "--orphan", linkedWorktree], { stdio: "ignore" });
    const linkedSetup = copyHookFiles(repositoryRoot, linkedWorktree);
    childProcess.execFileSync(setup, { cwd: temporaryRoot, stdio: "ignore", env: setupEnvironment });
    assert.equal(childProcess.execFileSync("git", ["-C", temporaryRoot, "config", "--worktree", "--get", "core.hooksPath"], { encoding: "utf8" }).trim(), path.join(temporaryRoot, ".githooks"));
    assert.equal(childProcess.spawnSync("git", ["-C", linkedWorktree, "config", "--worktree", "--get", "core.hooksPath"]).status, 1);
    childProcess.execFileSync(linkedSetup, { cwd: linkedWorktree, stdio: "ignore", env: setupEnvironment });
    assert.equal(childProcess.execFileSync("git", ["-C", linkedWorktree, "config", "--worktree", "--get", "core.hooksPath"], { encoding: "utf8" }).trim(), path.join(linkedWorktree, ".githooks"));
    assert.equal(childProcess.execFileSync("git", ["-C", temporaryRoot, "config", "--worktree", "--get", "core.hooksPath"], { encoding: "utf8" }).trim(), path.join(temporaryRoot, ".githooks"));
    childProcess.execFileSync(setup, { cwd: temporaryRoot, stdio: "ignore", env: setupEnvironment });
    const externalWorktreeHooksPath = path.join(linkedWorktree, "external-hooks");
    childProcess.execFileSync("git", ["-C", linkedWorktree, "config", "--worktree", "--add", "core.hooksPath", externalWorktreeHooksPath]);
    assert.throws(() => childProcess.execFileSync(linkedSetup, { cwd: linkedWorktree, stdio: "ignore", env: setupEnvironment }));
    const linkedWorktreeConfigPath = childProcess.execFileSync("git", ["-C", linkedWorktree, "rev-parse", "--git-path", "config.worktree"], { encoding: "utf8" }).trim();
    const linkedWorktreeConfig = path.isAbsolute(linkedWorktreeConfigPath) ? linkedWorktreeConfigPath : path.join(linkedWorktree, linkedWorktreeConfigPath);
    const linkedRemovalOutput = childProcess.execFileSync(linkedSetup, ["--remove"], { cwd: linkedWorktree, encoding: "utf8", env: setupEnvironment });
    assert.ok(linkedRemovalOutput.includes(`Preserved external core.hooksPath is now effective: ${externalWorktreeHooksPath}`));
    assert.deepEqual(childProcess.execFileSync("git", ["config", "--file", linkedWorktreeConfig, "--get-all", "core.hooksPath"], { encoding: "utf8" }).trim().split("\n"), [externalWorktreeHooksPath]);
    const externalConfigContents = fs.readFileSync(linkedWorktreeConfig, "utf8");
    assert.match(childProcess.execFileSync(linkedSetup, ["--remove"], { cwd: linkedWorktree, encoding: "utf8", env: setupEnvironment }), /No script-owned worktree core\.hooksPath is configured/);
    assert.equal(fs.readFileSync(linkedWorktreeConfig, "utf8"), externalConfigContents);

    childProcess.execFileSync(path.join(temporaryRoot, ".githooks", "pre-commit"), { cwd: temporaryRoot, stdio: "ignore" });
    const validMessage = path.join(temporaryRoot, "valid-message");
    const invalidMessage = path.join(temporaryRoot, "invalid-message");
    fs.writeFileSync(validMessage, "chore(root/policy): Install native hooks\n");
    fs.writeFileSync(invalidMessage, "invalid message\n");
    childProcess.execFileSync(path.join(temporaryRoot, ".githooks", "commit-msg"), [validMessage], { cwd: temporaryRoot, stdio: "ignore" });
    assert.throws(() => childProcess.execFileSync(path.join(temporaryRoot, ".githooks", "commit-msg"), [invalidMessage], { cwd: temporaryRoot, stdio: "ignore" }));

    const pushInput = "refs/heads/fix/root-tb-82-governance abc refs/heads/fix/root-tb-82-governance def\n";
    assert.equal(childProcess.spawnSync(path.join(temporaryRoot, ".githooks", "pre-push"), [], { cwd: temporaryRoot, input: pushInput }).status, 0);
    childProcess.execFileSync("git", ["-C", temporaryRoot, "symbolic-ref", "HEAD", "refs/heads/legacy-branch"]);
    assert.throws(() => childProcess.execFileSync(path.join(temporaryRoot, ".githooks", "pre-commit"), { cwd: temporaryRoot, stdio: "ignore" }));
    const invalidPush = "refs/heads/legacy-branch abc refs/heads/legacy-branch def\n";
    assert.notEqual(childProcess.spawnSync(path.join(temporaryRoot, ".githooks", "pre-push"), [], { cwd: temporaryRoot, input: invalidPush }).status, 0);
    const globalHooksPath = path.join(temporaryRoot, "global-hooks");
    childProcess.execFileSync("git", ["config", "--file", globalConfig, "core.hooksPath", globalHooksPath]);
    assert.throws(() => childProcess.execFileSync(setup, { cwd: temporaryRoot, stdio: "ignore", env: setupEnvironment }));
    assert.equal(childProcess.execFileSync("git", ["-C", temporaryRoot, "config", "--worktree", "--get", "core.hooksPath"], { encoding: "utf8", env: setupEnvironment }).trim(), path.join(temporaryRoot, ".githooks"));
    const removalOutput = childProcess.execFileSync(setup, ["--remove"], { cwd: temporaryRoot, encoding: "utf8", env: setupEnvironment });
    assert.ok(removalOutput.includes(`Preserved external core.hooksPath is now effective: ${globalHooksPath}`));
    assert.equal(childProcess.execFileSync("git", ["config", "--file", globalConfig, "--get", "core.hooksPath"], { encoding: "utf8" }).trim(), globalHooksPath);
    assert.equal(childProcess.execFileSync("git", ["-C", temporaryRoot, "config", "--get", "core.hooksPath"], { encoding: "utf8", env: setupEnvironment }).trim(), globalHooksPath);
    assert.equal(childProcess.execFileSync("git", ["-C", linkedWorktree, "config", "--worktree", "--get", "core.hooksPath"], { encoding: "utf8" }).trim(), externalWorktreeHooksPath);

    const collisionRoot = fs.mkdtempSync(path.join(os.tmpdir(), "repository-policy-collision-"));
    try {
      childProcess.execFileSync("git", ["init", collisionRoot], { stdio: "ignore" });
      const collisionSetup = copyHookFiles(repositoryRoot, collisionRoot);
      const commonHooksPath = path.join(collisionRoot, "common-hooks");
      childProcess.execFileSync("git", ["-C", collisionRoot, "config", "--local", "core.hooksPath", commonHooksPath]);
      assert.throws(() => childProcess.execFileSync(collisionSetup, { cwd: collisionRoot, stdio: "ignore" }));
      assert.equal(childProcess.execFileSync("git", ["-C", collisionRoot, "config", "--local", "--get", "core.hooksPath"], { encoding: "utf8" }).trim(), commonHooksPath);
    } finally {
      fs.rmSync(collisionRoot, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
