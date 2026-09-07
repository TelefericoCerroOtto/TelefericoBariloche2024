# Local Git Hook Setup

The tracked native hooks provide fast, offline feedback before a commit or push. They use the same dependency-free policy module as GitHub Actions.

## Quick path

1. Run `./scripts/setup-git-hooks.sh` from each worktree that should opt in.
2. Confirm the command reports an absolute **worktree** `core.hooksPath` ending in that checkout's `.githooks`.
3. Commit or push from a policy-compliant branch.

The setup command enables Git's shared `extensions.worktreeConfig` when it is unset, then writes `core.hooksPath` only with `git config --worktree`. It does not install packages or change global configuration. Activating one worktree never activates or redirects another worktree.

If any common or global `core.hooksPath` differs from this worktree's `.githooks`, setup fails without replacing it, even when this worktree is already configured. A different worktree hooks path or an explicit `extensions.worktreeConfig=false` also fails. Re-running setup is idempotent only when every relevant hooks path is absent or already matches this worktree's target.

## Checks

| Hook | Validation |
| --- | --- |
| `pre-commit` | Current branch uses a tracked, explicit no-backlog, or promotion branch form. |
| `commit-msg` | Commit subject uses the documented convention or an explicit Git-generated exception. |
| `pre-push` | Each pushed local branch uses a valid branch form. |

## Limits

Hooks do not query Notion or GitHub. They do not run `npx`, `pnpm dlx`, package installation, builds, typechecks, Playwright, or test suites. GitHub Actions performs the authoritative Notion identity and PR commit-list checks.

## Removal

Run `./scripts/setup-git-hooks.sh --remove` from the opted-in worktree. It removes only the exact worktree-specific path for that checkout's `.githooks`; every other worktree value is preserved. If the target is absent, removal is a no-op. Global and common paths are never changed. If another value becomes effective after removal, the script reports it as preserved external configuration. The shared `extensions.worktreeConfig` setting remains enabled because other worktrees may rely on it.

Do not bypass hooks. Correct the branch or commit message instead.
