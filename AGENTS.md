# AGENTS.md — TelefericoBariloche2024

This file defines the portable repository-wide governance for agents working in this monorepo under the current GentleAI/OpenCode/SDD workflow.

## Repo shape

- Governed packages in this migration slice:
  - `teleferico-app` (Next.js + TypeScript + Tailwind): public site plus administrative dashboard
  - `teleferico-cms` (Strapi): CMS/API backend
- Separately scoped tooling:
  - `tools/image-pipeline`: local-first image authoring and batch processing. Has its own `AGENTS.md` with self-contained governance. It is NOT part of the public site runtime or the CMS; treat it as an independent tool unless a change explicitly crosses its boundary.
- Root surfaces: `.githooks/`, `.github/scripts/`, `scripts/`, `public/`, `teleferico-app/`, `teleferico-cms/`, `tools/`, `docs/`, `.agents/`, `cloudbuild.playwright-e2e.json`

## Key paths

### teleferico-app

- Routing/layouts: `teleferico-app/src/app`
- UI: `teleferico-app/src/components/{administration,forms,institutional,shared,ui}`
- Logic/config: `teleferico-app/src/lib/{actions,adapters,auth,constants,google,helpers,http,schemas,services}`
- Types: `teleferico-app/src/types/{api,cms}`
- Custom hooks: `teleferico-app/src/hooks`
- Utilities: `teleferico-app/src/utils`

### teleferico-cms

- Environments: `teleferico-cms/config/env/{staging,production}`
- Migrations: `teleferico-cms/database/migrations`
- API domain: `teleferico-cms/src/api/*/{content-types,controllers,routes,services}`
- Strapi components: `teleferico-cms/src/components/{images-blocks,page-components,page-properties,utils-components}`
- Auth/roles: `teleferico-cms/src/extensions/users-permissions`
- Generated types: `teleferico-cms/types/generated`

## Package-local governance

- `teleferico-app/AGENTS.md`, `teleferico-cms/AGENTS.md` and `tools/image-pipeline/AGENTS.md` are critical package-local guardrail sources.
- Package-local files refine this root guidance for their own package boundaries and sensitive flows; they must not weaken runtime instructions, user approvals, or approved slice boundaries.

## Scope-sensitive changes

The following changes are sensitive and must be explicitly called out in a proposal:

- Dependency and lockfile changes
- Strapi schema/auth changes (`content-types`, `components`, `migrations`, `users-permissions`, generated types)
- Large refactors or architecture changes
- Infrastructure, deployment, credential, or environment-sensitive changes

## Testing policy

- The current `teleferico-app` automated-test inventory includes Vitest unit, component, guard, and Route Handler coverage plus Playwright E2E coverage. Vitest discovers only `src/**/*.{test,spec}.{ts,tsx}`; tests outside `src` and JavaScript or JSX test files do not join automatically.
- **Forms and security:** If you modify public forms, rate limiters, or their security layers, you MUST maintain and expand their test coverage using the existing Vitest suite.
- **Other areas:** The long-term goal is to gradually expand testing coverage across all packages. Introduce tests progressively as new features or critical refactors are made.
- **Cloud Build Playwright baseline:** `cloudbuild.playwright-e2e.json` fails closed unless `COMMIT_SHA^{commit}` equals `/workspace` `HEAD^{commit}` and accepts only `smoke` (safe default) or `full`. Every accepted legacy profile runs the fixture suite, independent real-stack readiness, and then the blocking real-auth acceptance step. Real-auth success requires exactly three discovered, non-skipped scenarios to pass; synthetic verification and cleanup, service cleanup, outer final readiness, container cleanup, and absence checks must then succeed before the outer finalizer emits `TB122 real-auth acceptance=scenarios:3/3` with selected exit `0`. A successful build on the exact PR SHA is still required before merge. Trusted same-repository implementation PRs to `development` derive smoke; the internal `development -> staging` route derives full and unrelated staging heads skip before OIDC. Preserve keyless OIDC, pinned images, `pnpm@10.33.0`, frozen installs, synthetic fixtures, bounded cleanup, the Cloud Build dispatcher/executor, and the disabled legacy trigger. This repository activation does not itself prove the runtime gate. Production-smoke migration, diagnostic artifacts, legacy-trigger cleanup, deployment, and further GCP/IAM changes remain outside this slice under #261.

## GCP CLI operational rules

These rules apply to **all commands** executed through Google Cloud SDK / CLI (and wrappers that ultimately operate on GCP resources for this project).

| Command type | Rule |
|---|---|
| Safe read-only commands | Run without asking. |
| Sensitive reads | Ask first. This includes secrets, secret metadata, IAM-sensitive inspection, or any read that could expose private information directly or indirectly. |
| Mixed batches | Run the safe part first, then stop and ask before any sensitive part. |
| Non-destructive but irreversible / hard-to-revert changes | Ask first. |
| Production changes | Ask first, always. |
| Destructive changes | Ask first, always. |
| Ambiguous commands | Ask first. If you cannot classify a command with confidence, default to confirmation. |

### Required preflight

