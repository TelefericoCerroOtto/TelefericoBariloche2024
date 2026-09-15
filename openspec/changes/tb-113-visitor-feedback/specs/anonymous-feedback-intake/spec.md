# Anonymous Feedback Intake Specification

## Purpose

Define anonymous QR feedback acceptance, recovery, idempotency, and defenses.

## Requirements

### Requirement: Versioned public HTTP contract

Browsers MUST use Next.js mediation. `GET /api/feedback/surveys/{publicCode}` MUST return `{contractVersion,point:{pointKey,displayName},survey:{versionKey,translations:{es,en,pt},aspects},sessionToken,expiresAt}` only for an active point/version. The opaque signed token MUST expire within two hours and bind point, code, version, issue/expiry times, and session nonce. `POST /api/feedback/submissions` MUST accept `{contractVersion,sessionToken,idempotencyKey,locale,overallRating,aspects,otherAspect?,comment?}` and return `{submissionReceipt,acceptedAt,guardUntil}`. Failures MUST use `{error:{code,fields?}}`: 400 `VALIDATION_FAILED`, 401 `INVALID_SESSION`, 409 `IDEMPOTENCY_CONFLICT|GUARD_ACTIVE`, or 410 `SURVEY_UNAVAILABLE|SESSION_EXPIRED`. Credentials and server context MUST never reach the browser. (Primary: D33)

#### Scenario: Resolve and submit valid feedback
- GIVEN an active `publicCode`
- WHEN valid feedback and a fresh idempotency key are posted with its signed token
- THEN one accepted submission and one stable receipt MUST be returned.

#### Scenario: Reject untrusted context
- GIVEN an invalid signature, mismatched point/version, expired token, or inactive point
- WHEN submission is attempted
- THEN the API MUST return a safe error and persist nothing.

### Requirement: Exact answer validation and immutable acceptance

`overallRating` MUST be an integer 1-5, where 1 is lowest and 5 is highest; no verbal rating labels are normative. A submission MUST contain 1-3 unique aspect ratings from options presented in the signed active survey version's `sortOrder,aspectKey` order. `other` counts toward three and MUST include nonblank `customText` and one explicit negative, neutral, or positive sentiment. Every standard aspect MUST also have exactly one explicit negative, neutral, or positive sentiment. General `comment` MUST remain separate and optional; when present it MUST contain 1-2000 characters. Each aspect MUST snapshot its key, displayed label, order, and submitted rating. The server MUST authoritatively set `acceptedAt`, version, source=`valid_qr`, point, and final locale. Application users MUST NOT mutate accepted submissions. (Primary: D15-D20)

#### Scenario: Accept bounded answers
- GIVEN one to three aspects valid for the signed version
- WHEN the overall rating and optional fields satisfy the contract
- THEN the server MUST persist the authoritative context and snapshots atomically.

#### Scenario: Reject malformed answers
- GIVEN an out-of-range/noninteger rating, zero/four aspects, duplicate/unknown key, or incomplete `other`
- WHEN submitted
- THEN validation MUST identify safe field errors and persist nothing.

### Requirement: Browser draft and success guard

The browser MUST keep a client-only draft keyed by version, point, and pseudonymous browser context for two hours; locale MUST remain mutable. Draft creation and resume MUST occur only inside a valid QR-bound route and MUST NOT create a generic non-QR resume route. Success or expiry MUST remove it. An accepted response MUST establish a 24-hour browser guard across all points. (Primary: D21-D22)

#### Scenario: Resume draft in another locale
- GIVEN an unexpired draft
- WHEN the same version, point, and browser context reopen and locale changes
- THEN answers MUST be restored while translated labels follow the new locale.

#### Scenario: Enforce cross-point guard
- GIVEN this browser succeeded within 24 hours at any point
- WHEN another valid point is submitted
- THEN the API MUST reject acceptance without creating a second submission.

### Requirement: Invariant public form journey

The mobile-first public form MUST expose the same business stages and validation on mobile and desktop, in this order: persistent header/locale/progress; Q1 overall rating; Q2 ordered aspect selection; Q3 sentiment for every selected aspect; Q4 optional comment with a personal-data warning; uncounted anti-abuse verification; success/receipt. Responsive presentation MAY change layout only. Production verification MUST use the server-validated anti-abuse and failure contract, MUST NOT be counted as a question, and MUST NOT be represented as a user-attested mock-security checkbox.

Forward navigation MUST remain blocked while the current stage is invalid, expose a visible and assistive-technology status, and move focus to the first invalid control. Back navigation and ES/EN/PT locale changes MUST preserve entered state. Every visible state, instruction, validation message, loading state, failure, and success message MUST use semantic ES/EN/PT keys; a missing selected-locale value MUST fall back to ES and emit telemetry without changing answers.

The privacy notice MUST appear before submission. Submission itself acknowledges the notice: the UI MUST NOT require a consent checkbox and the system MUST NOT persist a separate consent event or notice version. Success MUST render only from authoritative `submissionReceipt`, `acceptedAt`, and guard state returned by acceptance.

#### Scenario: Keep responsive behavior semantically identical
- GIVEN the same valid QR session and answers on mobile and desktop
- WHEN the visitor advances, returns, changes locale, and submits
- THEN both variants MUST enforce the same stages, validation, preserved state, privacy acknowledgment, verification, and authoritative receipt behavior.

#### Scenario: Focus the first invalid answer
- GIVEN a required answer is missing from the current stage
- WHEN the visitor attempts to continue
- THEN navigation MUST stay on that stage, announce its status, and focus the first invalid control.

### Requirement: Idempotent, shared-network-safe defense

The system MUST durably enforce unique `(sessionNonce,idempotencyKey)` payload digests and bind a pseudonymous browser token, client receipt, and Redis guard state without treating IP as identity or primary deduplication. Reusing the pair with another payload MUST conflict. IP MAY be a short-retention, high-threshold abuse signal safe for shared Wi-Fi. Redis failure MUST fail open only after signature, QR, version, schema, and idempotency validation and MUST emit degradation telemetry. (Primary: D23-D24)

#### Scenario: Replay accepted request
- GIVEN an accepted idempotency key and identical payload
- WHEN replayed
- THEN the original receipt MUST return and no duplicate MUST be created.

#### Scenario: Redis unavailable
- GIVEN an otherwise valid, nonreplayed submission and unavailable Redis
- WHEN authoritative validation passes
- THEN it MUST be accepted and degradation telemetry MUST be emitted.

### Requirement: Original-data retention and model-copy privacy

The UI MUST warn against personal data. Accepted answers and original comments MUST remain unchanged and retained indefinitely. Only model-bound copies MUST redact recognizable email, phone, and URL patterns with typed placeholders. (Primary: D25-D26)

#### Scenario: Preserve and redact independently
- GIVEN a comment containing an email and ordinary prose
- WHEN accepted and later prepared for model use
- THEN storage MUST preserve the original while the model copy replaces only the email pattern.

## Traceability

Primary decisions: D15-D26, D33.
