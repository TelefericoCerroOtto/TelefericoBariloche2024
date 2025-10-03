# Codex Guideline

Use this document as the single source of truth for how Codex should structure commits and follow project conventions.

---

## Commit Message Rules (Conventional Commits)

**Format**
<type>(<scope>): <short, imperative summary>

**Types (use lowercase)**

- feat — a new feature
- fix — a bug fix
- refactor — code change that neither fixes a bug nor adds a feature
- chore — tooling, build, config, or other housekeeping
- style — formatting, UI tweaks, CSS-only, non-functional changes
- docs — documentation only
- perf — performance improvements
- test — adding or updating tests (rarely used here; see “Tests policy”)
- revert — revert a previous commit

> If you previously used styles, prefer style.

**Scope**

- The scope must reflect the root and section you modified:
  - Roots: app/ (frontend at ./teleferico-app), cms/ (backend at ./teleferico-cms), root/ (root of the project at ./)
  - Sections: e.g., components, hooks, pages, services, utils, styles, collections, etc.
- Combine them with a slash. Examples: app/components, app/hooks, cms/services, cms/collections.

**Examples**

- feat(app/components): add language selector dropdown
- chore(cms/config): update env variable parsing
- docs(root/README): update root README with new implementations.

**Body & Footer (optional but encouraged)**

- Use the body to explain what and why, not how.
- Use BREAKING CHANGE: in the footer if applicable.
  Example:
  BREAKING CHANGE: rename `getUser` to `fetchUser` in cms/services

---

## Tests Policy

- Do not create, update, or remove test files unless explicitly requested in the prompt.

---

## Dependencies & Packages Policy

- Do not install, update, or remove libraries, packages, or plugins unless explicitly requested in the prompt.
- Do not modify package.json, package-lock.json, yarn.lock, or pnpm-lock.yaml unless explicitly requested in the prompt.
- Use only existing, already-installed dependencies available in the project.
- If a change would normally require adding a dependency, suggest the changes on the answer and ask for implement it.
- Only proceed with dependency changes if explicitly requested in the prompt.

---

## Pull Request Titles (if applicable)

**Title**

- Must reflect the **main areas changed** (roots + key sections) and the **change type** (feature creation, refactor, update/fix).

**Description**

- Provide a **concise summary** of what changed (1–5 short bullets or 1–3 short sentences).
- Focus on the essentials (e.g., created/updated/refactored, key files/areas touched, notable impact).
- If relevant, add one line for BREAKING CHANGE or follow-up tasks.

---

## Quick Checklist for Codex

- [ ] Use Conventional Commits format.
- [ ] Include a correct scope like app/components or cms/services.
- [ ] Keep the summary imperative and concise.
- [ ] No tests unless explicitly requested.
- [ ] No installing/updating/removing packages; do not touch lockfiles.
- [ ] Add body/footer only when it adds clarity (e.g., rationale, BREAKING CHANGE).