- If a command offers `dry-run`, `plan`, `preview`, or an equivalent simulation mode, run that mode **before** any real change.
- Dry-run / plan / preview never requires confirmation because it does not apply an effective change.

### Confirmation format

When confirmation is required, ask once with **one consolidated list** of the exact commands to be executed.

For each command, include:

- the exact command
- a brief direct summary of what it will do
- why it needs approval
- the affected environment (`staging`, `production`, etc.)
- the expected result
- the risk level
- rollback options, if any

### Small examples

- `gcloud secrets versions access ...` → sensitive read, ask first.
- `gcloud app deploy` or a production deploy script → production change, ask first.
- `gcloud ... delete ...` / `destroy` / `purge` → destructive, ask first.

## Deployment governance

- Direct deployments from the console are prohibited.
- The only operational path to deploy is through a merge of a pull request into the branch associated with the target environment.
- The agent may prepare the pull request and supporting changes, but it must not decide, approve, or perform the merge.

### Practical default

When a command is not clearly safe, treat it as sensitive and ask before executing.

## Language Policy

- **All artifacts created in GitHub Issues and Notion items MUST be written in English.**
- Code, documentation, PR descriptions, commit messages, and internal notes must be in English.
- Only the interactive chat with the user can be in Spanish.

## Human conventions

- Conventional commits + scopes + PR titles: `docs/CONVENTIONS.md`
- GCP infrastructure: `docs/INFRA.md`
- Business domain context (zones, facilities, organization, operations): `docs/cerro-otto-business-context.md`
- Content authoring guide (component catalog, tone, translation vocabulary, content restrictions): `docs/content-components-guide.md`

## Business context sources

- `docs/cerro-otto-business-context.md` is the curated repository reference. Do not change it merely to mirror Notion; changes require an explicit request and must be relevant to repository or product context.
- When current or live organizational context is required, use the Notion MCP and start from `00 — LEER PRIMERO — Notion Teleférico Cerro Otto`: `https://app.notion.com/p/3dca58c3fefc81f89064cc55729b7ec5`.
- MCP-first behavior belongs in repository-agent governance, not in external ChatGPT project instructions.
- If the Notion MCP is unavailable, report the limitation and do not claim to have read or written Notion.
- Do not automatically overwrite either source or enforce literal bilingual parity between them.

## Implementation PR finalization

- `/implementation-pr` is an explicit, single-invocation shortcut for one implementation branch snapshot. Load `.agents/skills/implementation-pr/SKILL.md`; it composes the active commit and PR contracts without replacing them.
- It may commit, non-force-push, create one PR to `development`, apply required PR metadata, and observe checks. It never authorizes promotion PRs, later changes, force pushes, branch changes, merges, issue closure, branch deletion, or releases.
- Mechanical repository, publication, and native SDD fact discovery is delegated to `.opencode/agents/delivery-state-mapper.md`. The mapper is read-only except for an explicitly authorized fetch, emits one bounded versioned snapshot, and never decides policy or authorization.
- `.github/scripts/wait-for-implementation-governance.js` is the sole implementation for polling and classifying implementation PR checks. It waits only for repository governance and convention checks with a bounded timeout, while reporting Cloud Build and other functional checks separately.

## Automatic SDD slice transitions

- Load `.agents/skills/sdd-slice-transition/SKILL.md` only at a native SDD implementation/apply boundary where one bounded work unit is complete and verified or reviewed, implementation remains, and sequential chained delivery is already selected.
- At that boundary, reconstruct local facts through `delivery-state-mapper` and automatically present the skill's one closed candidate-scoped decision. Do not require a `/next-slice` command.
- Do not activate this workflow for ordinary interaction, planning, incomplete work, final SDD completion, or strict-TDD decisions. Strict TDD is independent of delivery transitions.
- Publication remains owned by `implementation-pr`; next-slice implementation remains owned by the native SDD apply actor. Child work may continue locally from the exact published parent commit, but stays unpushed and without a PR until that parent merges into `development`.

## Change intake preflight

- Activate `.agents/skills/change-intake-preflight/SKILL.md` for concrete change proposals, implementation requests, follow-ups, regressions, or delivery work already in progress. Informational questions and change-free exploration do not activate backlog intake.
- `docs/change-intake-preflight.md` is the canonical procedure and decision matrix. For explicit implementation, classify intent, search canonical tracking, resolve delivery artifacts, inspect Git state, prepare appropriate tracking and a safe branch, and only then edit.
- New implementation branches default to the current remote `origin/development`, unless the user explicitly requests a safe override. Never reuse a branch after its PR was merged; use a fresh follow-up branch.
- Inspect the working tree before branch changes. Never auto-commit or alter dirty-tree changes to make a branch switch possible.
- Not every code or documentation change requires a GitHub issue. Preserve the selected `Canal formal` and current authorization boundaries.
- Agents never merge or close PRs and never delete branches.

## Shared backlog governance

