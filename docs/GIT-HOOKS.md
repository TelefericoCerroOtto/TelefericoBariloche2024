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
| `commit-msg` | Commit subject and staged paths use the documented convention. It reads NUL-delimited staged paths with rename detection disabled, including deletes and both sides of cross-directory renames. |
| `pre-push` | Each pushed head branch uses a valid branch form and every outgoing commit is revalidated against paths derived from its first parent. |

## Limits

Hooks do not query Notion or GitHub. They do not run `npx`, `pnpm dlx`, package installation, builds, typechecks, Playwright, or test suites. GitHub Actions performs the authoritative Notion identity and PR commit-list checks.

`pre-push` ignores deleted and non-head refs, deduplicates commits shared by multiple refs, and never revalidates remote ancestry. For an existing remote ref it fails closed when the advertised remote commit is unavailable locally. For a new branch it compares against the configured remote namespace and fails closed if that namespace cannot be established. Git-generated merges skip path correlation; empty conventional commits are accepted with explicit `unverifiable` / `empty` metadata.

`commit-msg` validates the staged delta rather than a completed commit. In particular, an amend may replace a commit with paths outside that staged delta. The later `pre-push` and pull-request checks validate the final commit against its first parent.

## Removal

Run `./scripts/setup-git-hooks.sh --remove` from the opted-in worktree. It removes only the exact worktree-specific path for that checkout's `.githooks`; every other worktree value is preserved. If the target is absent, removal is a no-op. Global and common paths are never changed. If another value becomes effective after removal, the script reports it as preserved external configuration. The shared `extensions.worktreeConfig` setting remains enabled because other worktrees may rely on it.

Do not bypass hooks. Correct the branch or commit message instead.
