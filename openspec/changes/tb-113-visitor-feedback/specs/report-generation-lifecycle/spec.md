# Report Generation Lifecycle Specification

## Purpose

Define report periods, concurrency, overlap approval, asynchronous states, retries, checkpoints, and atomic publication.

U8-B does not implement this lifecycle. It exposes only the narrow validated
generate/retry command boundary. Native Strapi Role/API Token authorization is
the actor boundary for this slice, which stores `requestedBy: null` and does
not synthesize application-user attribution;
transactional overlap/race handling, retry lineage/state transitions, worker
cutoffs, and atomic publication are deferred to U9.

## Requirements

### Requirement: Separate generation and report records

`survey-report-generation` MUST be the mutable process record with unique immutable `reportRunId`, inclusive `periodStart`/`periodEnd`, `dataCutoffAt`, `status: queued|running|succeeded|failed`, nullable `requestedBy`, nullable `retryOfGeneration`, snapshot identity, stage checkpoints, attempts, safe failure, and cost metadata. It MUST relate to at most one `survey-report`. A report MUST be created only on success with unique report identity, source generation, immutable period/cutoff/snapshot/validated-output/artifact metadata, `generatedBy`, and creation time. (Primary: D40, D71)

#### Scenario: Observe asynchronous history
- GIVEN a queued generation whose requester leaves the page
- WHEN it later succeeds
- THEN history MUST show its state progression and one immutable report independently of page lifetime.

#### Scenario: Reject premature report
- GIVEN a queued, running, or failed generation
- WHEN report creation is attempted
- THEN no report or downloadable artifact MUST be published.

### Requirement: Atomic normalized-range concurrency

The CMS MUST atomically enforce one globally active (`queued` or `running`) generation per normalized exact range. Concurrent requests MUST yield one accepted generation and deterministic conflict responses naming the existing `reportRunId`. (Primary: D44)

#### Scenario: Race identical ranges
- GIVEN two simultaneous requests for the same normalized range
- WHEN committed
- THEN exactly one MUST become active and the other MUST conflict without partial state.

### Requirement: Complete overlap disclosure and override

Before creating a generation, the system MUST compare against all active and completed generations/reports, list every inclusive conflict and exact intersection, and recommend adjustment. Any overlap MUST require explicit override. Regenerating a completed exact range with override MUST create a separate generation and, on success, a separate immutable report. (Primary: D45, D47)

#### Scenario: List multiple overlaps
- GIVEN a requested range intersects three histories
- WHEN preflight runs
- THEN all three records and exact overlapping intervals MUST be returned and creation MUST pause.

#### Scenario: Override completed exact range
- GIVEN a completed exact-range report and explicit informed override
- WHEN regeneration succeeds
- THEN both reports MUST remain independently visible and immutable.

### Requirement: Retry lineage and resumable stages

Manual retry MUST apply only to a failed generation and create a new queued generation linked by `retryOfGeneration`; it MUST never reset or mutate the failed record. Valid persisted checkpoints MAY be reused only when their contract version, inputs, and digest remain valid. (Primary: D46)

#### Scenario: Retry failed run
- GIVEN a failed generation
- WHEN an authorized retry is requested
- THEN a new `reportRunId` MUST be queued with lineage to the failed run.

#### Scenario: Reject retry of success
- GIVEN a succeeded generation
- WHEN retry is requested
- THEN the command MUST reject it and direct exact-range regeneration through overlap override.

### Requirement: Atomic terminal completion

Generation MUST remain asynchronously observable as `queued`, `running`, `succeeded`, or `failed`. Failure of any required direct, map, reduce, validation, render, storage, or completion stage MUST terminally fail the whole run; no partial PDF/report MAY exist. Success MUST atomically persist terminal state, report relation, and artifact metadata. (Primary: D48, D69)

#### Scenario: Required chunk fails
- GIVEN one required map chunk exhausts allowed retries
- WHEN completion is evaluated
- THEN the run MUST fail and create neither report nor PDF.

#### Scenario: Complete atomically
- GIVEN every required checkpoint and artifact is valid
- WHEN completion commits
- THEN generation and report MUST become visible together without an intermediate success-only state.

## Traceability

Primary decisions: D40, D44-D48, D69, D71.
