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

Map output MUST target 600-1,200 tokens and never exceed 4,000; direct/reduce MUST target 1,800-3,000 and never exceed 8,000. Before checkpointing, the worker MUST bind validated provider `usageMetadata.candidatesTokenCount` and exact CountTokens evidence to the canonical output request for the exact stage, require both counts to agree, and reject missing, malformed, mismatched, or over-limit evidence. CMS MUST independently recount and validate the stage request digest, count, and hard bound against immutable model configuration; caller-supplied counts alone are not authority. Map MUST extract evidence and themes only. Reduce MUST consume validated maps plus global official metrics; neither stage MAY calculate official metrics. (Primary: D59-D60)

#### Scenario: Reject oversized stage output
- GIVEN a model response exceeds its stage maximum
- WHEN validated
- THEN it MUST be invalid and MUST NOT advance its checkpoint.

### Requirement: Redacted model input and structured evidence contract

Original ES/EN/PT comments MUST remain untranslated at input. Model copies MUST redact recognizable emails, phones, and URLs with typed placeholders. This three-pattern substitution does not mask names, addresses, or all private information. Internal model-input `evidenceRef` and Map-level `coveredRefs` MUST retain valid opaque references to eligible snapshot comments; no claim carries a reference list. Incidental references in prose are not an output rejection condition. (Primary: D54-D55; the former output-disclosure restriction is superseded by the approved structural-only policy.)

#### Scenario: Validate chunk identity independently of prose
- GIVEN the input has valid opaque references and Map `coveredRefs` match the independently derived chunk membership
- WHEN output is validated and published
- THEN input-record and Map chunk membership MUST remain verifiable internally without scanning prose or requiring per-claim references; membership MUST NOT be represented as proof that the conclusion's meaning is semantically supported.

### Requirement: Structurally validated Spanish narrative

Output MUST have the closed `survey-analysis.v2` seven-section structure: executive summary, observed changes, strengths, unfavorable areas, recurrent themes, minority signals, and coverage/limitations. Direct, Map theme, and Reduce claims contain only `claimId`, `textEs`, and `signal`; `evidenceRefs` is an unexpected field and MUST be rejected. Map `survey-map.v2` retains top-level ordered `coveredRefs` and Reduce retains ordered `mapOutputDigests`. Official metrics displayed as authoritative MUST come only from the immutable deterministic core snapshot; the model MUST NOT calculate or alter them. Validate closed schema/version, section order, status/claim shape, input-record and Map chunk membership, independently verified digests, and output-token bounds. Official aspect and core evidence thresholds remain separate from per-claim citations. Do not deterministically reject output based on prose wording, numbers, literal comments, incidental references, or private-data patterns. Worker/CMS instructions request concise Spanish conclusions without citations and remain byte-identical for each revision. Prompt `feedback-report-prompt.v3`, validator `feedback-report-validator.v2`, and source `feedback-report-profile.v3` bind the new request/checkpoint digests. Old in-flight revisions fail closed; no persisted data is migrated or deleted, and completed reports remain readable. No automated semantic-truth check or human editorial approval is required per report. The accepted residual risk includes inaccurate narrative, literal visitor comments, internal references, and private information outside the three recognizable input-redaction patterns. (Primary: D62-D63, D68.)

#### Scenario: Accept structurally valid nonempty analysis
- GIVEN nonempty citation-free output that satisfies the schema, order, input/chunk integrity, independently verified Map digests, and output bounds, even if its prose contains a literal comment, an incidental reference, or an invented number
- WHEN no independent routing, checkpoint, authentication, or runtime gate remains unresolved
- THEN the output MAY proceed to rendering without automated semantic-truth judgment or required human editorial review, and the system MUST NOT claim that those checks prove narrative truth.

#### Scenario: Reject malformed output contracts
- GIVEN output violates the closed structure, includes an unexpected per-claim `evidenceRefs`, mismatches Map `coveredRefs`, or exceeds the stage output-token bound
- WHEN validated
- THEN it MUST be rejected before checkpointing and MUST NOT appear in a report.

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
