---
name: suggest-branch-name
description: "Trigger: propose branch name, suggest branch name, nombre de rama, sugerir rama. Analyze working tree and suggest a git branch name based on changes."
license: Apache-2.0
metadata:
  author: manual
  version: "1.0"
---

## Activation Contract

Create a branch name suggestion based on the current changes in the working tree.

Also support branch suggestion from a backlog item when there are no local changes yet, using the item's `Work ID`, `Tipo`, `Área`, and `Tarea`.

## Hard Rules

- Analyze the working tree using `git status` and `git diff` (or `git diff --staged` if there are staged changes).
- The branch name MUST be in lowercase.
- Words MUST be separated by hyphens (kebab-case).
- The branch name MUST start with a valid conventional commit type (e.g., `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `style/`, `test/`).
- The branch name SHOULD include the scope if it is clear from the changes. Use the directory conventions from `docs/CONVENTIONS.md` if applicable (`app`, `cms`, `tools`, `root`).
- If the work is linked to a backlog row with `Work ID`, use `<type>/<dir>-tb-<digits>-<slug>`. Otherwise, use `<type>/<dir>-no-backlog-<slug>` only when work is deliberately without a Notion item.
- Keep the branch name concise but descriptive.
- Validate every recommendation with `node .github/scripts/repository-policy.js validate-branch <branch>` before returning it.

## Execution Steps

1. Run `git status` to see modified/added/deleted files.
2. Run `git diff` (and `git diff --staged`) to understand the actual changes.
3. Determine the primary type of the change (`feat`, `fix`, `chore`, etc.).
4. Determine the primary directory/scope (`app`, `cms`, `tools`, `root`, etc.).
5. If there are no meaningful local changes but a backlog item is provided, derive type/dir/slug from that item.
6. Formulate one recommendation using either `<type>/<dir>-tb-<digits>-<slug>` or the explicit `<type>/<dir>-no-backlog-<slug>` form. Never suggest legacy fallback shapes.
7. Return multiple alternatives only when type, directory, tracking mode, or slug remains materially ambiguous; name the unresolved dimension.
8. Run the repository-policy branch validator for every returned name and omit any invalid candidate.

## Output Contract

Return one validated recommended branch name with a brief explanation. Return multiple validated alternatives only for material ambiguity.
