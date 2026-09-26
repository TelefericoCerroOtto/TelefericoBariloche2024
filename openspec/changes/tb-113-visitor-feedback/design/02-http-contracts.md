# Normative HTTP Contracts

Strict UTF-8 JSON rejects unknown fields. Implementation raw caps: public/admin/CMS-worker-and-Cloud-Run=32/16/4 KiB. Provider ceilings remain unnumbered verification gates. Dates=`YYYY-MM-DD`; datetimes=UTC RFC3339; IDs=UUID. Errors=`{error:{code,message,fields?,reportRunId?,details?}}` with safe text.

## Public

GET `/api/feedback/surveys/{publicCode}` requires `^[A-Za-z0-9_-]{32,128}$`; success is 200:

```ts
// Normative
type PublicCopyKeyV1="headerTitle"|"localeLabel"|"progressLabel"|"overallQuestion"|"overallInstruction"|"aspectsQuestion"|"aspectsInstruction"|"otherLabel"|"sentimentQuestion"|"sentimentInstruction"|"commentQuestion"|"commentInstruction"|"commentLabel"|"personalDataWarning"|"verificationTitle"|"verificationInstruction"|"privacyNotice"|"backLabel"|"nextLabel"|"submitLabel"|"loadingStatus"|"ratingRequired"|"aspectsRequired"|"otherRequired"|"sentimentsRequired"|"verificationFailed"|"submittingStatus"|"genericFailure"|"successTitle"|"successMessage"|"receiptLabel";
type PublicSurveyV1={contractVersion:"feedback-public.v1";point:{pointKey:string;displayName:string};survey:{versionKey:string;translations:Record<"es"|"en"|"pt",Record<PublicCopyKeyV1,string>>;aspects:Array<{aspectKey:string;sortOrder:number;labels:Record<"es"|"en"|"pt",string>}>};sessionToken:string;expiresAt:string};
type SubmitV1={contractVersion:"feedback-public.v1";sessionToken:string;idempotencyKey:string;locale:"es"|"en"|"pt";overallRating:1|2|3|4|5;aspects:Array<{aspectKey:string;rating:"positive"|"neutral"|"negative"}>;otherAspect?:{customText:string;rating:"positive"|"neutral"|"negative"};comment?:string;formLoadedAt:number;website:"";captchaToken:string};
type AcceptedV1={submissionReceipt:string;acceptedAt:string;guardUntil:string};
```

Survey aspects order by order/key. Unknown/inactive code, disabled intake, or absent active published version returns exact 410 `SURVEY_UNAVAILABLE`; malformed path is 400 `VALIDATION_FAILED`; CMS outage is 503 `UPSTREAM_UNAVAILABLE`. (D01, D13, D33)

The token is `base64url(header).base64url(payload).base64url(HMAC-SHA256(secret,header.payload))`; header `{alg:"HS256",typ:"TB113",v:1}`; claims `{v:1,pointKey,publicCodeHash,versionKey,nonce,iat,exp}`; lowercase hex hashes/nonces; `exp=iat+7200`. Submit permits the active version or `lastSupersededAt` within 1,800 seconds. Built-in cryptography avoids a JWT dependency.

POST `/api/feedback/submissions` constrains idempotency key to 16..128 `^[A-Za-z0-9._~-]+$`; `aspects` to 0..3 unique active-version keys excluding `other`; `otherAspect.customText` to 1..300 nonblank characters; optional comment to 1..2000; captcha to 1..4096; form age to 3 seconds..2 hours. Exact total `aspects.length + (otherAspect ? 1 : 0)` MUST be 1..3. Validation order is media/size→origin/fetch-site→JSON/closed schema→combined count/uniqueness/separation→form-age/honeypot→captcha→token→point/code/version/grace→durable idempotency→24-hour guard→commit→best-effort Redis. Identical replay returns 200 with original `AcceptedV1` before the guard; new acceptance returns 201 with the same shape. Errors: 400 `VALIDATION_FAILED`; 401 `INVALID_SESSION`; 403 `UNTRUSTED_REQUEST|CAPTCHA_FAILED`; 409 `IDEMPOTENCY_CONFLICT|GUARD_ACTIVE`; 410 `SURVEY_UNAVAILABLE|SESSION_EXPIRED`; 413 `PAYLOAD_TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE`; 503 `UPSTREAM_UNAVAILABLE`. Redis failure after authoritative checks accepts with degradation telemetry. Cookie: opaque HttpOnly Secure SameSite=Lax, path `/`, max-age 86,400; persist only its hash. (D15-D18, D23-D24, D33)

## Public Form Projection

The single stage order is header/locale/progress → Q1 integer 1-5 overall rating → Q2 1-3 active-version aspects presented by `sortOrder,aspectKey` → Q3 explicit negative/neutral/positive sentiment for each selection → Q4 optional 1-2000-character comment and personal-data warning → uncounted production anti-abuse verification → authoritative success/receipt. One is lowest and five highest; the UI introduces no verbal scale labels. `other` requires its own text and sentiment and never becomes Q4.

Mobile and desktop share this state machine and validation; responsive code changes presentation only. A failed forward action remains on the stage, updates a `role="status"` or equivalent live status, and focuses the first invalid control. Back and locale navigation preserve all answers. Draft storage/resume requires the QR-bound version+point context and expires after two hours; no generic resume route exists.

All copy and states use semantic keys with ES/EN/PT values, including loading, empty, validation, server failure, privacy, verification, and success. Missing selected-locale copy falls back to ES and emits telemetry. The privacy notice appears before submit; submit acknowledgment requires no checkbox and persists no consent event/version. CAPTCHA is server verified under the production failure policy and is not a question. Success is derived only from `AcceptedV1` and the guard contract.

## Administration

