# Normative AI, Worker, and Infrastructure Contracts

All content is normative except provider facts behind explicit gates.

## Model and Validation

```ts
// Normative
type ModelConfigV1={version:"survey-model-config.v1";evidenceKeyId:string;provider:"vertex-ai";vertexProjectId:"teleferico-bariloche-2024";vertexLocation:"us";vertexApiEndpoint:"aiplatform.us.rep.googleapis.com";model:"gemini-3.8-flash";temperature:0;reasoning:"LOW";grounding:false;promptVersion:string;mapSchemaVersion:"survey-map.v1";analysisSchemaVersion:"survey-analysis.v1";redactionVersion:string;validatorVersion:string;chunkVersion:string;verifiedInputTokenLimit:number;map:{targetMin:600;targetMax:1200;hardMax:4000};directReduce:{targetMin:1800;targetMax:3000;hardMax:8000};safetyHeadroomTokens:number;sourceRevision:string};
type WorkerDeploymentConfigV1={version:"survey-worker-deployment.v1";operationalProjectId:"teleferico-bariloche-2024";vertexProjectId:"teleferico-bariloche-2024";vertexLocation:"us";vertexApiEndpoint:"aiplatform.us.rep.googleapis.com";cloudTasksLocation:"southamerica-east1";workerRuntimeServiceAccount:string;taskInvokerServiceAccount:string;workerOidcAudience:string};
type EvidenceClaimV1={claimId:string;textEs:string;evidenceRefs:string[];signal:"recurrent"|"minority"|"descriptive"};
type MapV1={schemaVersion:"survey-map.v1";chunkId:string;coveredRefs:string[];themes:Array<{themeKey:string;labelEs:string;claims:EvidenceClaimV1[]}>;limitations:string[]};
type SectionKey="executive_summary"|"observed_changes"|"strengths"|"unfavorable_areas"|"recurrent_themes"|"minority_signals"|"coverage_limitations";
type SectionV1={key:SectionKey;status:"supported"|"insufficient_evidence";claims:EvidenceClaimV1[]};
type DirectV1={schemaVersion:"survey-analysis.v1";route:"direct";sections:[SectionV1,SectionV1,SectionV1,SectionV1,SectionV1,SectionV1,SectionV1]};
type ReduceV1=Omit<DirectV1,"route">&{route:"reduce";mapOutputDigests:string[]};
type PublishedAnalysisV1={schemaVersion:"survey-published-analysis.v1";sections:Array<{key:SectionKey;status:SectionV1["status"];paragraphsEs:string[]}>};
```

The worker MUST initialize Vertex with `vertexProjectId=teleferico-bariloche-2024`, `vertexLocation=us`, and `vertexApiEndpoint=aiplatform.us.rep.googleapis.com` from validated model and deployment configuration. Missing or mismatched values are terminal `CONFIGURATION` failures before client initialization, token counting, or generation. `southamerica-east1`, `us-aiplatform.googleapis.com`, runtime project/location, quota-project, local ADC, CLI defaults, and alternate models MUST NOT be used as fallbacks. `Teleferico-AI`, `opencode-vertex-local`, and every local OpenCode principal/configuration are outside the production trust and quota boundary. Only sanitized visitor-comment copies may cross this provider boundary.

Headroom=`max(2048,ceil(limit*10/100))`; `available=limit-instructions-schema-metrics-reservedOutput-headroom`, with exact CountTokens results for the serialized request segments. Direct is selected only when CountTokens proves the complete request fits. Otherwise, for `n=1..recordCount`, derive the deterministic byte-weighted chunks below and CountTokens each complete serialized map request; select the smallest `n` for which every request fits. Byte weights choose membership only: they are not token estimates, do not prove token safety, and do not replace CountTokens. Never split, sample, or omit a comment. Every comment in the immutable snapshot belongs to exactly one chunk. Reduce receives validated maps plus immutable metrics.

