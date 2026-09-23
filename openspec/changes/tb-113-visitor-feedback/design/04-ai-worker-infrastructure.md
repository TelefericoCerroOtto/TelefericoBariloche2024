# Normative AI, Worker, and Infrastructure Contracts

All content is normative except provider facts behind explicit gates.

## Model and Validation

```ts
// Normative
type ModelConfigV1={version:"survey-model-config.v1";provider:"vertex-ai";vertexProjectId:"teleferico-bariloche-2024";vertexLocation:"us";vertexApiEndpoint:"aiplatform.us.rep.googleapis.com";model:"gemini-3.8-flash";temperature:0;reasoning:"LOW";grounding:false;promptVersion:string;mapSchemaVersion:"survey-map.v1";analysisSchemaVersion:"survey-analysis.v1";redactionVersion:string;validatorVersion:string;chunkVersion:string;verifiedInputTokenLimit:number;map:{targetMin:600;targetMax:1200;hardMax:4000};directReduce:{targetMin:1800;targetMax:3000;hardMax:8000};safetyHeadroomTokens:number;sourceRevision:string};
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

Headroom=`max(2048,ceil(limit*10/100))`; `available=limit-instructions-schema-metrics-reservedOutput-headroom`, with exact token counts per serialized segment. Direct is selected only when the complete request fits. Otherwise sort complete redacted records by period/time/ID, token-count each, choose the minimum fitting chunk count, then place each record in the lowest-token chunk (tie: index). Never split, sample, or duplicate. Reduce receives validated maps plus immutable metrics.

Evidence ref=`e_` plus the first 20 lowercase base32 characters of `HMAC-SHA256(evidenceSecret,run+":"+recordId)`; its ref-to-comment map is memory-only. Objects reject unknown fields; IDs match `^[a-z0-9][a-z0-9._-]{0,63}$`; refs are unique/nonempty; `coveredRefs` exactly equals chunk refs. Sort themes/claims/digests by key/ID/chunk; sections use union order. Supported claims require threshold-valid refs and exact metrics; insufficient sections have no claims and fixed versioned Spanish text. Publication strips IDs/refs.

Model copies replace recognized versioned spans with `[EMAIL]`, `[PHONE]`, `[URL]`; originals remain unchanged. Validators reject parse/schema/version/order/language/token/ref/threshold/signal/metric/support/action/recommendation/causality/verbatim/exposed-ref/extra-section violations. Verbatim detection rejects a complete normalized comment under eight tokens or any contiguous eight-token match. Invalid output never renders.

## Checkpoints and Retries

```ts
// Normative
type PayloadV1={kind:"redact";recordCount:number;redactionVersion:string}|{kind:"count";segmentTokens:{instructions:number;schema:number;metrics:number;comments:number;reservedOutput:number;headroom:number};totalTokens:number}|{kind:"map";chunkId:string;chunkIndex:number;chunkCount:number;coveredRefs:string[];validatedOutput:MapV1}|{kind:"direct";validatedOutput:DirectV1}|{kind:"reduce";validatedOutput:ReduceV1}|{kind:"validate";publishedAnalysis:PublishedAnalysisV1;validatorVersion:string}|{kind:"render";rendererVersion:string;pdfSha256:string;size:number}|{kind:"store";objectKey:string;artifactSha256:string;size:number;mimeType:"application/pdf"};
type CheckpointV1={checkpointVersion:"survey-checkpoint.v1";stageKey:string;stageIndex:number;route:"common"|"direct"|"map-reduce";stageType:"redact"|"count"|"map"|"direct"|"reduce"|"validate"|"render"|"store";status:"valid";inputDigest:string;outputDigest:string;attempts:number;completedAt:string;payload:PayloadV1};
type CheckpointSetV1={version:"survey-checkpoints.v1";snapshotDigest:string;route:"undecided"|"direct"|"map-reduce";chunkCount:number|null;entries:CheckpointV1[]};
type RuntimeFailureCodeV1="PROVIDER_TRANSIENT"|"PROVIDER_RATE_LIMIT"|"PROVIDER_TIMEOUT"|"CMS_TRANSIENT"|"STORAGE_TRANSIENT"|"INVALID_OUTPUT"|"AUTHENTICATION"|"CONFIGURATION"|"UNKNOWN_VERSION"|"INVARIANT"|"PROHIBITED_CONTENT"|"QUEUE_ENQUEUE_EXHAUSTED";
type PricingSnapshotV1={version:string;currency:"USD";units:Array<{sku:string;inputMicrosPerMillion:number;outputMicrosPerMillion:number}>};
```

Keys are exactly `redact`, `count`, `direct`, `map.<i>-of-<n>`, `reduce`, `validate`, `render`, `store`; `<i>`/`<n>` are canonical decimals, `1<=i<=n`. `redact,count` use route `common`. Unique ordered indexes are direct: `0,1,2,3,4,5`; map/reduce: redact `0`, count `1`, map `i+1`, reduce `n+2`, validate `n+3`, render `n+4`, store `n+5`. Closed-set validation enforces unique key/index, one selected route/count, and every map index exactly once without another model/collection.

Required direct set: `{redact,count,direct,validate,render,store}`. Required map/reduce set: `{redact,count,map.1-of-n..map.n-of-n,reduce,validate,render,store}`. Edges are `redact→count→direct→validate→render→store` or `redact→count→all maps→reduce→validate→render→store`; only eligible stages commit. `inputDigest=SHA-256(tb-json.v1({stageKey,stageIndex,route,snapshotDigest,sourceRevision,contractVersions,stageConfigDigest,orderedDependencyOutputDigests,chunkMembershipDigest}))`; map membership binds ordered refs/index/count and is null otherwise. `outputDigest` hashes the canonical validated payload. CMS recomputes both before CAS.

Checkpoints prohibit visitor comments, raw/redacted prompts, credentials, signed URLs, the ref map, and unvalidated output. Persist only minimum fully schema/evidence/metric/language/token/verbatim-validated map/direct/reduce outputs and required refs/digests. Invalid output is memory-only and discarded before checkpoint, response, log, or diagnostic. Valid metadata/minimum outputs are indefinite (D55/D63/D78); 30-day diagnostics contain only keys/indexes, digests, counters, timings, validator codes, safe errors—never checkpoint text.

Identical valid-stage replay succeeds without state/attempt change; reuse of key or index with different binding is `CHECKPOINT_CONFLICT`. Resume retries the lowest missing eligible stage, preserves valid sibling maps, and blocks reduce until all maps validate. Mismatched persisted input fails `INVARIANT`; history is never overwritten. No persisted valid stage with matching bindings repeats. Transient operations get two retries after the first attempt; invalid model output gets one controlled regeneration; other failures are terminal.

Cost/call=`ceil(input*inputRate/1e6)+ceil(output*outputRate/1e6)` for persisted SKU; cached tokens require explicit cached SKU. Missing usage/SKU is `CONFIGURATION`; never estimate; sum checked integer costs.

## Task, Identity, Alerts, and Storage

Task name=`tb113-report-`+run UUID without hyphens, stored by CMS before enqueue; body/route are Appendix 02. The authorized Next.js `GenerationDispatchCoordinator` alone creates tasks: three attempts, deterministic 1s then 2s delay, transient transport/rate/5xx only. Same-name succeeds only for the same stored run/name. Auth/config rejection or third-attempt exhaustion before claim invokes Appendix-02 dispatch-failure CAS; CMS alone commits queued→failed `QUEUE_ENQUEUE_EXHAUSTED`. Replay is idempotent; running/terminal races conflict; no report/object is created.

U9-A1 supplies only the authenticated CMS dispatch-failure CAS endpoint and
app-side wiring for a dispatcher result that proves no task was created. It does
not reserve or persist `taskName`, create Cloud Tasks, or implement retry
classification. Task-name pre-reservation and the production dispatcher remain
U10-owned; until that evidence exists, `DISPATCH_UNAVAILABLE` leaves the run
queued and ambiguous outcomes are not compensated.

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