Routes require Auth.js session/capability; mutations enforce origin→session/CSRF→capability→schema→CMS. CMS rechecks with server-held JWT. The shared analyzed period requires `from,to`, maximum 366 days; only the route-specific filters below are accepted. Lists add `page=1,pageSize=25` (1..100); generations alone allow `status`. Comments filter acceptance; reports/generations use period intersection; pagination follows filtering/order. Metric types come from Appendix 03.

```ts
// Normative
type RouteFiltersV1={route:"summary";from:string;to:string}|{route:"aspects";from:string;to:string;pointKey:string|null}|{route:"qr-comparison";from:string;to:string;pointKeys:string[]}|{route:"qr-detail";from:string;to:string;pointKey:string}|{route:"comments";from:string;to:string;aspectKey:string|null;ratings:Array<1|2|3|4|5>;pointKey:string|null;locale:"es"|"en"|"pt"|null;text:string|null}|{route:"reports";from:string;to:string}|{route:"generations";from:string;to:string;status:string|null};
type MetaV1={filters:RouteFiltersV1;population:PopulationMetaV1;page?:number;pageSize?:number;total?:number};
type ReadV1<T>={contractVersion:"feedback-admin.v1";data:T;meta:MetaV1};
type SummaryV1={current:PeriodV1;previous:PeriodV1;deltas:DeltasV1};
type AspectRowV1={aspectKey:string;label:string;sortOrder:number;current:SentimentV1;previous:SentimentV1};
type PointRowV1={pointKey:string;displayName:string;sortOrder:number;current:PeriodV1;previous:PeriodV1};
type AdminCommentV1=Omit<CommentRecordV1,"recordId">;
type ReportRowV1={reportId:string;reportRunId:string;name:string;period:{from:string;to:string};status:"succeeded";analyzedResponseCount:number;analyzedCommentCount:number;dataCutoffAt:string;createdAt:string;requestedBy:string|null;generatedBy:string|null;canDownload:boolean;artifactSize:number;artifactSha256:string};
type GenerationRowV1={reportRunId:string;status:"queued"|"running"|"succeeded"|"failed";period:{from:string;to:string};dataCutoffAt:string;createdAt:string;completedAt:string|null;requestedBy:string|null;retryOfReportRunId:string|null;reportId:string|null;safeFailureMessage:string|null;cumulativeCostMicros:number};
type GenerateV1={contractVersion:"feedback-admin.v1";period:{from:string;to:string};override:{accepted:boolean;overlapDigest:string|null}};
```

Base `/api/admin/feedback/`: GET `summary` accepts only `from,to`; GET `aspects` adds optional `pointKey` and orders analytics rows by selection count descending, then `sortOrder,aspectKey`; GET `qr-points` has a comparison projection with its own nonempty selected-point set and a detail projection with exactly one point; GET `comments` adds optional aspect/rating/point/language/text filters and orders `acceptedAt DESC,receipt ASC`; GET `reports` accepts only `from,to` and orders `createdAt DESC,reportId ASC`; GET `generations` alone adds nullable `status` and orders `createdAt DESC,reportRunId ASC`. Every other route-specific filter is rejected. Comment `total`, pages, detail eligibility, and empty state use the same filtered set. Report generation accepts only its independent range and overlap fields, never comment filters. Capabilities respectively are `feedback.read`, `feedback.read`, `feedback.read`, `feedback.comments.read`, `feedback.reports.read`, `feedback.reports.read`.

Top-level navigation and module projections are fixed:

1. **Summary:** responses, average rating, satisfaction, unfavorable; temporal evolution; star distribution; strengths/opportunities; latest successful report by `createdAt DESC,reportId ASC`.
2. **Aspects:** period overview; selected-aspect sentiment, related overall rating by sentiment, and temporal evolution; priority matrix; five-star association; structured `other` entries.
3. **QR points:** Comparison then Detail tabs. Comparison has selectors, four KPIs, volume by point, and a comparison table, with no temporal evolution. Detail has one selector, four KPIs, star distribution, temporal evolution, exact-data table, and a point-filtered aspects link/context.
4. **Comments and reports:** comment filters/results/pagination/detail; AI explanation; independent generation; immutable history.

Every route uses the shared analyzed range and previous equal-duration comparison. Responsive projections may replace navigation, layout, or tables with equivalent cards only. Invitation/scan response rate is prohibited until a denominator contract exists. Prior-zero, zero-denominator, low-evidence, and empty states are explicit. Report history contains persisted rows only; no synthetic first row or demo download text is normative.

POST `generations` requires generate capability: no overlap→202 queued; overlap without matching digest→409 `OVERLAP_REQUIRES_OVERRIDE` with all intersections ordered start/run, digest, adjustment; active exact-range race→409 `ACTIVE_RANGE_CONFLICT` plus run. POST `generations/{run}/retry` accepts only `{contractVersion:"feedback-admin.v1"}` for failed source and returns a new queued run/lineage; otherwise 409 `INVALID_STATE`. GET `reports/{id}/download` requires `feedback.reports.read`, rejects query parameters, and returns only verified PDF bytes as an attachment with SHA-256 ETag, `private, no-store`, `nosniff`, and no storage URL. It checks the capability flag before authentication or service access, then applies the existing origin, session/CSRF, and capability guards. Report IDs are lowercase UUIDs; malformed IDs return 400 and missing reports return 404. Other metadata/storage failures map to 503. The response uses `Content-Type: application/pdf`, a bounded `Content-Length`, and filename `feedback-report-{reportId}.pdf`. PDFs are capped at 25 MiB; metadata must bind the requested report to its succeeded generation and match the fixed report object-key pattern, a lowercase SHA-256, positive size, and PDF MIME. The app reads the private object through an injected server-only reader, verifies byte length, PDF signature, and digest before returning it. No production GCS reader, token, credential, or default composition is supplied, so production download remains unavailable until separately approved wiring exists. Other mappings: 401 `UNAUTHORIZED`; 403 `FORBIDDEN`; named 409; 413 `PAYLOAD_TOO_LARGE`; 500 `INTERNAL_ERROR`.

