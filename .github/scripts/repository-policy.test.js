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

test("classifies implementation, promotion, and governed stacked-preview routes", () => {
  assert.equal(policy.classifyPullRequest("feature/root-tb-82-governance", "development").type, "implementation");
  assert.equal(policy.classifyPullRequest("legacy-branch", "development").type, "implementation");
  assert.equal(policy.classifyPullRequest("development", "staging").type, "promotion-to-staging");
  assert.equal(policy.classifyPullRequest("staging", "main").type, "promotion-to-main");
  assert.equal(policy.classifyPullRequest("fix/root-tb-83-child", "feat/root-tb-82-parent").type, "stacked-child-preview");
  assert.equal(policy.classifyPullRequest("fix/root-tb-82-governance", "staging").type, "unsupported-implementation-target");
  assert.equal(policy.classifyPullRequest("fix/root-tb-83-child", "feature/root-tb-82-tracker").type, "unsupported-implementation-target");
  assert.equal(policy.classifyPullRequest("feature/root-tb-83-child", "feat/root-tb-82-parent").type, "unsupported-implementation-target");
  assert.equal(policy.classifyPullRequest("legacy-child", "feat/root-tb-82-parent").type, "unsupported-implementation-target");
});

test("validates conventional commit messages without enforcing recommended length", () => {
  assert.equal(policy.validateCommitMessage("fix(app/auth): Repair session refresh").kind, "conventional");
  assert.equal(policy.validateCommitMessage("fix(root/Policy): Preserve documented scope freedom").kind, "conventional");
  assert.equal(policy.validateCommitMessage(`docs(app-cms-root/policy): ${"A".repeat(150)}`).kind, "conventional");
});

test("derives exact conventional directories from changed paths", () => {
  assert.equal(policy.directoryForPath("teleferico-app/src/app/page.tsx"), "app");
  assert.equal(policy.directoryForPath("teleferico-cms/src/index.js"), "cms");
  assert.equal(policy.directoryForPath("tools/image-pipeline/index.js"), "tools");
  assert.equal(policy.directoryForPath("docs/CONVENTIONS.md"), "root");
  assert.equal(policy.deriveDirectoryFromPaths(["teleferico-app/src/app/page.tsx", "teleferico-cms/src/index.js", "docs/CONVENTIONS.md"]), "app-cms-root");
  assert.equal(policy.deriveDirectoryFromPaths([]), null);

  for (const [message, paths] of [
    ["feat(root/e2e): Cover root workflow", [".github/workflows/backlog-governance.yml"]],
    ["feat(app/login): Add login view", ["teleferico-app/src/app/login/page.tsx"]],
    ["fix(app-cms/contact-form): Repair submission", ["teleferico-app/src/components/contact.tsx", "teleferico-cms/src/api/contact/index.js"]],
  ]) {
    assert.equal(policy.validateCommitMessageAgainstPaths(message, paths).pathValidation.status, "verified", message);
  }
});

test("rejects directory omissions, extras, unordered composites, duplicates, and root wildcards", () => {
  const cases = [
    ["fix(app/login): Omit CMS", ["teleferico-app/a.js", "teleferico-cms/b.js"]],
    ["fix(app-cms/login): Add CMS", ["teleferico-app/a.js"]],
    ["fix(cms-app/login): Unordered", ["teleferico-app/a.js", "teleferico-cms/b.js"]],
    ["fix(app-app/login): Duplicate", ["teleferico-app/a.js"]],
    ["fix(root/login): Treat root as wildcard", ["teleferico-app/a.js"]],
  ];
  for (const [message, paths] of cases) assert.throws(() => policy.validateCommitMessageAgainstPaths(message, paths), undefined, message);
});

