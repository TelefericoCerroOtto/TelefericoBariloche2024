# Commits and PRs

This document defines conventions for humans and agents regarding commits and PRs.

## Commit message conventions

To ensure a consistent history, we use the format of
[Conventional Commits](https://www.conventionalcommits.org/):

- Required format: `<type>(<dir>/<scope>): <description>`.
- `<scope>` is non-empty and identifies the affected area. It uses alphanumeric segments separated by a single dot, underscore, or hyphen: `[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*`.
- `<description>` must be non-empty. The recommendation to keep it under 100 characters is not enforced.

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

Choose `<dir>` from every changed path covered by the commit. The mapping is exact:

- `app`: all changes are within `./teleferico-app/**`
- `cms`: all changes are within `./teleferico-cms/**`
- `tools`: all changes are within `./tools/**`
- `root`: a changed path is outside `./teleferico-app/**`, `./teleferico-cms/**`, and `./tools/**`; it is a category, not a wildcard

If changes span multiple top-level directories, use a hyphenated composite in stable order:

- Order: `app`, `cms`, `tools`, `root`
- Examples:
  - `app-tools`
  - `app-cms`
  - `app-tools-root`

Note: keep `<dir>` as short as possible while still truthful.

The declared directory must exactly equal the directories derived from the paths. For example, `feat(app/login): ...` may not include a CMS path, and a root-only declaration may not cover application-only paths. The policy derives composites only in this order: `app`, `cms`, `tools`, `root`.

### Scope and Git-generated exceptions

The scope identifies the general area covering the commit, such as a file, entity, directory, or feature.

Native Git may generate a subject that cannot use the conventional shape. Enforcement accepts only these explicit exceptions:

- `Merge branch '<ref>' [into <branch>]`, `Merge remote-tracking branch '<ref>' [into <branch>]`, and `Merge tag '<ref>' [into <branch>]`
- `Merge pull request #<number> from <owner>/<branch>`
- `Revert "<valid conventional or accepted merge subject>"`

Other arbitrary `Merge ...` or `Revert ...` subjects are rejected.

Git-generated merges declare no directory and skip path correlation. A generated revert correlates the inner conventional subject when one exists; a revert of an accepted merge also skips correlation. A conventional `revert(<dir>/<scope>): ...` remains an ordinary conventional commit and must match its paths.

An empty conventional commit is accepted because no paths can establish its directory. Validators return explicit `unverifiable` / `empty` path metadata for this exception. This is not a directory wildcard.

Local `commit-msg` checks the NUL-delimited staged path set with rename detection disabled, so deletes and both sides of a cross-directory rename are included. During `git commit --amend`, that staged delta may not represent the full replacement commit; `pre-push` and PR validation re-check each final commit against its first parent.

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
- Every non-promotion PR targeting `development` is implementation work, even when its branch prefix is unknown. Its branch must satisfy the explicit mode in [backlog-branch-pr-policy.md](./backlog-branch-pr-policy.md).

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

### Direct implementation finalization shortcut

`/implementation-pr` is an explicit, single-shot shortcut for the current implementation-branch snapshot. It composes the existing commit and PR contracts to commit when needed, non-force-push `HEAD`, create one PR to `development`, apply required metadata, and observe repository governance with a bounded timeout.

After PR creation, invoke:

```bash
node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>
```

The helper is the sole source of check identities, polling, duplicate-run handling, and exit semantics. It waits for `Governance tests`, `validate-pr-policy`, and `trusted-pr-sync`; Cloud Build and other functional checks are reported separately and never change the governance exit status. A governance pass is not a claim that the PR is fully validated while application tests are still running.

It does not authorize later changes, force pushes, branch changes, rebases, merges, issue closure, branch deletion, or releases. It is not a promotion workflow: continue to use the separate `development -> staging` and `staging -> main` promotion flow and its release/closure rules.

### Content rules by PR type

#### Implementation PR

- Use the full template below.
- Describe the net product/code change.
- Group changes by logical area when useful.

#### Promotion PR

- Use the deterministic promotion body contract below. The validator reads GitHub-rendered visible content only; hidden containers, code blocks, details, and blockquotes do not satisfy a field.
- Keep the narrative short and release-oriented. Do not copy the implementation narrative or expect automation to rewrite the body.

### Promotion PR body contract

Both routes require each canonical H2 section exactly once:

- `## Included Implementation PRs` with one or more exact `PR: #<number>` entries. Each entry must resolve to a pull request.
- `## Release Target` with `Environment: staging` for `development -> staging` or `Environment: production` for `staging -> main`.
- `## Validation` with `Plan: <non-empty text>` for `development -> staging` or both `Prior staging validation evidence: <non-empty text>` and `Release candidate SHA: <40-character SHA>` for `staging -> main`.
- `## Rollback` with `Strategy: <non-empty text>`.

When a `staging -> main` promotion uses `Advances #N`, it must also include exactly one `## Advancement Finalization` section with one record for every advanced issue:

```md
Issue: #<number>
Remaining work or condition: <non-empty text>
Finalization owner: <non-empty text>
Finalization event or action: <non-empty text>
```

The staging plan describes expected checks; it does not require the new promotion PR own CI results, which do not exist when the body is created. Production promotions record prior staging evidence and the exact 40-character candidate SHA; the validator compares that SHA case-insensitively with the current promotion PR head SHA. Post-merge production checks remain GitHub Actions evidence and are not copied back into the PR body.

**CRITICAL: Issue Closure Extraction**
When creating a promotion PR to `main`, the author (human or agent) MUST scan all included implementation PRs and extract every `Refs #N` issue reference. Declare each issue as `Closes #N` when its acceptance scope is complete or `Advances #N` when this release delivers an intermediate phase and the issue must remain open. Failure to declare the release intent leaves issue state ambiguous.

### Issue linkage and closure policy

Use GitHub Issues as the formal artifact, but distinguish between the PR that
**implements** the change and the PR that **officially closes** the issue.

#### Quick path

1. Create or reference the GitHub Issue for the work item.
2. In the **implementation PR** (`feature/fix -> development`), reference the issue as context.
3. In the **promotion PR to `main`** (`staging -> main`), close the issue or declare an intermediate delivery phase.

#### Rules

| PR type | Typical branch flow | How to reference the issue | Purpose |
|---|---|---|---|
| Implementation PR | `<type>/<dir>-tb-<digits>-<slug>` or `<type>/<dir>-no-backlog-<slug>` -> `development` | `Refs #N` in `## Related Issues` when tracked by a GitHub Issue; optional for other tracked channels and explicitly untracked work | Preserve the technical story of the actual code change |
| Promotion PR to staging | `development -> staging` | Optional mention of `#N` or included implementation PRs | Track validation scope; do not close the issue here |
| Promotion PR to main | `staging -> main` | `Closes #N`, `Advances #N`, or explicit `Formal issues: none` | Close completed issues, record partial delivery for open issues, or declare that no formal issues are included |

#### Strict issue closure token

When promoting to `main`, the PR body **MUST** declare its release intent to pass automation:
- If there are issues to close, use standard `Closes #N` / `Fixes #N`.
- If an issue is only partially delivered and must remain open, use `Advances #N` and add its record to `## Advancement Finalization`.
- If the release contains no formal issues, include the exact line `Formal issues: none` in the PR body.
- **MANDATORY EXTRACTION RULE**: Scan the descriptions of all implementation PRs being promoted, extract every `Refs #N`, and classify each as `Closes #N` or `Advances #N`. Do not assume implementation references will update issue state themselves.

| Combination | Result |
| --- | --- |
| `Advances #N` alone | Valid |
| `Advances #N` + `Closes #M` for different issues | Valid |
| `Advances #N` + `Closes #N` for the same issue | Invalid |
| `Advances #N` + `Formal issues: none` | Invalid |
| `Closes #N` + `Formal issues: none` | Invalid |
| No declaration | Invalid |

#### Phased delivery

Use phased delivery only when real work or an actual acceptance condition remains after the production promotion. Intermediate promotion PRs use `Advances #N` with the deterministic finalization path above; the final promotion drops `Advances` and uses `Closes #N`. Use `Closes #N` when merging the production promotion delivers the complete intended mechanism, even if a deployment-triggered workflow executes that mechanism afterward.

Phased delivery is not review slicing or chained PRs. Review slices divide a change for review but ship together in one release, so the existing promotion policy applies without `Advances`.

#### Format for `#N`

When referencing an issue via `#N` (e.g., `Refs #N`, `Advances #N`, `Closes #N`), you **MUST use the numeric GitHub Issue ID** (for example, `Refs #71`).
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

## Included Implementation PRs

- PR: #123

## Release Target

Environment: staging

## Validation

Plan: Verify the booking flow and the administration update flow.

## Rollback

Strategy: Revert this promotion PR if staging validation fails.

## Breaking Changes

- [ ] None
```

#### Promotion PR to main

```md
## Summary

- Promote the validated release candidate to production.

## Context

- The implementation was originally introduced in #123 and this exact release candidate passed staging validation.

## Included Implementation PRs

- PR: #123

## Release Target

Environment: production

## Validation

Prior staging validation evidence: Staging run https://github.com/<owner>/<repo>/actions/runs/<run-id> passed for the current release candidate.

Release candidate SHA: <40-character SHA of this PR head>

## Rollback

Strategy: Revert this promotion PR and redeploy the prior release if production validation fails.

Closes #123
```

#### Promotion PR with multiple included PRs

```md
## Summary

- Promote the current approved release candidate to staging.

## Context

- This promotion groups multiple previously reviewed changes into a single validation batch.

## Included Implementation PRs

- PR: #123
- PR: #124
- PR: #126

## Release Target

Environment: staging

## Validation

Plan: Verify checkout, booking administration, and availability synchronization.

## Rollback

Strategy: Revert this promotion PR or exclude affected changes in the next release batch.

## Breaking Changes

- [ ] None

## Related Issues

Refs #123
Refs #124
Refs #126
```
