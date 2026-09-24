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
- validate each PR commit message and changed paths fetched through GitHub's read-only base-repository APIs
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

`repository-policy.js` is the dependency-free source for branch syntax, commit syntax, path-to-directory mapping, and commit/path correlation. Hooks call it directly with Node; they do not duplicate policy regular expressions or query external services. Run `./scripts/setup-git-hooks.sh` once in each opting-in worktree to set only that checkout's absolute `core.hooksPath`. The script uses Git worktree-specific config, rejects existing conflicting hook paths, does not install packages, and does not change global Git configuration. See [GIT-HOOKS.md](./GIT-HOOKS.md).

### Implementation PR governance observer

File: `.github/scripts/wait-for-implementation-governance.js`

The repository-local implementation finalizer invokes this dependency-free CLI with a PR number or URL. The observer binds one invocation to the resolved PR head SHA, base branch/SHA, and draft state, reads GitHub Actions workflow runs and exact-attempt jobs through `gh api`, and orders reruns by stable run number, attempt, and IDs rather than nullable timestamps. Only `pull_request` and `pull_request_target` runs are authoritative for governance; manual previews are ignored. Default mode remains strict for PRs into `development`. Explicit `--mode stacked-preview` accepts only a governed draft child route and reports functional/Cloud Build CI as deferred.

```bash
node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url> \
  --timeout-seconds 300 \
  --interval-seconds 5
```

Exit codes are stable: `0` means governance passed, `1` means governance failed, `2` means expected governance checks remained missing or pending until timeout, and `3` means usage, GitHub CLI, malformed-response, or PR-snapshot observation failed. Functional failures are reported but do not replace the governance exit code.

### Post-creation app Vitest evidence

File: `.github/scripts/implementation-pr-vitest.js`

Until required PR CI adopts app Vitest, `/implementation-pr` invokes this dependency-free helper once after governance observation with `--pr-created` and every path from the complete candidate inventory as repeated `--candidate-path` arguments. The helper runs `pnpm run test` when an app candidate is not Markdown documentation (`.md`/`.mdx`); CMS/root-only and app Markdown-only inventories skip. Its JSON schema `implementation-pr-vitest.v1` reports scope, path count, run count, and child exit code. Completed suite failures exit `0` with JSON `status=failed` so the workflow can continue; callers must inspect the JSON. Argument/process errors emit `status=error` and exit nonzero. `--pr-created` and the candidate-path list are caller inputs tied to successful PR read-back and the accepted snapshot; the helper does not verify PR identity or inventory completeness. Failure records withhold all stdout/stderr and include only safe category/exit/signal fields plus an explicit withholding note. Failure attribution remains `unclassified`. When required PR CI adopts the full app suite, retire the local rule and helper in the same policy change. Focused contract tests cover scope classification, output withholding, exit semantics, and governance-before-Vitest instructions.

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
9. lists the PR commits, then fetches each SHA from the trusted base repository and validates its full message against its own changed paths; changed-file pages, renamed/copied `previous_filename` values, malformed metadata, unresolved SHAs, and the GitHub commit API's 3,000-file truncation boundary fail closed.
   One PR validation has a shared 300-page commit-detail request budget: every accepted commit can use an initial page and 51 continuation pages remain; it fails before requesting a page beyond the budget.

Branch validation checks deterministic syntax and identity only. It does not judge whether the slug is semantically meaningful. Missing, malformed, repeated, multiple, ambiguous, or unknown Work IDs fail closed; missing a Work ID never enables no-backlog mode.

**For draft `stacked-to-main` child previews:**

1. requires governed head and immediate-parent branch names, same-repository head/base, draft state, and full runtime head/base SHAs
2. requires one deterministic visible `## Chain Context` section declaring `Strategy`, `Parent PR`, `Parent branch`, and `Parent head SHA` exactly once
3. iteratively verifies every declared parent through visible Chain Context until an open same-repository implementation PR into `development`; each open draft-preview ancestor must have governed head/base branches and a declared parent branch/head SHA matching its runtime base, and cycles or orphaned/malformed/hidden contexts fail closed
4. verifies a non-empty parent-relative PR file list and fails closed at GitHub's 3,000-file truncation boundary
5. runs commit governance but skips implementation tracking and explicitly no-ops `trusted-pr-sync`, so no GitHub issue or Notion mutation can occur
6. does not dispatch or claim Cloud Build/functional CI; those checks remain deferred until the same PR is retargeted to `development`

