# Survey Reporting Verification Gates

## Outcome

S01 records evidence; it does not provision infrastructure. The maintainer has now approved sanitized visitor-comment processing with `gemini-3.8-flash` in Vertex AI multi-region `us`, and the exact model/location/settings gate passed through the official `aiplatform.us.rep.googleapis.com` endpoint. Generation remains disabled because the worker, queue, IAM, storage-policy, renderer POC, and keyless-deployment gates are incomplete. No raw comment processing, alternate model, API, project, location, or local OpenCode identity is authorized as a fallback; there is no silent fallback.

## Evidence handling

- **Evidence boundary:** Maintainer-supplied facts, approved bounded Google Cloud reads, and the official sources below are the only evidence used.
- **Credential boundary:** No credential, token, active account, ADC state, authentication environment variable, key file, or container credential store was read or changed.
- **Probe boundary:** The four S01 infrastructure probe groups were attempted once at `2026-09-12T00:55:51Z`. Later maintainer-supplied Vertex evidence is limited to the approved bounded `CountTokens` and synthetic `generateContent` outcomes recorded below; this reconciliation made no additional provider call.
- **Interpretation rule:** An empty or null bounded projection is inconclusive unless the requested field was positively returned. It is not proof that the underlying policy or configuration is empty.
- **Decision rule:** `PASS` means the evidence named by that gate satisfies its current S01 criterion. `FAIL` or `DEFERRED` keeps the dependent behavior disabled.

## Verified facts

- The product operational, Vertex consumer/quota, billing, storage, and telemetry project is `teleferico-bariloche-2024`. `Teleferico-AI` and `opencode-vertex-local` are local OpenCode concerns only.
- Safe evidence supplied to S01 confirms `aiplatform.googleapis.com`, `run.googleapis.com`, `storage.googleapis.com`, and `cloudtasks.googleapis.com` are enabled in the product project.
- Safe evidence supplied to S01 confirms Cloud Tasks supports `southamerica-east1`.
- The four named existing application and CMS Cloud Run services were read successfully. Each reported ingress `all` and use of the documented shared App Engine identity.
- The bounded TB-113 inventory returned no queue or Cloud Run service whose name matched `tb113|survey-report` in `southamerica-east1`.
- Both approved existing buckets reported location `SOUTHAMERICA-EAST1` and an empty lifecycle rule list in the bounded read.
- `CountTokens` succeeded for `gemini-3.8-flash` at resource location `us` through `https://aiplatform.us.rep.googleapis.com` and returned `totalTokens: 8`.
- A separate synthetic `generateContent` request succeeded at the same endpoint and location with a strict JSON response schema, `temperature: 0`, `candidateCount: 1`, `thinkingConfig.thinkingLevel: LOW`, and no grounding metadata.
- The generation returned `modelVersion: gemini-3.8-flash`, `finishReason: STOP`, prompt tokens: 516, candidate tokens: 330, total tokens: 846, and zero structural validation failures. The generated text was intentionally not emitted, so language and tone were not manually inspected.

## Failed facts

- `southamerica-east1` returned HTTP `404` / `NOT_FOUND` for both `gemini-3.8-flash` and `gemini-3.5-flash-lite`; production MUST NOT retry there or silently fall back to another model or location.
- An earlier bare-US `404` used the wrong hostname `us-aiplatform.googleapis.com` and is invalid as model-availability evidence. The official Vertex AI multi-region hostname used by the passing probes is `aiplatform.us.rep.googleapis.com`.
- The probes establish access, fixed request settings, strict structured output, response usage metadata, and returned model revision. They do not establish the model's maximum usable input/output limits or manually reviewed Spanish language and tone quality; those remain U11 validation concerns rather than a failed availability gate.
- The existing buckets did not show the required 30-day diagnostics lifecycle rule in the bounded result. This fails TB-113 storage readiness even though report artifacts are not yet being written.

## Deferred evidence

- No dedicated TB-113 worker service or Cloud Tasks queue exists in the matching regional inventory. Worker attachment, private ingress, OIDC audience, retry policy, and distinct invoker/runtime identities remain deferred to approved infrastructure work.
- The bucket reads returned null for location type, uniform bucket-level access, and public access prevention. Those controls remain unverified.
- The bounded bucket IAM projections returned empty binding arrays. This is inconclusive and does not prove that either IAM policy has no bindings, no public grants, or the required least-privilege worker access.
- Production deployment evidence for a dedicated user-managed keyless worker identity, absence of service-account JSON keys, and absence of `GOOGLE_APPLICATION_CREDENTIALS` remains deferred. The credential boundary forbids substituting local credential inspection for deployment evidence.
- Effective runtime quota attribution, billing labels, feature labels, logs, metrics, per-generation pricing snapshots, and alerts remain deferred until the worker and approved infrastructure exist.

