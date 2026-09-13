# Authoritative Survey Metrics Specification

## Purpose

Define deterministic periods, populations, metrics, evidence thresholds, and immutable snapshot handoff.

## Requirements

### Requirement: Eligible population and period normalization

All dashboard and report metrics MUST include only accepted `valid_qr` submissions whose authoritative `acceptedAt` falls within an inclusive range interpreted in `America/Argentina/Buenos_Aires` and at or before `dataCutoffAt`. The previous range MUST immediately precede the current range and contain the same inclusive day count. (Primary: D03, D41-D43)

Day, week, and month trends MUST use local calendar boundaries in that time zone: a local date; Monday through Sunday; and calendar month. First and last buckets MUST be clipped to the analyzed range. Implementations MUST NOT use range-relative 7-day or 30-day chunks.

#### Scenario: Derive previous range
- GIVEN current dates 2026-08-11 through 2026-08-20
- WHEN normalized in Buenos Aires
- THEN previous dates MUST be 2026-08-01 through 2026-08-10, inclusively.

#### Scenario: Enforce cutoff and boundaries
- GIVEN submissions at both local-day boundaries and one after cutoff
- WHEN the population is built
- THEN boundary records MUST qualify and the post-cutoff record MUST not.

### Requirement: Deterministic metric authority

The shared core MUST be the sole authority for population counts, average rating, 1-5 distribution/counts, satisfied (4-5), neutral (3), unfavorable (1-2), current-versus-previous deltas, temporal series, aspect comparison, and QR-point comparison. Response comparison MUST expose both `currentCount - previousCount` and relative percent change; relative percent MUST be `null` when previous count is zero. Summary displays the percent while retaining the absolute delta for audit. Absolute rates MUST be integer basis points in `0..10000`, and non-null absolute averages MUST remain bounded milli-stars. Deltas and relative response changes MUST be signed safe integers, MAY be negative or exceed `10000`, and MUST NOT be clamped to absolute-value domains. Zero denominators MUST produce explicit unavailable values, never fabricated percentages. Models and workers MUST NOT calculate or alter official statistics. (Primary: D49)

### Requirement: Closed exact arithmetic domain

Raw count and aggregation operands MUST be read losslessly from persistence as nonnegative integer decimal or BigInt values and converted directly to BigInt without first passing through JavaScript `Number`. Every count, sum, product, difference, doubled median numerator, scaling multiplication by 2/1000/10000, and half-up division MUST use BigInt intermediates. Signed half-up MUST operate on the absolute numerator, round half up against a positive denominator, and then restore the original sign.

Canonical `tb-json.v1` MUST remain integer-only and MUST contain no BigInt values. Before converting each final BigInt to a JSON number, the core MUST verify the field's semantic range and JavaScript safe-integer bounds. Absolute rates remain `0..10000` basis points and non-null absolute averages remain within their milli-star range. Signed deltas and relative response changes MAY be negative or exceed `10000`, but each final value MUST fit a safe integer. Contractually nullable zero denominators, including zero previous response count, MUST return `null` without overflow.

Malformed or forbidden-negative input, a nonpositive non-nullable denominator, any non-BigInt arithmetic intermediate, or an unrepresentable final field MUST abort the whole snapshot before persistence with typed `metric_overflow`, unless an already-normative more specific invalid-input code applies. The system MUST NOT clamp, wrap, approximate, emit ad hoc numeric strings, partially persist, or continue AI/report work. No artificial population cap or new dependency is permitted.

#### Scenario: Preserve exactness beyond Number multiplication safety
- GIVEN near-safe-integer eligible and selected counts of `9007199254740990` whose basis-point scaling product exceeds JavaScript Number safety
- WHEN the rate is calculated with BigInt intermediates
- THEN the exact in-range final rate MUST serialize as JSON number `10000` without approximation.

#### Scenario: Reject an unrepresentable final value
- GIVEN safe raw counts whose exact relative-change result exceeds JavaScript safe-integer bounds
- WHEN the snapshot is calculated
- THEN the system MUST return `metric_overflow`, persist no snapshot, and start no report or AI work.

