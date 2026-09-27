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

Load only when the user explicitly invokes `/implementation-pr`, names this workflow, or selects the candidate-scoped publication choice from `sdd-slice-transition`. For slash-command syntax, accept either bare `/implementation-pr` (strict-scope default) or exactly `/implementation-pr --allow-mixed-scope "<nonblank reason>"`; reject missing or blank reasons, unknown or extra arguments, and alternate flag spellings. An equally explicit natural-language authorization remains valid. The current request must authorize commit of the current candidate, non-force-push of `HEAD` to the named remote, and creation of one implementation PR, and identify the current credential/session authorization. Never infer authorization from a generic continuation. Authorization expires when the candidate, target, session, or publication outcome changes.

## Hard Rules

- Own authorization, publication decisions, and the minimal preflight. Do not use or delegate to `delivery-state-mapper`.
- Gather the required local Git facts once with native Git commands: current branch, `HEAD`, status/staged state, candidate paths, and comparison to the explicitly authorized base. Validate the path list once with `.github/scripts/implementation-candidate-paths.js`; it checks path names only and never reads candidate contents. Never read credential files or secret values. Block unknown or secret-like paths, including secret-bearing `.env*` files, `.npmrc`, `.netrc`, `.pypirc`, `.ssh`, `.aws`, credentials/secrets/private-key paths, and token/auth/service-account basenames. The only `.env`-prefixed basename exception is the exact `.env.example`, `.env.sample`, or `.env.template` template under non-sensitive ancestors; this is path-only classification, not a claim about file contents.
- Use GitHub reads only when the current request authorizes the destination, operation, and session. Gather only facts needed for this publication: repository identity, existing open PR for this head, remote head, and target/base identity. Do not probe authentication or fetch unless that exact remote operation is authorized.
- Stop for missing authorization; wrong branch, remote, or base; unknown or secret-like candidate paths; an existing open PR; failed or ambiguous commit/push; or a published head/base mismatch. Do not switch branches, force-push, rebase, merge, close issues, delete branches, or create promotion PRs.
- Keep the exact user-approved mixed-scope reason and full exceptional-path list in one visible English `## Scope Exception` section in the PR. Ask once for authorization only when the complete candidate list is known; do not ask or validate path-by-path. Never include unknown or sensitive paths.
- Preserve validated same-repository `stacked-to-main` preview restrictions and visible `Chain Context`; render the parent SHA as `Parent head SHA: [<full SHA>](https://github.com/<owner>/<repo>/commit/<full SHA>)`. Never accept an arbitrary base.
- Before measuring a candidate, resolve the applicable prospective budget from its change-local route/docs. For TB-113, use `openspec/changes/tb-113-visitor-feedback/README.md` and the prospective section of `tasks.md`; the standing maintainer-approved limit is 6,000 authored additions plus deletions per logical PR against its exact immediate parent. Do not infer a current limit from `apply-progress.md` or another historical snapshot. When no applicable change-local exception is documented, retain the general repository policy.
- For a tracked item whose `Canal formal` is `GitHub Issue`, resolve the exact issue number from its verified `Enlace formal` before composing any PR, including a draft stacked preview. Put `Refs #<issue number>` under a final visible `## Related Issues` section after `## Chain Context` when present, so retargeting to `development` needs no body repair. Stop if the formal issue is missing or ambiguous; never derive its number from the Work ID or copy a parent's reference without verification. Do not invent `Refs` for other formal channels.
- Do not invoke the standalone `branch-pr` preflight. Reuse only its repository-policy interpretation and PR-content/creation clauses inline. It must not repeat discovery, branch/base setup, authorization checks, fetches, candidate-scope validation, or push planning owned by this workflow.
- A failed or unknown commit/push result is terminal; do not create a PR. After publication, verify that the PR has the exact local published head and authorized base. A mismatch is terminal.
- Use native Git state, existing hooks, and CI for candidate integrity. Do not run a second local fingerprint helper or invent candidate fingerprints. Staged content must be included intentionally; do not silently change the candidate.
- Governance observation remains `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>`. Do not replace it with unfiltered `gh pr checks --watch` or retry a failed/unknown observation in the same invocation. Once the governance helper returns, invoke `.github/scripts/implementation-pr-vitest.js` exactly once, whether governance passed, failed, timed out, or returned an observer error. Its result and other CI status are advisory evidence, never a publication authorization gate.
- Direct routes do not trigger generic OpenSpec/SDD discovery. Never launch SDD for ordinary publication.

## Execution

1. Parse the request and confirm the explicit mutation authorization, target, remote, destination, and session. If a required detail is missing, stop before remote access or mutation.
2. Resolve the applicable prospective change-local budget before measuring. Capture the minimal local Git facts once. Confirm the named branch and target/base are the intended ones, identify the complete candidate paths, and run the path-only candidate validator once with the exact paths as separate arguments. Do not inspect candidate file contents for credential discovery.
3. If any non-sensitive unrelated paths are present, require one explicit mixed-scope approval covering the complete inventory and a concrete reason. Preserve the exact reason and path list for PR disclosure.
4. With current authorization, make only the necessary repository-scoped GitHub reads. Stop if the repository/remote/base is wrong, the head already has an open PR, or the remote head/base does not match the intended plan. No discovery retry or replacement snapshot is allowed.
5. Commit only when explicitly authorized and needed. Verify the command succeeded and the branch is unchanged. Push only when explicitly authorized; stop on failure or unknown outcome, and verify the published head equals local `HEAD`.
6. Compose the PR using only `branch-pr`'s repository-policy and content/creation clauses. Include the exact approved scope exception when applicable. Read back the created PR and verify its head/base and exact scope disclosure match the published commit, authorized plan, and approval. Stop on mismatch; never create a duplicate.
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
