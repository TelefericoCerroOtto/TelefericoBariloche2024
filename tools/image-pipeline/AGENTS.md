# AGENTS.md — tools/image-pipeline

## Purpose

Local-first tooling for image authoring and batch processing.
Combines:

- A Next.js/App Router Studio for importing, previewing and editing workspaces
- A CLI for running batches from `jobs.json`
- A shared Sharp core for parsing, planning, cropping, resizing and rendering

This file is the package-local source of guardrails for `tools/image-pipeline`: it complements `../../AGENTS.md`, does not replace it, and narrows rules when scope touches this tool, its Studio, its CLI or its jobs contract.

## Governance usage

- Apply alongside `../../AGENTS.md`
- This file is mandatory context whenever scope touches `tools/image-pipeline`, its render pipeline, its `jobs.json` schema, its Studio or its local artifacts.
- Its guardrails do not reduce approval requirements, scope limits or global repository rules.

## Repo context

- Package: `tools/image-pipeline`
- Nature: local tooling; not part of the public site runtime or the CMS.
- Main stack: Next.js 16 + React 19 + strict TypeScript + Tailwind CSS v4 + Sharp + Vitest + Commander.
- Package manager: pnpm 10.x.

## Key paths

- `src/app`: Studio App Router shell, layout, page and API routes.
- `src/app/api`: route handlers for workspaces, jobs, preview, import, process and registry.
- `src/components/studio`: Studio UI.
- `src/core`: shared domain core (`jobs`, `render`, `types`) reused by both CLI and Studio.
- `src/lib/server`: filesystem access, path safety, preview/process and workspace/registry stores.
- `src/lib/studio`: Studio-side contracts, mappers and capabilities.
- `src/cli.ts`: CLI entrypoint.
- `src/processJobs.ts`: thin façade for executing jobs from CLI or integrations.
- `src/scripts/build-jobs.ts`: utility script for building `jobs.json`.
- `src/cropAndFitToMP.ts`: standalone crop+resize math (aspect ratio fitting, focal point, MP budget). Predates `src/core`; may be absorbed into core in a future refactor.
- `src/ratioToTag.ts`: converts aspect ratio values to filesystem-safe tag strings.
- `src/sharpUtils.ts`: thin Sharp helpers (e.g. EXIF-aware oriented dimensions).
- `jobs.json`: canonical batch contract between Studio and CLI.
- `inbox/`: local inputs.
- `processed/`: generated outputs.
- `.studio/registry` and `.studio/workspaces`: local Studio state.

## Guardrails (non-negotiables)

### Shared core / contracts

- `src/core` is the source of truth for parsing, planning, cropping, naming, collision policies and rendering.
- CLI and Studio must reuse the same core behaviour. Do NOT duplicate or diverge pipeline logic in components, route handlers or scripts.
- `jobs.json` is the canonical contract between Studio and CLI; any schema change is sensitive and must explicitly state compatibility/migration.

### Types / quality

- Keep TypeScript strict; avoid `any` unless there is a genuine justification.
- Types that are strictly local may remain co-located with the module that uses them.
- Whenever a type starts crossing layers or being reused across `core`, `studio`, `app/api`, `server` or scripts, centralise it in `src/types` rather than duplicating it. Note: `src/types/` does not yet exist; create it when the first cross-layer type needs a home.
- Do not break existing contracts in `src/core/types.ts` or `src/lib/studio/types.ts` without reviewing all their consumers.

### Styles / UI

- Tailwind CSS v4 is ALREADY available in this tool and must be the first choice for new UI or visual refactors where reasonable.
- `src/app/globals.css` is for tokens, reset/base, theming and global/shared styles that are not a good fit for utilities.
- Avoid mixing Tailwind, global CSS and inline styles without a clear rationale. Inline styles should be reserved for dynamic geometry, canvas, calculated positioning or similar cases.
- Do not redo stable styles just to "migrate them to Tailwind" unless explicitly requested.

### Server / filesystem

- All filesystem access, path resolution and workspace state must go through `src/lib/server`; do not bring direct I/O into client components.
- Changes to path resolution and path safety are sensitive; preserve the path safety checks and workspace boundaries.
- Do not manually edit generated or ephemeral artifacts: `.next/`, `node_modules/`, `processed/`, `.studio/workspaces/*/processed`.

### Dependencies / config / env

