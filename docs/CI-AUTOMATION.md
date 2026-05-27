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
- a shared script that contains the business logic
- this document, which preserves the rationale

## Implemented architecture

### Workflow

File: `.github/workflows/backlog-governance.yml`

Responsibilities:

- listen to GitHub events
- inject secrets and repository variables
- run the shared synchronization script in the right mode

Triggers:

- `workflow_dispatch` → run a selected slice on demand, including `dry_run`
- `pull_request_target` → validate governed PRs and sync formal closure only from merged `staging -> main` promotions

### Shared script

File: `.github/scripts/github-notion-sync.js`

Responsibilities:

- query Notion for governed backlog linkage checks
- validate implementation/promotion PR policy
- sync `Hecho` status on merged `staging -> main` promotions with explicit closure intent

The script uses **plain Node.js with native `fetch`** so the repository does not need a root package manager or root dependency installation just to support this automation.

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

**For implementation PRs (branches like `feat/`, `fix/`, etc.):**
1. fails if the target branch is not `development`
2. fails if the PR body contains closing keywords (e.g., `Closes #N`)
3. extracts the `Work ID` from the branch name (or falls back to Notion `Branch` match)
4. if `Canal formal = GitHub Issue`, requires a valid linked GitHub Issue URL and verifies the issue exists

**For promotion PRs to staging (`development` -> `staging`):**
1. fails if the PR body contains closing keywords

**For promotion PRs to main (`staging` -> `main`):**
1. fails if the PR body does not explicitly declare issue closure intent (either using `Closes #N` or the exact line `Formal issues: none`)

### 2. `sync-main-promotion-closures`

Use case:

- a `staging` -> `main` promotion PR is closed

What it does:

1. ignores the PR if it was closed without merge
2. parses closing references from the merged promotion PR body
3. marks the linked Notion rows as `Hecho`
4. does nothing when the PR explicitly declares `Formal issues: none`

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
| `NOTION_TITLE_PROPERTY` | `Tarea` |
| `NOTION_WORK_ID_PROPERTY` | `Work ID` |
| `NOTION_STATUS_PROPERTY` | `Estado` |
| `NOTION_FORMAL_CHANNEL_PROPERTY` | `Canal formal` |
| `NOTION_FORMAL_LINK_PROPERTY` | `Enlace formal` |
| `NOTION_NOTES_PROPERTY` | `Notas` |
| `NOTION_BRANCH_PROPERTY` | `Branch` |
| `NOTION_DONE_STATUS` | `Hecho` |
| `NOTION_GITHUB_ISSUE_CHANNEL` | `GitHub Issue` |

`NOTION_FORMAL_LINK_PROPERTY` should remain a real Notion `url` property because the close-sync path queries it as a URL filter.

## On-demand mode and dry runs

The workflow exposes `workflow_dispatch` inputs for:

- `mode`
- `branch_name`
- `base_branch`
- `pr_body`
- `pr_action`
- `pr_merged`
- `dry_run`

Use `dry_run: true` when validating the wiring or testing against a real repository configuration without writing to Notion.

Recommended operating model:

1. Capture and triage work in Notion.
2. Decide explicitly what should become a formal artifact.
3. Formalize artifacts explicitly through human/agent flow; then rely on this workflow for PR governance and promotion closure sync only.

## Security notes

- The PR validation path uses `pull_request_target` so it can access repository secrets.
- That job checks out the **trusted base repository branch**, not arbitrary PR code.
- Sensitive sync logic stays in one reviewed script instead of being spread across opaque inline YAML snippets.

## Intentional limits of this first slice

This implementation does **not** yet:

- create GitHub issues from Notion rows
- create Notion backlog items from GitHub
- infer whether something “implies repo changes” by heuristic analysis
- synchronize `Formalizado` links/status automatically
- post comments automatically on PRs or issues
- run tests, installs, or package validation checks
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