Evidence ref=`e_` plus the first 20 lowercase base32 characters of `HMAC-SHA256(evidenceSecret,canonicalRunId+":"+canonicalRecordId)`; `evidenceSecret` is at least 32 bytes, `canonicalRunId` is a lowercase UUID, and record IDs match `^[a-z0-9][a-z0-9._-]{0,63}$`. The nonsecret `evidenceKeyId` is immutable in each run's `modelConfigJson` and selects a future provisioned runtime key; the key itself is injected only, never persisted or logged. The in-memory ref-to-comment map remains worker-only. Both worker and CMS derive the same ref and membership from the canonical snapshot plus the injected key. Order complete snapshot comment records by `period`, `acceptedAt` instant, then `recordId`, using code-point order; for `n` chunks, assign each record in that order to the lowest accumulated weight, where weight is the UTF-8 byte length of `tb-json.v1` canonical JSON for the complete original `CommentRecordV1` (tie: lowest one-based chunk index). Do not normalize Unicode; unpaired surrogates reject. Every comment is assigned once; duplicate record IDs reject. `chunkMembershipDigest=SHA-256(tb-json.v1({version:"survey-chunk-membership.v1",evidenceKeyId,reportRunId,snapshotDigest,chunkIndex,chunkCount,records:[{recordId,evidenceRef,weightBytes}]}))`. The preimage and ref map are transient; persisted payloads contain only ordered `coveredRefs`, key ID, and digest, never comment text, record IDs, or key bytes. Objects reject unknown fields; refs are unique/nonempty; `coveredRefs` must exactly equal the independently derived ordered refs. Sort themes/claims/digests by key/ID/chunk; sections use union order. Supported claims require threshold-valid refs and exact metrics; insufficient sections have no claims and fixed versioned Spanish text. Publication strips IDs/refs.

Model copies replace recognized versioned spans with `[EMAIL]`, `[PHONE]`, `[URL]`; originals remain unchanged. Validators reject parse/schema/version/order/language/token/ref/threshold/signal/metric/support/action/recommendation/causality/verbatim/exposed-ref/extra-section violations. Verbatim detection rejects a complete normalized comment under eight tokens or any contiguous eight-token match. Invalid output never renders.

### Pure MapV1 and ReduceV1 Preflight Boundary

The app-side `preflightMapAnalysis` and `preflightReduceAnalysis` are structural preflights only. They return `rejected` for independently detectable violations and `incomplete` for every otherwise clean result; neither result is validated model evidence and neither function enables checkpoint writes.

- Map preflight accepts only the exact `survey-map.v1` keys and canonical `map.<i>-of-<n>` chunk ID. It independently derives membership from the immutable snapshot comments, report-run ID, injected evidence key/key ID, snapshot digest, and supplied chunk count; `coveredRefs` must exactly match that derived ordered chunk list. Caller-supplied `coveredRefs` is never the authority. Themes and claims require exact object shapes, unique code-point-sorted keys/IDs, valid reference syntax and chunk-local claim refs. Prohibited claim language, exposed refs, malformed Unicode, and the normative verbatim-comment match are rejected.
- The preflight cannot establish that the supplied chunk count is the smallest count selected by exact CountTokens over complete serialized requests. Therefore even exact derived membership is reported as incomplete until worker routing evidence and CMS-recomputed checkpoint bindings exist.
- Reduce preflight accepts only the exact `survey-analysis.v1`/`route: "reduce"` schema, the normative section order/status shape, and unique sorted claim IDs. It rejects empty, malformed, or duplicate `mapOutputDigests` values, but does not compare them with a caller-supplied “validated” digest list: that list has no independent CMS checkpoint authority. A syntactically clean digest list remains `incomplete` behind `independently_verified_cms_map_checkpoint_output_digests`; neither digest membership nor map-index order can be claimed until CMS-verified map checkpoint evidence is supplied.
- Both preflights reject detected prohibited/verbatim text and malformed or foreign refs but do not prove model semantics, metric grounding, contradiction/current-previous truth, or immutable per-run key selection. Clean outputs remain `incomplete`; no default key is provided and tests use synthetic key material only.

These app checks do not change the CMS checkpoint route: writes remain `UNKNOWN_VERSION` before transaction entry. Runtime key-provider wiring, complete nested semantic/evidence validation, CMS recomputation under CAS, and valid map payload fit under the existing 4 KiB request cap remain separate activation gates owned by the U10-A5 worker implementer and CMS lifecycle owner.

## Checkpoints and Retries

