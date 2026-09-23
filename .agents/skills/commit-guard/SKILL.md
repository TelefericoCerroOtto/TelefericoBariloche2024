---
name: commit-guard
description: Inspect staged and working-tree changes, suggest related hunks/files that may need staging, run TypeScript typecheck only for affected packages, and produce a commit-readiness report without modifying files. Use when asked to "run commit guard", "check staged consistency", "suggest what else to stage", "run typecheck for changed code", or "am I ready to commit?".
---

# Commit Guard

Run a deterministic pre-commit inspection for this repository and return a concise readiness report.

## Workflow

1. Run the guard script from the repository root:

```bash
bash .agents/skills/commit-guard/scripts/commit_guard.sh
```

2. Read the report sections in order:

- Change inventory (`staged`, `unstaged`, `untracked`)
- Potential related hunks/files (same file changed in staged and unstaged)
- Affected package detection
- Typecheck results by affected package

3. Report readiness status using the guard output:

- `READY`: staged changes exist, no typecheck failures, no partial-file staging risks detected
- `NEEDS REVIEW`: no hard failures, but unstaged/untracked or partial-file risks are present
- `NOT READY`: no staged changes or at least one typecheck failure

4. Suggest next actions without applying them:

- Recommend `git add -p <file>` for partial-file overlaps
- Recommend staging specific listed files when related changes are found
- Recommend fixing type errors before commit when typecheck fails

## Repository Rules

- Do not modify files unless explicitly instructed by the user.
- Do not stage/unstage automatically.
- Only run `typecheck` in affected packages that expose a `typecheck` script. Parse each `package.json` as JSON so formatting and line breaks do not affect detection; malformed package configuration is an explicit failure, not `NOT_AVAILABLE`.
- The read-only script's fixture contract can be checked with `bash .agents/skills/commit-guard/tests/commit_guard.test.sh`. Its fake package-manager executable verifies detection without running a real typecheck.

## Resources

### scripts/

- `scripts/commit_guard.sh`: produce commit-readiness report for current git state.

## Output Contract

Return:

1. `Status`: `READY`, `NEEDS REVIEW`, or `NOT READY`
2. `Reasons`: short bullets
3. `Typecheck`: per affected package
4. `Suggested staging actions`: explicit commands to run manually
