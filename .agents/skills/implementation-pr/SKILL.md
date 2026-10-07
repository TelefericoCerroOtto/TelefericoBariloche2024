---
name: implementation-pr
description: "Trigger: /implementation-pr, finalize implementation branch. Orchestrate one authorized commit, push, PR, and governance observation."
license: Apache-2.0
metadata:
  author: "manuelffernandez"
  version: "1.0"
---

# Implementation PR

## Activation Contract

Load only when the user invokes `/implementation-pr` (bare or with the exact `--allow-mixed-scope` argument) or explicitly asks in natural language to run implementation-PR publication. The invocation itself authorizes at most one commit of the current candidate when needed, one non-force push of `HEAD` to `origin`, and creation of one implementation PR. No second consent or credential/session prompt is required for the default target, `development`. Bare invocation is strict-scope by default; exactly `/implementation-pr --allow-mixed-scope` selects known non-sensitive paths outside the addressed item for disclosure. Reject unknown or extra arguments and alternate flag spellings. Generic continuation, ambient commands, or selecting an SDD slice-transition candidate do not authorize publication.

The bare invocation defaults to `origin/development`. A different target is allowed only when the current request explicitly selects a separately validated `stacked-to-main` preview plan. The preview must be same-repository and draft, and target only its exact immediate parent branch at the exact parent head SHA declared in the complete visible `Chain Context`. Never infer a preview from the current or ambient branch, and never accept an arbitrary base. SDD slice-transition publication still requires independent user consent.

## Hard Rules

- Own authorization, publication decisions, and the minimal preflight. Do not use or delegate to `delivery-state-mapper`.
- Gather the required local Git facts once with native Git commands: current branch, `HEAD`, status/staged state, candidate paths, and comparison to the explicitly authorized base. Validate the path list once with `.github/scripts/implementation-candidate-paths.js`; it checks path names only and never reads candidate contents. Never read credential files or secret values. Block unknown or secret-like paths, including secret-bearing `.env*` files, `.npmrc`, `.netrc`, `.pypirc`, `.ssh`, `.aws`, credentials/secrets/private-key paths, and token/auth/service-account basenames. The only `.env`-prefixed basename exception is the exact `.env.example`, `.env.sample`, or `.env.template` template under non-sensitive ancestors; this is path-only classification, not a claim about file contents.
- Use the current active GitHub CLI session for only the repository-scoped reads needed for this publication: repository identity, existing open PR for this head, remote head, and target/base identity. Do not read credentials or probe authentication. Runtime tool permissions still apply; if GitHub CLI capability is missing, access is denied, or an operation fails, stop without bypassing permissions.
- Stop for a wrong repository, branch, remote, or base; unknown or secret-like candidate paths; an existing open PR; failed or ambiguous commit/push; or a published head/base mismatch. Do not switch branches, force-push, rebase, merge, close issues, delete branches, create promotion PRs, replay a terminal outcome, or substitute a new candidate.
- When ad hoc scope is selected, preserve the full exact path/work-unit inventory in one visible English `## Scope Disclosure` section stating `Changes outside the addressed item:`. Do not ask for a reason or repeat approval per path. Never include unknown or sensitive paths. The supported invocation authorizes only the bounded publication; disclosure content does not broaden that authorization or authorize separate tracking changes.
- For an explicitly selected `stacked-to-main` preview, require a same-repository draft child based only on its exact immediate parent branch and head SHA, with the validated visible `Chain Context`; render the parent SHA as `Parent head SHA: [<full SHA>](https://github.com/<owner>/<repo>/commit/<full SHA>)`. Never infer preview selection from ambient branch state or accept an arbitrary base.
- Before measuring a candidate, resolve the applicable prospective budget from its change-local route/docs. For TB-113, use `openspec/changes/tb-113-visitor-feedback/README.md` and the prospective section of `tasks.md`; the standing maintainer-approved limit is 6,000 authored additions plus deletions per logical PR against its exact immediate parent. Do not infer a current limit from `apply-progress.md` or another historical snapshot. When no applicable change-local exception is documented, retain the general repository policy.
- For a tracked item whose `Canal formal` is `GitHub Issue`, resolve the exact issue number from its verified `Enlace formal` before composing any PR, including a draft stacked preview. Put `Refs #<issue number>` under a final visible `## Related Issues` section after `## Chain Context` when present, so retargeting to `development` needs no body repair. Stop if the formal issue is missing or ambiguous; never derive its number from the Work ID or copy a parent's reference without verification. Do not invent `Refs` for other formal channels.
- Do not invoke the standalone `branch-pr` preflight. Reuse only its repository-policy interpretation and PR-content/creation clauses inline. It must not repeat discovery, branch/base setup, authorization checks, fetches, candidate-scope validation, or push planning owned by this workflow.
- A failed or unknown commit/push result is terminal; do not create a PR. After publication, verify that the PR has the exact local published head and authorized base. A mismatch is terminal.
- Use native Git state, existing hooks, and CI for candidate integrity. Do not run a second local fingerprint helper or invent candidate fingerprints. Staged content must be included intentionally; do not silently change the candidate.
- Governance observation remains `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>`. Do not replace it with unfiltered `gh pr checks --watch` or retry a failed/unknown observation in the same invocation. Once the governance helper returns, invoke `.github/scripts/implementation-pr-vitest.js` exactly once, whether governance passed, failed, timed out, or returned an observer error. Its result and other CI status are advisory evidence, never a publication authorization gate.
- Direct routes do not trigger generic OpenSpec/SDD discovery. Never launch SDD for ordinary publication.

