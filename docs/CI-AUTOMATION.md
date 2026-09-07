# GitHub Actions Automation & Governance

This document explains **what the repository automates**, **why it lives in GitHub Actions**, and **how to extend it later** without mixing backlog governance with general CI responsibilities too early.

## Goal

This slice keeps backlog governance executable from GitHub Actions while delegating issue formalization to explicit human/agent flow:

- [docs/todo-workflow.md](./todo-workflow.md)
- [docs/backlog-branch-pr-policy.md](./backlog-branch-pr-policy.md)
- [docs/CONVENTIONS.md](./docs/CONVENTIONS.md)

The goal is to reduce manual drift between Notion and GitHub while keeping **Notion as the source of truth before formalization** and ensuring issue creation is always an explicit human/agent decision.

## Why documentation is required

The workflow YAML alone is **not** enough.

The code can execute the automation, but the team also needs a stable explanation of:

- when PR governance should fail fast
- when the workflow should fail
- why issue formalization is intentionally outside GitHub Actions
- which secrets and variables must exist
- where future automation for tests, installs, or CI checks should live

That is why this implementation is intentionally split into:

- a workflow that wires triggers and permissions
- a shared PR orchestration script, a pure repository-policy module, and tracked native hooks
- this document, which preserves the rationale

## Implemented architecture

### Workflow

File: `.github/workflows/backlog-governance.yml`

Responsibilities:

- listen to GitHub events
- inject secrets and repository variables
- run the shared synchronization script in the right mode

Triggers:

- `workflow_dispatch` → run validation-only preview checks on demand using operator-supplied PR metadata; it never performs GitHub or Notion mutations and always executes the trusted default-branch workflow/script code
- `pull_request` → runs the dependency-free Node governance tests against PR code with read-only permissions and no secrets
- `pull_request_target` → runs validation from trusted default-branch workflow code; the live governance change takes effect only after it reaches the default branch

### Shared script

File: `.github/scripts/github-notion-sync.js`

Responsibilities:

- query Notion for governed backlog linkage checks
- validate implementation/promotion PR policy
- validate PR commit messages fetched through GitHub's read-only pull-request commits API
- sync `Hecho` status on merged `staging -> main` promotions only for issues with explicit closure intent
- record phased delivery for `Advances #N` without closing the issue or changing its Notion status

Commands are separated by responsibility: `validate-pr-policy` renders the PR body with GitHub GFM and performs read-only policy checks; `sync-pr-mutations` performs the trusted write phase; and the `trusted-pr-sync` workflow job invokes that write command only after validation. Issue-reference synchronization is part of the write phase.

The workflow separates read-only validation from privileged synchronization. Validation has read-only issue permissions. Append-only issue comments and Notion closure updates run only after the governance test job and validation job both succeed, only for same-repository `pull_request_target` events, and only in the dedicated job with `issues: write`. Fork metadata and manual dispatch inputs can never trigger a mutation. Every secret-bearing job checks out the repository default branch before executing `.github/scripts/github-notion-sync.js`, so the workflow never executes selected-ref or PR-head code with secrets.

The script uses **plain Node.js with native `fetch`** so the repository does not need a root package manager or root dependency installation just to support this automation.

### Repository policy and local hooks

Files:

- `.github/scripts/repository-policy.js`
- `.githooks/pre-commit`
- `.githooks/commit-msg`
- `.githooks/pre-push`
- `scripts/setup-git-hooks.sh`

`repository-policy.js` is the single syntax source for branch names and commit subjects. Hooks call it directly with Node; they do not duplicate policy regular expressions or query external services. Run `./scripts/setup-git-hooks.sh` once in each opting-in worktree to set only that checkout's absolute `core.hooksPath`. The script uses Git worktree-specific config, rejects existing conflicting hook paths, does not install packages, and does not change global Git configuration. See [GIT-HOOKS.md](./GIT-HOOKS.md).

## Issue formalization boundary

Issue creation/formalization is outside this workflow.

- Use the human/agent flow documented in `docs/todo-workflow.md`.
- Keep `docs/issue-context-contract.md` as the canonical body structure when an issue is created.
- GitHub Actions in this slice only validates/governs already-linked artifacts.

## Flows implemented

### 1. `validate-pr-policy`

Use case:

