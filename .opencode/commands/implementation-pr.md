---
description: Finalize the current implementation branch using one explicit, bounded publication authorization.
---

# Implementation PR Command

Read `.agents/skills/implementation-pr/SKILL.md` FIRST. It owns authorization, minimal local/remote fact gathering, publication decisions, and operation-specific checks. Do not invoke `delivery-state-mapper` or start generic SDD discovery.

The slash command accepts bare `/implementation-pr` as the strict-scope default, or exactly `/implementation-pr --allow-mixed-scope "<nonblank reason>"`. Reject a missing or blank reason, unknown or extra arguments, and alternate spellings. An equally explicit natural-language authorization remains valid. The workflow requires a current explicit authorization to commit the candidate, non-force-push `HEAD` to the named remote, and create one implementation PR, plus the destination and credential/session authorization. A generic request to continue does not authorize those mutations. Do not create, switch, or delete branches as part of this shortcut.

Capture local branch, `HEAD`, Git status, candidate paths, and intended base facts once with native Git. Validate the complete path list once with `node .github/scripts/implementation-candidate-paths.js <candidate-path...>` using argument-vector execution. This checks names only; never read `.env` or other credential/secret files or their values. Stop for an unknown or secret-like candidate path, incorrect branch/remote/base, an existing open PR, or ambiguous/failing commit or push. Use repository-scoped GitHub reads only when explicitly authorized for that destination, operation, and session; do not probe authentication or fetch without explicit authorization.

Block secret-bearing `.env*` files, `.npmrc`, `.netrc`, `.pypirc`, `.ssh`, `.aws`, credentials/secrets/private-key paths, and token/auth/service-account basenames. Only exact `.env.example`, `.env.sample`, or `.env.template` basenames under non-sensitive ancestors are path-safe templates; never infer anything about their contents.

Mixed-scope approval is one approval for the complete known non-sensitive inventory and a concrete reason. Preserve the exact reason and every approved exceptional path in a visible English `## Scope Exception` section. Do not run path-by-path approval loops or generate a candidate fingerprint. Use Git-native facts, existing hooks, and CI for integrity.

Preserve validated same-repository `stacked-to-main` preview restrictions and visible `Chain Context`. Render the parent SHA as `Parent head SHA: [<full SHA>](https://github.com/<owner>/<repo>/commit/<full SHA>)`; never accept an arbitrary base.

Do not invoke standalone `branch-pr` preflight. Reuse only its repository-policy interpretation and PR-content/creation clauses inline after this workflow's authorization and publication gates. It must not repeat discovery, authorization, branch/base setup, candidate classification, fetch, or push planning. Read back the created PR and verify its head and base match the published commit and authorized plan; a mismatch is terminal.

Observe governance once with `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>`. After that helper returns—whether it passes, fails, times out, or reports an observer error—run `.github/scripts/implementation-pr-vitest.js` exactly once. Report Vitest and functional/Cloud Build status as advisory evidence; do not retry an unknown/failed observation. Advisory evidence is never a publication gate.
