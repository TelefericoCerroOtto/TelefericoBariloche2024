# public-form-protection Specification

## Purpose

Define REQUIRED two-layer protection for public contact and postulation forms across app and CMS boundaries, with explicit environment separation, failure semantics, and verifiable observability.

## Package Boundary: teleferico-app Requirements

### Requirement: Core Guard Continuity Before Protection Layers

The system MUST keep existing form guards (captcha, honeypot, form age, trusted origin, body size, internal API key, and schema validation) enforced before and alongside the new protection layers. Feature flags MAY disable only a protection layer and MUST NOT weaken core guards.

#### Scenario: Protection flag rollback keeps base security

- GIVEN one protection layer is disabled by configuration
- WHEN a request violates any core guard
- THEN the request is rejected
- AND the rejection reason is logged without PII

### Requirement: Mandatory Two-Layer Protection Model

The system MUST evaluate two layers for each accepted request: (1) shared volumetric IP limiting via Redis/Memorystore-style backend and (2) Strapi-backed email business-rule validation. The system MUST NOT use app-local in-memory limiting as the source of truth for staging or production.

#### Scenario: Request passes layer sequence

- GIVEN a request passes core guards
- WHEN IP and email business-rule layers are evaluated
- THEN both layers are applied in order
- AND the final decision uses both layer outcomes

### Requirement: Form-Specific Threshold Enforcement

The system MUST enforce these thresholds: postulation IP `5/15min`, postulation email `2/30d`, postulation same email + same `sectorDocumentId` (the selected sector identifier used by the current app flow) = hard duplicate block; contact IP `10/1h`; contact email `5/24h`.

#### Scenario: Hard duplicate postulation

- GIVEN an existing postulation with the same email and the same `sectorDocumentId`
- WHEN a new postulation is submitted
- THEN the request is blocked as a hard duplicate
- AND the response uses UI-safe copy

### Requirement: Missing Client IP Handling

If client IP is missing or unverifiable, the system MUST skip only IP limiting, MUST continue with email business-rule validation, and MUST log `missing_client_ip` as a structured event.

#### Scenario: Missing IP still enforces business rules

- GIVEN no trusted client IP can be resolved
- WHEN a request is processed
- THEN IP limiting is skipped
- AND email business rules still decide allow/block

### Requirement: Shared Limiter Backend Failure Semantics

If the shared limiter backend is unavailable or errors, the IP layer MUST fail open, the system MUST emit a critical structured log, and the system MUST trigger an alert hook.

#### Scenario: Redis/Memorystore outage

- GIVEN shared limiter connectivity fails
- WHEN a request reaches the IP layer
- THEN processing continues to business-rule validation
- AND a critical degraded event is emitted for alerting

## Package Boundary: teleferico-cms Requirements

### Requirement: Single Strapi Collection Business Contract

Email business-rule decisions MUST be served by exactly ONE Strapi collection dedicated to public-form protection records/rules. The app MUST use that single collection as the business-layer contract for contact and postulation checks.

#### Scenario: Single-collection lookup and decision

- GIVEN a form request reaches business-rule validation
- WHEN the app queries Strapi for email and `sectorDocumentId` rule state
- THEN one collection contract is used for decisioning
- AND the decision is returned to the app layer

### Requirement: Strapi Business-Layer Failure Semantics

If Strapi business-layer read/write fails, times out, or returns invalid contract data, the system MUST fail closed, MUST return a UI-safe error, MUST emit a critical structured log, and MUST trigger an alert hook.

#### Scenario: Strapi business-layer outage

- GIVEN Strapi business validation cannot complete
- WHEN a request requires email-rule evaluation
- THEN the request is blocked with safe user-facing messaging
- AND no silent bypass path is used

## Cross-Cutting Requirements

### Requirement: Fingerprinting Is Signal-Only in v1

The system MAY compute request fingerprint signals for abuse analysis, but fingerprinting MUST NOT be a standalone blocking reason in v1.

#### Scenario: Fingerprint anomaly without rule breach

- GIVEN fingerprint risk signal is high
- WHEN IP and email thresholds are not breached
- THEN the request is not blocked solely by fingerprint
- AND the signal is stored for observability

### Requirement: Environment Separation and Operational Path

Local development MUST use a local Redis container/emulator and MUST NOT depend on remote managed Redis. Staging/production Redis/Memorystore infrastructure changes MUST be executed through the Docker MCP path using the running `google-cloud-sdk` container with approved commands, and MUST remain separate from app-local configuration changes.

#### Scenario: Local development setup

- GIVEN a developer starts the form-protection stack locally
- WHEN Redis-backed IP limiting is enabled
- THEN the limiter uses local container/emulator Redis
- AND no remote managed Redis endpoint is required

### Requirement: Observability, Debugging, and Test Stack Contract

The system MUST emit structured allow/block/error/degraded events with reason codes and non-PII identifiers, and MUST provide debugging fields sufficient to reconstruct layer decisions. The verification strategy MUST use Vitest + Testing Library + jest-dom + jsdom + MSW for app-layer behavior and failure-mode coverage.

#### Scenario: Verification evidence for protection behavior

- GIVEN the change is ready for verification
- WHEN automated tests are executed
- THEN evidence covers thresholds, missing IP, fail-open, fail-closed, and duplicate blocking
- AND failures are diagnosable from structured logs/events
