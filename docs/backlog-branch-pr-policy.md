# Backlog, Branch, and Implementation PR Policy

This document defines how Notion items are associated with branches and implementation PRs to avoid implicit relationships or dependencies on human memory.

## Short Path

1. Work originates or is consolidated in Notion.
2. If it will touch versioned code or docs, it may have an associated branch.
3. A tracked branch includes one valid primary `Work ID`; legacy branches may instead exactly match the Notion `Branch` field.
4. An implementation PR is tracked when that association resolves uniquely, or explicitly untracked when no Work ID marker and no exact `Branch` association exist.

## Conceptual Model

- **Notion** stores the work unit and its maturity.
- **`Work ID`** is the stable identifier for that unit.
- **`Branch`** is optional metadata for one concrete active or representative branch. It is not the stable identity of the work unit.
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

### Deterministic tracking modes

An implementation PR has exactly one mode:

1. **Tracked:** its branch has exactly one complete canonical `TB-<digits>` marker, or—only for a branch without a Work ID marker—it has one exact Notion `Branch` match. A canonical marker is the primary identity: once it resolves exactly one Notion item, that item's `Branch` value cannot veto the association. Marker boundaries use Unicode letters and numbers, so `tb` embedded in a Unicode word is not a Work ID. Unknown, malformed, repeated, multiple, or ambiguously matched IDs fail closed without falling back to `Branch` or explicitly untracked mode.
2. **Explicitly untracked:** only when there is no Work ID marker and no exact Notion `Branch` match. The body must contain a `## Tracking` section with the exact line `Backlog item: none` and a non-empty `Reason: ...` line.

Validation establishes deterministic syntax and identity only. It does not infer whether a branch slug is semantically appropriate. The preferred full branch format remains `<type>/<dir>-<work-id>-<slug>`.

A tracked item must define `Canal formal`. If it is `GitHub Issue`, `Enlace formal` must be a same-repository `github.com/<owner>/<repo>/issues/<number>` URL and the GitHub-rendered visible body must include `Refs #<that exact issue number>` in final `## Related Issues`. Other channels and explicitly untracked PRs may omit `Refs #N`.

### What to do if the branch doesn't follow the standard

If a branch has no Work ID marker and no exact `Branch` match, use the explicitly untracked declaration above. Do not use it to bypass a malformed, unknown, or ambiguous Work ID.

### Items in `Clarify`

If the item is still in `Clarify`:

- a branch name can be suggested
- an implementation PR must still satisfy the tracked or explicitly untracked mode

### `Formal Channel` and PRs

- If `Formal Channel = GitHub Issue`, the PR must use `Refs #N` for the exact issue in `Enlace formal`.
- If `Formal Channel != GitHub Issue`, the PR should not invent an issue by default; any optional `Refs #N` must still reference an existing issue.
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

- keep one active or representative branch in `Branch`
- document additional branches in `Notes`
- if the slices are already autonomous, create new items

### The branch exists before the item

Do not assume match by textual similarity.

Valid options:

- create the item and link it
- complete `Branch` in the correct item
- use the explicit untracked declaration only when the branch has no Work ID marker and no exact `Branch` association

### The branch's `Work ID` doesn't exist in Notion

The flow should be blocked. A branch cannot point to a non-existent unit in the source of truth.

### The item's `Branch` names another branch

A different non-empty `Branch` does not block a branch whose unique canonical `Work ID` resolves that item. For sequential slices, keep one representative branch in `Branch` and document additional branches in `Notes`; do not overwrite the field merely to satisfy CI.

## Future Enforcement Recommendation

When the local PR wrapper exists:

- **implementation PRs** → fail closed if reliable association is missing
- **promotion PRs** → do not apply this strict validation
- if minimum context is missing, request correction before creating/regenerating the PR
