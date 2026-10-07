# Implementation PR invocation authorization

## Objective

Make a bare `/implementation-pr` invocation itself the explicit, bounded request to commit the current candidate, non-force-push it, and create one implementation PR, defaulting to `origin/development` without separate per-session publication permission.

## Problem and rationale

The current workflow treats slash-command invocation as scope selection, then requires separate current-request authorization for commit, push, and PR creation, plus destination and credential/session authorization. That makes the named publication shortcut insufficient to request its defining operation. Treat the exact bare invocation as that bounded request while retaining candidate validation and fail-closed publication safeguards.

## Scope and constraints

- User-approved worktree: `/home/manuel/Documentos/TelefericoBariloche2024-worktrees/implementation-pr-invocation`.
- Branch and base: `docs/root-no-backlog-implementation-pr-invocation`, based on `origin/development` at `dcbba2d`.
- This is deliberate no-backlog housekeeping: it clarifies the authorization contract of an existing repository workflow, with no distinct product or operational outcome to track.
- Default bare invocation authorizes only the current candidate's commit, one non-force push, and creation of one implementation PR targeting `origin/development`. It does not authorize later changes or a second publication attempt.
- Preserve stops for unknown or secret-like candidate paths, wrong branch/remote/base, an existing open PR, and failed or ambiguous commit/push or published-head/base mismatch. Never read credential files or secret values.
- Preserve `/implementation-pr --allow-mixed-scope` and natural-language mixed-scope selection, the exact scope disclosure, and the rule that scope selection is not needed for default publication.
- Default to `origin/development`. Permit a different target only when the current request explicitly selects an independently validated same-repository `stacked-to-main` preview: draft only, exact immediate parent branch and head SHA, and visible `Chain Context`. Never infer preview mode from ambient branch state or accept an arbitrary base. SDD slice-transition consent remains independent.
- Review and align `AGENTS.md`, `.agents/skills/implementation-pr/SKILL.md`, `.opencode/commands/implementation-pr.md`, `docs/CONVENTIONS.md`, `docs/backlog-branch-pr-policy.md`, and `docs/change-intake-preflight.md`. Update directly relevant assertions in `.github/scripts/implementation-pr-vitest.test.js`.
- Create and track this task document before the first policy-source edit. No governance-source edit is part of this planning phase.
- Route assessment: the delegated-direct threshold is met by the six policy documents; execution remained single-writer in this session, with parent ownership of scope checks, integration, and verification.
- TDD mode: standard. No source explicitly configures strict TDD for this non-SDD governance change; the presence of existing tests alone does not enable it.
- Focused verification command:

  ```bash
  node --test .github/scripts/implementation-pr-vitest.test.js .github/scripts/tb113-feedback-and-publication-contract.test.js .github/scripts/implementation-candidate-paths.test.js
  ```

- Forecast: approximately 200–350 authored changed lines, advisory only.
- Do not commit, push, or create a PR until publication authorization is evaluated under the resulting contract.

## Acceptance checks

- Bare `/implementation-pr` is documented and tested as sufficient explicit authorization for the bounded publication actions and default `origin/development` target. An explicitly selected validated preview is limited to the exact immediate parent branch/head SHA, draft state, and visible `Chain Context`.
- No redundant separate per-session permission is required for the default invocation; repository, branch, remote, base, candidate-path, open-PR, publication-result, and published-head/base mismatch stops remain intact. Preview mode is never inferred from ambient branch state.
- Mixed-scope behavior and disclosure remain optional and unchanged; SDD slice-transition consent remains independent.
- The six policy surfaces agree. Focused policy/path tests pass; the combined baseline-only failure is recorded transparently below.
- The plan remains no-backlog, and this task document is tracked before policy edits begin.

## Tasks

- [x] **GOV-1 — Align invocation authorization across policy surfaces.** Updated all six policy documents. Verification: removed the full read-only GitHub/Notion consent block from `AGENTS.md`; manually reviewed the six-file diff; searched for stale separate-session/publication-consent wording (no matches); and `git diff --check` passed. The general `change-intake-preflight` skill remains unchanged because it requires an explicit implementation request but adds no publication-specific consent gate. Route assessment: delegated-direct threshold met (six policy documents); actual execution was single-writer in this session.
- [x] **GOV-2 — Add focused contract coverage and verify the change.** Added focused assertions in `.github/scripts/implementation-pr-vitest.test.js` for wrong repository/branch/remote/base, published head/base mismatch, default `origin/development` versus an explicitly selected and validated same-repository draft preview pinned to its immediate parent branch/SHA and visible `Chain Context`, runtime permission denial, and rejection of arbitrary bases. The focused command `node --test .github/scripts/implementation-pr-vitest.test.js .github/scripts/implementation-candidate-paths.test.js` passed 26/26. The required combined command returned 27/28; its sole failure, `app Cloud Build snapshots close feedback on every deploy`, is base-only: `git diff --exit-code HEAD -- docs/infra/cloud-build/app-staging.yaml .github/scripts/tb113-feedback-and-publication-contract.test.js` returned 0, the unchanged HEAD staging YAML contains `FEEDBACK_CAPABILITY_ENABLED=true`, and the unchanged assertion expects `false`. `git diff --check` passed. No deployment file or unrelated test was changed.

Next: publication remains subject to the authorization contract active before this policy edit. The independent Cloud Build test/configuration mismatch is baseline-only advisory evidence, not a publication gate; resolve it under its own scope without claiming the combined suite passed.
