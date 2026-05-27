# GitHub Actions Automation & Governance

This document explains **what the repository automates**, **why it lives in GitHub Actions**, and **how to extend it later** without mixing backlog governance with general CI responsibilities too early.

## Goal

This first slice keeps backlog governance executable from GitHub Actions without forcing hourly auto-formalization:

- [docs/todo-workflow.md](./todo-workflow.md)
- [docs/backlog-branch-pr-policy.md](./backlog-branch-pr-policy.md)
- [docs/CONVENTIONS.md](./docs/CONVENTIONS.md)

The goal is to reduce manual drift between Notion and GitHub while keeping **Notion as the source of truth before formalization** and making formalization an explicit decision.

## Why documentation is required

The workflow YAML alone is **not** enough.

The code can execute the automation, but the team also needs a stable explanation of:

- when an issue is formalized on demand
- when the workflow should fail
- why Notion is never created from GitHub in this slice
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

- query Notion
- find or create GitHub Issues
- render issue bodies using the canonical contract in `docs/issue-context-contract.md`
- sync the issue URL back to Notion
- mark Notion rows as `Formalizado` or `Hecho`

The script uses **plain Node.js with native `fetch`** so the repository does not need a root package manager or root dependency installation just to support this automation.

## Canonical issue contract target

Issue creation automation must target the canonical contract in:

- `docs/issue-context-contract.md`

This means automation-generated issues should keep the stable section skeleton and required artifact links.

Required skeleton sections are:

- `## Summary`
- `## Problem`
- `## Desired Outcome`
- `## Scope`
- `## Context`
- `## Repo Surfaces to Inspect`
- `## Acceptance Signals`
- `## Related Artifacts`

At minimum, `## Related Artifacts` must include `Work ID`, Notion URL, and related PR references when available.

Current state:

- The script already creates structured issue bodies.
- The expected direction is to render the canonical contract directly from Notion backlog fields, so human-created and automation-created issues converge on the same body shape.

## Flows implemented

### 1. `reconcile-ready-items` (on demand)

Use case:

- the backlog row already exists in Notion
- `Estado = Listo para formalizar`
- `Canal formal = GitHub Issue`
- no GitHub issue is linked yet

How it is triggered:

- manually from `workflow_dispatch`
- explicitly by an agent/operator that decides to formalize that queue

What it does:

1. queries Notion for rows that use the GitHub formal channel
2. filters the rows that are ready for formalization and still have no formal link
3. searches GitHub for an existing issue using the `Work ID`
4. creates the issue if it does not exist
5. updates the Notion row with the issue URL
6. moves the row to `Formalizado`

### 2. `validate-pr-policy`

Use case:

- a governed PR is opened, edited, or updated
- it validates whether the PR is an implementation PR or a promotion PR, and enforces the issue closure policy before merge

What it does:

**For implementation PRs (branches like `feat/`, `fix/`, etc.):**
1. fails if the target branch is not `development`
2. fails if the PR body contains closing keywords (e.g., `Closes #N`)
3. extracts the `Work ID` from the branch name and creates the missing formal issue in GitHub (if Notion expects one)
4. syncs the issue URL back into Notion

**For promotion PRs to staging (`development` -> `staging`):**
1. fails if the PR body contains closing keywords

**For promotion PRs to main (`staging` -> `main`):**
1. fails if the PR body does not explicitly declare issue closure intent (either using `Closes #N` or the exact line `Formal issues: none`)

### 3. `sync-main-promotion-closures`

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
| `NOTION_READY_STATUS` | `Listo para formalizar` |
| `NOTION_FORMALIZED_STATUS` | `Formalizado` |
| `NOTION_DONE_STATUS` | `Hecho` |
| `NOTION_GITHUB_ISSUE_CHANNEL` | `GitHub Issue` |
| `GITHUB_ISSUE_LABELS` | empty |

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

Use `dry_run: true` when validating the wiring or testing against a real repository configuration without writing to Notion or creating real GitHub Issues.

Recommended operating model:

1. Capture and triage work in Notion.
2. Decide explicitly what should become a formal artifact.
3. Run `reconcile-ready-items` on demand (agent/manual dispatch) for rows that are ready for GitHub formalization.

## Security notes

- The PR validation path uses `pull_request_target` so it can access repository secrets.
- That job checks out the **trusted base repository branch**, not arbitrary PR code.
- Sensitive sync logic stays in one reviewed script instead of being spread across opaque inline YAML snippets.

## Intentional limits of this first slice

This implementation does **not** yet:

- create Notion backlog items from GitHub
- infer whether something “implies repo changes” by heuristic analysis
- synchronize the `Branch` field back into Notion
- post comments automatically on PRs or issues
- run tests, installs, or package validation checks
- fully materialize every optional canonical issue-contract section from Notion fields

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

In short: PR governance stays automatic on PR events, while issue formalization from Notion is explicit and on demand.
