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
- If the work is linked to a backlog row with `Work ID`, include it in the branch name after `<dir>` using the format `<type>/<dir>-<work-id>-<slug>`.
- Keep the branch name concise but descriptive.

## Execution Steps

1. Run `git status` to see modified/added/deleted files.
2. Run `git diff` (and `git diff --staged`) to understand the actual changes.
3. Determine the primary type of the change (`feat`, `fix`, `chore`, etc.).
4. Determine the primary directory/scope (`app`, `cms`, `tools`, `root`, etc.).
5. If there are no meaningful local changes but a backlog item is provided, derive type/dir/slug from that item.
6. If a backlog `Work ID` is available, formulate 3 options using `<type>/<dir>-<work-id>-<slug>`; otherwise fall back to `<type>/<dir>-<scope>/<description>` or `<type>/<description>`.
7. Present the options to the user with a brief explanation of why they were chosen.

## Output Contract

Return a bulleted list of 3 branch name suggestions, starting with the most appropriate one. Include a brief explanation for each.
