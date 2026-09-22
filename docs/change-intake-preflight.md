# Change Intake Preflight

This is the canonical contract for deciding whether and how to prepare repository work before implementation edits. It governs intent classification, cross-system discovery, tracking, branch state, and working-tree safety. It does not require every code or documentation change to have a GitHub issue.

## Required Order

For an explicit implementation request, complete this sequence before editing:

1. Classify the user's intent.
2. For continuation or follow-up work with a concrete existing-change anchor, resolve that anchor and inspect its change-local entrypoint or routing instructions.
3. Select the implementation route from those instructions before invoking any generic workflow preflight.
4. Search the canonical Notion backlog.
5. Resolve related GitHub issues, pull requests, and branches.
6. Inspect the current Git branch and working tree.
7. Create or reuse tracking when appropriate and authorized.
8. Establish the correct implementation branch.
9. Only then edit files.

Never implement on `development` first and formalize afterward.

## Intent Gate

| Intent | Intake behavior |
| --- | --- |
| Informational question | Do not activate backlog intake. Answer from available evidence. |
| Exploration or hypothesis with no intent to change | Stay read-only. Do not create tracking or a branch. |
| Concrete proposal without an implementation request | Run read-only intake and recommend the next tracking action. Do not assume implementation. |
| Explicit implementation request | Run the full preflight and prepare appropriate tracking and a safe branch before editing. |
| Follow-up or regression without IDs | Search Notion, GitHub issues and PRs, and branches semantically. Reuse tracking only when evidence identifies one work unit uniquely. |
| Delivery operation already in progress | Resolve from the current branch or PR. Do not create parallel tracking. |

If intent remains materially ambiguous, ask one short question and stop.

## Route Resolution Gate

For continuation or follow-up work with a concrete existing-change anchor, resolve the anchor and read its change-local entrypoint or routing instructions before selecting an implementation route or invoking any generic workflow preflight.

- Change-local routing decides whether ordinary work uses direct implementation, delegated direct work, or explicit formal SDD.
- OpenSpec or SDD artifacts, including historical SDD work, do not by themselves select SDD for the current request.
- Only an explicit current request for a formal SDD lifecycle operation overrides a change-local direct route.
- If route instructions are missing or contradictory and the choice would change what executes, ask one concise clarification and stop.

## Canonical Backlog

Use only this Notion database for backlog reads and writes:

- Name: `Backlog unificado`
- Database ID: `adf69803-af21-49a1-a98f-e5afa6f95be5`
- Data source ID: `c0734f69-87ea-43ca-a757-3bb80a41cbbc`
- URL: `https://app.notion.com/p/adf69803af2149a1a98fe5afa6f95be5`

Any database with a suffix, especially `Backlog unificado (1)`, is non-canonical and must not receive writes.

Search by exact identifiers first, then title, outcome, area, context, linked issue, and branch. Inspect likely matches before deciding whether evidence is unique.

## Cross-System Resolution

Resolve the strongest available evidence across:

- canonical Notion row and `Work ID`
- formal channel and formal link
- GitHub issue state
- current and historical pull requests
- local and remote branch state
- merge target and whether the outcome reached `main`

Prefer deterministic links over text similarity. Do not reopen issues, repair tracking contradictions, or reuse a work unit when evidence is ambiguous. A prior `Branch` value is metadata and cannot veto a uniquely resolved `Work ID`, but branch and PR history still determine whether that branch is safe to use.

When delegation is available, the orchestrator should assign all cross-system read-only discovery to one subagent and require one normalized result. Governed mutations remain with the authorized actor.

## Tracking Decisions

- `Inbox`, `Clarificar`, `Listo para formalizar`, `Formalizado`, and `En progreso` are active states, subject to their normal maturity rules.
- `Bloqueado` requires the blocker to be surfaced before continuation.
- `Hecho` may be reused only when the requested work is still the same unfinished acceptance scope; otherwise treat it as follow-up work.
- `No hacer` is not reusable without an explicit user decision.
- A non-GitHub `Canal formal` must not be converted into a GitHub issue by default.
- Creating or updating Notion or GitHub tracking must follow current authorization and the backlog-governance contract.
- An implementation branch does not by itself require a GitHub issue. Choose `Canal formal` from the work, not from the fact that code may change.

## Branch Contract

### Default Base

Create a new implementation branch from the current remote `origin/development` by default. Refresh or inspect remote evidence with a read-only operation immediately before branch creation; do not rely only on stale local references.

This is an overridable convention, not a prohibition. If the user explicitly requests another base or flow, follow it and record the override briefly unless it conflicts with a higher-priority restriction or an unauthorized destructive operation. Do not reject or lecture the user merely for choosing an exception.

### Fresh Follow-Up Branch

Use `fresh follow-up branch` as the canonical term.

- Never reuse a branch whose PR was merged, even if the branch still exists locally or remotely.
- For more work before the change reaches `main`, or for a problem found in staging, create a fresh follow-up branch from the current `origin/development`.
- Reuse the same `Work ID` only when the branch still delivers the same outcome and acceptance scope.
- A regression after the change reached `main`, or an autonomous new outcome, normally receives a new linked `Work ID`.
- Store the active or representative branch in `Branch`; record additional branches in `Notas`.