```ts
// Normative
type PayloadV1={kind:"redact";recordCount:number;redactionVersion:string}|{kind:"count";segmentTokens:{instructions:number;schema:number;metrics:number;comments:number;reservedOutput:number;headroom:number};totalTokens:number}|{kind:"map";chunkId:string;chunkIndex:number;chunkCount:number;evidenceKeyId:string;coveredRefs:string[];chunkMembershipDigest:string;validatedOutput:MapV1}|{kind:"direct";validatedOutput:DirectV1}|{kind:"reduce";validatedOutput:ReduceV1}|{kind:"validate";publishedAnalysis:PublishedAnalysisV1;validatorVersion:string}|{kind:"render";rendererVersion:string;pdfSha256:string;size:number}|{kind:"store";objectKey:string;artifactSha256:string;size:number;mimeType:"application/pdf"};
type CheckpointV1={checkpointVersion:"survey-checkpoint.v1";stageKey:string;stageIndex:number;route:"common"|"direct"|"map-reduce";stageType:"redact"|"count"|"map"|"direct"|"reduce"|"validate"|"render"|"store";status:"valid";inputDigest:string;outputDigest:string;attempts:number;completedAt:string;payload:PayloadV1};
type CheckpointSetV1={version:"survey-checkpoints.v1";snapshotDigest:string;route:"undecided"|"direct"|"map-reduce";chunkCount:number|null;entries:CheckpointV1[]};
type CheckpointContractVersionsV1={snapshot:"survey-snapshot.v1";checkpoint:"survey-checkpoint.v1";canonicalization:"tb-json.v1";evidenceRef:"survey-evidence-ref.v1";chunkMembership:"survey-chunk-membership.v1";stageConfig:"survey-stage-config.v1";stageInput:"survey-stage-input.v1"};
type StageConfigProjectionV1={version:"survey-stage-config.v1";stageKey:string;modelConfig:ModelConfigV1;evidenceKeyId:string;rendererVersion:string|null};
type RuntimeFailureCodeV1="PROVIDER_TRANSIENT"|"PROVIDER_RATE_LIMIT"|"PROVIDER_TIMEOUT"|"CMS_TRANSIENT"|"STORAGE_TRANSIENT"|"INVALID_OUTPUT"|"AUTHENTICATION"|"CONFIGURATION"|"UNKNOWN_VERSION"|"INVARIANT"|"PROHIBITED_CONTENT"|"QUEUE_ENQUEUE_EXHAUSTED";
type PricingSnapshotV1={version:string;currency:"USD";units:Array<{sku:string;inputMicrosPerMillion:number;outputMicrosPerMillion:number}>};
```

Keys are exactly `redact`, `count`, `direct`, `map.<i>-of-<n>`, `reduce`, `validate`, `render`, `store`; `<i>`/`<n>` are canonical decimals, `1<=i<=n`. `redact,count` use route `common`. Unique ordered indexes are direct: `0,1,2,3,4,5`; map/reduce: redact `0`, count `1`, map `i+1`, reduce `n+2`, validate `n+3`, render `n+4`, store `n+5`. Closed-set validation enforces unique key/index, one selected route/count, and every map index exactly once without another model/collection.

Required direct set: `{redact,count,direct,validate,render,store}`. Required map/reduce set: `{redact,count,map.1-of-n..map.n-of-n,reduce,validate,render,store}`. Edges are `redact→count→direct→validate→render→store` or `redact→count→all maps→reduce→validate→render→store`; only eligible stages commit. `contractVersions` is the closed exact-key type above. `stageConfigDigest=SHA-256(tb-json.v1(StageConfigProjectionV1))`; the projection includes the full immutable model config, key ID, stage key, and renderer version (`null` except render/store). `orderedDependencyOutputDigests` are: none for redact; redact for count; count for direct and each map; count then map outputs by ascending chunk index for reduce; direct or reduce for validate; validate for render; render for store. `inputDigest=SHA-256(tb-json.v1({stageKey,stageIndex,route,snapshotDigest,sourceRevision,contractVersions,stageConfigDigest,orderedDependencyOutputDigests,chunkMembershipDigest}))`; `chunkMembershipDigest` is the derived map digest and is null otherwise. Arrays retain this specified order. `outputDigest` hashes the canonical validated payload. CMS recomputes both before CAS.

