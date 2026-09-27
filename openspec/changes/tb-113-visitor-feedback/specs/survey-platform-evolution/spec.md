# Survey Platform Evolution Specification

## Purpose

Define compatibility, migration, seed, permission, testing, rollout, rollback, and planning gates across app, CMS, core, worker, and infrastructure.

## Requirements

### Requirement: Additive migration and deterministic prerequisites

Schema rollout MUST create the approved types/components, generated Strapi types, relations, constraints/indexes for all declared uniqueness and active-range concurrency, and deny-by-default capability assignments before feature enablement. Migration MUST safely handle absent settings, active version, and QR points. Synthetic seeds MUST be deterministic, marker-scoped, ES/EN/PT-complete, cover statuses/ranges/overlaps/retries/reports, and clean up only their own records. (Primary: D92)

#### Scenario: Migrate an empty environment
- GIVEN no survey settings or records
- WHEN additive migration runs
- THEN a valid disabled baseline MUST exist without enabling intake or generation.

#### Scenario: Protect nonfixture data
- GIVEN seeded and unrelated records coexist
- WHEN seed cleanup runs
- THEN only exact marker-scoped fixture records MUST be removed.

### Requirement: Versioned compatibility matrix

HTTP, snapshot, AI-output, checkpoint, and `ChartViewModel` contracts MUST carry independent explicit versions where evolution differs. A reviewed matrix MUST identify every app/core/CMS/worker version pair as read/write compatible or rejected, require an overlap window during rollout/rollback, and fail unknown versions before side effects. The workspace expansion MUST remain inside `teleferico-app`; no repository-root workspace package MAY be created. (Primary: D88, D90)

#### Scenario: Deploy compatible overlap
- GIVEN old and new workers coexist during rollout
- WHEN the app emits a snapshot
- THEN the matrix MUST guarantee at least one deployed worker validates that exact contract.

#### Scenario: Reject incompatible contract
- GIVEN an unsupported snapshot or checkpoint version
- WHEN a consumer receives it
- THEN it MUST fail safely before model, render, storage, or terminal mutation.

### Requirement: Acceptance test boundaries

Strict TDD MUST cover pure period/metric/threshold/redaction/token/chunk/validator/view-model logic; Next.js mediation, ordering, capability, CSRF, idempotency, guard, locale/draft, and safe-error behavior; CMS permissions, immutability, uniqueness, overlap, lineage, and atomic transitions; worker OIDC, retries/checkpoints, direct/map-reduce, cost/retention, and PDF golden structure; and synthetic QR-only plus authenticated administration E2E. Contract tests MUST prove no metric recalculation and cross-version compatibility.

These coverage requirements remain acceptance criteria for their corresponding behaviors. The focused tests, required existing PR CI, and integrated synthetic/local acceptance MUST be executed at their applicable work-unit and development-acceptance checkpoints, with only observed results recorded. This requirement does not assert that every suite or live-service check runs before offline code delivery or merge, and it does not reduce or waive any listed coverage.

#### Scenario: Block incomplete acceptance
- GIVEN any required test boundary lacks executable coverage or the renderer POC fails
- WHEN operational rollout readiness is assessed
- THEN operational rollout MUST remain blocked; this gate does not block disabled offline implementation, existing PR CI, or synthetic/local testing.

#### Scenario: Keep live operation disabled when Google gates are incomplete
- GIVEN any required live Google configuration or operational gate is missing or has failed
- WHEN disabled implementation, existing PR CI, or fake-provider synthetic testing proceeds
- THEN offline code development MAY proceed without real remote calls, while real provider operation and generation enablement MUST remain blocked.

### Requirement: Ordered rollout and reversible controls

Disabled code MAY be delivered to `development` under the existing required PR CI, and synthetic/local testing MAY proceed before live operational approvals. This disabled delivery is not operational rollout and does not authorize live provider calls, queue dispatch, storage publication, or feature enablement. Actual rollout MUST proceed only after approvals in this order: additive CMS schema/indexes and capabilities; fixtures/migration validation; core and app compatible readers; compatible worker; queue/OIDC/IAM/storage lifecycle/alerts; read-only dashboard; QR intake; reporting UI; generation. Missing or failed live Google evidence blocks real operation and generation enablement, not offline code development. Intake and generation MUST have independent disable controls. Rollback MUST pause dispatch, retain accepted submissions and immutable reports, keep compatible readers, repoint the active version, restore compatible revisions, and remove only unused TB-113 grants after consumers stop.

#### Scenario: Roll back generation safely
- GIVEN generation causes an operational regression
- WHEN generation is disabled and dispatch paused
- THEN intake MAY remain available and existing submissions/reports MUST remain intact.

### Requirement: Closed decisions and implementation gate

Product and macro architecture MUST remain closed to QR-only access. Exact technical choices not fixed by D01-D93 MUST be resolved in design without contradicting these specs. Implementation MUST NOT begin until proposal, all capability specs, design, and tasks are complete. (Primary: D91, D93)

#### Scenario: Enforce planning gate
- GIVEN proposal and specs exist but design or tasks are incomplete
- WHEN apply is requested
- THEN implementation MUST remain blocked.

## Traceability

Primary decisions: D88, D90-D93. D92 owns migration, seed, permission, testing, and rollout detail required by SDD.

Cross-spec audit: **93 covered, 0 missing, 0 multiply owned, 0 contradicted**. Each capability's Traceability section is the canonical primary-owner index; requirement annotations are local references to that same owner.