The CMS-only metadata endpoint is `GET /api/tb113/worker/reports/{reportId}/download-metadata`. It accepts no query parameters and requires the native `content-api-token` strategy plus the exact action `api::survey-report-generation.survey-report-generation.workerReportDownloadMetadata`. The controller checks Strapi's selected strategy, token kind, and custom-token type before query or database access. It verifies the report-to-generation relation and `status="succeeded"`, then returns exactly `{contractVersion:"survey-report-download-metadata.v1",reportId,reportRunId,generationStatus:"succeeded",objectKey,sha256,size,mimeType:"application/pdf"}`. The response contains no signed URL, PDF bytes, private comments, prompts, or analysis. Anonymous, JWT, and wrong-scope callers are denied; no default or persistent token/role grant is added. The app's server-only transport uses a trusted exact-origin allowlist and a token provider bound to this one action. No browser caller accesses this CMS endpoint or sees its response.

U8-B owns only the generate/retry command boundary through authenticated Next.js
and native Strapi core generation endpoints. The application helper performs
validation, overlap disclosure, and retry decisions before using core CRUD;
U8-A owns report reads/history; U9 owns active-range races,
retry lineage/state-machine behavior, and worker cutoffs; U12-A owns PDF artifact
storage and download mediation. Those later contracts remain normative, but are
not implemented in this slice.

## CMS and Worker