Checkpoints prohibit visitor comments, raw/redacted prompts, credentials, signed URLs, the ref map, and unvalidated output. Persist only minimum fully schema/evidence/metric/language/token/verbatim-validated map/direct/reduce outputs and required refs/digests. Invalid output is memory-only and discarded before checkpoint, response, log, or diagnostic. Valid metadata/minimum outputs are indefinite (D55/D63/D78); 30-day diagnostics contain only keys/indexes, digests, counters, timings, validator codes, safe errors—never checkpoint text.

Identical valid-stage replay succeeds without state/attempt change; reuse of key or index with different binding is `CHECKPOINT_CONFLICT`. Resume retries the lowest missing eligible stage, preserves valid sibling maps, and blocks reduce until all maps validate. Mismatched persisted input fails `INVARIANT`; history is never overwritten. No persisted valid stage with matching bindings repeats. Transient operations get two retries after the first attempt; invalid model output gets one controlled regeneration; other failures are terminal.

**Foundation implementation gate:** App/CMS pure derivation and synthetic cross-runtime vectors are local foundations only. The authenticated CMS checkpoint route remains fail-closed with `UNKNOWN_VERSION` before transaction entry; no checkpoint write is accepted. No real verifier key is provisioned, no key ID is populated in generation rows, and no schema/auth/grant/dependency/IAM change is included. Before activation, wire an explicitly authorized runtime key provider by immutable per-run `evidenceKeyId`, validate complete nested output/evidence/privacy constraints, recompute all stage digests and dependencies inside CMS CAS, align app stage keys/indexes/payloads, and resolve the unchanged 4 KiB HTTP cap against validated map payload sizes. Byte weighting never substitutes for CountTokens or all-comment evidence validation.

The local worker POC validates only closed direct-route `render` and `store`
metadata/payloads and their canonical output digests, and emits the normative
direct indexes 4 and 5. The app claim DTO now matches the CMS running response's
`modelConfig` and `pricingSnapshot` fields. Before snapshot/provider work, the
worker validates the closed model configuration, including the pinned
`gemini-3.8-flash` model and topology/settings, and validates the exact
`PricingSnapshotV1` shape, USD currency, unique SKUs, and finite nonnegative
safe-integer prices. This POC does not yet use pricing values for cost
accounting. It then binds render to the
canonical output digest of the locally validated `validate` payload and store
to the canonical render-payload output digest. Both stage-input digests use the
v1 projection, contract versions, snapshot/source revision, full model config,
renderer version, and the exact ordered dependency. Missing configuration or
dependency data fails closed, and legacy POC digests have no fallback or reuse
path. CMS now has a separate pure `verifyCheckpointGraphV1` foundation, but it
is not connected to the lifecycle or HTTP write path. It checks the closed
direct-route stage order/indexes, immutable snapshot/source/model bindings,
exact contract versions, dependency output-digest order, canonical payload
output digests, and exact replay versus stale/conflicting history. Its closed
payload checks cover `redact`, `count`, `render`, and `store`; render/store do
not become verified when an upstream semantic stage is incomplete. `DirectV1`,
`MapV1`, `ReduceV1`, and published-analysis semantics remain unsupported, so
their outputs can only produce an `incomplete` result and are never labeled
validated. Every incomplete result contains only an explicit reason and
structural/pending stage-key summaries; it never returns checkpoint entries,
candidate payloads, or a proposed next state version. A persisted
`status: "valid"` is contract data, not proof that semantic validation passed.
Map/reduce graph verification also fails closed because this pure API does not
receive an independently authorized snapshot/key pair. The helper performs no
writes, and the authenticated CMS checkpoint route still returns
`UNKNOWN_VERSION` before transaction entry. Complete nested AI/evidence
validation and checkpoint activation remain separate gates.

