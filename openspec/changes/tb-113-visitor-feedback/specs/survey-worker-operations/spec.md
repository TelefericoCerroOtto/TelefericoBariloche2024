# Survey Worker Operations Specification

## Purpose

Define authenticated task execution, isolated worker responsibilities, observability, cost controls, retention, and private storage.

## Requirements

### Requirement: Private idempotent task execution

Cloud Tasks MUST invoke a private Cloud Run worker using valid OIDC audience and an authorized dedicated invoker identity. The request MUST identify only the versioned command and `reportRunId`; the worker MUST authenticate before loading generation state. Repeated delivery MUST resume valid checkpoints and MUST NOT duplicate stages, reports, or artifacts. (Primary: D35, D70)

#### Scenario: Resume duplicate delivery
- GIVEN a valid task for a run with completed checkpoints
- WHEN Cloud Tasks redelivers it
- THEN the worker MUST skip valid stages and continue from the first incomplete stage.

#### Scenario: Reject unauthenticated invocation
- GIVEN missing/invalid OIDC identity or audience
- WHEN the endpoint is invoked
- THEN it MUST reject before reading generation data or invoking Vertex/storage.

### Requirement: Isolated worker authority

The private worker MUST own model invocation/validation, deterministic rendering, diagnostic packaging, and artifact storage. It MUST validate snapshot contracts and MUST NOT calculate metrics. Its separate build/image MUST contain Chromium and ECharts while the public app image MUST contain neither. (Primary: D86, D89)

#### Scenario: Enforce image boundary
- GIVEN public-app and worker dependency manifests/images
- WHEN inspected
- THEN AI/render dependencies MUST be reachable only from the worker.

### Requirement: Safe observable execution

Structured logs MUST include `reportRunId`, stage, status, attempt, model, input/output tokens, chunks, duration, and bounded safe error; they MUST exclude prompts, comments, credentials, raw model output, and signed URLs. Only terminal failure MUST alert. UI failures MUST expose safe text and `reportRunId`, never internals. (Primary: D72-D74)

#### Scenario: Exhaust retries
- GIVEN a stage reaches terminal failure
- WHEN state commits
- THEN exactly one terminal alert MUST be emitted and the UI MUST show only safe failure plus `reportRunId`.

#### Scenario: Retry transient error
- GIVEN a nonterminal retry
- WHEN telemetry is emitted
- THEN no failure alert MUST fire and sensitive payloads MUST remain absent.

### Requirement: Usage-based cost and labels

Each generation MUST accumulate model cost from returned `usageMetadata` using an immutable versioned pricing snapshot. Resources and telemetry MUST carry survey-report feature and worker-service labels distinct from OpenCode and other Agent Platform usage. Crossing cumulative USD 10 MUST emit exactly one nonblocking alert; it MUST NOT impose a hard cap or monthly-budget rule. (Primary: D75-D77)

#### Scenario: Cross cost threshold
- GIVEN accumulated cost changes from USD 9.99 to above USD 10
- WHEN usage is persisted
- THEN one alert MUST fire while generation continues and later usage MUST not repeat it.

### Requirement: Private storage and retention

The environment's existing private bucket MUST use `private/feedback-reports/{reportId}/...` for report artifacts and `private/report-diagnostics/{reportRunId}/...` for sanitized failures unless separately approved isolation requirements diverge. Direct public access and signed-URL disclosure MUST be denied. Metadata and validated output MUST be retained indefinitely; sanitized diagnostics MUST expire after 30 days; raw prompts/comments MUST NOT be retained in diagnostics. (Primary: D78-D79)

#### Scenario: Apply lifecycle by prefix
- GIVEN report and diagnostic objects
- WHEN retention is evaluated after 30 days
- THEN report artifacts MUST remain and diagnostic objects MUST expire.

## Traceability

Primary decisions: D35, D70, D72-D79, D86, D89.
