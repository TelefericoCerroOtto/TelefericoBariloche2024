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

POST `generations` requires generate capability: no overlap→202 queued; overlap without matching digest→409 `OVERLAP_REQUIRES_OVERRIDE` with all intersections ordered start/run, digest, adjustment; active exact-range race→409 `ACTIVE_RANGE_CONFLICT` plus run. POST `generations/{run}/retry` accepts only `{contractVersion:"feedback-admin.v1"}` for failed source and returns a new queued run/lineage; otherwise 409 `INVALID_STATE`. GET `reports/{id}/download` requires download capability and streams PDF with attachment disposition, SHA-256 ETag, private/no-store, no URL. Mapping: 400 `VALIDATION_FAILED`; 401 `UNAUTHORIZED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`; named 409; 413 `PAYLOAD_TOO_LARGE`; 503 `UPSTREAM_UNAVAILABLE`; 500 `INTERNAL_ERROR`.

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

The checkpoint route is currently fail-closed: bounded requests return 400 `UNKNOWN_VERSION` before opening a transaction; raw bodies over 4 KiB retain the existing 413 behavior. The 4 KiB cap is unchanged, but validated map payloads may exceed it. Before activation, define and test a bounded request-size contract against complete valid map payloads; this foundation does not claim every valid checkpoint fits the current cap. See Appendix 04 for the remaining activation gates.

`POST W/claim` is a native authenticated Strapi action with no default role or
API-token grant. It accepts only the exact command under the 4 KiB worker cap,
locks the generation row, and atomically performs queued→running with one
state-version increment and `claimedAt`. Running returns `resumed` without a
write; succeeded/failed returns only the terminal replay identity/status/version.
The running projection contains only checkpoints, model configuration, and
pricing snapshot—never comments. Explicit worker credential provisioning and
permission grants remain outside this local contract slice.

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

The current worker checkpoint POC is deliberately narrower than the normative
stage graph: it emits only direct-route `render`/`store` checkpoints at indexes
4/5, validates their exact metadata and payload shapes, output digests, and
private staged-object identity, and rejects a prior same-stage input-digest
mismatch before reuse. The app claim DTO now includes the CMS running projection's
immutable model configuration and pricing snapshot. The worker derives v1
stage-input digests for render from its validated validate-payload digest and
for store from the render-payload digest, with the exact ordered dependency,
full model configuration, contract versions, snapshot digest, and source
revision. Missing configuration/dependency inputs fail closed; there is no
legacy-digest fallback. This binds only the app-side direct render/store
boundary: map/reduce and complete nested output/evidence validation remain
unsupported. CMS checkpoint writes remain `UNKNOWN_VERSION` before transaction
entry; no checkpoint is accepted or persisted.

Cloud Tasks, Cloud Run/OIDC, Vertex, GCS, production worker-image readiness,
and authenticated integrated execution remain external validation and
deployment gates. They are intentionally not configured or inferred by this
slice.