The worker also has a pure direct-analysis preflight. It checks the closed
`DirectV1` shape and section order, evidence-ref syntax, uniqueness and
membership derived from the supplied snapshot/run/key, recurrent/minority
minimum counts, bounded scalar text, prohibited action/causal markers, and
verbatim comment matches. A clean result is explicitly `incomplete`, never a
validated analysis: the preflight cannot prove claim-to-metric entailment,
semantic contradictions, provider-evidence meaning, or the versioned Spanish
fallback text. The real evidence key is not provisioned or wired; synthetic
test material is not an operational source, and immutable per-run key selection
is not verified. `MapV1`, `ReduceV1`, checkpoint acceptance, and CMS validation
remain unsupported. The authenticated CMS checkpoint route must continue to
return `UNKNOWN_VERSION` before transaction entry.

The partial validator also rejects a `recurrent_themes` claim whose signal is
not `recurrent`, and a `minority_signals` claim whose signal is not `minority`.
This checks declared section/signal consistency only; it does not establish that
claim wording is grounded in snapshot metrics or comment meaning. The contract
does not define a machine-readable metric citation or comparison syntax, so
numeric grounding, contradictory evidence, and current/previous comparison
truth remain unverified and MUST keep the result `incomplete`. Do not infer
these semantics from lexical heuristics or invent metric references.

### Pure initial generation-input materialization

`materializeGenerationInputsV1` is an app-local pure boundary for constructing
the immutable values needed before worker execution. Its caller must inject the
complete `SnapshotInput`, exact `ModelConfigV1`, nonempty `PricingSnapshotV1`,
and nonsecret `evidenceKeyId`; the snapshot source revision, model-config source
revision, and injected key ID must agree. It invokes the existing
`survey-reporting-core.createSnapshot`, persists only its payload and canonical
SHA-256 digest, and initializes the closed `survey-checkpoints.v1` envelope
(`route: "undecided"`, `chunkCount: null`, `entries: []`). This versioned
checkpoint envelope is intentionally not `{}`; zero completed stages is valid
at queue creation. The returned materialization is validated and deeply frozen.

The boundary has no CMS reader, provider, credential, runtime-key, or default
model/pricing configuration. The current admin command has no injected source
for all submissions, definitions, QR points, model settings, or pricing inputs;
therefore this work does not wire the materializer into `buildGenerationData`
or change public generation/dispatch behavior. That existing path is not proven
worker-ready and its placeholder generation fields remain a known integration
gap. A separately bounded U10-A adapter must supply authoritative CMS-derived
snapshot inputs and approved versioned model/pricing inputs, replace those
placeholders, and prove creation/retry cutoff immutability before runtime use.
Until then the feedback capability's deployment flag remains `false` and CMS
checkpoint writes remain `UNKNOWN_VERSION` before transaction entry.

### Strict authoritative CMS source adapter

The local U10-A source foundation uses a separate server-only injected page
reader. It accepts only complete cursor chains for submissions, versions, and
QR points: each page must echo its requested cursor, report one stable total,
and terminate with exactly that many rows. Repeated cursors, missing rows,
malformed rows, and pagination failures reject the entire source; there is no
response cap or partial-snapshot mode. The requested window is the normalized
previous-period start through current-period end, while `dataCutoffAt` remains
the immutable cutoff captured before the read. The shared core excludes valid
in-range rows accepted after that cutoff.

Submission identity, receipt, valid-QR source, accepted time, locale, rating,
point/version relations, every aspect definition/rating, the private `comment`
field (including explicit `null`), and the private lowercase SHA-256
`payloadDigest` are mandatory. Duplicate identities, missing relations,
duplicate definitions within a version, conflicting row metadata, or unknown
aspect bindings reject before `materializeGenerationInputsV1`. Each relation's
source-row ID must match the canonical row ID collected for its point/version
key; missing IDs and known keys bound to another row reject. Duplicate source
row IDs or keys also reject. No digest is substituted and no private content is
logged. Across versions, the core's minimum snapshotted sort-order rule remains
authoritative.

The page reader remains an injected app adapter; U10-A11 now composes it with
the admin generation/retry command through an explicit server-only input port.
A separate authenticated CMS source-page action exists, and its isolated HTTP
harness verifies the private-field response shape and custom content API
token strategy/action boundary. The default application runtime still has no
trusted production origin/token-provider or approved model/pricing/key-ID
configuration, so it does not construct that port. Those operational sources
remain unselected and generation remains fail-closed; CMS checkpoint writes
remain `UNKNOWN_VERSION`.