## Gate register

### Gate G01 — Product project and explicit runtime topology

- **Owner**: Platform maintainer and survey worker implementer.
- **Source/evidence**: Maintainer-confirmed topology; normative `ModelConfigV1` and `WorkerDeploymentConfigV1`; official Vertex initialization and quota-project documentation.
- **Observed status**: `PASS` for the selected topology. Operational, Vertex consumer/quota, billing, storage, and telemetry ownership is fixed to `teleferico-bariloche-2024`; local OpenCode projects and identities are excluded. Runtime implementation is not part of S01.
- **Pass criterion**: Configuration requires explicit `vertexProjectId=teleferico-bariloche-2024` and an evidence-approved `vertexLocation`, and rejects absent or mismatched project/location values before provider initialization.
- **Fail criterion**: Any implicit project/location resolution, mismatched project, local OpenCode reuse, or quota/billing attribution outside the product project.
- **Fallback**: None. Fail closed before CountTokens, generation, storage, or dispatch.
- **Timestamp/evidence provenance**: Maintainer decision captured before S01; design read back on `2026-09-12`; no credential-derived evidence.
- **Affected decisions**: D56, D75, D76, D92.

### Gate G02 — Required APIs and Cloud Tasks region

- **Owner**: Platform maintainer.
- **Source/evidence**: Preverified safe API/region evidence supplied to S01; official Cloud regional and service documentation.
- **Observed status**: `PASS`. The four required APIs are enabled, and Cloud Tasks supports `southamerica-east1`.
- **Pass criterion**: `aiplatform.googleapis.com`, `run.googleapis.com`, `storage.googleapis.com`, and `cloudtasks.googleapis.com` remain enabled in `teleferico-bariloche-2024`, with the queue configured in `southamerica-east1`.
- **Fail criterion**: A required API is disabled, the queue uses another location, or regional support is not proven.
- **Fallback**: None. Dispatch and generation remain disabled until the same gate passes.
- **Timestamp/evidence provenance**: Safe evidence verified before S01 and supplied by the maintainer; recorded on `2026-09-12`.
- **Affected decisions**: D35, D70, D79, D92.

### Gate G03 — Exact Vertex model, location, access, and settings

- **Owner**: Maintainer for the manual provider probe; survey AI implementer for later validated configuration.
- **Source/evidence**: Maintainer-supplied approved `CountTokens` and synthetic strict-schema `generateContent` results; official Vertex initialization and Gemini model/location documentation.
- **Observed status**: `PASS`. `gemini-3.8-flash` is accessible at resource location `us` through `aiplatform.us.rep.googleapis.com`. `CountTokens` returned 8 tokens. Strict structured generation with temperature 0, one candidate, LOW thinking, and no grounding returned model version `gemini-3.8-flash`, `STOP`, 516 prompt tokens, 330 candidate tokens, 846 total tokens, and zero structural validation failures.
- **Pass criterion**: Approved probes prove the exact model is accessible in configured location `us` through the official multi-region endpoint, CountTokens succeeds, fixed generation settings are accepted, strict schema validation passes, and response usage/model revision metadata is returned.
- **Fail criterion**: `NOT_FOUND`, denied access, unsupported location/settings, unavailable token/usage evidence, or any project/location mismatch.
- **Fallback**: None. Production uses only `gemini-3.8-flash` in `us`; it MUST NOT retry in `southamerica-east1` or select an alternate model, API, project, location, hostname, or implicit runtime default.
- **Timestamp/evidence provenance**: Original regional failure was recorded on `2026-09-12`. The maintainer supplied the later passing bounded probe results and approved sanitized-comment processing in `us` on `2026-09-14`; this reconciliation did not rerun either request and did not inspect the intentionally suppressed generated text.
- **Affected decisions**: D57, D58, D75, D92.

### Gate G04 — Cloud Run worker identity and ingress