test("accepts compatible scopes and rejects separator and symbol near-misses", () => {
  for (const scope of ["CONVENTIONS.md", "AGENTS.md", "package.json", "UPPER", "snake_case", "camelCase", "dot.name", "under_score", "hyphen-name"]) {
    assert.equal(policy.validateCommitMessage(`docs(root/${scope}): Preserve scope compatibility`).kind, "conventional", scope);
  }
  for (const scope of [".leading", "trailing.", "double..dot", "double__under", "double--hyphen", "with@symbol", "with space", "with/slash", "with:colon", "with(paren)"]) {
    assert.throws(() => policy.validateCommitMessage(`docs(root/${scope}): Reject invalid scope`), undefined, scope);
  }
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

test("marks empty conventional commits unverifiable and handles merge and revert correlation", () => {
  assert.deepEqual(policy.validateCommitMessageAgainstPaths("chore(root/policy): Empty maintenance", []).pathValidation, {
    status: "unverifiable",
    reason: "empty",
    declaredDirectory: "root",
  });
  assert.equal(policy.validateCommitMessageAgainstPaths("Merge branch 'development'", ["teleferico-app/a.js"]).pathValidation.status, "skipped");
  assert.equal(policy.validateCommitMessageAgainstPaths('Revert "Merge branch \'development\'"', ["teleferico-app/a.js"]).pathValidation.reason, "reverted-git-generated-merge");
  assert.equal(policy.validateCommitMessageAgainstPaths('Revert "fix(app/login): Repair login"', ["teleferico-app/a.js"]).pathValidation.status, "verified");
  assert.throws(() => policy.validateCommitMessageAgainstPaths('Revert "fix(app/login): Repair login"', ["teleferico-cms/a.js"]));
  assert.equal(policy.validateCommitMessageAgainstPaths("revert(app/login): Repair login", ["teleferico-app/a.js"]).pathValidation.status, "verified");
});

test("correlates additions, deletions, cross-directory renames, and root commits", () => {
  assert.equal(policy.validateCommitMessageAgainstPaths("feat(app/login): Add login", ["teleferico-app/src/login.tsx"]).pathValidation.status, "verified");
  assert.equal(policy.validateCommitMessageAgainstPaths("fix(cms/contact): Delete contact", ["teleferico-cms/src/contact.js"]).pathValidation.status, "verified");
  assert.equal(policy.validateCommitMessageAgainstPaths("refactor(app-cms/contact): Move contact", ["teleferico-app/src/contact.tsx", "teleferico-cms/src/contact.js"]).pathValidation.status, "verified");
  assert.equal(policy.validateCommitMessageAgainstPaths("chore(root/AGENTS.md): Update governance", ["AGENTS.md"]).pathValidation.status, "verified");
});

function git(root, args, options = {}) {
  const output = childProcess.execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_AUTHOR_NAME: "Policy Test", GIT_AUTHOR_EMAIL: "policy@example.test", GIT_COMMITTER_NAME: "Policy Test", GIT_COMMITTER_EMAIL: "policy@example.test" },
    ...options,
  });
  return typeof output === "string" ? output.trim() : "";
}

function commitFile(root, file, contents, message) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), contents);
  git(root, ["add", "--", file]);
  git(root, ["commit", "--no-verify", "-m", message], { stdio: "ignore" });
  return git(root, ["rev-parse", "HEAD"]);
}