#### Scenario: Round a signed negative relative change
- GIVEN current response count `1` and previous response count `3`
- WHEN relative basis-point change is calculated with sign-aware half-up
- THEN the exact signed result MUST be `-6667`.

#### Scenario: Preserve nullable zero-previous behavior
- GIVEN any current response count and previous response count `0`
- WHEN relative response change is calculated
- THEN the result MUST be `null` without `metric_overflow`.

Survey-definition options MUST order `sortOrder,aspectKey`. Analytics aspect lists MUST order selection count descending, then `sortOrder,aspectKey`. Aspect selection rate is eligible submissions selecting the aspect divided by eligible submissions in scope. Aspect evidence threshold is `max(10,ceil(5% * eligibleSubmissionCount))`, evaluated for the global or point-scoped population; `other` is excluded.

Strength requires strict unique positive dominance and opportunity requires strict unique negative dominance. Ties and neutral dominance are excluded. Each class orders dominant count descending, selection count descending, then stable key ascending, and is capped at three.

Related overall rating by sentiment MUST expose the submission count and half-up average overall rating for eligible submissions whose selected aspect has that sentiment; zero count yields a `null` average. Per-aspect day/week/month buckets MUST expose selection count and positive/neutral/negative counts and rates, with each rate divided by that bucket's aspect selection count; an empty bucket has zero counts and `null` rates.

The priority matrix MUST use X=selection count and Y=negative sentiment rate. `other` and aspects below the evidence threshold MUST be excluded from reference medians and quadrant classification and MUST expose the intended excluded or insufficient-evidence state. Median reference fields MUST be doubled integer numerators computed with BigInt intermediates: for an odd population the value is `2 * middle`; for an even population it is `lowerMiddle + upperMiddle`. High relevance is exactly `2 * X >= medianSelectionCountTimesTwo`; high negativity is exactly `2 * Y > medianNegativeRateBpsTimesTwo`, using BigInt operands. Therefore X equality is high relevance and Y equality is low negativity. Quadrants MUST map high+low to `strength`, high+high to `priority`, low+high to `specific`, and low+low to `secondary`. No classification or reference line is available when no qualifying aspect exists; one qualifying aspect uses twice its own X and Y. Each final doubled value MUST pass semantic and safe-integer checks before JSON-number serialization or display projection. Display MAY divide each doubled numerator by two, but the snapshot and validator MUST retain and compare the integer numerator.

Five-star association MUST compare, for every eligible non-`other` aspect, its positive-selection rate among five-star eligible submissions with the same rate among eligible 1-4-star submissions. Each denominator is every eligible submission in that cohort; each numerator selects that aspect positively. Difference is five-star rate minus 1-4-star rate in percentage points; order by difference descending then stable key. If either cohort is empty, both comparison difference and unavailable cohort rate MUST be `null`.

`other` analytics MUST preserve original custom text, explicit sentiment, overall rating, date, and QR context; MUST NOT recategorize text; and MUST exclude `other` from rankings, matrix calculations/classification, and five-star association. Counts remain integers, ratings display to one decimal, and percentages display to one decimal; basis-point and milli-star half-up values remain unchanged underneath formatting.

#### Scenario: Reconcile consumers
- GIVEN one normalized population
- WHEN dashboard and report snapshots are produced
- THEN every official KPI and chart datum MUST be semantically identical.

#### Scenario: Empty population
- GIVEN no eligible responses
- WHEN metrics are calculated
- THEN counts MUST be zero and ratios/deltas MUST be explicitly unavailable.

#### Scenario: Classify matrix boundaries
- GIVEN qualifying non-`other` aspects with an aspect exactly at both medians
- WHEN quadrant membership is calculated
- THEN it MUST be high-relevance and low-negativity because X equality is high and Y equality is low.

#### Scenario: Preserve custom aspect evidence
- GIVEN an eligible `other` selection
- WHEN analytics are projected
- THEN its original text and context MUST remain visible while all ranking, matrix, and five-star association calculations exclude it.

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
