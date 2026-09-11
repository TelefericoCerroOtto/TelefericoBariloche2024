# Normative HTTP Contracts

Strict UTF-8 JSON rejects unknown fields. Implementation raw caps: public/admin/CMS-worker-and-Cloud-Run=32/16/4 KiB. Provider ceilings remain unnumbered verification gates. Dates=`YYYY-MM-DD`; datetimes=UTC RFC3339; IDs=UUID. Errors=`{error:{code,message,fields?,reportRunId?,details?}}` with safe text.

## Public

GET `/api/feedback/surveys/{publicCode}` requires `^[A-Za-z0-9_-]{32,128}$`; success is 200:

```ts
// Normative
type PublicSurveyV1={contractVersion:"feedback-public.v1";point:{pointKey:string;displayName:string};survey:{versionKey:string;translations:Record<"es"|"en"|"pt",{title:string;question:string;intro:string;privacyNotice:string;submitLabel:string;successMessage:string}>;aspects:Array<{aspectKey:string;sortOrder:number;labels:Record<"es"|"en"|"pt",string>}>};sessionToken:string;expiresAt:string};
type SubmitV1={contractVersion:"feedback-public.v1";sessionToken:string;idempotencyKey:string;locale:"es"|"en"|"pt";overallRating:1|2|3|4|5;aspects:Array<{aspectKey:string;rating:"positive"|"neutral"|"negative"}>;otherAspect?:{customText:string;rating:"positive"|"neutral"|"negative"};comment?:string;formLoadedAt:number;website:"";captchaToken:string};
type AcceptedV1={submissionReceipt:string;acceptedAt:string;guardUntil:string};
```

Survey aspects order by order/key. Unknown/inactive code, disabled intake, or absent active published version returns exact 410 `SURVEY_UNAVAILABLE`; malformed path is 400 `VALIDATION_FAILED`; CMS outage is 503 `UPSTREAM_UNAVAILABLE`. (D01, D13, D33)

The token is `base64url(header).base64url(payload).base64url(HMAC-SHA256(secret,header.payload))`; header `{alg:"HS256",typ:"TB113",v:1}`; claims `{v:1,pointKey,publicCodeHash,versionKey,nonce,iat,exp}`; lowercase hex hashes/nonces; `exp=iat+7200`. Submit permits the active version or `lastSupersededAt` within 1,800 seconds. Built-in cryptography avoids a JWT dependency.

POST `/api/feedback/submissions` constrains idempotency key to 16..128 `^[A-Za-z0-9._~-]+$`; `aspects` to 0..3 unique active-version keys excluding `other`; `otherAspect.customText` to 1..300 nonblank characters; optional comment to 1..2000; captcha to 1..4096; form age to 3 seconds..2 hours. Exact total `aspects.length + (otherAspect ? 1 : 0)` MUST be 1..3. Validation order is media/size→origin/fetch-site→JSON/closed schema→combined count/uniqueness/separation→form-age/honeypot→captcha→token→point/code/version/grace→durable idempotency→24-hour guard→commit→best-effort Redis. Identical replay returns 200 with original `AcceptedV1` before the guard; new acceptance returns 201 with the same shape. Errors: 400 `VALIDATION_FAILED`; 401 `INVALID_SESSION`; 403 `UNTRUSTED_REQUEST|CAPTCHA_FAILED`; 409 `IDEMPOTENCY_CONFLICT|GUARD_ACTIVE`; 410 `SURVEY_UNAVAILABLE|SESSION_EXPIRED`; 413 `PAYLOAD_TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE`; 503 `UPSTREAM_UNAVAILABLE`. Redis failure after authoritative checks accepts with degradation telemetry. Cookie: opaque HttpOnly Secure SameSite=Lax, path `/`, max-age 86,400; persist only its hash. (D15-D18, D23-D24, D33)

## Administration

Routes require Auth.js session/capability; mutations enforce origin→session/CSRF→capability→schema→CMS. CMS rechecks with server-held JWT. Queries require `from,to`, optional `pointKey,versionKey`, maximum 366 days. Lists add `page=1,pageSize=25` (1..100); generations alone allow `status`. Comments filter acceptance; reports/generations use period intersection; pagination follows filtering/order. Metric types come from Appendix 03.

