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
- `test` — adding or updating tests (rare; only when requested)
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

Use the following template as reference:

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
```
