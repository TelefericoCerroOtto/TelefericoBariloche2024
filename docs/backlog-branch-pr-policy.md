# Backlog, Branch, and Implementation PR Policy

This document defines how Notion items are associated with branches and implementation PRs to avoid implicit relationships or dependencies on human memory.

## Short Path

1. Work originates or is consolidated in Notion.
2. If it will touch versioned code or docs, it may have an associated branch.
3. Every implementation branch uses one explicit syntax: tracked with a `Work ID` or deliberately no-backlog.
4. An implementation PR is tracked only when its branch resolves exactly one Notion `Work ID`; an explicitly untracked branch must declare that mode in both its name and PR body.

## Conceptual Model

- **Notion** stores the work unit and its maturity.
- **`Work ID`** is the stable identifier for that unit.
- **`Branch`** is optional metadata for one concrete active or representative branch. It is not the stable identity of the work unit.
- **Implementation PR** is the review of the actual change.
- **Promotion PR** moves already reviewed changes between branches/environments and does not create a new backlog unit.

## Language Policy for Artifacts

**All artifacts created in GitHub Issues and Notion items MUST be written in English. Only the interactive chat can be in Spanish.**

## Base Rules

Before implementation edits or branch setup, apply `docs/change-intake-preflight.md`. Not every repository change requires a GitHub issue; tracking follows the selected `Canal formal`.

### 1. Implementation branch grammar

Every implementation branch must use exactly one of these forms:

```text
<type>/<dir>-tb-<digits>-<slug>
<type>/<dir>-no-backlog-<slug>
```

The first form is tracked. The second is deliberately without a Notion item. Missing a `Work ID` does not select no-backlog mode; the literal `no-backlog` marker is required.

| Component | Allowed values |
| --- | --- |
| `<type>` | `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`, `revert` |
| `<dir>` | `app`, `cms`, `tools`, `root`, or a hyphenated composite in this stable order: `app`, `cms`, `tools`, `root` |
| `<slug>` | Non-empty lowercase kebab-case |

Examples:

- `fix/app-tb-066-login-refresh`
- `chore/root-tb-067-pause-legacy-vm`
- `docs/root-tb-073-backlog-governance`
- `chore/app-cms-root-no-backlog-policy-maintenance`

The grammar is exhaustive. Old marker-free shapes, unknown types, uppercase names, invalid directory values, unordered composites, repeated directories, missing slugs, malformed markers, repeated markers, and multiple markers are invalid. The policy does not infer whether a slug is semantically appropriate.

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

### 4. New branches default to current `origin/development`

Inspect updated remote evidence with a read-only operation immediately before creating an implementation branch. Use the current `origin/development` as the default base.

This convention is overridable. Follow and briefly record an explicit safe user-selected base or flow unless a stronger restriction applies.

### 5. Merged branches are historical

Never reuse a branch after its PR was merged. Additional same-scope work before reaching `main`, including staging fixes, uses a **fresh follow-up branch** from the current `origin/development`. Reuse the Work ID only for the same outcome and acceptance scope; a post-main regression or autonomous change normally gets a new linked Work ID.

Keep the active or representative branch in `Branch` and additional fresh follow-up branches in `Notas`.

## Policy for Implementation PRs

The strict policy only applies to **implementation PRs**.

Expected governed flow:

- work branch (`feat/...`, `fix/...`, `chore/...`, etc.) → `development`
- optional draft `stacked-to-main` child → its immediate open implementation parent into `development` or immediate open draft stacked-preview parent, followed by retargeting of that same PR to `development` after the parent merges

### Deterministic tracking modes

An implementation PR has exactly one mode:

1. **Tracked:** its branch uses `<type>/<dir>-tb-<digits>-<slug>` and the normalized `TB-<digits>` resolves exactly one Notion item. The `Branch` field is optional metadata and cannot establish, override, or veto this identity. Unknown or ambiguously matched IDs fail closed.
2. **Explicitly untracked:** its branch uses `<type>/<dir>-no-backlog-<slug>`. The body must contain a visible `## Tracking` section with the exact line `Backlog item: none` and a non-empty `Reason: ...` line.

Malformed, repeated, multiple, or missing `Work ID` markers never fall back to a `Branch` lookup or explicitly untracked mode. A no-backlog branch never queries Notion.

### Ad hoc non-sensitive scope disclosure