No browser/CRUD. The app-owned public resolver reads the native Strapi REST
surfaces for `survey-qr-points`, `survey-settings`, and `survey-versions` with
the server-held feedback token. Transactional intake remains
`POST /api/tb113/public/submissions`; user JWT mirrors admin. Worker outputs
omit prompts/comments/credentials/signed URLs/unvalidated model output.

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
type DispatchStateCommandV1={contractVersion:"survey-dispatch-state.v1";action:"reserve";expectedStateVersion:number;taskName:string}|{contractVersion:"survey-dispatch-state.v1";action:"record";expectedStateVersion:number;taskName:string;outcome:"created"|"unknown";dispatchAttemptCount:1|2|3;evidence:DispatchEvidenceV1};
type DispatchEvidenceV1={contractVersion:"survey-dispatch-evidence.v1";outcome:"created";taskName:string;dispatchAttemptCount:number;verifiedAt:string}|{contractVersion:"survey-dispatch-evidence.v1";outcome:"unknown";taskName:string;dispatchAttemptCount:number;reasonCode:"AMBIGUOUS_RESPONSE"|"PROVIDER_UNAVAILABLE"|"UNCLASSIFIED"};
type DispatchStateResultV1={contractVersion:"survey-dispatch-state.v1";reportRunId:string;taskName:string;stateVersion:number;status:"queued";dispatchState:"reserved"|"created"|"unknown";dispatchAttemptCount:number;failureCode:null;replayed:boolean};
```

Paths: `W=/api/tb113/worker/generations/:reportRunId`; `A=/api/tb113/admin/generations/:reportRunId`; dispatch state `POST /api/tb113/admin/generations/:reportRunId/dispatch-state`.

| Method/path | First success; replay | Specific failures | 413 (raw > cap: `PAYLOAD_TOO_LARGE`) |
|---|---|---|---|
| POST `W/claim` (`WorkerClaimCommandV1`) | 200 `WorkerClaimResultV1` `claimed`; replay `resumed` or minimal `terminal-replay` | 400 `INVALID_COMMAND`; 409 `INVALID_STATE` | Possible: >4 KiB |
| GET `W/snapshot` | 200 `SnapshotResultV1`; replay byte-equivalent | 409 `INVALID_STATE|DIGEST_MISMATCH` | Impossible/N/A: bodyless |
| PUT `W/checkpoints/:stageKey` | 200 `CheckpointResultV1`; identical replay has current version/`replayed:true` | 400 `VALIDATION_FAILED|UNKNOWN_VERSION`; 409 `STATE_VERSION_CONFLICT|CHECKPOINT_CONFLICT|DEPENDENCY_NOT_READY|DIGEST_MISMATCH` | Possible: >4 KiB |
| POST `W/complete` | 201 `CompleteResultV1`; identical replay 200/`replayed:true` | 400 `VALIDATION_FAILED|UNKNOWN_VERSION`; 409 `STATE_VERSION_CONFLICT|CHECKPOINT_SET_INCOMPLETE|DIGEST_MISMATCH|TERMINAL_CONFLICT` | Possible: >4 KiB |
| POST `W/fail` | 200 `FailResultV1`; identical replay 200/`replayed:true` | 400 `VALIDATION_FAILED`; 409 `STATE_VERSION_CONFLICT|TERMINAL_CONFLICT` | Possible: >4 KiB |
| POST `A/dispatch-failure` | 200 `DispatchFailureResultV1`; identical replay 200/`replayed:true` | 400 `VALIDATION_FAILED`; 409 `STATE_VERSION_CONFLICT|INVALID_STATE|TASK_ALREADY_CREATED` | Possible: >16 KiB |
| POST `A/dispatch-state` (`DispatchStateCommandV1`) | `reserve`: 200 `reserved`; `record(created|unknown)`: 200 queued; identical replay reports `replayed:true` | 400 `VALIDATION_FAILED` (including all `absent` outcomes); 404 `RUN_NOT_FOUND`; 409 `STATE_VERSION_CONFLICT|INVALID_STATE|TASK_ALREADY_CREATED|TASK_IDENTITY_CONFLICT` | Possible: >16 KiB |

All worker/admin command actions add 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `RUN_NOT_FOUND`, and safe 500 `INTERNAL_ERROR`. Claim alone reads checkpoints. Identical checkpoint/terminal replay precedes stale CAS; differing replay conflicts. Appendix 04 validates completion. Only snapshot carries D50-D51 raw comments to the private worker, never browsers; others omit comments and raw prompt/model responses.

`POST W/fail` is a CMS terminal-state command, not a client-provided diagnostic
channel. It requires Strapi's native `content-api-token` strategy, the exact
`api::survey-report-generation.survey-report-generation.workerFail` scope, and
the shared controller identity guard before body measurement/reading or database
access. Users & Permissions JWTs remain denied even if their role has this
action. The exact closed `FailV1` body is capped at 4 KiB; `failureCode` must be
a known `RuntimeFailureCodeV1` and `safeFailureMessage` must equal its fixed
bounded mapping in Appendix 04. Caller comments, prompts, stack traces, signed
URLs, and any non-mapped text are rejected without persistence or reflection.

The lifecycle locks the generation row. Only `running` with the exact
`expectedStateVersion` may transition to `failed`; the update increments
`stateVersion` once and records only `failureCode`, the mapped safe message, and
`completedAt`. It creates no report or partial PDF. Before stale-CAS handling,
an identical already-failed command (same expected version, code, and mapped
message) returns the current version with `replayed:true` and no mutation.
Changed terminal replay and `queued`/`succeeded` states return 409
`TERMINAL_CONFLICT`; a stale running version returns 409
`STATE_VERSION_CONFLICT`. No alert is emitted by this endpoint; any later alert
adapter may run only after the terminal commit succeeds and must deduplicate
replays.

The local checkpoint route accepts CMS-verified zero-comment and nonempty-comment **DIRECT** graphs plus synthetic **MAP/REDUCE** graphs. Direct execution uses injected CountTokens/analysis/key fakes; map/reduce uses injected CountTokens/map/reduce/key fakes. CMS independently recomputes exact serialized request digests, smallest-fit chunk routing, evidence refs and chunk membership, map output digests, stage graph dependencies/order, structural/privacy/threshold checks, and state-version CAS under the generation row lock. Reduce digests must match the persisted CMS-verified map checkpoints, and the reducer receives only those maps plus immutable core metrics. Semantic truth and contradiction are intentionally not judged. Live provider and storage integrations remain gated. `W/complete` independently rechecks the complete route-specific stage graph, CMS-verified published projection, renderer/artifact bindings, and state version before atomically creating the report and succeeding the generation. Both actions require their own exact custom content API token scope and have no default grant.

`POST W/claim`, `GET W/snapshot`, `PUT W/checkpoints/:stageKey`, `POST
W/complete`, and `POST W/fail` require the native Strapi `content-api-token` strategy and their
respective exact custom action scopes:
`api::survey-report-generation.survey-report-generation.workerClaim`,
`...workerSnapshot`, `...workerCheckpoint`, `...workerComplete`, and `...workerFail`. A shared controller guard
checks Strapi's selected strategy and credential `kind: "content-api"` plus
`type: "custom"` before worker body measurement/reading or any service/database
access. No Users & Permissions JWT fallback is accepted, even when a role has
the same worker action. Existing JWT grants for these worker actions therefore
stop authorizing the worker endpoints; this is an intentional auth migration,
not a global auth change. A separately approved worker owner must provision a
custom content API token with only the exact action needed by its caller. This
repository creates no persistent token or grant and adds no default permission.

Claim accepts only the exact command under the 4 KiB worker cap, locks the
generation row, and atomically performs queued→running with one state-version
increment and `claimedAt`. Running returns `resumed` without a write;
succeeded/failed returns only the terminal replay identity/status/version. The
running projection contains only checkpoints, model configuration, and pricing
snapshot—never comments. Snapshot remains running-only, byte-equivalent on replay,
and validates the immutable snapshot digest before exposing private comments.
Direct and map/reduce checkpoint writes are accepted only after CMS graph/input/output digest recomputation and compare-and-swap. For nonempty output, the worker and CMS resolve the immutable evidence-key ID to the same injected per-run key. CMS derives reference membership, verifies chunk balance and complete record coverage, independently validates map/reduce structures, and binds each Reduce digest to a persisted map output in chunk order. Completion revalidates the route-specific graph and published projection, then atomically creates the report and succeeds the generation. The implementation accepts structurally valid narratives without semantic-truth judgment; the local integration uses only synthetic provider/key fakes. Live provider/storage integrations remain gated.

`A/dispatch-failure` is a CMS-authenticated command action, granted explicitly
to the corresponding Users & Permissions role for the server-mediated
application user JWT from the Auth.js session; no API token is used for this
call, and browser/public callers never receive the CMS credential. It accepts
only the exact `DispatchFailureV1` shape within 16 KiB. CMS performs
the state/version check and update under one row-locking transaction; identical
exhaustion replay is recognized before stale-version rejection. Running/claimed,
task-created, terminal, altered, and stale requests fail closed. The app invokes
it only when its dispatcher returns the typed `noTaskCreated: true` exhaustion
outcome; malformed or unmeasurable request bodies fail closed with 413 before
the service is read. When raw bytes are not exposed by the runtime, the action
requires a valid bounded `Content-Length` and rejects chunked/unmeasurable
bodies. Thrown/ambiguous dispatcher outcomes and `DISPATCH_UNAVAILABLE` do not
invoke compensation. The current default dispatcher remains unavailable and
leaves runs queued. The local CMS reservation/outcome contract is added below;
app integration and real enqueue/retry proof remain deferred to U10.

The additive U10-A CMS seam persists `dispatchState` separately from
`taskName`: `unreserved` → `reserved` before enqueue, then `created` or
`unknown`. The authenticated `A/dispatch-state` action uses state-version CAS
and identical-command replay. `unknown` leaves the generation queued and blocks
another reservation. The action rejects every `absent` outcome and cannot commit
queued→failed; caller-supplied `not-found` text is not authoritative proof. The
existing U9-A1 v1 compensation action remains unchanged and still rejects a
reserved task name. Reservation/created/unknown behavior is locally tested, but
there is no verified absence path or real dispatch; both remain pending for a
future authorized provider adapter.

Cloud Run only exposes POST `/internal/v1/report-runs:execute` with `{commandVersion:"survey-report-command.v1",reportRunId}`; raw >4 KiB returns 413 `PAYLOAD_TOO_LARGE`. Auth precedes dependencies. Deadline-bounded 200: `{contractVersion:"survey-worker-execution.v1",reportRunId,status:"succeeded"|"failed",disposition:"completed"|"terminal-replay",failureCode?:RuntimeFailureCodeV1|"QUEUE_ENQUEUE_EXHAUSTED"}`. Failures: 400 `INVALID_COMMAND`, 401 `INVALID_OIDC`, 403 `FORBIDDEN_INVOKER`, 404 `RUN_NOT_FOUND`, 409 `INVALID_STATE`, retryable 503 `RETRYABLE_EXECUTION`, safe 500 `INTERNAL_ERROR`. Responses omit checkpoints/sensitive/raw content.

### Authenticated private CMS source pages

The bounded CMS source reader is `POST /api/tb113/worker/report-source` and
requires the exact
`api::survey-report-generation.survey-report-generation.workerSourceRead` scope
under Strapi's `content-api-token` strategy only. Users & Permissions is not a
fallback strategy. The controller checks Strapi's actual auth result for the
`content-api-token` strategy, `kind: "content-api"`, and `type: "custom"` before
measuring or validating the request body or invoking the source service. In
Strapi 5, the core content API auth middleware stores the selected strategy and
credentials in `ctx.state.auth`; the installed token strategy supplies these
fields after verifying the API token. The route has no native submission CRUD
permission, and the service reads only its explicit raw SQL projection.

The disposable HTTP harness proves anonymous denial, denial of an ordinary
application-user JWT even with the same workerSourceRead Users & Permissions
action granted, denial of a custom API token without this action, allow for a
synthetic custom content API token with only this action, and denial of native
`survey-submission.find` to both JWT and custom-token callers. The action and
synthetic tokens are created only in the ephemeral test database. No persistent
grant, real credential, schema, generated type, dependency, or environment
change is part of this contract. Real worker custom-token provisioning remains
a separately authorized operational step.

```ts
// Normative source-page request and response
type GenerationSourceResourceV1 = "submissions" | "versions" | "points";
type GenerationSourcePageRequestV1={contractVersion:"survey-generation-source.v1";resource:GenerationSourceResourceV1;acceptedAtGte:string;acceptedAtLte:string;dataCutoffAt:string;cursor:string|null;pageSize:number};
type GenerationSourcePageResponseV1={contractVersion:"survey-generation-source.v1";resource:GenerationSourceResourceV1;cursor:string|null;nextCursor:string|null;total:number;items:unknown[]};
```

The request is closed, uses canonical UTC instants, restricts the inclusive
window to at most 732 days, and accepts only page sizes `1..25`; measured request
bodies above 4 KiB return 413. Cursors are opaque base64url values bound to the
resource, time window, and immutable cutoff. Submission pages keyset on unique
receipt order; version and point pages keyset on canonical document ID. Every
page returns the same complete-set total; malformed cursors, unstable totals,
missing relations/ratings, and query failures return a bounded failure, never a
partial page success. Submission rows are restricted to `source=valid_qr` and
the selected accepted-time window. The query intentionally does not filter by
`dataCutoffAt`: rows after the frozen cutoff must reach the shared core so it
can compute `excludedAfterCutoffCount`. Each submission explicitly includes
nullable `comment`, lowercase `payloadDigest`, ratings, and canonical version/
point IDs and keys. `survey-version` pages include definitions; `survey-qr-point`
pages include point identity/display/order. Do not expose this projection through
the browser, admin dashboard, generic native `find`, or public role/token.

### App server-only transport for private source pages

`teleferico-app/services/survey-report-worker/src/private-report-source-transport.ts`
implements only the server-only HTTP adapter for the source-page action. Its
factory requires an explicit CMS origin, a nonempty exact-origin allowlist,
and a token-provider function. The allowlist must come from a trusted
server-only composition; no production composition or approved CMS hostname
exists yet. Both the configured target and every allowlist entry must be a
canonical public HTTPS DNS origin. Missing/empty/mismatched allowlists, all IP
literal destinations (including public, loopback, private, and link-local),
localhost/private/reserved/metadata/deceptive hostnames, userinfo, noncanonical
authority, path, query, or fragment are rejected. The target origin is matched
exactly against the allowlist before the token provider can run. The path is
fixed to `POST /api/tb113/worker/report-source`; redirects use `redirect: error`
and redirected/cross-origin responses are rejected, requests use
`cache: no-store`, and the provider is called for each page. There is no
environment lookup, default allowlist/token, fallback authentication strategy,
U&P JWT, browser route, or admin generate/retry/dispatch wiring.

The adapter sends the closed `survey-generation-source.v1` request with page
size 25 and enforces a 4 KiB request-body ceiling, a 10-second per-page deadline
covering token acquisition/fetch/body read, a 1 MiB response-body ceiling (both
declared and streamed size), JSON media type, exact version/resource/cursor/page
envelope, safe-integer totals, and the CMS 732-day/1,024-character cursor
bounds. It maps CMS 401/403 and other upstream failures to fixed non-sensitive
error categories and never logs provider errors, response bodies, credentials,
or comments. The existing `buildAuthoritativeGenerationInputsV1` then enforces
the complete cursor chain, stable total, terminal row count, normalized source
rows, private comment/digest fields, and relation identities before invoking
the immutable materializer; no partial snapshot is returned.

The fake-fetch app tests exercise all three resource types and cursor paging,
exact allowlist match-before-token behavior, unsafe/private/metadata/deceptive
origin rejection (including origins mistakenly listed), redirect refusal,
auth/status failures, malformed envelopes, oversized responses, timeout,
provider/fetch/JSON failures, and credential/comment non-disclosure. They do not
prove app-to-Strapi HTTP compatibility or establish an approved production
origin. The exact deferred integrated proof is an isolated app↔Strapi run using
a test-only trusted server composition with an explicitly approved canonical
HTTPS origin and synthetic custom content API token carrying only
`workerSourceRead`; use more than 25 synthetic submissions to exercise a real
CMS cursor page, read submissions/versions/points through the transport, and
pass the complete rows to the existing authoritative source builder. Verify
denied/invalid credentials, exact private projection, all-page totals and
materialization; use only the disposable test database and remove its owned
services/data afterward. This scenario is `not run`; the test-origin/allowlist
source remains unselected; owner is the TB-113 app/CMS implementer and reviewer.

The future operational credential source is a dedicated Secret Manager secret
injected only into the app server runtime and supplied through the explicit
token-provider interface. The secret resource name, IAM grant, and runtime
binding are not approved or configured; no token was provisioned or read. The
platform/CMS runtime operator owns creation, least-privilege grant, and rotation;
the named individual owner remains unassigned. This operational setup and the
real token remain separately authorized work.

### U10-A10 same-process app↔CMS integration evidence

The disposable `teleferico-cms/test/feedback/private-report-source.test.js`
harness now loads the app transport, authoritative source adapter, materializer,
and their restricted relative TypeScript import graph in the same test process.
It uses only the CMS-installed transitive TypeScript `5.4.5` compiler through
`transpileModule`, with a test-only empty `server-only` stub and explicit
`node:net`/`node:crypto` built-in imports. It has no global require hook, child
process, new environment variable, temporary source file, or direct dependency
addition. The loader fails closed if the required compiler version or approved
source module graph is unavailable; TypeScript remains a transitive CMS
dependency and must not be installed or added solely for this harness.

The in-memory fetch adapter permits only the exact logical
`https://cms.example.com/api/tb113/worker/report-source` URL. It never resolves
that hostname; it forwards only to the active disposable Strapi server on
`127.0.0.1`, with redirects disabled and the synthetic custom content API token
carried only in the current test process. A test `Response` wrapper reports the
approved logical URL and no redirect so the production transport's allowlist
and response-origin checks remain exercised. Any other URL is rejected before
the Authorization header is forwarded.