- The pre-issue source of truth for backlog items is the Notion database **Backlog unificado** documented in `docs/todo-workflow.md`.
- Ad-hoc Notion checklists are archival surfaces only; do **not** add new work items there.
- Before creating a backlog item, search for duplicates in the Notion backlog and prefer updating/merging an existing row over creating a near-duplicate.
- Use one Notion row per work unit. Keep subtasks, acceptance notes, or migration details inside the row notes unless the subtask needs independent tracking.
- Use `Clarificar` for ambiguous items, `Listo para formalizar` when the work is clear enough to deserve a formal artifact, and `Formalizado` only after the artifact exists and the link is attached to the row.
- Separate work maturity from artifact type: use `Canal formal` to indicate whether the formal target is a GitHub Issue, an operational change, a document/ADR, or something else.
- Use `Work ID` as the stable backlog identifier and `Branch` as optional metadata for one active or representative branch.
- Implementation branches must use `<type>/<dir>-tb-<digits>-<slug>` or `<type>/<dir>-no-backlog-<slug>`. Use only documented types and `app`, `cms`, `tools`, `root` directories; composites use stable `app`, `cms`, `tools`, `root` ordering. The literal `no-backlog` marker is required for deliberately untracked work.
- For **implementation PRs**, use one deterministic mode: tracked branches resolve exactly one canonical `TB-<digits>` Work ID, while no-backlog branches are explicitly untracked. `Branch` is metadata and never establishes fallback tracking. Explicitly untracked PRs require a visible `## Tracking` section with `Backlog item: none` and a non-empty `Reason:` line. Missing, malformed, unknown, repeated, multiple, and ambiguous Work IDs fail closed without fallback. Every non-promotion PR targeting `development` is implementation work, including unknown branch prefixes.
- Run `./scripts/setup-git-hooks.sh` once in each opting-in worktree to enable tracked offline branch, commit-message, and outgoing-commit path validation. The setup uses worktree-specific Git configuration and fails on existing conflicting hook paths. Hooks do not call Notion or GitHub and do not run package commands, builds, or test suites.
- Governance validation is read-only and uses GitHub-rendered visible GFM semantics. Append-only managed issue comments and Notion closure writes run only after complete preflight for same-repository trusted PR heads; fork metadata must never initiate a mutation. Legacy issue-body blocks are not updated.
- For **promotion PRs**, do not require a direct `Work ID`/branch association; they track release movement, not a new unit of backlog work.
- A branch should have **one primary backlog item**. Multiple items on one branch are allowed only when they form one tightly coupled reviewable outcome; otherwise split the work.
- Promote a Notion item to GitHub only when the scope is clear, it needs engineering follow-up, and the right `Canal formal` for that row is `GitHub Issue`.
- Notion → GitHub issue formalization is explicit and on-demand via agent/human flow only; GitHub Actions in this repo do not create issues from Notion.
- When a request is about adding, deduplicating, triaging, or promoting backlog items, agents should load `.agents/skills/notion-todo-governance/SKILL.md` when the client supports project skills.

## Issue context resolution governance

- The canonical GitHub issue contract lives in `docs/issue-context-contract.md`.
- When a user mentions `TB-###`, `#123`, a Notion URL, a GitHub issue URL, or a governed branch containing `tb-###`, agents should resolve linked artifacts automatically.
- Resolution should include Work ID ↔ Notion row ↔ GitHub issue and governed branch association when available.
- This lookup is **silent by default** while the agent executes the requested task.
- A structured recap/context snapshot should be emitted **only** when the user explicitly asks for a summary.
- For operational resolution workflow, load `.agents/skills/issue-context-harness/SKILL.md` alongside backlog-governance rules when applicable.

## Documentation maintenance

Whenever code, flows, architecture, contracts or configuration change in a way that affects documented behaviour, update the relevant documentation **in the same change**. This includes but is not limited to:

- Package-local `AGENTS.md` (guardrails, key paths, conventions)
- `README.md` files at any level
- `docs/*` (CONVENTIONS.md, INFRA.md, any domain-specific docs)
- Shared rules under `.agents/RULES/*`
- **Environment variables**: Every time an environment variable is added or modified, it MUST be documented in the `.env.example` file of its respective package accompanied by a brief comment explaining its purpose.

Do not treat documentation as a follow-up task; outdated docs actively mislead agents and humans.

## Pull Request Validation Loop

When an agent is instructed to create or update a Pull Request, it MUST NOT consider the task finished just by opening it. Because this repository enforces strict semantic checks via GitHub Actions (`backlog-governance.yml`), the agent MUST proactively ensure the PR passes CI:

1. After creating/updating an implementation PR, immediately run `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>`. Do not replace it with an unfiltered `gh pr checks --watch`.
2. Treat exit `0` as governance completion only. Report functional and Cloud Build checks separately; they may still be running or may have failed, and the PR must not be described as fully validated while they are nonterminal.
3. If a governance check fails—especially `Governance tests`, `validate-pr-policy`, or `trusted-pr-sync`—the agent MUST fetch the failed run logs using the GitHub CLI.
4. Analyze the logs against `docs/CONVENTIONS.md` to find the exact semantic violation (e.g., missing issue linkage, wrong title format, wrong PR type).
5. Fix PR metadata using `gh pr edit` only when the current authorization permits it, then invoke the helper again. Code failures require a new implementation/finalization invocation.
