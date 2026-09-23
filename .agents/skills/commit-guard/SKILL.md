---
name: commit-guard
description: On demand, inspect mixed or partial staging and optionally run a deep TypeScript diagnostic for affected packages. Use when asked to "run commit guard", "check staged consistency", "suggest what else to stage", or "run typecheck for changed code".
---

# Commit Guard

Use this as an optional deep diagnostic for mixed/partial staging or when explicitly requested. Ordinary commit preparation uses the repository's quick staging, branch, and whitespace checks plus existing hooks; it does not require running this skill.

## Workflow

1. Run the script from the repository root. The default is a quick, read-only staging diagnostic; pass `--typecheck` only for an explicitly requested deep diagnostic:

```bash
bash .agents/skills/commit-guard/scripts/commit_guard.sh
# Explicit deep diagnostic only
bash .agents/skills/commit-guard/scripts/commit_guard.sh --typecheck
```

2. Read the report sections in order:

- Change inventory (`staged`, `unstaged`, `untracked`)
- Potential related hunks/files (same file changed in staged and unstaged)
- Branch, affected package detection, and typecheck state
- Typecheck is `NOT_RUN` by default. With `--typecheck`, inspect results only for affected packages that declare a valid typecheck script.

3. Report readiness status using the guard output:

- `READY`: staged changes exist and the quick checks pass; it does not mean TypeScript was verified
- `NEEDS REVIEW`: no hard failures, but unstaged/untracked or partial-file risks are present
- `NOT READY`: no staged changes, patch-sanity/conflict-marker failure, malformed package configuration during deep mode, or an executed typecheck failure

4. Suggest next actions without applying them:

- Recommend `git add -p <file>` for partial-file overlaps
- Recommend staging specific listed files when related changes are found
- Report `NOT_RUN` distinctly; never describe quick-mode `READY` as typechecked
- Recommend fixing type errors before completion when an explicitly run typecheck fails

## Repository Rules

- Do not modify files unless explicitly instructed by the user.
- Do not stage/unstage automatically.
- The default invocation must not inspect package configuration or launch a package manager. Typecheck is opt-in via the exact `--typecheck` flag and runs only for affected packages that expose a `typecheck` script.
- In deep mode, parse each `package.json` as JSON so formatting and line breaks do not affect detection; malformed package configuration is an explicit failure, not `NOT_AVAILABLE`. Unknown or duplicate options fail before repository work.
- This diagnostic never stages files. Before a later commit, independently prove the captured candidate and staged content are unchanged; do not use `READY` as that proof.
- The read-only script's fixture contract can be checked with `bash .agents/skills/commit-guard/tests/commit_guard.test.sh`. Its fake package-manager executable verifies detection without running a real typecheck.

## Resources

### scripts/

- `scripts/commit_guard.sh`: produce quick staging diagnostics by default; `--typecheck` opts into affected-package typechecks.

## Output Contract

Return:

1. `Status`: `READY`, `NEEDS REVIEW`, or `NOT READY`
2. `Reasons`: short bullets
3. `Typecheck`: per affected package, including `NOT_RUN` when not requested
4. `Suggested staging actions`: explicit commands to run manually