The harness reads 27 marker-free synthetic valid-QR rows: 13 in the previous
period, 13 in the current period before the frozen cutoff, and one in-range row
after that cutoff. It proves complete submissions paging of 25+2 with stable
totals/cursors, one version page, one point page, nullable private comment and
payload-digest projection, 27 unique receipts, and materialization counts of
13 previous, 13 current, and 1 excluded-after-cutoff submission. An interrupted
continuation rejects the entire authoritative build instead of returning a
partial materialization. The existing test `finally` path destroys Strapi,
removes only the named owned Compose project, and verifies owned container and
volume absence.

This is local synthetic HTTP integration evidence only. No production app/CMS
logic, schema, auth policy, permission grant, environment, dependency, or
deployment behavior changed. No real credential, production origin, GCP, or
remote service was used. Operational token provisioning, a trusted production
origin composition, generation wiring, and all worker/provider/checkpoint
activation gates remain pending.

### U10-A11 app generation-input composition

`createFeedbackAdminCommandTransport` accepts an explicit `generationInputs`
port with a private-source `readPage` transport and a
`getApprovedConfiguration` provider. The provider must return the complete
versioned model configuration, nonempty pricing snapshot, nonsecret
`evidenceKeyId`, and matching source revision; there is no default or fallback.
After authenticated command validation and complete overlap preflight, the app
freezes `dataCutoffAt`, reads all source pages for the normalized period, and
passes them through `buildAuthoritativeGenerationInputsV1` and
`materializeGenerationInputsV1`. It validates the resulting closed materialized
fields again before the CMS create request. `buildGenerationData` also binds the
snapshot's `population.current.from/to` to the effective persisted period and
`population.dataCutoffAt` to the exact frozen generation cutoff. The materialized
envelope's internal digest/source consistency alone is insufficient: an
individually valid snapshot for another range or cutoff must fail as a bounded
unavailable result before CMS create or dispatch. The first dispatcher call occurs
only after CMS returns a valid created generation. Retry first verifies that
the source generation is failed, then captures a new cutoff, obtains a fresh
source/configuration materialization, and creates a new row linked to the
unchanged failed generation.

