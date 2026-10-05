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
- Those existing CMS identity observations do not authorize TB-113 provider access. CMS CountTokens and evidence-key reads require a separately attached, dedicated keyless CMS service identity; no such binding or IAM grant was inspected or changed here.
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

- The historical S01 inventory found no dedicated TB-113 worker service or Cloud Tasks queue in the matching region. The queue was later created, initially read back as `PAUSED`, and resumed on 2026-10-03 at the user's request; readback confirmed `RUNNING`. This permits task dispatch but does not prove worker readiness. No worker service exists. Worker attachment, private ingress, OIDC audience, and runtime invocation remain deferred to approved infrastructure work.
- The historical S01 bucket projection returned null for location type, uniform bucket-level access, and public access prevention. The 2026-10-03 staging-bucket readback later verified uniform bucket-level access enabled and Public Access Prevention enforced; location type remains unverified.
- The bounded bucket IAM projections returned empty binding arrays. This is inconclusive and does not prove that either IAM policy has no bindings, no public grants, or the required least-privilege worker access.
- Production deployment evidence for a dedicated user-managed keyless worker identity, absence of service-account JSON keys, and absence of `GOOGLE_APPLICATION_CREDENTIALS` remains deferred. The credential boundary forbids substituting local credential inspection for deployment evidence.
- Effective runtime quota attribution, billing labels, feature labels, logs, metrics, per-generation pricing snapshots, and alerts remain deferred until the worker and approved infrastructure exist.

## Fresh staging gate deltas — 2026-10-03 UTC