- a governed PR is opened, edited, or updated
- it validates whether the PR is an implementation PR or a promotion PR, and enforces the issue closure policy before merge

What it does:

**For implementation PRs (every non-promotion PR targeting `development`):**
1. fails if the target branch is not `development`
2. fails if GitHub-rendered visible PR text contains closing keywords (e.g., `Closes #N`)
3. requires `<type>/<dir>-tb-<digits>-<slug>` for tracked work or `<type>/<dir>-no-backlog-<slug>` for explicitly untracked work
4. resolves exactly one tracked Notion item through the explicit branch `Work ID`; a different or empty Notion `Branch` cannot veto it or establish a fallback
5. permits an explicitly untracked PR only for the explicit no-backlog branch form and when `## Tracking` contains `Backlog item: none` plus a non-empty `Reason:` line
6. requires a non-empty `Canal formal` for tracked items
7. if `Canal formal = GitHub Issue`, requires a valid linked GitHub Issue URL, verifies it exists, and requires its exact `Refs #N` reference inside a visible final `## Related Issues` section
8. permits optional `Refs #N` for non-issue and explicitly untracked PRs, but verifies every visible explicit reference from the final `## Related Issues` section before comment synchronization
9. fetches PR commit metadata through GitHub's API and validates each message with the shared policy module

Branch validation checks deterministic syntax and identity only. It does not judge whether the slug is semantically meaningful. Missing, malformed, repeated, multiple, ambiguous, or unknown Work IDs fail closed; missing a Work ID never enables no-backlog mode.

Policy semantics come from GitHub's GFM renderer, not from handwritten Markdown parsing. The script reads only visible headings and text from GitHub-sanitized HTML; rendered code, blockquotes, details, hidden containers, and tag attributes do not count. Rendering failures fail closed.

Promotion references remain optional. No references are a silent no-op. A supplied reference that is definitively missing skips all comment writes for that PR with a warning; transient, rate-limit, authentication, malformed-response, and server failures fail so the run can be retried safely. Governance accepts at most 100 distinct explicit issue references per PR and fetches them with bounded concurrency of five.

**For promotion PRs to staging (`development` -> `staging`):**
1. fails if the PR body contains closing keywords

**For promotion PRs to main (`staging` -> `main`):**
1. accepts `Closes #N` for completed issues, `Advances #N` for intermediate delivery phases, or the exact line `Formal issues: none` when the release has no formal issues
2. fails when the PR body contains none of those declarations
3. fails when the same issue is both advanced and closed, or when `Formal issues: none` is combined with either reference type

| Combination | Result |
| --- | --- |
| `Advances #N` alone | Valid |
| `Advances #N` + `Closes #M` for different issues | Valid |
| `Advances #N` + `Closes #N` for the same issue | Invalid |
| `Advances #N` + `Formal issues: none` | Invalid |
| `Closes #N` + `Formal issues: none` | Invalid |
| No declaration | Invalid |

Phased delivery is distinct from review slicing or chained PRs. Review slices ship together in one release and continue to use the existing promotion policy without `Advances`.

### 2. `sync-pr-mutations`

Use case:

- a `staging` -> `main` promotion PR is closed

What it does:

1. ignores the PR if it was closed without merge
2. parses closing and advancing references from the merged promotion PR body
3. preflights every referenced GitHub issue, issue-comment page, and unique Notion formal-link match before any GitHub or Notion write
4. marks only uniquely linked rows declared with `Closes #N` as `Hecho`; duplicate formal-link matches fail closed before any mutation
5. adds an `Advanced by` managed comment for `Advances #N` without adding `Shipped by`, closing the issue, or changing its Notion status
6. does nothing when the PR explicitly declares `Formal issues: none`

Conservative behavior:

- Manual issue closure does **not** trigger automation. Formal closure logic runs only when a promotion PR to main is merged.
- The workflow fails closed if PR bodies contradict the backlog policy.

## Required configuration

### Repository secrets

| Secret | Required | Purpose |
| --- | --- | --- |
| `NOTION_TOKEN` | yes | Notion integration token with read/write access |
| `NOTION_BACKLOG_DATA_SOURCE_ID` | yes | Notion data source ID for the shared backlog |

> `GITHUB_TOKEN` is provided by GitHub Actions automatically.

### Optional repository variables

These exist so the workflow can adapt if the Notion property names or option names change later.