- **Owner**: Platform maintainer.
- **Source/evidence**: Approved Cloud Run identity probe group; official Cloud Run service identity and IAM documentation.
- **Observed status**: `DEFERRED`. Existing app/CMS services all reported ingress `all` and `usesDocumentedSharedIdentity=true`. The matching TB-113 inventory contained no worker service, so dedicated worker attachment and private ingress are unproven.
- **Pass criterion**: A TB-113 worker exists with private ingress and a dedicated user-managed worker runtime service account attached as its Cloud Run service identity.
- **Fail criterion**: Public ingress, no attached service identity, use of the documented shared application identity, or use of any local OpenCode identity.
- **Fallback**: None. The worker and generation stay disabled.
- **Timestamp/evidence provenance**: Four named service describes and one filtered service list, each attempted once at `2026-09-12T00:55:51Z`.
- **Affected decisions**: D35, D79, D86, D89, D90, D92.

### Gate G05 — Cloud Tasks queue, delivery, and distinct OIDC invoker

- **Owner**: Platform maintainer and generation dispatch implementer.
- **Source/evidence**: Approved regional queue inventory; normative queue/OIDC contract; official IAM documentation.
- **Observed status**: `DEFERRED`. The filtered inventory returned zero matching queues, so queue state, rates, retry policy, audience, and invoker binding cannot pass yet.
- **Pass criterion**: One approved product-project queue in `southamerica-east1` has the specified delivery deadline/retry contract and invokes only the private worker through a distinct least-privilege OIDC invoker identity.
- **Fail criterion**: Missing or divergent queue, wrong region, wrong audience, shared invoker/runtime identity, broader permissions, or an unapproved retry/deadline configuration.
- **Fallback**: None. Do not dispatch; generation remains disabled.
- **Timestamp/evidence provenance**: One filtered queue list attempted once at `2026-09-12T00:55:51Z`; zero matching resources returned.
- **Affected decisions**: D35, D70, D92.

### Gate G06 — Existing bucket configuration and retention

- **Owner**: Platform maintainer and report delivery implementer.
- **Source/evidence**: Approved bounded describes of the staging and production CMS buckets; normative report and diagnostics prefixes.
- **Observed status**: `FAIL` for TB-113 readiness and otherwise `DEFERRED`. Both buckets reported `SOUTHAMERICA-EAST1` and no lifecycle rules. Location type, uniform bucket-level access, and public access prevention returned null and remain unproven.
- **Pass criterion**: Approved storage evidence proves the selected private bucket, report retention, 30-day diagnostics expiration by prefix, uniform bucket-level access, public access prevention, and no direct public delivery.
- **Fail criterion**: Missing diagnostics lifecycle, public access, unproven required controls, wrong location, destructive report expiry, or divergent prefixes.
- **Fallback**: None. Rendering/storage/publication remain disabled; immutable reports must never be written under an unreviewed policy.
- **Timestamp/evidence provenance**: Both approved bucket describes attempted once at `2026-09-12T00:55:51Z`; bounded fields only.
- **Affected decisions**: D78, D79, D92.

### Gate G07 — Bucket IAM least privilege

- **Owner**: Platform maintainer.
- **Source/evidence**: Approved bounded IAM policy reads for the staging and production CMS buckets; official IAM grant/change/revoke guidance.
- **Observed status**: `DEFERRED`. Both projected responses contained zero bindings. Because the projection did not establish policy completeness, S01 does not infer absent grants, public access, or worker authorization.
- **Pass criterion**: Reviewed complete redacted evidence proves no public grants and only the required worker access to the exact report and diagnostics prefixes/resources.
- **Fail criterion**: Public principals, shared application identity reuse, excess member kinds/roles, missing required worker access, or incomplete evidence.
- **Fallback**: None. Storage access and generation remain disabled.
- **Timestamp/evidence provenance**: Both approved bucket IAM reads attempted once at `2026-09-12T00:55:51Z`; identities were never emitted.
- **Affected decisions**: D35, D79, D92.

### Gate G08 — Keyless production credential boundary

- **Owner**: Platform maintainer and deployment reviewer.
- **Source/evidence**: Maintainer-approved production policy; official Cloud Run service identity and service-account key guidance.
- **Observed status**: `DEFERRED`. The required keyless policy is fixed, but no TB-113 deployment exists to prove attachment, no-key provisioning, or omission of `GOOGLE_APPLICATION_CREDENTIALS`. S01 intentionally performed no credential or authentication inspection.
- **Pass criterion**: Redacted deployment and IAM evidence proves metadata-provided credentials through the dedicated attached runtime identity, no service-account JSON key, and no `GOOGLE_APPLICATION_CREDENTIALS` setting.
- **Fail criterion**: Any JSON key, credential file, explicit credential environment variable, local credential fallback, or identity reuse.
- **Fallback**: None. Fail closed before provider, CMS, or storage access.
- **Timestamp/evidence provenance**: Policy confirmed before S01; evidence boundary reviewed on `2026-09-12`; credential inspection prohibited.
- **Affected decisions**: D35, D56, D58, D79, D90, D92.

