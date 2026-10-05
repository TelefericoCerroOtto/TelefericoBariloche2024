# TB-113 worker trigger approval snapshot

## Objective

Record the operator's proposed staging worker-trigger setting without changing the live trigger or corrupting the separate Cloud Build recipe.

## Problem and why

The inline worker trigger currently requires manual approval. The maintainer wants future eligible staging builds to run without that gate and will update the live trigger manually. `docs/infra/cloud-build/worker-staging.yaml` is a Build resource and cannot carry `BuildTrigger.approvalConfig`.

## Scope and constraints

- Add a non-importable, documentary trigger-metadata snapshot beside the existing worker build snapshot, with `approvalRequired: false`, and document current versus proposed state.
- Preserve the worker build steps, repository binding, branch/path filters, private deployment boundaries, and existing secret references. Do not turn off other safeguards or claim that a docs-only PR will trigger a worker build.
- No GCP mutation, direct deployment, build approval/cancellation, secret or IAM-sensitive read, merge, or production change. The operator owns the live trigger update.
- Existing TB-113 work item and direct implementation route apply; no SDD phase. This work stays on `docs/root-tb-113-worker-trigger-approval`, based on the observed current `origin/development` at `cb3b2dbcd0baf99e1bdbc623f1806295da26551c`.
- Delivery strategy: ask-on-risk. Forecast: fewer than 400 authored changed lines. Commit, push, and PR remain pending their publication-specific authorization.

## Tasks

- [x] **TA-1 — Proposed trigger metadata.** Added `docs/infra/cloud-build/worker-staging-trigger.yaml` as a partial, non-importable documentary proposal for trigger `7ee6da31-f842-407d-a635-afba62e90c6b` with `approvalRequired: false`. The separate Build recipe is unchanged. Route: delegated direct writer. Parent `python3` schema/closed-key assertion passed; no durable test for the metadata projection was added.
- [x] **TA-2 — Operational documentation and verification.** Updated the Cloud Build index, `docs/INFRA.md`, and the survey-reporting verification gates to distinguish observed live `approvalRequired: true` from proposed `false`, manual operator ownership, automatic build/deploy risk for future eligible merges, and non-retroactivity. Route: same delegated direct writer. Writer and parent ran the focused worker image-contract test (4/4) and `git diff --check` successfully; independent read-only validator found no snapshot/doc contradiction after the parent added explicit schema proof and updated this progress.

## Acceptance and evidence

- The trigger metadata proposal is separate from `worker-staging.yaml` and references only nonsecret known metadata.
- Docs do not claim the live trigger was changed or the worker was deployed; existing build statuses remain historical observations.
- Checks: parse the proposed YAML, run the focused worker image-contract test if applicable, and run `git diff --check`. TDD mode: not applicable to a documentary metadata change; checks are still required.

## Progress and next step

Branch created from the observed development commit. Both documentary tasks are complete and verified locally; `python` is not installed in the parent shell, so the schema assertion was rerun successfully with `python3`. Live GCP still requires approval until the operator manually changes the trigger; the prior approved old-SHA build failed and the worker was absent at the last read. This docs-only candidate does not trigger a worker build or prove readiness. No GCP mutation, commit, push, or PR has occurred. Next: publication preflight only after authorization under the current `implementation-pr` contract.
