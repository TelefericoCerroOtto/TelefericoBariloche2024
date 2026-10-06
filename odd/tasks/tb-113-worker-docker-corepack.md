# TB-113 worker Docker Corepack fix

## Objective

Fix the worker image build failure in Cloud Build `9bc6c099-d3b5-4e6b-a405-9c427968e289` with a reviewable source change. The worker Dockerfile must expose pinned pnpm inside its own Node image, without a trigger-side source patch.

## Scope and constraints

- Continue the same work unit on fresh `fix/root-tb-113-worker-docker-corepack-current` from `origin/development` at `7d03a1d8435f88b40e0f4cca21de276df832f514`. The earlier worktree at `e68f11c` retains its uncommitted changes; do not modify or delete it. The root worktree is a separate dashboard branch.
- Tracking: TB-113, GitHub issue #227. User explicitly authorized moving only this correction to the current base and publishing one implementation PR (one commit, one non-force push, no merge/deployment/GCP mutation).
- Preserve the immutable Node image digest, pnpm `10.33.0`, frozen production install with `--ignore-scripts`, package-local trust policy, browser OS dependencies, and existing image/runtime contracts. Limit paths to the worker Dockerfile, focused image-contract test, worker README, and this task document.
- TB-113 direct work expects focused RED/GREEN proof. Exact runner: `node --test services/survey-report-worker/test/image-contract.test.mjs`. No repository-wide strict TDD mode was established. The 400-line task heuristic is advisory.

## Tasks

- [x] **C1 — Diagnose and prove the initial correction.** The failed build's step 0 succeeded; step 1 exited 127 with `/bin/sh: 1: pnpm: not found`. On the previous uncommitted branch, `corepack enable` before pinned prepare/install in the same Dockerfile RUN produced RED then GREEN 6/6 and a pinned-image smoke printed pnpm `10.33.0`. Independent verification passed. That prior evidence is a source for this continuation, not proof of this new branch's bytes.
- [x] **C2 — Transfer only the scoped fix to the new base.** Compared the three intended tracked paths with the prior worktree and transplanted only the Corepack Dockerfile, image-contract test, and README changes. On this branch, the pre-change focused test passed 6/6; after adding the assertion it failed only the expected image-install contract (5/6); after the Dockerfile fix it passed 6/6. The pinned Node image smoke printed pnpm `10.33.0`; `git diff --check` passed. The earlier worktree remained read-only. Full Docker build is deferred because generated `dist/` is absent and remains a later Cloud Build gate.
- [ ] **C3 — Publish the verified new candidate.** On this exact new branch/base, complete single-shot candidate/path/remote preflight, stage only this work unit, create one Conventional Commit and non-force push, then one implementation PR into `development` with `Refs #227`. Observe repository governance; report functional/Cloud Build evidence separately. Do not create a promotion PR or merge.

## Progress and next step

C1 and C2 are established on this new base. C3 remains pending. Mirror this entire document under Engram topic `odd/tb-113-worker-docker-corepack/tasks` after each task outcome.
