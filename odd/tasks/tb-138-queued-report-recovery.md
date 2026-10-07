# TB-138 queued report cancellation

## Objective and problem

Allow an authorized operator to end a queued report request that the worker has not claimed, without deleting its history or assuming that an absent Cloud Task failed. A staging task received five HTTP 403 responses before the worker invoker grant was corrected; its task is now absent while the dashboard still displays the run as queued. This is an explicit cancellation of an already-created request, not a claim that the worker executed or that Cloud Tasks reported terminal failure.

## Scope and constraints

- Tracking: [TB-138](https://app.notion.com/p/3f2a58c3fefc81a9b56ae0d3f7d0d615), a focused follow-up to TB-113 issue #227 and merged enqueue-compensation PR #340. Formal channel: no separate issue required. The user selected the shortest safe fix after comparing explicit cancellation with automatic Cloud Tasks failure awareness.
- Implement only in worktree `../TelefericoBariloche2024-tb-138-queued-report-recovery`, branch `fix/app-cms-tb-138-queued-report-recovery`, based on `origin/development` at `576d50a0d62308f144e667566d0038c82549d141`. Do not touch the dirty original checkout.
- Preserve report history, immutable inputs, existing worker-claim and admin authorization boundaries, and the existing linked retry semantics. No blind task recreation, mass cleanup, direct database edit, new secret, IAM change, or deployment. Current staging data is outside code-edit authority.
- Cancel only `queued` and unclaimed requests with an explicit authenticated command and a row-locked state-version compare-and-swap; a worker claim that wins the race prevents cancellation, and a later claim after cancellation must not start work. A queued request has begun its lifecycle even though worker execution has not started. Do not cancel `running`, completed, or failed reports in this slice. Do not delete the Cloud Task or claim to prevent further harmless HTTP delivery attempts.
- Use a distinct fixed cancellation failure code/message, not `QUEUE_ENQUEUE_EXHAUSTED`; keep the history readable and the failed-row linked retry path deliberate. Automatic detection of delivery failure and cooperative cancellation after worker claim are independent pending outcomes, not part of this fix. Cloud Tasks deletes tasks on success as well as exhaustion, so absence alone is not terminal-failure evidence.
- Direct implementation route per TB-113 README. Route-specific focused RED/GREEN tests are required; no repository-wide strict TDD setting is established. Runners: `node --test teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js` from repo root and `COREPACK_ENABLE_NETWORK=0 corepack pnpm exec vitest run src/lib/feedback/dispatch.test.ts src/lib/feedback/admin-command.test.ts` from `teleferico-app`, adjusted only to actual changed test files. The 400-line ODD heuristic is advisory.
- Delivery strategy: `ask-on-risk`; no commit, push, PR, GCP mutation, or staging record mutation is authorized by this request.

## Acceptance criteria

- An authorized operator may explicitly cancel only the selected queued, unclaimed generation through its persisted identity and expected version; the snapshot and history remain intact with a distinct fixed cancellation reason.
- A worker claim that wins the race, a stale version, wrong run, or any running/terminal state prevents the cancellation; a replay of the exact completed command is safe and does not mutate another run. The existing authentication, origin, CSRF, and capability checks stay authoritative; a new CMS action must have a narrow explicit grant.
- A cancelled failed run no longer blocks exact-range creation; the existing retry flow remains a deliberate new linked generation rather than silently restarting the old task. UI exposes the action only on queued rows and refreshes the history after success or conflict.
- Focused CMS lifecycle/route, app route/command and dashboard/history tests prove the rules; documentation describes permission and deployment prerequisites and safe recovery for the existing staging run without implying local code is deployed.

## Tasks

- [ ] **T1 — Add queued-only cancellation at the CMS state boundary.** Route: sole direct writer in the authorized worktree. Establish the narrow CAS transition and replay/conflict tests; no public grant, schema change, or task deletion.
- [ ] **T2 — Expose authenticated cancellation in the app and queued-only dashboard action.** Route: the same direct writer (app route/command, safe history projection, tests and documentation); keep exact-run confirmation, guard chain, safe cancellation reason, and history refresh. Do not add automatic Cloud Tasks status inference or running cancellation.
- [ ] **T3 — Verify and document staging recovery.** Route: direct writer; review the final diff and observed test output, document operator checks, CMS action grant and deployment prerequisite. Do not mutate the staging CMS record or run a new Cloud Task.

## Progress and next step

- Intake, unique tracking, the separate worktree, and direct-route selection are complete. The sole writer added the CMS cancellation transition/route, guarded app command/route, queued-only confirmed dashboard action, focused tests, and permissions/operator documentation. No source was changed in the dirty original checkout.
- T1–T3 remain unchecked until their required verification is complete. CMS lifecycle observed RED (`cancelQueued is not a function`) before implementation and now passes 28/28; CMS permissions pass 9/9. Four focused app Vitest files pass 102/102 after a test fixture correction that preserved the production guard. Parent spot-check reran CMS lifecycle (28/28). `git diff --check` passes.
- CMS HTTP integration failed in both worktrees when its Docker subprocess exited 1; it did not prove the new route end to end. App typecheck passes in the original checkout but fails in this fresh worktree on unresolved packages, public assets, and generated `RouteContext`; candidate type safety remains unproven. Frozen offline installs with scripts disabled changed no tracked manifests/lockfiles. Local Node is v24.21.0; the packages require 22.x.
- Read-only GCP evidence on 2026-10-07: the queue was `RUNNING` with zero tasks; the former task was absent after five HTTP 403 responses; the worker invoker binding was verified. No post-grant worker POST was observed. Worker execution remains unproven.
- The staging row remains untouched. Before using cancellation there, deploy both packages via the approved PR path, grant and verify Users & Permissions `operatorCancel` for the intended app role, and recheck the run state/version. Do not delete the row. Automatic failure awareness is separately pending as TB-139; cancellation after worker claim is outside this fix.
- Engram mirror saved under topic `odd/tb-138-queued-report-recovery/tasks` after the earlier `session_already_ended` (HTTP 409) failure. This local file remains authoritative. No work-unit commit, push, PR, GCP change, or staging-record mutation is authorized.
- Rollback boundary: remove only the queued-cancellation CMS lifecycle/controller/route, app command/route/dashboard action, and matching tests/docs. Preserve existing dispatch, worker processing, and persisted report records.