The implementation workflow remains strict by default. To include known non-sensitive paths outside the addressed item, use `/implementation-pr --allow-mixed-scope` or select that ad hoc scope explicitly in natural language. The option takes no argument; unknown or extra command arguments fail closed. This selection requires no justification and does not authorize commit, push, PR creation, or any other publication mutation; those still require their own explicit authorization naming the destination and current credential/session. It does not change the selected tracking mode or authorize separate tracking changes.

After capturing the complete candidate inventory, list every ad hoc path exactly once in one visible English `## Scope Disclosure` section using `Path: <exact path> | Work unit: <non-empty description>`, preceded by `Changes outside the addressed item:`. Do not ask for separate approval per path or request a rationale. Unknown or sensitive paths remain blocked, credential files must never be read, and the disclosure does not waive wrong branch/remote/base, existing open PR, ambiguous commit/push, or published head/base mismatch stops. This agent-owned disclosure contract cannot be inferred by repository CI.

The ordinary publication path directly captures required local Git facts once and validates the complete candidate path list once with `.github/scripts/implementation-candidate-paths.js`. The helper checks path names only; it never opens candidate files. Use only the compatible PR-content and creation parts of `branch-pr`; do not duplicate its discovery, authorization, branch/base setup, candidate classification, fetch, or push planning. Remote reads require explicit current-session authorization for the destination and operation. Do not use a delegated mapper, run candidate fingerprint helpers, retry discovery, or launch generic SDD discovery for a direct route.

When ad hoc scope is selected, require one visible English `## Scope Disclosure` section containing `Changes outside the addressed item:` and every exceptional entry as `Path: <exact path> | Work unit: <non-empty description>`. Verify the created PR's head and base against the published commit and authorized plan. Strict invocations omit the section. A later invocation requires fresh publication authorization; generic follow-ups do not authorize publication.

A tracked item must define `Canal formal`. If it is `GitHub Issue`, `Enlace formal` must be a same-repository `github.com/<owner>/<repo>/issues/<number>` URL and the GitHub-rendered visible body must include `Refs #<that exact issue number>` in final `## Related Issues`. Other channels and explicitly untracked PRs may omit `Refs #N`.

### Stacked preview lifecycle

Only `stacked-to-main` is supported. `feature-branch-chain` remains unsupported.

An early child PR must be draft and same-repository, and its immediate parent must be either an open same-repository implementation PR into `development` or an open same-repository draft stacked-child preview. Bind the child base to the parent's exact head SHA. Both branch names must use the governed grammar. The visible `## Chain Context` contract in [CONVENTIONS.md](./CONVENTIONS.md#stacked-child-preview) must match the parent PR and runtime base exactly, and the parent-relative diff must be focused and non-truncated.

Validation follows each draft-preview parent through its visible Chain Context to an open same-repository implementation PR into `development`. Every preview link must match its runtime base branch and SHA; orphaned links, cycles, or malformed, hidden, or missing ancestor context fail closed.

A preview is never delivery. Validation performs no issue or Notion mutation, and functional/Cloud Build CI is deferred. After the parent merges into `development`, fresh candidate-scoped authorization may retarget the existing child PR to `development`; normal tracking, implementation governance, and observation then run from scratch. Never open a duplicate child PR or automate ancestry repair.

### What to do if the branch doesn't follow the standard

Rename the branch to the required no-backlog form before opening its implementation PR. Do not use it to bypass a malformed, unknown, or ambiguous Work ID.

### Legacy branch migration

There is no legacy allowlist and no marker-free fallback. A legacy branch must be renamed to a governed form before its next push or implementation PR only when that is safe under the working-tree and change-intake rules. If renaming is unsafe or the work needs new tracking, continue through a fresh governed branch from the current approved base.

Never auto-rename a branch, move dirty work, or infer a backlog association. Hooks are opt-in per worktree; CI rejects any future implementation PR targeting `development` from a legacy name.

### Items in `Clarificar`

If the item is still in `Clarificar`:

- a branch name can be suggested
- an implementation PR must still satisfy the tracked or explicitly untracked branch mode

### `Canal formal` and PRs

- If `Canal formal = GitHub Issue`, the PR must use `Refs #N` for the exact issue in `Enlace formal`.
- If `Canal formal != GitHub Issue`, the PR should not invent an issue by default; any optional `Refs #N` must still reference an existing issue.
- A `Documento / ADR` can still live in a docs PR. The important thing is not to force issue semantics when it's not appropriate.