The browser request and response contracts do not change. Missing, malformed,
or mismatched input/configuration maps to a bounded unavailable response before
create or dispatch; overlap and retry-state conflicts likewise occur before
source reads. The default `getFeedbackAdminCommandTransport` composition does
not provide the source/configuration port because no approved production CMS
origin, custom source token provider, model/pricing source, or evidence key ID
exists. Thus production generation remains fail-closed even if invoked while
the separately controlled capability is disabled by default. No credential,
operational approval, runtime binding, CMS grant/schema, or deployment change is
introduced. The initial `usageJson` remains the empty initial usage value; all
snapshot/model/pricing/checkpoint fields come from the validated materializer.

### U10-A12 actual app-command-to-CMS create/retry proof

The test-only extension of `teleferico-cms/test/feedback/private-report-source.test.js`
uses the restricted same-process TypeScript loader to execute the current
`createFeedbackAdminCommandTransport`. In the disposable Strapi database only,
the application-user JWT role has exactly the existing generation `find` and
`create` actions. A separate synthetic custom content API token has exactly
`workerSourceRead`. Cross-use is denied: the JWT cannot read the private source
action, and the custom token cannot use native generation `find` or `create`.
The generation `find` preflight uses real Strapi HTTP. The app source transport
also reaches the real private-source HTTP action and returns the seeded 27
submissions through page sizes 25+2 before the generation POST.