### Gate G09 — Product-project quota, billing, labels, and telemetry

- **Owner**: Platform maintainer and survey worker implementer.
- **Source/evidence**: Maintainer-confirmed project topology; official quota-project guidance; normative per-generation cost and alert contracts.
- **Observed status**: `DEFERRED`. Ownership is fixed to the product project, but effective runtime quota attribution, usage metadata, labels, pricing snapshots, logs, metrics, and alerts cannot be proven before the worker exists and the Vertex gate passes.
- **Pass criterion**: Redacted runtime evidence attributes quota, billing, resources, logs, metrics, feature labels, returned usage metadata, pricing snapshots, and alerts to `teleferico-bariloche-2024`, distinct from OpenCode activity.
- **Fail criterion**: Missing attribution, local OpenCode attribution, estimated rather than returned usage, missing pricing SKU, unsafe telemetry, or absent deduplicated alerts.
- **Fallback**: None. Generation remains disabled when cost or attribution evidence is incomplete.
- **Timestamp/evidence provenance**: Topology confirmed before S01; runtime evidence deferred as of `2026-09-12`.
- **Affected decisions**: D72, D73, D75, D76, D77, D92.

## Exact approved probe outcomes

1. **Cloud Run identities:** all four named app/CMS staging/production services returned successfully; ingress was `all`; `usesDocumentedSharedIdentity` was `true` for each.
2. **TB-113 resource inventory:** zero matching Cloud Tasks queues and zero matching Cloud Run services were returned in `southamerica-east1`.
3. **Bucket configuration:** both redacted buckets returned `SOUTHAMERICA-EAST1` and `lifecycle=[]`; location type, uniform bucket-level access, and public access prevention were null in the bounded projection.
4. **Bucket IAM:** both redacted buckets returned an empty projected binding array. The outcome is recorded as inconclusive rather than as proof of an empty policy.
5. **Vertex `us` CountTokens:** the official multi-region endpoint returned `totalTokens: 8` for `gemini-3.8-flash`.
6. **Vertex `us` structured generation:** the official multi-region endpoint returned strict-schema output with zero structural failures, `STOP`, model version `gemini-3.8-flash`, and usage 516 prompt / 330 candidate / 846 total tokens. Output text was suppressed, so no manual language or tone claim is made.

## Dependency impact

- **Unblocked now:** S03 may execute its renderer POC because G03 passed for sanitized comments with the exact `gemini-3.8-flash` / `us` contract. Offline implementation with fake-provider and synthetic boundaries may proceed independently of Google operational readiness; live provider calls still require all applicable gates.
- **Blocked now:** S20 cannot enable deterministic private PDF delivery until S03 passes and storage readiness is approved; S21 cannot apply operational infrastructure; S22 and S23 cannot complete compatibility, rollout, or staging proof. These are live-operation and rollout dependencies, not blockers to offline code implementation.
- **Transitively blocked:** S15 cannot complete report-capable administration without a passed S03 renderer gate. Any real generation path remains disabled by the remaining worker, renderer, storage, IAM, and deployment gates; this does not block fake-provider local tests or synthetic integration.
- **Not authorized by S01:** dependency adoption, schema/auth changes, environment changes, IAM changes, queue/service/bucket mutations, deployment, or provider substitution.
- **Unblocking rule:** each failed or deferred gate requires its named approved evidence before the dependent live operation, enablement, or rollout. A design/spec revision is required before any substitute is considered. A failed Google gate blocks real operation, not offline coding; the approved `gemini-3.8-flash` / Vertex `us` / `aiplatform.us.rep.googleapis.com` model contract remains exact, with no fallback.

## Official sources

- [Vertex AI Node.js initialization](https://cloud.google.com/vertex-ai/generative-ai/docs/reference/nodejs/latest/vertexai/vertexinit)
- [Set a quota project](https://cloud.google.com/docs/quotas/set-quota-project)
- [Cloud Run service identity](https://cloud.google.com/run/docs/securing/service-identity)
- [Grant, change, and revoke IAM access](https://cloud.google.com/iam/docs/granting-changing-revoking-access)
- [Best practices for managing service account keys](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- [Gemini 3.8 Flash model documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash)
- [Gemini Enterprise Agent Platform locations](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations)