This delta supplements the historical S01 record above; the canonical full staging chronology is in [docs/INFRA.md](../../INFRA.md#fresh-staging-state--2026-10-03-utc).

- **G05:** The queue's initial `PAUSED` state and retry/rate settings were read back. On 2026-10-03, following the user's request, it was resumed and a subsequent readback confirmed `RUNNING`; this permits task dispatch but does not prove a deployed or ready worker. The Cloud Tasks service agent's `roles/iam.serviceAccountUser` binding on `feedback-task-invoker-staging` was also read back. G05 remains deferred: there is no worker service or confirmed `roles/run.invoker` binding, and the app-side `1800s` task deadline is unresolved.
- **Worker build trigger:** On 2026-10-03 UTC, the authorized staging trigger `feedback-worker-staging-deploy-cr` (ID `7ee6da31-f842-407d-a635-afba62e90c6b`) was created disabled and approval-required. Its earlier `BuildTrigger.build` parsed equal to the then-current `worker-staging.yaml`; the creation-time readback included the `^staging$` push filter and worker/shared-package paths. A read-only gcloud describe on 2026-10-04 found the trigger enabled and approval-required. Current live substitutions and snapshot parity have not been verified. This does not establish full trigger-metadata parity or equality for the app/CMS snapshots. The dedicated standard Docker Artifact Registry repository `feedback-worker-staging` exists in `southamerica-east1`. Builder grants were confirmed: repository-only `roles/artifactregistry.writer`, project `roles/logging.logWriter`, separately approved project `roles/run.developer`, and `roles/iam.serviceAccountUser` only on the worker runtime service account. Project Cloud Run Developer allows modifications to other services, including production; this breadth was knowingly approved. No direct deployment or live trigger update occurred. Whether this role suffices for the exact private deploy path remains unverified; do not grant `roles/run.admin` automatically. The latest worker-token mount is configured in the local snapshot, but its Secret Manager resource/access is unverified. At the previous local-snapshot checkpoint, the CMS evidence-key alias differed from the worker alias; the current local snapshots now reference the same pinned resource/version. The user reports checking the secret, but we have not independently verified resource/version existence or effective IAM/runtime access. This trigger evidence does not satisfy G05 or establish a deployed/operational worker.
- The local worker snapshot passes both Secret Manager references directly to Cloud Run, without intermediate Cloud Build substitutions or step environment variables. `FEEDBACK_WORKER_CMS_TOKEN` maps to `WORKER__STAGING__FEEDBACK_WORKER_CMS_TOKEN:latest`; the evidence-key path selects version `1`. At the previous snapshot checkpoint, the CMS staging snapshot used a different evidence-key alias; the current local snapshots now reference the same pinned resource/version. The user reports checking the secret, but we have not independently verified resource/version existence or effective IAM/runtime access. The worker guard checks the numeric resource-path shape before deployment after image build and push. At creation, the trigger readback included `_WORKER_CMS_TOKEN_SECRET_VERSION`, `_EVIDENCE_KEY_RESOURCE`, and `_AR_REPOSITORY=REQUIRED_OPERATOR_VALUE`; current live substitutions have not been verified. A read-only gcloud describe on 2026-10-04 found the trigger enabled and approval-required. No live configuration was changed in this documentation update, and local snapshots are not being claimed as fully in parity.
- **G06:** The dedicated staging bucket has uniform bucket-level access enabled, Public Access Prevention enforced, and an applied 30-day `private/report-diagnostics/` deletion rule. This does not establish report retention, direct-delivery controls, or full G06 completion; the shared CMS bucket is unchanged.
- **G07:** The first worker bucket-binding attempt failed HTTP 400. Read-only follow-up confirmed role permissions at `GA`, bucket grantability, and no grant after failure; a fresh approved binding was then confirmed on the dedicated bucket only. This does not prove effective runtime access or complete IAM policy state, so G07 remains deferred.

App/CMS still share the broad-role `appspot` identity, including Editor; do not grant it queue roles before CMS identity migration and operator review. The current CMS and worker snapshots reference the same pinned evidence-key resource/version, following the user's correction. The user's secret check is user-reported; resource/version existence and effective IAM/runtime access have not been independently verified. A read-only gcloud describe on 2026-10-04 found the worker trigger enabled and approval-required; current live substitutions and snapshot parity remain unverified. The CMS and app inline-trigger updates remain user-owned. No worker service, secret setup, or deployment exists. The current app-staging snapshot sets `FEEDBACK_CAPABILITY_ENABLED=true`; no evidence confirms this is deployed or safe to enable.

## Worker trigger approval proposal — 2026-10-05

The latest observed worker trigger state is enabled and approval-required. The separate [`worker-staging-trigger.yaml`](../cloud-build/worker-staging-trigger.yaml) is a partial, non-importable proposal to set `approvalRequired: false`; only the operator can update the live trigger. If changed, future eligible staging pushes could automatically build, push, and privately deploy after a qualifying merge, subject to unresolved configuration and readiness gates. This is future-only and does not alter existing builds. The historical approved build `4d59496d` failed at `2026-10-05T17:58:58Z`, and the worker service was absent at the last read; this does not prove deployment or secret/IAM access. A docs-only pull request does not match the worker trigger's path filter. Trigger substitutions remain unverified, and no deployment/readiness gate passes by virtue of this proposal.

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

### Gate G04 — Cloud Run worker/CMS identities and ingress

- **Owner**: Platform maintainer.
- **Source/evidence**: Approved Cloud Run identity probe group; official Cloud Run service identity and IAM documentation.
- **Observed status**: `DEFERRED`. Existing app/CMS services all reported ingress `all` and `usesDocumentedSharedIdentity=true`. The matching TB-113 inventory contained no worker service, and no dedicated CMS checkpoint identity/IAM binding was established.
- **Pass criterion**: The worker exists with private ingress and its dedicated user-managed worker runtime identity; CMS independently uses a dedicated user-managed keyless identity limited to the approved Vertex CountTokens method and pinned evidence-key read. Neither reuses the app, worker, or task-invoker identity.
- **Fail criterion**: Public worker ingress, missing identity attachment, reuse of the shared application identity, any additional TB-113 CMS grant beyond CountTokens and the pinned key read, or use of any local OpenCode identity.
- **Fallback**: None. Worker execution and CMS provider-backed checkpoint validation remain unavailable; generation stays disabled.
- **Timestamp/evidence provenance**: Four named service describes and one filtered service list, each attempted once at `2026-09-12T00:55:51Z`.
- **Affected decisions**: D35, D79, D86, D89, D90, D92.

### Gate G05 — Cloud Tasks queue, delivery, and distinct OIDC invoker

- **Owner**: Platform maintainer and generation dispatch implementer.
- **Source/evidence**: Approved regional queue inventory; normative queue/OIDC contract; official IAM documentation.
- **Observed status**: `DEFERRED`. The 2026-10-03 UTC readback confirms the queue exists and is `RUNNING`; it was initially `PAUSED` and later resumed at the user's request. The Cloud Tasks primary service agent has `roles/iam.serviceAccountUser` on `feedback-task-invoker-staging`. The worker staging build trigger was created disabled and approval-required on 2026-10-03; a read-only gcloud describe on 2026-10-04 found it enabled and approval-required. The trigger does not create a worker service, which remains absent; the `roles/run.invoker` binding is also unconfirmed, and the app-side task deadline remains unresolved. App/CMS share the broad-role `appspot` identity; do not grant it queue roles before CMS identity migration and operator review.
- **Pass criterion**: One approved product-project queue in `southamerica-east1` has the specified delivery deadline/retry contract and invokes only the private worker through a distinct least-privilege OIDC invoker identity.
- **Fail criterion**: Missing or divergent queue, wrong region, wrong audience, shared invoker/runtime identity, broader permissions, or an unapproved retry/deadline configuration.
- **Fallback**: None. Do not dispatch; generation remains disabled.
- **Timestamp/evidence provenance**: One filtered queue list attempted once at `2026-09-12T00:55:51Z`; zero matching resources returned.
- **Affected decisions**: D35, D70, D92.

### Gate G06 — Existing bucket configuration and retention

- **Owner**: Platform maintainer and report delivery implementer.
- **Source/evidence**: Approved bounded describes of the staging and production CMS buckets; normative report and diagnostics prefixes.
- **Observed status**: `FAIL` for TB-113 readiness and otherwise `DEFERRED`. Historical S01 reads returned no lifecycle rules and null for location type, uniform access, and public access prevention. The 2026-10-03 UTC readback verifies uniform bucket-level access, enforced Public Access Prevention, and the 30-day diagnostics-prefix deletion rule. It does not prove report retention or no direct public delivery; G06 remains incomplete.
- **Pass criterion**: Approved storage evidence proves the selected private bucket, report retention, 30-day diagnostics expiration by prefix, uniform bucket-level access, public access prevention, and no direct public delivery. The diagnostics lifecycle subcriterion is evidenced for `private/report-diagnostics/`; the remaining criteria are not thereby satisfied.
- **Fail criterion**: Missing diagnostics lifecycle, public access, unproven required controls, wrong location, destructive report expiry, or divergent prefixes.
- **Fallback**: None. Rendering/storage/publication remain disabled; immutable reports must never be written under an unreviewed policy.
- **Timestamp/evidence provenance**: Historical bucket describes attempted once at `2026-09-12T00:55:51Z`; scoped staging bucket lifecycle and guard readback succeeded on `2026-10-03` UTC.
- **Affected decisions**: D78, D79, D92.

### Gate G07 — Bucket IAM least privilege

- **Owner**: Platform maintainer.
- **Source/evidence**: Approved bounded IAM policy reads for the staging and production CMS buckets; official IAM grant/change/revoke guidance.
- **Observed status**: `DEFERRED`. The initial 2026-10-03 binding attempt returned HTTP 400. Read-only checks confirmed role permissions at `GA`, bucket grantability, and no grant after failure; a fresh approved bucket-scoped worker binding was confirmed by policy readback. This does not prove effective runtime access or complete policy state. Historical projections remain inconclusive, and reviewed least-privilege access remains unresolved.
- **Pass criterion**: Reviewed complete redacted evidence proves no public grants and only the required worker access to the exact report and diagnostics prefixes/resources.
- **Fail criterion**: Public principals, shared application identity reuse, excess member kinds/roles, missing required worker access, or incomplete evidence.
- **Fallback**: None. Storage access and generation remain disabled.
- **Timestamp/evidence provenance**: Both approved bucket IAM reads attempted once at `2026-09-12T00:55:51Z`; identities were never emitted.
- **Affected decisions**: D35, D79, D92.

### Gate G08 — Keyless production credential boundary

- **Owner**: Platform maintainer and deployment reviewer.
- **Source/evidence**: Maintainer-approved production policy; official Cloud Run service identity and service-account key guidance.
- **Observed status**: `DEFERRED`. The required keyless policy is fixed, but no TB-113 deployment exists to prove attachment, no-key provisioning, or omission of `GOOGLE_APPLICATION_CREDENTIALS`. S01 intentionally performed no credential or authentication inspection.
- **Pass criterion**: Redacted deployment and IAM evidence proves metadata-provided credentials through the dedicated worker and CMS service identities, no service-account JSON key, and no `GOOGLE_APPLICATION_CREDENTIALS` setting on either runtime.
- **Fail criterion**: Any JSON key, credential file, explicit credential environment variable, local credential fallback, or identity reuse.
- **Fallback**: None. Fail closed before provider, CMS, or storage access.
- **Timestamp/evidence provenance**: Policy confirmed before S01; evidence boundary reviewed on `2026-09-12`; credential inspection prohibited.
- **Affected decisions**: D35, D56, D58, D79, D90, D92.

### Gate G09 — Product-project quota, billing, labels, and telemetry

- **Owner**: Platform maintainer and survey worker implementer.
- **Source/evidence**: Maintainer-confirmed project topology; official quota-project guidance; normative per-generation cost and alert contracts.
- **Observed status**: `DEFERRED`. Ownership is fixed to the product project, but effective worker/CMS quota attribution, usage metadata, labels, pricing snapshots, logs, metrics, and alerts cannot be proven before the dedicated runtimes exist and the Vertex gate passes.
- **Pass criterion**: Redacted runtime evidence attributes worker generation and CMS CountTokens quota, billing, resources, logs, metrics, feature labels, returned usage metadata, pricing snapshots, and alerts to `teleferico-bariloche-2024`, distinct from OpenCode activity.
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

## Local redacted projection verifier

`verify-config.mjs` reads one explicitly supplied local JSON projection and has
no Google Cloud SDK, environment, secret-store, or network integration. The
closed `survey-worker-config-projection.v1` input contains only declared project
IDs/topology, required API names, Vertex/queue values, redacted identity aliases
and permission scopes, boolean key-presence statements, private object prefixes
and retention declarations, labels, and budget rules. It rejects unknown or
secret-like data.

Run `node --test docs/infra/survey-reporting/verify-config.test.mjs` from the
repository root for the synthetic projection tests. A CLI result of
`projection_valid` means only that supplied declarations match the local
contract. It does not alter the observed statuses above or prove live readiness.
Missing or unverifiable declarations are `blocked`; operational confirmation
of queue/service existence, ingress, OIDC bindings, runtime identity attachment,
credential absence, IAM, bucket policy, and lifecycle remains deferred to
separately approved evidence. Generation remains disabled.
