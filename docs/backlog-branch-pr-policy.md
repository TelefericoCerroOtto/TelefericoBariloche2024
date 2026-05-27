# Backlog, Branch, and Implementation PR Policy

This document defines how Notion items are associated with branches and implementation PRs to avoid implicit relationships or dependencies on human memory.

## Short Path

1. Work originates or is consolidated in Notion.
2. If it will touch versioned code or docs, it may have an associated branch.
3. The branch must include the primary item's `Work ID`.
4. An implementation PR is only created or regenerated if the association with the backlog is reliable.

## Conceptual Model

- **Notion** stores the work unit and its maturity.
- **`Work ID`** is the stable identifier for that unit.
- **`Branch`** is optional and represents a concrete active branch.
- **Implementation PR** is the review of the actual change.
- **Promotion PR** moves already reviewed changes between branches/environments and does not create a new backlog unit.

## Language Policy for Artifacts

**All artifacts created in GitHub Issues and Notion items MUST be written in English. Only the interactive chat can be in Spanish.**

## Base Rules

### 1. `Work ID` is mandatory for branches governed by this flow

If a branch is used to implement a backlog work unit, it must include the `Work ID` in its name.

Recommended format:

```text
<type>/<dir>-<work-id>-<slug>
```

Examples:

- `fix/app-tb-066-login-refresh`
- `chore/infra-tb-067-pause-legacy-vm`
- `docs/root-tb-073-backlog-governance`

### 2. `Branch` is optional

Not all items must have a branch. It's normal to leave `Branch` empty when the work:

- is purely operational in GCP
- is still in decision/ADR phase
- lives in Notion or another tool without versioned changes

### 3. A branch has one primary item

By default, a branch should map to **one primary item** in the backlog.

Multiple items in the same branch are only tolerated if:

- they are very small
- they are tightly coupled
- and form a single reviewable outcome

If these conditions are not met, the work should be split.

## Policy for Implementation PRs

The strict policy only applies to **implementation PRs**.

Expected governed flow:

- work branch (`feat/...`, `fix/...`, `chore/...`, etc.) → `development`

### Reliable association required

An implementation PR can be created or regenerated only if at least one of the following is met:

1. The current branch includes the `Work ID`
2. The item's `Branch` field exactly matches the current branch
3. The user passes an explicit override indicating the correct item

If none of these are met, the flow must **stop**.

### What to do if the branch doesn't follow the standard

If the branch doesn't contain `Work ID` and there's no reliable association via `Branch` or override:

- do not create or regenerate the implementation PR
- request branch correction or explicit linkage with the backlog

### Items in `Clarify`

If the item is still in `Clarify`:

- a branch name can be suggested
- an implementation PR should not be created automatically, except with explicit user override

### `Formal Channel` and PRs

- If `Formal Channel = GitHub Issue`, the PR should attempt to use the formal issue reference.
- If `Formal Channel != GitHub Issue`, the PR should not invent an issue by default.
- A `Document / ADR` can still live in a docs PR. The important thing is not to force issue semantics when it's not appropriate.

## Policy for Promotion PRs

Promotion PRs are exempt from the strict branch↔`Work ID` association, but **have strict closure rules**.

Reason:

- their review unit is the **promotion of already approved changes**
- they are the only permitted vehicle to formally close issues automatically

Therefore:

- they don't need `Work ID` in the branch
- they don't need an associated Notion `Branch` field
- they should rely on existing PRs/issues and the release/promotion narrative
- **Promotion to staging**: should not use closure keywords (e.g., `Closes #123`).
- **Promotion to main**: must explicitly declare closure intent in the PR body (using `Closes #123` or the line `Formal issues: none`).

## Policy for Branch Suggestion Skill

The branch suggestion skill should support two modes:

### A. From working tree

Uses `git status` and `git diff` to infer type, directory, and slug.

### B. From Notion item

Should be able to suggest a branch even without local changes, using:

- `Work ID`
- `Type`
- `Area`
- `Task`

This allows opening the branch before touching code.

## Edge Cases

### More than one branch for the same item

Allowed when the same work is divided into reviewable slices, but the primary item remains one.

Recommendation:

- keep the main branch in `Branch`
- document additional branches in `Notes`
- if the slices are already autonomous, create new items

### The branch exists before the item

Do not assume match by textual similarity.

Valid options:

- create the item and link it
- complete `Branch` in the correct item
- pass explicit override to the PR creation flow

### The branch's `Work ID` doesn't exist in Notion

The flow should be blocked. A branch cannot point to a non-existent unit in the source of truth.

### The item's `Branch` is already occupied by another branch

Do not silently overwrite. Request confirmation to:

- move the association
- create a new derived branch
- or use another item

## Future Enforcement Recommendation

When the local PR wrapper exists:

- **implementation PRs** → fail closed if reliable association is missing
- **promotion PRs** → do not apply this strict validation
- if minimum context is missing, request correction before creating/regenerating the PR