## Execution

1. Parse only the supported invocation forms. Bind the bounded authorization to the current candidate and repository. Default the target to `origin/development`; use a different target only if this request explicitly selects a `stacked-to-main` preview plan. If the request is generic, ambiguous, or outside this workflow, stop before remote access or mutation.
2. Resolve the applicable prospective change-local budget before measuring. Capture the minimal local Git facts once. Confirm the actual repository, branch, `origin` remote, and selected base: `origin/development` by default, or the exact immediate parent branch and head SHA for an explicitly selected preview. For previews, also validate same-repository identity, draft state, and visible `Chain Context`. Identify the complete candidate paths and run the path-only candidate validator once with the exact paths as separate arguments. Do not inspect candidate file contents for credential discovery.
3. If `--allow-mixed-scope` or explicit natural-language scope selection was used, capture the complete known non-sensitive inventory and prepare its exact path/work-unit disclosure. Do not request a justification or repeat approval per path.
4. Use the active CLI session for only the necessary repository-scoped GitHub reads; runtime permissions remain in force. Stop if access is unavailable or denied, the repository/remote/base is wrong, the head already has an open PR, or the remote head/base does not match the intended plan. Do not retry discovery or replace the candidate snapshot.
5. Make at most one commit for the current candidate when needed. Verify success and that the branch is unchanged. Make at most one non-force push of `HEAD` to `origin`; stop on failure or unknown outcome and verify the published head equals local `HEAD`.
6. Compose one implementation PR using only `branch-pr`'s repository-policy and content/creation clauses. Target `development` by default; for an explicitly selected and validated preview, target only the exact immediate parent branch and create the PR as a draft. Include the required `Chain Context` and exact scope disclosure when applicable. Read back the created PR and verify its head/base, draft state, chain context, and exact scope disclosure match the selected plan. Stop on mismatch; never create a duplicate.
7. Run the repository governance helper once. After it returns for any outcome, run the post-creation Vitest helper exactly once. Report governance, Vitest, and functional/Cloud Build results separately; advisory failures or pending checks do not retroactively block or gate publication.

## Output Contract

Report the PR URL first when created, then governance and advisory test/CI status. If blocked, name the exact minimal blocker. Never describe a PR as fully validated while required checks are pending or failing.

## References

- `AGENTS.md`
- `docs/backlog-branch-pr-policy.md`
- `docs/CONVENTIONS.md`
- `~/.config/opencode/skills/commit-planner/SKILL.md`
- `~/.config/opencode/skills/branch-pr/SKILL.md` (PR content and creation only)
- `.github/scripts/implementation-candidate-paths.js`
- `.github/scripts/wait-for-implementation-governance.js`
