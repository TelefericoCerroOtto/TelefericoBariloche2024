# — Commits & PRs

This document defines conventions for humans and agents regarding commits and PRs.

## Commit message conventions

To ensure a consistent history, we use the format of
[Conventional Commits](https://www.conventionalcommits.org/):

- Format: `<type>(<dir>/<scope>): <description>`.

### Types (lowercase)

- `feat` — a new feature
- `fix` — a bug fix
- `refactor` — code change that neither fixes a bug nor adds a feature
- `chore` — tooling, build, config, or other housekeeping
- `style` — formatting, UI tweaks, CSS-only, non-functional changes
- `docs` — documentation only
- `perf` — performance improvements
- `test` — adding or updating tests (especially required when modifying forms or security layers)
- `revert` — revert a previous commit

### Directories (lowercase)

Choose `<dir>` based on the staged paths covered by the commit:

- `app`: all changes are within `./teleferico-app/**`
- `cms`: all changes are within `./teleferico-cms/**`
- `tools`: all changes are within `./tools/**`
- `root`: changes include paths outside `./teleferico-app/**`, `./teleferico-cms/**`, and `./tools/**`

If changes span multiple top-level directories, use a hyphenated composite in stable order:

- Order: `app`, `cms`, `tools`, `root`
- Examples:
  - `app-tools`
  - `app-cms`
  - `app-tools-root`

Note: keep `<dir>` as short as possible while still truthful.

### Scope

The scope can be any word that refers to the general area covering all the changes in that commit (file name, entity, directory name, feature, etc.).

### Description

The description should be clear, short, and concise, ideally staying under 100 characters and focusing on the outcome of the changes being committed. As a general rule, if the changes cover too many aspects, there may be too many files for a single commit and it should probably be split into multiple commits.

Examples:

```
docs(root/CONVENTIONS.md): Add more specifications
```

```
feat(app/auth): implement session verification and expiration handling in JWT callback
```

## PRs conventions

Follow these strict rules:

- Write the PR description in **English**.
- Format the output in **Markdown**.
- Follow EXACTLY this structure and headings:
  1. Summary
  2. Context
  3. Changes
  4. Technical Details
  5. Breaking Changes (only if they exist)
- Do NOT invent features or changes that are not clearly supported by the diff.
- Group changes by logical area (e.g., Frontend/UI, Backend/API, Types/Schemas).
- Be concise but clear.
- Do NOT propose commit messages.
- Do NOT mention branch names.
- Do NOT include any instruction text, only the final PR description.

### PR types

This project distinguishes between **two PR types**. They serve different review goals and therefore must not reuse the same body blindly.

#### 1. Implementation PR

Use an implementation PR when proposing the original code change for review.

- Typical flow: a feature/fix/refactor branch into the integration branch currently used by the team.
- Goal: review the implementation itself.
- The PR body should explain the problem, context, solution, and technical details of the actual code change.
- This is the **source PR** for the change narrative.

#### 2. Promotion PR

Use a promotion PR when moving already-reviewed code from one environment branch to the next one.

- Typical flow: integration branch to `staging`, or `staging` to `main`.
- Goal: review and approve the **promotion/release step**, not re-review the implementation.
- Do **not** copy the full implementation narrative verbatim unless there is a strong reason.
- The PR body must stay concise and focus on:
  - which previously reviewed PRs are included
  - what environment is being promoted to
  - what validation already happened and what still needs to be validated
  - rollback expectations if the promotion fails

### Content rules by PR type

#### Implementation PR

- Use the full template below.
- Describe the net product/code change.
- Group changes by logical area when useful.

#### Promotion PR

- Use the same headings and English Markdown structure.
- Keep the content short and release-oriented.
- Reference the already reviewed implementation PRs instead of duplicating their full explanation.
- If the promotion contains a single implementation PR, mention that PR explicitly.
- If the promotion contains multiple implementation PRs, present them as an included release batch.
- State the validation target clearly (`staging` or production) and the expected rollback path.

### Promotion PR guidance

When a promotion PR contains **one** previously approved implementation PR, the body should summarize the promotion and link the original PR. It should not restate the full technical story.

When a promotion PR contains **multiple** previously approved implementation PRs, the body should act as a release summary:

- list the included PRs
- summarize the combined scope
- identify the main validation focus
- state rollback expectations

**CRITICAL: Issue Closure Extraction**
When creating a promotion PR to `main`, the author (human or agent) MUST scan all included implementation PRs, extract any `Refs #N` issue references from them, and explicitly convert them to `Closes #N` in the promotion PR footer. Failure to do this leaves issues open after release.

### Issue linkage and closure policy

Use GitHub Issues as the formal artifact, but distinguish between the PR that
**implements** the change and the PR that **officially closes** the issue.

#### Quick path

1. Create or reference the GitHub Issue for the work item.
2. In the **implementation PR** (`feature/fix -> development`), reference the issue as context.
3. In the **promotion PR to `main`** (`staging -> main`), close the issue.

#### Rules

| PR type | Typical branch flow | How to reference the issue | Purpose |
|---|---|---|---|
| Implementation PR | `feat/fix -> development` | `Refs #N` in `## Related Issues` when tracked by a GitHub Issue; optional for other tracked channels and explicitly untracked work | Preserve the technical story of the actual code change |
| Promotion PR to staging | `development -> staging` | Optional mention of `#N` or included implementation PRs | Track validation scope; do not close the issue here |
| Promotion PR to main | `staging -> main` | `Closes #N` or explicit `Formal issues: none` | Mark the issue as officially shipped via the default branch |

#### Strict issue closure token

When promoting to `main`, the PR body **MUST** declare its closure intent to pass automation:
- If there are issues to close, use standard `Closes #N` / `Fixes #N`.
  - **MANDATORY EXTRACTION RULE**: You must scan the descriptions of all implementation PRs being promoted, extract every `Refs #N` linked to them, and declare them here as `Closes #N`. Do not assume they will close themselves.
- If there are no issues closed in the release, include the exact line `Formal issues: none` in the PR body.

#### Format for `#N`

When referencing an issue via `#N` (e.g., `Refs #N`, `Closes #N`), you **MUST use the numeric GitHub Issue ID** (for example, `Refs #71`). 
Do **NOT** use the Notion Work ID slug (for example, do not use `Refs #tb-71`), because GitHub's autolinking parser only recognizes pure digits. If the issue is not yet created in GitHub, either create it first to get the ID, or use a plain text reference for the Notion ID without the `#` symbol.

#### Placement of `Refs #N` in implementation PRs

In implementation PRs, every `Refs #N` token **MUST appear at the end of the PR body**, under a dedicated `## Related Issues` section. When present, `## Related Issues` must be the final visible H2 section. A tracked item whose `Canal formal` is `GitHub Issue` must include the exact issue number from `Enlace formal`; additional valid references are allowed. Other tracked channels and explicitly untracked PRs may omit references. This keeps the narrative clean and groups traceability metadata together — consistent with the git trailer convention.

```
## Related Issues
Refs #N
```

Do **NOT** place `Refs #N` at the top of the body or inline within prose sections. GitHub-rendered code, blockquotes, details, hidden containers, and tag attributes are ignored; visible text in normal inline labels and links is eligible. The visible final section makes traceability immediately discoverable during review and in the PR history.

#### Why

- The **implementation PR** is the canonical review surface for the code change itself.
- The **promotion PR to `main`** is the canonical release surface for GitHub issue closure.
- GitHub only auto-closes issues from PR keywords like `Closes #N` when the PR targets the repository's **default branch**.

#### Notes

- If the issue is created **after** the relevant PRs were already merged, close it manually and reference:
  - the implementation PR that introduced the change
  - the promotion PR that shipped it to `main`
- Do not use `Closes #N` in `development` or `staging` promotions just to force a workflow shortcut; that obscures where the change was reviewed versus where it was released.

### Recommended examples

#### Implementation PR

```
## Summary
- ...

## Context
- ...

## Changes
- ...

## Technical Details
- ...

## Breaking Changes
- [ ] (explain impact)

## Related Issues
Refs #N
```

#### Promotion PR to staging

```md
## Summary

- Promote the approved change set to staging.

## Context

- This promotion contains the previously reviewed implementation from #123.
- No additional code changes were introduced after the original approval.

## Changes

- Included PRs:
  - #123 — Fix checkout validation for seasonal pricing

## Technical Details

- Validation target: staging
- Expected checks:
  - booking flow
  - admin update flow
- Rollback strategy:
  - revert this promotion PR if staging validation fails

## Breaking Changes

- [ ] None
```

#### Promotion PR to main

```md
## Summary

- Promote the validated release candidate to production.

## Context

- This promotion was previously validated in staging.
- The implementation was originally introduced in #123.

## Changes

- Included PRs:
  - #123 — Fix checkout validation for seasonal pricing

Closes #123
```

#### Promotion PR with multiple included PRs

```md
## Summary

- Promote the current approved release candidate to staging.

## Context

- This promotion groups multiple previously reviewed changes into a single validation batch.

## Changes

- Included PRs:
  - #123 — Fix checkout validation for seasonal pricing
  - #124 — Add operator note field to booking management
  - #126 — Refactor availability cache invalidation

## Technical Details

- Validation target: staging
- Focus areas:
  - checkout
  - booking admin
  - availability sync
- Rollback strategy:
  - revert this promotion PR or exclude affected changes in the next release batch

## Breaking Changes

- [ ] None

## Related Issues

Refs #123
Refs #124
Refs #126
```