| Variable | Default |
| --- | --- |
| `NOTION_VERSION` | `2025-09-03` |
| `NOTION_WORK_ID_PROPERTY` | `Work ID` |
| `NOTION_STATUS_PROPERTY` | `Estado` |
| `NOTION_FORMAL_CHANNEL_PROPERTY` | `Canal formal` |
| `NOTION_FORMAL_LINK_PROPERTY` | `Enlace formal` |
| `NOTION_BRANCH_PROPERTY` | `Branch` |
| `NOTION_DONE_STATUS` | `Hecho` |
| `NOTION_GITHUB_ISSUE_CHANNEL` | `GitHub Issue` |

`NOTION_FORMAL_LINK_PROPERTY` should remain a real Notion `url` property because the close-sync path queries it as a URL filter.

## Test execution and activation

The workflow exposes these checks: `Governance tests`, `validate-pr-policy`, and `trusted-pr-sync`. `Governance tests` runs `node --test .github/scripts/*.test.js` for pull requests without secrets or write permissions. It includes branch grammar, commit-message grammar, and hook setup tests. Secret-bearing jobs deliberately check out the default branch, not PR code or manually selected refs; this protects privileged validation but means workflow/script fixes become live only after they are promoted to the default branch. `validate-pr-policy` uses that trusted code to fetch PR commit metadata from GitHub's read-only API boundary.

Only trusted-sync runs for the same PR are serialized. Each issue relation is an append-only comment with a deterministic marker, so unrelated PRs never share mutable issue-body state. The action lists paginated comments before posting, making retries idempotent without rewriting issue bodies. Legacy managed body blocks remain untouched and are not used for new synchronization.

## On-demand validation

The workflow exposes `workflow_dispatch` inputs for:

- `branch_name`
- `base_branch`
- `pr_body`
- `pr_action`
- `pr_merged`

Manual dispatch is validation-only. It is the safe preview surface for checking policy decisions against real repository configuration without writing to GitHub or Notion.

`workflow_dispatch` preview also checks out the trusted default branch before running the privileged validation script. Operator-supplied metadata influences validation inputs only; it never selects which repository code runs with secrets.

Manual dispatch validates the supplied branch and PR-body policy but does not validate commit messages because it has no PR number or commit-list input. The `pull_request_target` validation path performs the authoritative commit-list check through GitHub's read-only API.

Recommended operating model:

1. Capture and triage work in Notion.
2. Decide explicitly what should become a formal artifact.
3. Formalize artifacts explicitly through human/agent flow; then rely on this workflow for PR governance and promotion closure sync only.

## Security notes

- The PR validation path uses `pull_request_target` so it can access repository secrets.
- Secret-bearing jobs check out the **trusted default branch**, not arbitrary PR code, PR-head code, or manually selected refs.
- Privileged mutation requires an actual same-repository `pull_request_target` event; `workflow_dispatch` never synthesizes trust from operator-provided inputs.
- Manual validation never executes selected-ref or PR-head code with secrets.
- Sensitive sync logic stays in one reviewed script instead of being spread across opaque inline YAML snippets.

## Intentional limits of this first slice

This implementation does **not** yet:

- create GitHub issues from Notion rows
- create Notion backlog items from GitHub
- infer whether something “implies repo changes” by heuristic analysis
- synchronize `Formalizado` links/status automatically
- create issue body content from backlog fields

Those are separate concerns and should not be mixed into the governance slice before this flow is stable.

## How to extend it later

When you add test automation or package-installation checks, prefer this structure:

1. keep backlog governance in `backlog-governance.yml`
2. add separate workflows or separate jobs for CI validation
3. reuse `.github/scripts/` only for shared GitHub automation logic that belongs to repository governance

Why: backlog synchronization and CI validation have different permissions, failure semantics, runtime cost, and review concerns.

## Relationship to repo policy

This automation implements the current policy; it does not silently replace it.

- `docs/todo-workflow.md` still defines Notion as the pre-issue source of truth
- `docs/backlog-branch-pr-policy.md` still defines reliable branch ↔ `Work ID` association
- `docs/CONVENTIONS.md` still governs how implementation and promotion PRs reference and close issues

In short: PR governance and promotion closure sync stay automatic on PR events, while issue formalization is explicit human/agent work.
