# Authoritative Survey Metrics Specification

## Purpose

Define deterministic periods, populations, metrics, evidence thresholds, and immutable snapshot handoff.

## Requirements

### Requirement: Eligible population and period normalization

All dashboard and report metrics MUST include only accepted `valid_qr` submissions whose authoritative `acceptedAt` falls within an inclusive range interpreted in `America/Argentina/Buenos_Aires` and at or before `dataCutoffAt`. The previous range MUST immediately precede the current range and contain the same inclusive day count. (Primary: D03, D41-D43)

#### Scenario: Derive previous range
- GIVEN current dates 2026-08-11 through 2026-08-20
- WHEN normalized in Buenos Aires
- THEN previous dates MUST be 2026-08-01 through 2026-08-10, inclusively.

#### Scenario: Enforce cutoff and boundaries
- GIVEN submissions at both local-day boundaries and one after cutoff
- WHEN the population is built
- THEN boundary records MUST qualify and the post-cutoff record MUST not.

### Requirement: Deterministic metric authority

The shared core MUST be the sole authority for population counts, average rating, 1-5 distribution/counts, satisfied (4-5), neutral (3), unfavorable (1-2), current-versus-previous deltas, daily satisfaction/volume series, aspect comparison, and QR-point comparison. Zero denominators MUST produce explicit unavailable values, never fabricated percentages. Models and workers MUST NOT calculate or alter official statistics. (Primary: D49)

#### Scenario: Reconcile consumers
- GIVEN one normalized population
- WHEN dashboard and report snapshots are produced
- THEN every official KPI and chart datum MUST be semantically identical.

#### Scenario: Empty population
- GIVEN no eligible responses
- WHEN metrics are calculated
- THEN counts MUST be zero and ratios/deltas MUST be explicitly unavailable.

### Requirement: Complete immutable snapshot

The app/core MUST create a canonical immutable snapshot containing `contractVersion`, source revision, digest, normalized current/previous ranges, cutoff, complete population metadata, all processed metrics, and 100% of eligible original-language comments for both periods. The worker MUST validate known version and digest and MUST NOT recompute metrics. (Primary: D50-D51, D87)

#### Scenario: Validate snapshot handoff
- GIVEN a known-version snapshot with matching canonical digest
- WHEN the worker receives it
- THEN it MAY analyze comments while treating all metrics as immutable authority.

#### Scenario: Reject altered or partial snapshot
- GIVEN an unknown version, digest mismatch, sampled comments, or missing population
- WHEN validation runs
- THEN processing MUST fail before model invocation or rendering.

### Requirement: Evidence classification thresholds

Evidence MUST be evaluated independently per period. Recurrent evidence requires `max(10, ceil(2% of eligible comments))` unique comments; minority evidence requires at least four unique comments and MUST remain distinct from recurrent evidence. Unsupported required categories MUST explicitly state insufficient evidence. (Primary: D64-D67)

#### Scenario: Classify recurrent evidence
- GIVEN 1,001 eligible comments in a period
- WHEN 21 unique comments support a theme
- THEN the recurrent threshold MUST be 21 and the theme MAY be recurrent.

#### Scenario: Keep weak evidence explicit
- GIVEN three unique comments support only a minority theme
- WHEN classification runs
- THEN it MUST NOT qualify and the affected category MUST state insufficient evidence.

### Requirement: Pure shared core

`survey-reporting-core` MUST contain pure contracts, period logic, metrics, snapshots, evidence thresholds, and `ChartViewModel`; it MUST have no React, Next.js, Strapi, ECharts, Recharts, browser, or Node dependency. (Primary: D85)

#### Scenario: Verify portability
- GIVEN the core package dependency graph
- WHEN inspected
- THEN none of the prohibited framework/runtime dependencies MUST be reachable.

## Traceability

Primary decisions: D03, D41-D43, D49-D51, D64-D67, D85, D87.