The CMS source page includes valid-QR rows within the inclusive previous/current
range even when `acceptedAt` is later than the frozen `dataCutoffAt`. The cutoff
is fixed before the read and bound into all cursor pages; it is not used to trim
rows in SQL because the immutable snapshot core must compute
`excludedAfterCutoffCount`. The action returns only the required comment and
payload digest plus ratings and canonical version/point identity. It does not
use native collection `find`, change a schema, expose fields to the browser, or
create a default permission. The endpoint's machine boundary is enforced by
the native Strapi `content-api-token` strategy plus a single custom action scope;
an ordinary Users & Permissions JWT remains denied even when its role is granted
that action. The controller corroborates the runtime-selected strategy and
custom content-token type before body measurement/validation or source access.
The isolated HTTP harness tests this with a synthetic custom token bearing only
the source-read action. Real source-token provisioning remains separately
authorized.

### Admin generation/retry composition

U10-A11 composes the strict source adapter and pure materializer into the
server-only admin command transport through an explicit injected
`generationInputs` port. The port supplies the private-source page transport
and an approved-configuration provider; every call must provide a versioned
`ModelConfigV1`, nonempty `PricingSnapshotV1`, nonsecret `evidenceKeyId`, and
one matching source revision. The admin command performs authorization,
capability, overlap or failed-state preflight first, freezes a cutoff, obtains
all three complete CMS collections, and validates the materialized exact
snapshot digest, snapshot, initial checkpoint envelope, model config, and
pricing snapshot before CMS create or dispatch. A failed retry retains its
original row and lineage while receiving a new cutoff and independent complete
source read.

The command boundary additionally requires
`snapshotJson.population.current.from/to` to equal the effective persisted
period and `snapshotJson.population.dataCutoffAt` to equal the exact frozen
generation cutoff. This contextual binding is not implied by a valid snapshot
digest: the independent materialized-input validator proves internal envelope
consistency, while the lifecycle builder proves association with the generation
being created. A mismatch fails before persistence and dispatch; the app maps it
to bounded `UPSTREAM_UNAVAILABLE`. This correction adds no
`createdAt`-versus-cutoff ordering requirement.

No production composition is installed: the default command factory supplies
no generation-input port because the trusted CMS origin/token provider and
approved model/pricing/key-ID sources are not configured. The command therefore
fails with a bounded unavailable result before create or dispatch instead of
persisting placeholders. The capability flag remains false by default; no
credential, configuration approval, environment variable, grant, deployment,
or provider readiness is claimed. The empty initial usage object is not a
snapshot/config/pricing/checkpoint substitute.

Cost/call=`ceil(input*inputRate/1e6)+ceil(output*outputRate/1e6)` for persisted SKU; cached tokens require explicit cached SKU. Missing usage/SKU is `CONFIGURATION`; never estimate; sum checked integer costs.

## Task, Identity, Alerts, and Storage

Task name=`tb113-report-`+run UUID without hyphens, stored by CMS before enqueue; body/route are Appendix 02. The authorized Next.js `GenerationDispatchCoordinator` alone creates tasks: three attempts, deterministic 1s then 2s delay, transient transport/rate/5xx only. Same-name succeeds only for the same stored run/name. Auth/config rejection or third-attempt exhaustion before claim invokes Appendix-02 dispatch-failure CAS; CMS alone commits queued→failed `QUEUE_ENQUEUE_EXHAUSTED`. Replay is idempotent; running/terminal races conflict; no report/object is created.

U9-A1 supplies only the authenticated CMS dispatch-failure CAS endpoint and
app-side wiring for a dispatcher result that proves no task was created. It does
not reserve or persist `taskName`, create Cloud Tasks, or implement retry
classification. Task-name pre-reservation and the production dispatcher remain
U10-owned; until that evidence exists, `DISPATCH_UNAVAILABLE` leaves the run
queued and ambiguous outcomes are not compensated.

The local U10-A CMS contract now reserves the deterministic `taskName` with
`dispatchState=reserved` before enqueue and records `created` or `unknown`
through the authenticated server-mediated action with state-version CAS and
idempotent replay. An unknown outcome leaves the generation queued and blocks
another reservation; there is no blind retry or automated reconciliation. The
new action rejects `absent` and cannot commit queued→failed because its caller
cannot supply independently verifiable Cloud Tasks absence evidence. The U9-A1
v1 compensation guard remains unchanged and rejects a stored task name. There
is no verified absence path, production queue adapter, or real dispatch; these
remain pending until separately authorized provider integration.