## Working-Tree Contract

Inspect the branch and working tree before creating or switching branches.

| State | Required action |
| --- | --- |
| Clean tree and unambiguous implementation | Create or switch to the correct branch automatically when authorized. |
| Dirty tree on the correct branch; changes clearly related | Continue and briefly report the existing changes. |
| Dirty tree and branch creation or switching is required | Do not commit, stash, reset, rebase, restore, move changes, or switch automatically. Report files, relationship, and risk; ask one consolidated question with a recommendation. |
| Dirty tree with unrelated changes | Recommend a separate worktree and wait for the user's decision. |
| Related changes already made on the wrong branch | Present safe alternatives explicitly and wait for the user's decision. Do not auto-correct with a commit or branch operation. |

Obey an explicit safe user instruction. Never manufacture a commit as a recovery mechanism.

## Decision Matrix

| Evidence | Decision |
| --- | --- |
| No Notion match | For a proposal, recommend a new row. For implementation, create one only when appropriate and authorized; otherwise ask once. |
| One Notion match | Reuse it when outcome and scope match. Resolve its formal artifact and delivery history. |
| Multiple Notion matches | Stop mutation. Present the ambiguity in one question; do not merge or choose by weak similarity. |
| Active Notion state | Continue according to maturity, formal channel, and unique evidence. |
| `Hecho` | Reuse only for the same unfinished acceptance scope; otherwise use linked follow-up tracking. |
| `No hacer` | Stop and request an explicit decision before reviving the work. |
| `Bloqueado` | Surface the blocker; continue only when the requested action resolves or explicitly accepts it. |
| GitHub issue absent | Create one only when `Canal formal = GitHub Issue` and authorization permits; code changes alone do not require one. |
| GitHub issue open | Reuse it when identity and scope match. |
| GitHub issue closed | Inspect delivery evidence. Do not reopen automatically; ask when reuse versus new tracking is not unique. |
| Branch absent | Create a governed branch from the current default or explicitly overridden base after the tree check. |
| Branch active and unmerged | Reuse it only when it is the current safe delivery branch for the same scope. |
| Branch merged | Treat it as historical; create a fresh follow-up branch. |
| Branch deleted | Treat it as historical or absent based on PR history; never restore it merely for reuse. |
| PR absent | Continue on the safe implementation branch; PR creation still requires an explicit request. |
| PR open | Treat delivery as started and resolve from that PR/branch. Do not create parallel tracking. |
| PR merged | Do not reuse its branch. Apply pre-main versus post-main follow-up rules. |
| PR closed without merge | Inspect why it closed. Reuse neither branch nor tracking automatically when intent is unclear. |
| Change has not reached `main` | Same-scope work may reuse the Work ID on a fresh follow-up branch from current `origin/development`. |
| Change reached `main` | A regression or autonomous change normally gets a new Work ID linked to the prior one. |
| Clean working tree | Automatic safe branch setup is allowed for an unambiguous implementation request. |
| Dirty, related working tree | Continue only on the correct branch; otherwise ask before changing branch state. |
| Dirty, unrelated working tree | Recommend a separate worktree and ask once. |
| Non-GitHub formal channel | Preserve that channel; do not invent an issue. Prepare repository work only if the request actually requires it. |
| Required external service unavailable | If required tracking cannot be verified, stop with one decision: retry or continue explicitly without verified tracking. |
| Explicit user override | Follow and record the safe override unless a stronger restriction applies. |

## Authorization Boundaries

- Never auto-commit.
- Commit, push, and PR creation require an explicit user request under the global repository contract.
- Agents never merge or close PRs and never delete branches; those are human actions.
- Do not stash, reset, rebase, restore, or move dirty-tree changes without explicit authorization.
- Do not reopen issues or silently correct ambiguous tracking contradictions.

### Implementation publication scope override

The only maintainer mixed-scope override is `/implementation-pr --allow-mixed-scope "<reason>"`. Empty invocation remains strict; missing, blank, unknown, and extra arguments fail closed. This is not a branch, base, tracking, or promotion override.

The override must bind the complete exact candidate snapshot, selected `origin`, typed base plan, destination, and current authenticated Git/GitHub session authorization. It permits only non-sensitive paths classified as otherwise unrelated after exact sorted inventory capture and requires visible English `## Scope Exception` disclosure in the implementation PR with the reason and exact exceptional paths/work units. Sensitive paths, ambiguity, truncation, candidate changes, binding changes, force pushes, rebases, merges, issue closure, branch deletion, promotions, releases, arbitrary bases, and destructive operations remain forbidden.

## Runtime Report

Do not dump the full context snapshot by default. Return at most four or five short lines using simple labels and explanations in the user's current conversation language:

- intent
- tracking
- state or evidence
- next action
- blocker or continuation

If there is no blocker, report and continue in the same turn. If blocked, ask one consolidated question and stop.

## Composed Contracts

- `docs/todo-workflow.md` defines backlog schema, deduplication, and formal-channel maturity.
- `docs/issue-context-contract.md` defines issue content and deterministic artifact resolution.
- `docs/backlog-branch-pr-policy.md` defines implementation PR tracking and association rules.
- `.agents/skills/change-intake-preflight/SKILL.md` executes this contract by composing the backlog and issue-context skills.
