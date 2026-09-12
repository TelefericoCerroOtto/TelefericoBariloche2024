# Vertex Feedback Analysis Specification

## Purpose

Define deterministic model routing, redaction, structured evidence, validation, retry, and narrative contracts.

## Requirements

### Requirement: Exact model request and routing

Every environment MUST configure `vertexProjectId` as `teleferico-bariloche-2024` and an explicit, evidence-approved `vertexLocation`, and MUST use only Vertex AI / Agent Platform `gemini-3.8-flash` with temperature `0`, reasoning `LOW`, and grounding disabled. The model/deployment project and location MUST match; missing or mismatched values MUST fail as configuration errors before client initialization, CountTokens, or generation, without runtime, ADC, CLI, local OpenCode, project, location, or alternate-model fallback. Exact model availability and settings in the configured location remain blocked until probed. Repository-versioned prompts, schemas, redaction, token/chunk/model/validator/narrative rules and deployed source revision MUST be recorded. Character count MAY prefilter; exact CountTokens MUST budget instructions, schemas, official metrics, complete comments, output reservation, and headroom. A fitting request MUST route direct; otherwise complete records MUST be deterministically balanced into map/reduce chunks without sampling. (Primary: D52-D53, D56-D58)

#### Scenario: Route direct
- GIVEN the exact full request including reserved output and headroom fits
- WHEN routing is selected
- THEN one direct request MUST include every eligible complete comment.

#### Scenario: Route map/reduce
- GIVEN the exact full request exceeds budget
- WHEN routing is selected
- THEN every complete record MUST occur in exactly one deterministic map chunk before reduce.

#### Scenario: Reject implicit or mismatched Vertex topology
- GIVEN `vertexProjectId` or `vertexLocation` is absent, differs from deployment configuration, or has not passed its evidence gate
- WHEN the worker prepares the Vertex client
- THEN the run MUST fail with a nonretryable configuration error before any provider request.

### Requirement: Output budgets and stage duties

Map output MUST target 600-1,200 tokens and never exceed 4,000; direct/reduce MUST target 1,800-3,000 and never exceed 8,000. Map MUST extract evidence and themes only. Reduce MUST consume validated maps plus global official metrics; neither stage MAY calculate official metrics. (Primary: D59-D60)

#### Scenario: Reject oversized stage output
- GIVEN a model response exceeds its stage maximum
- WHEN validated
- THEN it MUST be invalid and MUST NOT advance its checkpoint.

### Requirement: Privacy-preserving evidence contract

Original ES/EN/PT comments MUST remain untranslated at input. Model copies MUST redact recognizable emails, phones, and URLs with typed placeholders. Opaque evidence references MAY exist only in worker memory or sanitized checkpoints for validation and MUST be stripped from UI/PDF output. (Primary: D54-D55)

#### Scenario: Validate evidence without disclosure
- GIVEN a theme cites opaque references to distinct redacted comments
- WHEN output is validated and published
- THEN support MUST be verifiable internally while references and verbatim comments are absent publicly.

### Requirement: Fixed validated Spanish narrative

Output MUST be structured Spanish, descriptive only, and limited to: executive summary, observed changes, strengths, unfavorable areas, recurrent themes, minority signals, and coverage/limitations. It MUST contain no recommendations, actions, causal claims, verbatim comments, unsupported assertions, or invented category content. (Primary: D62-D63, D68)

#### Scenario: Accept compliant analysis
- GIVEN evidence-supported structured Spanish output using only allowed sections
- WHEN schema, style, evidence, privacy, and metric validations pass
- THEN the validated output MAY proceed to rendering.

#### Scenario: Reject prohibited narrative
- GIVEN output recommends an action, claims causation, quotes a comment, or adds a section
- WHEN validated
- THEN it MUST be rejected and MUST NOT appear in a report.

### Requirement: Bounded error-aware retries

Errors MUST be classified as transient, invalid-output, authentication, or configuration. Each transient operation MAY retry twice; invalid model output MAY receive one controlled regeneration. Authentication/configuration errors MUST never retry. Any valid persisted stage MUST never repeat. (Primary: D61)

#### Scenario: Recover transient map failure
- GIVEN one map call fails transiently then succeeds within two retries
- WHEN processing resumes
- THEN completed valid stages MUST be reused and only the failed stage retried.

#### Scenario: Stop nonretryable failure
- GIVEN authentication or configuration fails
- WHEN classified
- THEN the run MUST fail immediately without another model call.

## Traceability

Primary decisions: D52-D63, D68.