The generated native create payload omits the private nullable `requestedBy`
relation. This preserves `requestedBy: null` in storage without inventing an
application-user attribution; the test verifies the field is absent from the
POST and directly asserts zero rows in Strapi's
`survey_report_generations_requested_by_lnk` table for the created run. No CMS
schema, private-JSON handling, auth grant, or direct-DB production write was
added.

The current app transport now completes real native Strapi `find` and `create`
HTTP for generation. The test persists and compares the exact cutoff-bound
snapshot, snapshot digest, initial closed checkpoints, model configuration,
pricing snapshot, and source revision. Its fake dispatcher is invoked only
after the successful create response. A seeded failed generation is then read
and retried through the same app transport and real CMS HTTP; the retry has a
fresh cutoff and snapshot digest, points to the unchanged failed source through
`retryOfGeneration`, and persists its own exact materialized fields. The test
also proves an unauthorized source JWT and an interrupted submissions
continuation fail before generation POST, with no extra row or dispatch.

This is disposable local integration evidence only. No real CMS origin/token,
model/pricing/key provider, Cloud Tasks, worker runtime, production credentials,
GCP/IAM, deployment, or operational rollback was exercised. Those runtime gates
remain pending; the default feature flag and persistent permissions remain
unchanged.

### U10-A15 app worker CMS HTTP client

`teleferico-app/services/survey-report-worker/src/worker-cms-client.ts` is a
server-only implementation of the existing `WorkerCmsClient` seam for claim,
snapshot, and fail. Its factory requires a canonical HTTPS DNS hostname, an
explicit nonempty exact-origin allowlist, and an injected token provider that
receives the exact native custom-token action identity and returns that same
identity with the opaque token. The shared validator checks URL/hostname syntax
and exact allowlist membership before the provider can run. It does **not**
resolve DNS, validate resolved IP addresses, pin addresses, or prove network
egress; split-horizon DNS or rebinding can still resolve an allowed hostname to
a private address. Do not treat this hostname gate as a complete SSRF control.
The fixed routes and methods are `POST W/claim`, `GET W/snapshot`, and `POST
W/fail`; request/response schemas are closed, bodies and deadlines are bounded,
redirects and cross-origin responses are rejected, and only fixed non-sensitive
transport errors escape. The same syntax/allowlist helper is shared with the
private source transport.

Before wiring any operational token provider, require a separately approved
trusted CMS origin plus verified DNS/address controls and network egress
restriction that prevent the bearer token from reaching private, loopback,
link-local, or otherwise unapproved addresses. This candidate provides no DNS/IP
pinning, resolution check, or egress proof.

Snapshot responses are checked by the existing snapshot-envelope digest
validator. Private comments are returned only as part of the validated private
snapshot result; they are never logged or included in transport errors. Claim
and fail replay envelopes are validated without inventing or mutating state.
`checkpoint` rejects with `UNKNOWN_VERSION` before token acquisition because CMS
still rejects checkpoint writes before transaction entry. `complete` rejects as
unsupported because the CMS HTTP action is not registered. Neither method makes
a request or reports success.

Fake-fetch tests prove action identity, exact requests, status/error mapping,
closed envelope validation, digest rejection, request/response limits, redirect
refusal, safe error handling, and the no-request checkpoint/completion behavior.
The existing U10-A10 same-process restricted TypeScript loader can be extended
without a child process or environment-file access, but this client integration
was not run in U10-A15. The deferred scenario is to extend
`teleferico-cms/test/feedback/private-report-source.test.js` to load this app
client through that loader and call real isolated Strapi `W/claim`, `W/snapshot`,
and `W/fail` using separate synthetic custom content API tokens in the disposable
database; assert action-scope isolation/denial, replay, snapshot digest/private
comment projection, and no request for checkpoint/complete, then clean up owned
resources. Owner: TB-113 app/CMS implementer and reviewer. No production origin,
token, grant, environment binding, or worker runtime composition is selected or
created.

### U10-A16 worker client ↔ CMS claim contract correction

The test-only continuation extends the existing same-process TypeScript loader
in `teleferico-cms/test/feedback/private-report-source.test.js` to load the real
app `WorkerCmsClient` and shared CMS-origin validator. Its fetch seam accepts
only the exact `https://cms.example.com` worker URL and fixed claim/snapshot/fail
paths, then forwards to the owned loopback Strapi server. It rejects other URLs
before inspecting or forwarding authorization and returns a logical-origin
response so the app client's same-origin and redirect checks still execute.
The logical host is never resolved.

The first same-process real HTTP attempt found that PostgreSQL/Strapi returned
`checkpoints`, `modelConfig`, and `pricingSnapshot` as JSON strings. The scoped
CMS correction now parses each stored string once, rejects malformed,
double-encoded, non-object, placeholder, mismatched, or unsupported claim
contracts, and returns normalized objects. It reuses the existing CMS model
configuration validator and additionally binds the stored source revision,
  evidence key ID, and pinned model. The checkpoint envelope must be the exact
  v1 shape with the row snapshot digest, null chunk count, and no entries; its
  route may be `direct` or the exact initial `undecided` state. Pricing must be a closed
USD snapshot with nonempty unique SKUs and safe nonnegative integer rates.
Validation runs on queued claim before the queued→running CAS and on running
resume; invalid stored state returns the fixed `INVALID_STATE` error before any
status/version update. Terminal replay remains the existing minimal envelope and
does not inspect private claim fields.