- Do not touch `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `postcss.config.mjs` or `.env` without an explicit request.
- Do not commit secrets or ephemeral local Studio data unless explicitly instructed.

### Testing

- If `src/core`, `src/lib/server` or `src/app/api` is touched, review/adjust existing tests or add coverage.
- Keep tests close to the affected domain with `*.test.ts` or `*.test.tsx`.

## Architecture & conventions

### Overview

The architecture has three main layers:

1. **Inputs**
   - Studio: `src/app` + `src/components/studio`
   - CLI: `src/cli.ts`
   - Operational scripts: `src/scripts/*`

2. **Adapters**
   - `src/app/api`: Studio HTTP surface
   - `src/lib/server`: filesystem, stores, preview/process, path safety
   - `src/lib/studio`: UI mappers and contracts

3. **Core**
   - `src/core/jobs.ts`: parse, validate and normalise the jobs document
   - `src/core/render.ts`: preview, render and job execution
   - `src/core/types.ts`: pipeline domain contracts

### Expected flows

- **Studio flow**: client component → route handler in `src/app/api` → service/store in `src/lib/server` → shared core in `src/core`.
- **CLI flow**: `src/cli.ts` → `src/processJobs.ts` → shared core in `src/core`.
- If a business rule serves both Studio and CLI, it belongs in the core, NOT in the UI or the route handler.

### Folder structure

```text
tools/image-pipeline
├── src
│   ├── app              # Studio App Router + API routes
│   ├── components       # Studio UI
│   │   └── studio
│   │       ├── hooks    # Co-located custom hooks (state/logic)
│   │       ├── jobs     # Jobs panel
│   │       ├── preview  # Preview panel
│   │       ├── process  # Process panel
│   │       ├── registry # Registry panel
│   │       └── workspace # Workspace tree + assignment panel
│   ├── core             # Shared pipeline domain
│   ├── lib
│   │   ├── server       # I/O, stores, preview/process, path safety
│   │   └── studio       # Studio contracts, mappers, capabilities, api-client
│   ├── scripts          # Operational scripts
│   ├── cli.ts           # CLI entrypoint
│   ├── cropAndFitToMP.ts # Standalone crop+resize math (pre-core)
│   ├── ratioToTag.ts    # Ratio → filesystem-safe tag
│   ├── sharpUtils.ts    # Thin Sharp helpers (EXIF orientation)
│   └── processJobs.ts   # Execution façade
├── inbox                # Local inputs
├── processed            # Generated outputs
├── .studio              # Local registry and workspaces
└── jobs.json            # Canonical batch contract
```

### UI component composition (guardrails)

- **Max component body**: A component file SHOULD NOT exceed ~150 lines of code (including hooks, handlers and JSX). If it does, it is a signal that responsibilities need extraction — either into custom hooks, presentational components, or both.
- **Container-Presentational separation**: Shell/page-level components (containers) should orchestrate state and compose child components. They should NOT contain significant JSX markup beyond layout wrappers. Visual sections with their own heading, card, or panel identity should be presentational components receiving props.
- **Custom hook extraction**: When a component accumulates 3+ related `useState` or `useEffect` calls that serve a single domain concern (e.g. workspace CRUD, preview loading, item selection), extract them into a custom hook. Place it in a `hooks/` directory co-located with the component unless it is reusable across multiple components.
- **Hook co-location vs promotion**:
  - Default: `src/components/studio/hooks/` (co-located, private to the feature).
  - Promote to `src/lib/studio/` when a hook is imported by 2+ unrelated components.
  - NEVER duplicate a hook to avoid importing from a sibling directory.
- **Generic utilities belong in `src/lib`**: Functions like API clients, fetch wrappers, formatters or validators that have zero coupling to React or to a specific component MUST live in `src/lib/`, not inside components.
- **DRY across handlers**: If two or more async functions share a significant logic pattern (e.g. "ensure at least one workspace"), extract the shared pattern into a named helper function within the hook or module — do not copy-paste the sequence.

### Conventions

- Prefer the `@/*` alias for imports from `src/*`.
- Keep responsibilities separated: UI without pipeline logic, API without duplicated rules, core without UI dependencies.
- **Component composition flow**: Shell (container) → custom hooks (state/logic) → presentational components (UI) → shared components (design system). State and side effects live in hooks; JSX layout and theming live in components. A shell component should read like a TABLE OF CONTENTS, not like an implementation.
- Reuse existing helpers before creating new variants for cropping, naming or collision handling.
- Document in `README.md` if the operable pipeline behaviour or the `jobs.json` schema changes.

## Shared rules

Rules from:

- `../../.agents/RULES/TS.md`

## Commands (from package.json)

- Dev Studio: `pnpm run dev`
- CLI process: `pnpm run cli:process -- --jobs ./jobs.json`
- Build jobs manifest: `pnpm run cli:build-jobs`
- Lint: `pnpm run lint`
- Test: `pnpm run test`
- Typecheck: `pnpm run typecheck`

## Read if needed

- `./README.md`
- `./jobs.json`
- `./package.json`
- `./tsconfig.json`
- `./postcss.config.mjs`
- `./src/core/jobs.ts`
- `./src/core/render.ts`
- `./src/lib/server/workspace-store.ts`
- `./src/lib/server/preview-service.ts`
- `./src/lib/studio/types.ts`
