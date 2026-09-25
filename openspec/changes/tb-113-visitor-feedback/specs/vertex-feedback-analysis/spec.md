# Vertex Feedback Analysis Specification

## Purpose

Define deterministic model routing, redaction, structured evidence, validation, retry, and narrative contracts.

## Requirements

### Requirement: Exact model request and routing

Every environment MUST configure `vertexProjectId` as `teleferico-bariloche-2024`, `vertexLocation` MUST be `us`, and the client MUST use the official `aiplatform.us.rep.googleapis.com` multi-region endpoint. Production MUST use only Vertex AI / Agent Platform `gemini-3.8-flash` for sanitized visitor comments with temperature `0`, reasoning `LOW`, and grounding disabled. The model/deployment project and location MUST match; missing or mismatched values MUST fail as configuration errors before client initialization, CountTokens, or generation, without runtime, ADC, CLI, local OpenCode, project, location, hostname, or alternate-model fallback. `southamerica-east1` is a proven unavailable model location and MUST NOT be retried. Repository-versioned prompts, schemas, redaction, token/chunk/model/validator/narrative rules and deployed source revision MUST be recorded. Character count MAY prefilter; exact CountTokens MUST budget instructions, schemas, official metrics, complete sanitized comments, output reservation, and headroom. A fitting request MUST route direct; otherwise complete records MUST be deterministically balanced into map/reduce chunks without sampling. (Primary: D52-D53, D56-D58)

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
- GIVEN a claim cites opaque references that have valid syntax and resolve to distinct eligible snapshot comments
- WHEN output is validated and published
- THEN reference membership MUST be verifiable internally while references and verbatim comments are absent publicly; membership MUST NOT be represented as proof that the claim's meaning is semantically supported.

### Requirement: Structurally validated Spanish narrative

Output MUST be structured Spanish, descriptive only, and limited to: executive summary, observed changes, strengths, unfavorable areas, recurrent themes, minority signals, and coverage/limitations. It MUST contain no recommendations, actions, causal claims, verbatim comments, exposed evidence references, prohibited content, or invented official metric values. Official metrics MUST come only from the immutable deterministic core snapshot; the model MUST NOT calculate or alter them. Validate the closed schema and version, required section order, status/claim shape, reference syntax and membership, applicable deterministic evidence thresholds, privacy, prohibited content, and output bounds. Do NOT automatically judge whether the narrative is semantically truthful to comments, grounded in their meaning, or free of contradictory interpretation. This fallibility is an accepted residual product limitation. Human editorial review MAY occur but MUST NOT be a per-report acceptance gate. (Primary: D62-D63, D68)

#### Scenario: Accept structurally valid nonempty analysis
- GIVEN nonempty structured Spanish output that satisfies the schema, order, reference/membership, deterministic threshold, privacy, prohibited-content, and output-bound checks
- WHEN no independent routing, checkpoint, authentication, or runtime gate remains unresolved
- THEN the output MAY proceed to rendering without automated semantic-truth judgment or required human editorial review, and the system MUST NOT claim that those checks prove narrative truth.

#### Scenario: Reject prohibited or unsafe narrative
- GIVEN output recommends an action, claims causation, reproduces a comment, exposes an evidence reference, violates the closed structure, or introduces an official metric value not sourced from the deterministic core
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