## Policy for Promotion PRs

Promotion PRs are exempt from the strict branch↔`Work ID` association, but **have strict closure rules**.

Reason:

- their review unit is the **promotion of already approved changes**
- they are the only permitted vehicle to formally close issues automatically

Therefore:

- they don't need `Work ID` in the branch
- they don't need an associated Notion `Branch` field
- they must use the deterministic promotion body contract in [CONVENTIONS.md](./CONVENTIONS.md#promotion-pr-body-contract): visible included implementation PRs, route-consistent target environment, route-specific validation, and rollback strategy
- **Promotion to staging**: requires a validation plan or expected checks and must not use closure keywords (e.g., `Closes #123`).
- **Promotion to main**: requires prior staging validation evidence and `Release candidate SHA: <40-character SHA>` matching the promotion PR head for the exact release candidate; it must explicitly declare release intent using `Closes #123`, `Advances #123`, or the exact line `Formal issues: none`.

`Advances #N` is reserved for phased delivery: an intermediate production phase with real remaining work or an actual remaining acceptance condition. Each declaration requires its deterministic `## Advancement Finalization` record: `Issue: #N`, `Remaining work or condition:`, `Finalization owner:`, and `Finalization event or action:`. It records an `Advanced by` relation, leaves the GitHub issue open, and does not move the Notion row to `Hecho`. The final phase uses `Closes #N`.

Use `Closes #N` when merging the production promotion delivers the complete intended mechanism, even if a deployment-triggered workflow normally executes the mechanism after deployment.

| Combination | Result |
| --- | --- |
| `Advances #N` alone | Valid |
| `Advances #N` + `Closes #M` for different issues | Valid |
| `Advances #N` + `Closes #N` for the same issue | Invalid |
| `Advances #N` + `Formal issues: none` | Invalid |
| `Closes #N` + `Formal issues: none` | Invalid |
| No declaration | Invalid |

Phased delivery is not review slicing or chained PRs. Review slices ship together in one release, so they continue to use the existing promotion policy without `Advances`.

## Policy for Branch Suggestion Skill

The branch suggestion skill should support two modes:

### A. From working tree

Uses `git status` and `git diff` to infer type, directory, and slug.

### B. From Notion item

Should be able to suggest a branch even without local changes, using:

- `Work ID`
- `Tipo`
- `Área`
- `Tarea`

This allows opening the branch before touching code.

## Edge Cases

### More than one branch for the same item

Allowed when the same work is divided into reviewable slices, but the primary item remains one.

Recommendation:

- keep one active or representative branch in `Branch`
- document additional fresh follow-up branches in `Notas`
- if the slices are already autonomous, create new items

### The branch exists before the item

Do not assume match by textual similarity.

Valid options:

- create the item and link it
- create a tracked branch after the item exists
- use the explicit no-backlog branch form only when the work deliberately has no Notion item

### The branch's `Work ID` doesn't exist in Notion

The flow should be blocked. A branch cannot point to a non-existent unit in the source of truth.

### The item's `Branch` names another branch

A different non-empty `Branch` does not block a branch whose unique canonical `Work ID` resolves that item. For fresh follow-up branches, keep one representative branch in `Branch` and document additional branches in `Notas`; do not overwrite the field merely to satisfy CI.

### Dirty working tree

Inspect the working tree before creating or switching branches. Continue on the correct branch when dirty changes are clearly related, with a brief report. If branch creation or switching is required, do not commit, stash, reset, rebase, restore, move changes, or switch automatically. Ask one consolidated question as defined in `docs/change-intake-preflight.md`; recommend a separate worktree for unrelated changes.

## Enforcement

The dependency-free validator at `.github/scripts/repository-policy.js` is the syntax source of truth for native hooks and GitHub Actions. Run `./scripts/setup-git-hooks.sh` once in each opting-in worktree to enable tracked local hooks. See [GIT-HOOKS.md](./GIT-HOOKS.md) for setup and limits.

GitHub Actions treats every non-promotion PR targeting `development` as implementation work. It separately recognizes only validated governed draft `stacked-to-main` previews against immediate parent branches. Promotion flows remain modeled as `development -> staging` and `staging -> main`.