test("pre-push validates only outgoing commits and fails closed at unavailable boundaries", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "repository-policy-pre-push-"));
  const remoteRoot = path.join(temporaryRoot, "remote.git");
  const sourceRoot = path.join(temporaryRoot, "source");
  const hook = path.join(repositoryRoot, ".githooks", "pre-push");
  try {
    childProcess.execFileSync("git", ["init", "--bare", remoteRoot], { stdio: "ignore" });
    childProcess.execFileSync("git", ["init", sourceRoot], { stdio: "ignore" });
    copyHookFiles(repositoryRoot, sourceRoot);
    git(sourceRoot, ["symbolic-ref", "HEAD", "refs/heads/fix/root-tb-123-policy"]);
    const legacySha = commitFile(sourceRoot, "legacy.txt", "legacy", "unstructured legacy history");
    git(sourceRoot, ["remote", "add", "origin", remoteRoot]);
    git(sourceRoot, ["push", "origin", "HEAD:refs/heads/fix/root-tb-123-policy"], { stdio: "ignore" });
    git(sourceRoot, ["fetch", "origin"], { stdio: "ignore" });

    const validSha = commitFile(sourceRoot, "teleferico-app/src/login.tsx", "login", "feat(app/login): Add login");
    const existingRef = `refs/heads/fix/root-tb-123-policy ${validSha} refs/heads/fix/root-tb-123-policy ${legacySha}\n`;
    const existingPush = childProcess.spawnSync(hook, ["origin", remoteRoot], { cwd: sourceRoot, input: existingRef });
    assert.equal(existingPush.status, 0, `legacy remote ancestry is not revalidated: ${existingPush.stderr}`);

    git(sourceRoot, ["branch", "fix/app-tb-123-new-branch", validSha]);
    const newRef = `refs/heads/fix/app-tb-123-new-branch ${validSha} refs/heads/fix/app-tb-123-new-branch ${"0".repeat(40)}\n`;
    assert.equal(childProcess.spawnSync(hook, ["origin", remoteRoot], { cwd: sourceRoot, input: newRef }).status, 0, "new branch uses configured remote namespace");
    assert.equal(childProcess.spawnSync(hook, ["origin", remoteRoot], { cwd: sourceRoot, input: `refs/heads/legacy ${"0".repeat(40)} refs/heads/legacy ${legacySha}\nrefs/tags/v1 ${validSha} refs/tags/v1 ${"0".repeat(40)}\n` }).status, 0, "deleted and non-head refs are ignored");

    git(sourceRoot, ["checkout", "-b", "fix/app-tb-123-force-update", legacySha], { stdio: "ignore" });
    const forcedSha = commitFile(sourceRoot, "teleferico-app/src/force.tsx", "force", "feat(app/force): Replace outgoing history");
    assert.equal(childProcess.spawnSync(hook, ["origin", remoteRoot], { cwd: sourceRoot, input: `refs/heads/fix/app-tb-123-force-update ${forcedSha} refs/heads/fix/app-tb-123-force-update ${validSha}\n` }).status, 0, "force updates validate only their replacement commits");
    git(sourceRoot, ["checkout", "fix/root-tb-123-policy"], { stdio: "ignore" });

    const badSha = commitFile(sourceRoot, "teleferico-app/src/bad.ts", "bad", "fix(cms/contact): Mismatch path");
    const badRef = `refs/heads/fix/root-tb-123-policy ${badSha} refs/heads/fix/root-tb-123-policy ${legacySha}\n`;
    assert.notEqual(childProcess.spawnSync(hook, ["origin", remoteRoot], { cwd: sourceRoot, input: badRef }).status, 0, "malformed outgoing path correlation fails");
    git(sourceRoot, ["branch", "fix/app-tb-123-duplicate", badSha]);
    const duplicate = childProcess.spawnSync(hook, ["origin", remoteRoot], { cwd: sourceRoot, input: `${badRef}${`refs/heads/fix/app-tb-123-duplicate ${badSha} refs/heads/fix/app-tb-123-duplicate ${legacySha}\n`}` });
    assert.equal((duplicate.stderr.toString().match(/declares directory/g) || []).length, 1, "repeated outgoing SHAs are deduplicated");
    git(sourceRoot, ["checkout", "-b", "fix/root-tb-123-malformed", legacySha], { stdio: "ignore" });
    const malformedSha = commitFile(sourceRoot, "malformed.txt", "malformed", "unstructured outgoing commit");
    assert.notEqual(childProcess.spawnSync(hook, ["origin", remoteRoot], { cwd: sourceRoot, input: `refs/heads/fix/root-tb-123-malformed ${malformedSha} refs/heads/fix/root-tb-123-malformed ${legacySha}\n` }).status, 0, "malformed outgoing messages fail");
    assert.notEqual(childProcess.spawnSync(hook, ["origin", remoteRoot], { cwd: sourceRoot, input: `refs/heads/fix/root-tb-123-policy ${validSha} refs/heads/fix/root-tb-123-policy ${"f".repeat(40)}\n` }).status, 0, "unavailable existing boundaries fail closed");
    assert.notEqual(childProcess.spawnSync(hook, ["missing", remoteRoot], { cwd: sourceRoot, input: newRef }).status, 0, "unavailable new-branch remote namespaces fail closed");
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
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
    fs.mkdirSync(path.join(temporaryRoot, "teleferico-app"), { recursive: true });
    fs.writeFileSync(path.join(temporaryRoot, "teleferico-app", "hook-test.js"), "export {};\n");
    childProcess.execFileSync("git", ["-C", temporaryRoot, "add", "--", "teleferico-app/hook-test.js"]);
    fs.writeFileSync(validMessage, "chore(app/hook-test): Validate staged paths\n");
    childProcess.execFileSync(path.join(temporaryRoot, ".githooks", "commit-msg"), [validMessage], { cwd: temporaryRoot, stdio: "ignore" });
    fs.writeFileSync(validMessage, "chore(root/hook-test): Reject root wildcard\n");
    assert.throws(() => childProcess.execFileSync(path.join(temporaryRoot, ".githooks", "commit-msg"), [validMessage], { cwd: temporaryRoot, stdio: "ignore" }));

    const pushInput = "\n";
    assert.equal(childProcess.spawnSync(path.join(temporaryRoot, ".githooks", "pre-push"), ["origin", "unused"], { cwd: temporaryRoot, input: pushInput }).status, 0);
    childProcess.execFileSync("git", ["-C", temporaryRoot, "symbolic-ref", "HEAD", "refs/heads/legacy-branch"]);
    assert.throws(() => childProcess.execFileSync(path.join(temporaryRoot, ".githooks", "pre-commit"), { cwd: temporaryRoot, stdio: "ignore" }));
    const invalidPush = "refs/heads/legacy-branch abc refs/heads/legacy-branch def\n";
    assert.notEqual(childProcess.spawnSync(path.join(temporaryRoot, ".githooks", "pre-push"), ["origin", "unused"], { cwd: temporaryRoot, input: invalidPush }).status, 0);
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