The isolated run creates distinct synthetic custom content API tokens scoped to
`workerClaim`, `workerSnapshot`, and `workerFail`. It preserves the manually
seeded `route: "direct"` case and also claims a queued run created by the normal
U10-A12 app admin command, whose initial checkpoint route is `undecided`. The app
client claims and replays both forms at state version 2, reads each snapshot with
its digest validated, and commits/replays the bounded `INVALID_OUTPUT` failure
at version 3. The app-created run's private comments are returned only in the
validated snapshot result. A stored malformed checkpoint JSON string is rejected
over HTTP with 409/`INVALID_STATE` and leaves the queued row at version 1 with no
claim timestamp. Users & Permissions JWTs with worker actions granted and every
wrong-scope custom token are denied before generation-table access; native
collection reads remain denied. The app client rejects malformed claim and
digest-altered snapshot responses, and `checkpoint`/`complete` make no token or
fetch calls.

The initial `undecided` envelope remains only a claim state; the worker makes no
model call until injected CountTokens proves the complete direct request does not
fit and finds the smallest fitting map chunk count. A synthetic integration now
executes two chunks through authenticated app↔worker↔Strapi/PostgreSQL HTTP,
persists MapV1 output and membership checkpoints, and reduces only over the
persisted map outputs and immutable metrics. CMS uses an injected CountTokens
authority to independently recount direct, map, and output requests; it also
recomputes request digests, refs/membership, map payload output digests, stage
indexes/dependencies, and state-version CAS before each write and completion. A forged map output
digest is rejected without changing state. The same integration proves
deterministic PDF completion and terminal replay without a duplicate report.

This evidence uses injected synthetic providers/key material only. It does not
prove live Vertex, CountTokens, production key provisioning, Google/GCS/Cloud
Tasks/Cloud Run/OIDC readiness, capability enablement, or formal U10/U11/U12
completion. Semantic truth and contradiction remain intentionally unchecked;
human editorial review is not a per-report acceptance gate.

The test fetch accepts only the exact logical HTTPS origin and fixed worker
paths/methods, forwards only to owned loopback Strapi, never resolves the logical
host, and preserves response-origin metadata so the app client's origin and
redirect checks execute. Cleanup stops Strapi, restores test-process environment,
removes the owned Compose stack, and asserts server/container/volume absence. No
raw token or private comment appears in the test diagnostic or captured logs.

This is disposable local evidence only. No production origin, DNS/address
control, egress restriction, operational token, persistent grant, worker runtime,
GCP/IAM, or deployment was exercised. Those operational gates remain pending.
The correction changes no auth/access expectations, so `docs/STRAPI_PERMISSIONS.md`
requires no update.

### U10-A17 local zero-comment direct execution

The local executor now starts from the normal CMS-created `route: "undecided"`
claim. An explicitly injected CountTokens analogue receives the closed,
canonical request containing the exact model configuration, instruction/schema
segments, immutable metrics, and sanitized comments. Its integer segment result
is accepted only when the request digest recomputes in CMS, the output
reservation/headroom sum fits `verifiedInputTokenLimit`, and the CMS checkpoint
CAS transitions the checkpoint set to `route: "direct"`. The executor does not
infer a direct route or map/reduce fallback.

This executable local analysis is intentionally limited to snapshots with zero
eligible comments. The fake analysis provider can emit only the exact ordered
`survey-analysis.v1` shape with no claims and `insufficient_evidence` in every
section; CMS verifies it and the fixed published Spanish fallback against the
locked snapshot before accepting `direct`/`validate` checkpoints. Nonempty
comment analysis and all map/reduce execution remain blocked because complete
semantic/evidence validation and the smallest-fitting CountTokens chunk proof
are not implemented.

The authenticated `PUT W/checkpoints/:stageKey` uses only the exact custom
`workerCheckpoint` token scope and persists the CMS-recomputed stage graph under
row lock/CAS. `POST W/complete` uses its separate `workerComplete` scope, checks
all six persisted stages, analysis and artifact digests, private final object
key, and state version, then creates the report and succeeds the generation in
one transaction. The report ID is a deterministic UUID derived from run ID and
PDF digest; identical delivery replays the same completion. The synthetic
app↔Strapi test uses in-memory PDF bytes and test-only tokens; it proves no
Vertex/GCS/Cloud Tasks operation, production permission, or capability enablement.

## Direct implementation runtime boundary

The app-owned direct implementation now provides the local worker/PDF boundary
without claiming external task or storage execution:

- `teleferico-app/services/survey-report-worker/src/` owns typed CMS seams,
  immutable snapshot validation, checkpoint/CAS orchestration, deterministic
  ChartViewModel-to-SVG/HTML rendering, PDF metadata, and terminal failure
  handling.
- `teleferico-app/src/lib/feedback/dispatch.ts` is the admin dispatcher seam.
  Its default result is explicit `DISPATCH_UNAVAILABLE` with the generation
  left visibly queued; it never claims that Cloud Tasks or Cloud Run ran.
- Final artifact publication is represented only by the injected CMS
  completion adapter. The local artifact adapter stages bytes and cannot make
  a report downloadable before successful completion.

The local worker checkpoint runtime supports the closed direct and map/reduce
graphs. Direct retains indexes 0–5. Map/reduce uses redact 0, count 1, maps
2…n+1, reduce n+2, validate n+3, render n+4, and store n+5. Every stage-input
digest binds immutable model configuration, contract versions, snapshot/source
identity, ordered dependency output digests, and map membership where
applicable. CMS verification and persistence occur in the authenticated
checkpoint transaction with a locked snapshot, injected key, row lock, and
state-version CAS; completion revalidates the exact graph before atomic report
creation. Existing direct routes remain unchanged. No production key, provider,
Google resource, persistent grant, deployment default, or feature enablement is
added.

Cloud Tasks, Cloud Run/OIDC, Vertex, GCS, production worker-image readiness,
and authenticated integrated execution remain external validation and
deployment gates. They are intentionally not configured or inferred by this
slice.