```ts
// Normative
type MetaV1={filters:{from:string;to:string;pointKey:string|null;versionKey:string|null;status:string|null};population:PopulationMetaV1;page?:number;pageSize?:number;total?:number};
type ReadV1<T>={contractVersion:"feedback-admin.v1";data:T;meta:MetaV1};
type SummaryV1={current:PeriodV1;previous:PeriodV1;deltas:DeltasV1};
type AspectRowV1={aspectKey:string;label:string;sortOrder:number;current:SentimentV1;previous:SentimentV1};
type PointRowV1={pointKey:string;displayName:string;sortOrder:number;current:PeriodV1;previous:PeriodV1};
type AdminCommentV1=Omit<CommentRecordV1,"recordId">;
type ReportRowV1={reportId:string;reportRunId:string;period:{from:string;to:string};dataCutoffAt:string;createdAt:string;requestedBy:string|null;generatedBy:string|null;artifactSize:number;artifactSha256:string};
type GenerationRowV1={reportRunId:string;status:"queued"|"running"|"succeeded"|"failed";period:{from:string;to:string};dataCutoffAt:string;createdAt:string;completedAt:string|null;requestedBy:string|null;retryOfReportRunId:string|null;reportId:string|null;safeFailureMessage:string|null;cumulativeCostMicros:number};
type GenerateV1={contractVersion:"feedback-admin.v1";period:{from:string;to:string};override:{accepted:boolean;overlapDigest:string|null}};
```

Base `/api/admin/feedback/`: GET `summary` has no page keys; GET `aspects` orders `sortOrder,aspectKey`; GET `qr-points` orders `sortOrder,pointKey`; GET `comments` orders `acceptedAt DESC,receipt ASC`; GET `reports` orders `createdAt DESC,reportId ASC`; GET `generations` orders `createdAt DESC,reportRunId ASC`. Capabilities respectively are `feedback.read`, `feedback.read`, `feedback.read`, `feedback.comments.read`, `feedback.reports.read`, `feedback.reports.read`.

POST `generations` requires generate capability: no overlap→202 queued; overlap without matching digest→409 `OVERLAP_REQUIRES_OVERRIDE` with all intersections ordered start/run, digest, adjustment; active exact-range race→409 `ACTIVE_RANGE_CONFLICT` plus run. POST `generations/{run}/retry` accepts only `{contractVersion:"feedback-admin.v1"}` for failed source and returns a new queued run/lineage; otherwise 409 `INVALID_STATE`. GET `reports/{id}/download` requires download capability and streams PDF with attachment disposition, SHA-256 ETag, private/no-store, no URL. Mapping: 400 `VALIDATION_FAILED`; 401 `UNAUTHORIZED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`; named 409; 413 `PAYLOAD_TOO_LARGE`; 503 `UPSTREAM_UNAVAILABLE`; 500 `INTERNAL_ERROR`.

## CMS and Worker

No browser/CRUD. Intake token: GET `/api/tb113/public/surveys/:publicCode`, POST `/api/tb113/public/submissions`; user JWT mirrors admin. Worker outputs omit prompts/comments/credentials/signed URLs/unvalidated model output.

```ts
// Normative
type WorkerClaimCommandV1={commandVersion:"survey-report-command.v1"};
type WorkerClaimResultV1={contractVersion:"survey-worker-cms.v1";reportRunId:string;stateVersion:number}&({status:"running";disposition:"claimed"|"resumed";checkpoints:CheckpointSetV1;modelConfig:ModelConfigV1;pricingSnapshot:PricingSnapshotV1}|{status:"succeeded"|"failed";disposition:"terminal-replay"});
type SnapshotResultV1={contractVersion:"survey-worker-cms.v1";reportRunId:string;stateVersion:number;snapshot:SnapshotEnvelopeV1};
type CheckpointWriteV1={contractVersion:"survey-worker-cms.v1";expectedStateVersion:number;checkpoint:CheckpointV1};
type CheckpointResultV1={contractVersion:"survey-worker-cms.v1";reportRunId:string;stateVersion:number;stageKey:string;status:"valid";replayed:boolean};
type CompleteV1={contractVersion:"survey-worker-cms.v1";expectedStateVersion:number;validatedAnalysis:PublishedAnalysisV1;analysisDigest:string;rendererVersion:string;artifact:{objectKey:string;sha256:string;size:number;mimeType:"application/pdf"}};
type CompleteResultV1={contractVersion:"survey-worker-cms.v1";reportRunId:string;stateVersion:number;status:"succeeded";reportId:string;artifactSha256:string;artifactSize:number;replayed:boolean};
type FailV1={contractVersion:"survey-worker-cms.v1";expectedStateVersion:number;failureCode:RuntimeFailureCodeV1;safeFailureMessage:string};
type FailResultV1={contractVersion:"survey-worker-cms.v1";reportRunId:string;stateVersion:number;status:"failed";failureCode:RuntimeFailureCodeV1;replayed:boolean};
type DispatchFailureV1={contractVersion:"survey-dispatch-command.v1";expectedStateVersion:number;taskName:string;dispatchAttemptCount:number;failureCode:"QUEUE_ENQUEUE_EXHAUSTED"};
type DispatchFailureResultV1={contractVersion:"survey-dispatch-command.v1";reportRunId:string;stateVersion:number;status:"failed";failureCode:"QUEUE_ENQUEUE_EXHAUSTED";replayed:boolean};
```