After successful creation, Cloud Tasks exclusively owns delivery retries: deadline 1,800s, attempts 5, backoff 30..600s, doublings 4, all provider-gated. Worker 503 requests redelivery/resume. Delivery retry/exhaustion never invokes pre-claim compensation or creates another task.

The operational project and Vertex consumer/quota project are both `teleferico-bariloche-2024`. The worker MUST run as a dedicated user-managed `WORKER_RUNTIME_SERVICE_ACCOUNT` attached as its Cloud Run service identity. It uses metadata-provided keyless credentials only: production MUST provision no service-account JSON key and MUST omit `GOOGLE_APPLICATION_CREDENTIALS`. The Cloud Tasks OIDC `TASK_INVOKER_SERVICE_ACCOUNT` is a distinct service account with only invocation duty; it MUST NOT inherit the worker's Vertex, storage, CMS, logging, or metric permissions. IAM bindings attach each principal only to the policy of the required product-project resource.

OIDC requires valid signature/time, exact audience `WORKER_OIDC_AUDIENCE`, issuer in verified immutable allowlist, and exact principal `TASK_INVOKER_SERVICE_ACCOUNT`; audience is canonical HTTPS worker origin without path/query/trailing slash; unset issuers reject all. App may create on one queue/read required secrets only; invoker may invoke one worker; worker runtime may use the gated Vertex model, CMS token, two object prefixes, logs/metrics; CMS gets no GCP authority. The effective quota/billing project MUST be `teleferico-bariloche-2024`; any explicit quota-project mechanism requires the worker principal to hold `roles/serviceusage.serviceUsageConsumer` on that project. Vertex usage, feature labels, logs, metrics, per-generation pricing snapshots, cumulative cost, and alerts all remain attributable there, distinct from OpenCode usage.

Terminal key `tb113:terminal-failure:{run}:v1` is created once after any failed commit, including enqueue exhaustion, never on retries; replay cannot re-alert. Cost key `tb113:cost-over-10-usd:{run}:v1` is created once crossing `<=10_000_000` to `>10_000_000` micros and is nonblocking.

Report key `private/feedback-reports/{reportId}/report.pdf` is private/no-store/indefinite. Sanitized `private/report-diagnostics/{run}/bundle.json` expires after 30 days. Final-key upload remains pending/non-downloadable until atomic CMS report completion; terminal failure requires deletion/verified absence; duplicate delivery resumes cleanup/completion by digest.

## Verification Gates

- **Project/API / platform:** reviewed readback proves operational, Vertex consumer, quota, billing, and telemetry ownership in `teleferico-bariloche-2024`; `aiplatform.googleapis.com`, `run.googleapis.com`, `storage.googleapis.com`, and `cloudtasks.googleapis.com` are enabled; Cloud Tasks supports `southamerica-east1`. Divergence disables generation.
- **Vertex / AI:** approved probes have established `vertexProjectId=teleferico-bariloche-2024`, `vertexLocation=us`, official endpoint `aiplatform.us.rep.googleapis.com`, exact `gemini-3.8-flash` availability, CountTokens behavior, fixed settings, strict-schema generation, usage metadata, and returned model revision. U11 still validates usable limits and Spanish narrative quality. Failure disables, with no alternate API/model/hostname or implicit project/location fallback.
- **Tasks/Run/OIDC / platform:** docs+redacted probes prove route/audience/issuer/name/deadline/retry/ingress, distinct invoker/runtime identities, and worker attachment; failure disables dispatch/generation.
- **Region/storage/IAM / platform:** inventory/docs prove locations, least-privilege resource policies, lifecycle, prefixes, keyless runtime identity, absence of service-account JSON keys from deployment, and absence of `GOOGLE_APPLICATION_CREDENTIALS`; divergence needs approval.
- **Strapi / CMS:** version docs/metadata+isolated PostgreSQL prove policies, transactions, relations, hooks, constraints; custom services own invariants, never CRUD.