Policy semantics come from GitHub's GFM renderer, not from handwritten Markdown parsing. The script reads only visible headings and text from GitHub-sanitized HTML; rendered code, blockquotes, details, hidden containers, and tag attributes do not count. Rendering failures fail closed.

Every promotion PR uses the canonical body contract in [CONVENTIONS.md](./CONVENTIONS.md#promotion-pr-body-contract). It requires exactly one visible `## Included Implementation PRs`, `## Release Target`, `## Validation`, and `## Rollback` section; non-empty route-specific fields; and at least one unique `PR: #<number>` entry. Each included reference is verified through the GitHub pull-request API with bounded concurrency. Rendering and API failures fail closed.

**For promotion PRs to staging (`development` -> `staging`):**
1. requires `Environment: staging`, `Plan: <non-empty text>`, and `Strategy: <non-empty text>` in the canonical sections
2. fails if the PR body contains closing keywords
3. does not require the new promotion PR own CI results in the body; the plan names expected checks before they run

**For promotion PRs to main (`staging` -> `main`):**
1. requires `Environment: production`, `Prior staging validation evidence: <non-empty text>`, `Release candidate SHA: <40-character SHA>`, and `Strategy: <non-empty text>` in the canonical sections; the candidate SHA must equal the current PR head SHA case-insensitively
2. accepts `Closes #N` for completed issues, `Advances #N` for intermediate delivery phases, or the exact line `Formal issues: none` when the release has no formal issues
3. fails when the PR body contains none of those declarations
4. fails when the same issue is both advanced and closed, or when `Formal issues: none` is combined with either reference type
5. requires a visible `## Advancement Finalization` record for each `Advances #N`, with `Issue: #N`, `Remaining work or condition:`, `Finalization owner:`, and `Finalization event or action:` fields

| Combination | Result |
| --- | --- |
| `Advances #N` alone | Valid |
| `Advances #N` + `Closes #M` for different issues | Valid |
| `Advances #N` + `Closes #N` for the same issue | Invalid |
| `Advances #N` + `Formal issues: none` | Invalid |
| `Closes #N` + `Formal issues: none` | Invalid |
| No declaration | Invalid |

Phased delivery is distinct from review slicing or chained PRs. Use `Advances #N` only when real work or an actual acceptance condition remains after merge, with the required finalization path. Use `Closes #N` when merge delivers the complete intended mechanism, even if a deployment-triggered workflow executes that mechanism afterward. Review slices ship together in one release and continue to use the existing promotion policy without `Advances`.

For `workflow_dispatch` validation of a `staging -> main` route, provide `pr_head_sha`. Missing or malformed runtime SHA input fails closed before the policy accepts the body.

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

The workflow exposes these checks: `Governance tests`, `validate-pr-policy`, and `trusted-pr-sync`. `Governance tests` runs `node --test .github/scripts/*.test.js` for pull requests without secrets or write permissions. It includes branch grammar, commit-message grammar, hook setup tests, and the implementation-finalizer observer contract. Secret-bearing jobs deliberately check out the default branch, not PR code or manually selected refs; this protects privileged validation but means workflow/script fixes become live only after they are promoted to the default branch. `validate-pr-policy` uses that trusted code to fetch PR commit metadata from GitHub's read-only API boundary and fails closed when GitHub's pull-request commit listing reaches its 250-commit cap.

Only trusted-sync runs for the same PR are serialized. Each issue relation is an append-only comment with a deterministic marker, so unrelated PRs never share mutable issue-body state. The action lists paginated comments before posting, making retries idempotent without rewriting issue bodies. Legacy managed body blocks remain untouched and are not used for new synchronization.

## On-demand validation

The workflow exposes `workflow_dispatch` inputs for:

- `branch_name`
- `base_branch`
- `pr_body`
- `pr_action`
- `pr_merged`
- `pr_head_sha`
- `pr_base_sha`
- `pr_draft`
- `pr_head_repository`
- `pr_base_repository`

Manual dispatch is validation-only. It is the safe preview surface for checking policy decisions against real repository configuration without writing to GitHub or Notion.

`workflow_dispatch` preview also checks out the trusted default branch before running the privileged validation script. Operator-supplied metadata influences validation inputs only; it never selects which repository code runs with secrets.

Manual dispatch validates the supplied branch and PR-body policy but does not validate commit messages or paths because it has no reliable PR identity. The `pull_request_target` validation path performs the authoritative per-commit check through GitHub's read-only base-repository API.

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