Paths: `W=/api/tb113/worker/generations/:reportRunId`; `A=/api/tb113/admin/generations/:reportRunId`.

| Method/path | First success; replay | Specific failures | 413 (raw > cap: `PAYLOAD_TOO_LARGE`) |
|---|---|---|---|
| POST `W/claim` (`WorkerClaimCommandV1`) | 200 `WorkerClaimResultV1` `claimed`; replay `resumed` or minimal `terminal-replay` | 400 `INVALID_COMMAND`; 409 `INVALID_STATE` | Possible: >4 KiB |
| GET `W/snapshot` | 200 `SnapshotResultV1`; replay byte-equivalent | 409 `INVALID_STATE|DIGEST_MISMATCH` | Impossible/N/A: bodyless |
| PUT `W/checkpoints/:stageKey` | 200 `CheckpointResultV1`; identical replay has current version/`replayed:true` | 400 `VALIDATION_FAILED|UNKNOWN_VERSION`; 409 `STATE_VERSION_CONFLICT|CHECKPOINT_CONFLICT|DEPENDENCY_NOT_READY|DIGEST_MISMATCH` | Possible: >4 KiB |
| POST `W/complete` | 201 `CompleteResultV1`; identical replay 200/`replayed:true` | 400 `VALIDATION_FAILED|UNKNOWN_VERSION`; 409 `STATE_VERSION_CONFLICT|CHECKPOINT_SET_INCOMPLETE|DIGEST_MISMATCH|TERMINAL_CONFLICT` | Possible: >4 KiB |
| POST `W/fail` | 200 `FailResultV1`; identical replay 200/`replayed:true` | 400 `VALIDATION_FAILED`; 409 `STATE_VERSION_CONFLICT|TERMINAL_CONFLICT` | Possible: >4 KiB |
| POST `A/dispatch-failure` | 200 `DispatchFailureResultV1`; identical replay 200/`replayed:true` | 400 `VALIDATION_FAILED`; 409 `STATE_VERSION_CONFLICT|INVALID_STATE|TASK_ALREADY_CREATED` | Possible: >16 KiB |

All six add 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `RUN_NOT_FOUND`, and safe 500 `INTERNAL_ERROR`. Claim alone reads checkpoints. Identical checkpoint/terminal replay precedes stale CAS; differing replay conflicts. Appendix 04 validates completion. Only snapshot carries D50-D51 raw comments to the private worker, never browsers; others omit comments and raw prompt/model responses.

Cloud Run only exposes POST `/internal/v1/report-runs:execute` with `{commandVersion:"survey-report-command.v1",reportRunId}`; raw >4 KiB returns 413 `PAYLOAD_TOO_LARGE`. Auth precedes dependencies. Deadline-bounded 200: `{contractVersion:"survey-worker-execution.v1",reportRunId,status:"succeeded"|"failed",disposition:"completed"|"terminal-replay",failureCode?:RuntimeFailureCodeV1|"QUEUE_ENQUEUE_EXHAUSTED"}`. Failures: 400 `INVALID_COMMAND`, 401 `INVALID_OIDC`, 403 `FORBIDDEN_INVOKER`, 404 `RUN_NOT_FOUND`, 409 `INVALID_STATE`, retryable 503 `RETRYABLE_EXECUTION`, safe 500 `INTERNAL_ERROR`. Responses omit checkpoints/sensitive/raw content.
