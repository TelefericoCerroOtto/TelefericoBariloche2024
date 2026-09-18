# Normative Persistence Contracts

All types set `draftAndPublish:false`. `fixtureMarker` is private nullable string(64), local/test-seed only. Custom services own writes; generic application CRUD and Public/Authenticated survey permissions are disabled.

## Models

- **`survey-version` / `survey_versions`:** unique immutable `versionKey:string(1..64)` matching `^[a-z0-9][a-z0-9._-]*$`; `status:draft|published=draft`; required versioned closed `copyEs|copyEn|copyPt` JSON maps containing every Appendix-02 `PublicCopyKeyV1` with bounded strings; repeatable `aspects` 1..64; system-only nullable `publishedAt,lastActivatedAt,lastSupersededAt`; submissions relate many-to-one.
- **`survey.aspect-definition` / `components_survey_aspect_definitions`:** private `ownerVersionKey`; required `aspectKey:string(1..64)`, `sortOrder:int(0..63)`, `labelEs|En|Pt:string(1..120)`; owner equals container; owner+key/order unique.
- **`survey-settings` / `survey_settings`:** singleton; immutable `singletonKey="default"`; nullable one-to-one `activeSurveyVersion`; `intakeEnabled=false`, `generationEnabled=false`, `settingsRevision:int>=1=1`.
- **`survey-qr-point` / `survey_qr_points`:** immutable unique patterned `pointKey:string(1..64)` and opaque `publicCode:string(32..128)` matching `^[A-Za-z0-9_-]+$`; required `displayName:string(1..120)`, `status:active|inactive=active`, `sortOrder:int>=0`; `inactiveAt` null iff active; no visitor/ticket/owner.
- **`survey-submission` / `survey_submissions`:** immutable; unique UUID `receipt`; required server-authored `acceptedAt`, `source:valid_qr`, `locale:es|en|pt`, `overallRating:int(1..5)`, version/point relations; repeatable `ratings` 1..3 after normalizing standard `aspects` plus optional `otherAspect`; optional `comment:text(2000)`; required SHA-256 `sessionNonceHash,payloadDigest,browserTokenHash` and patterned `idempotencyKey:string(16..128)`.
- **`survey.aspect-rating` / `components_survey_aspect_ratings`:** private `ownerReceipt`; required `aspectKey:string(1..64)`, `label:string(1..120)`, `sortOrder:int(0..63)`, sentiment `rating`; `customText:string(1..300)` required only when separate `otherAspect` normalizes to `other`; owner equals container; owner+key unique. Survey definitions may expose reserved display key `other`, but `SubmitV1.aspects` cannot; selection serializes as `otherAspect` and snapshots that definition's label/order.
- **`survey-report-generation` / `survey_report_generations`:** unique UUID `reportRunId`; immutable period/cutoff/override/overlap/snapshot/source/model/pricing/retry; status `queued|running|succeeded|failed=queued`; `stateVersion>=1`, `attemptCount,dispatchAttemptCount>=0`; nullable claim/completion/failure and immutable alerts; required closed snapshot/checkpoint/model/usage/pricing JSON and nonnegative USD micros; nullable unique `taskName`, requester, retry lineage, inverse report. Audit relations never own/filter.
- **`survey-report` / `survey_reports`:** immutable unique UUID `reportId`; unique owning `generationRunId`; copied period/cutoff/snapshot/source; required validated analysis/version/digest, renderer, private object key, artifact SHA-256/positive size/PDF MIME; nullable generator audit relation.

## SQL and Transactions

Schema JSON fixes collection names; migration asserts tables/columns and aborts mismatch.

```sql
-- Normative
BEGIN;
CREATE UNIQUE INDEX uq_submission_nonce_idem ON survey_submissions(session_nonce_hash,idempotency_key);
CREATE UNIQUE INDEX uq_definition_owner_key ON components_survey_aspect_definitions(owner_version_key,aspect_key);
CREATE UNIQUE INDEX uq_definition_owner_order ON components_survey_aspect_definitions(owner_version_key,sort_order);
CREATE UNIQUE INDEX uq_rating_owner_key ON components_survey_aspect_ratings(owner_receipt,aspect_key);
CREATE UNIQUE INDEX uq_generation_active_range ON survey_report_generations(period_start,period_end) WHERE status IN ('queued','running');
CREATE UNIQUE INDEX uq_generation_task ON survey_report_generations(task_name) WHERE task_name IS NOT NULL;
CREATE UNIQUE INDEX uq_report_generation ON survey_reports(generation_run_id);
CREATE UNIQUE INDEX uq_settings_singleton ON survey_settings(singleton_key);
ALTER TABLE survey_settings ADD CONSTRAINT ck_settings_singleton CHECK(singleton_key='default');
ALTER TABLE survey_report_generations ADD CONSTRAINT ck_generation_range CHECK(period_start<=period_end), ADD CONSTRAINT ck_generation_terminal CHECK((status IN ('queued','running') AND completed_at IS NULL) OR (status IN ('succeeded','failed') AND completed_at IS NOT NULL));
COMMIT;
```

Isolated PostgreSQL proves indexes, component links, and cardinalities; guessed provider metadata cannot ship.

Idempotency canonicalizes the contract version, stable signed session/domain claims, `browserTokenHash`, locale, standard `aspects`, optional `otherAspect`, and `comment` into the payload digest. The digest excludes `sessionToken`, `pointDocumentId`, and `versionDocumentId`. Before transaction/insert, the persistence adapter MUST resolve those document IDs and validate them against the signed stable point/version claims. This keeps digest identity independent of internal Strapi identifiers while preserving browser-context binding. One transaction locks/queries `(sessionNonceHash,idempotencyKey)`: absent→validate/insert; equal digest→original receipt/time; different digest→`IDEMPOTENCY_CONFLICT`. Resolve replay before Redis guard; set Redis only after commit.

`snapshotJson=SnapshotV1`; other closed JSON follows Appendices 03–04. Usage stores ordered stage tokens/cost and totals; pricing stores ordered SKU input/output micros per million. Values are nonnegative USD.

## Lifecycle

- Draft→published is one-way; published identity/content is immutable. Activation alone updates lifecycle times and atomically locks settings/revision; target must be published.
- QR identity is immutable; status atomically sets/clears `inactiveAt`. Submission/report/audit/range/cutoff/snapshot/pricing/alert/retry fields are immutable.
- CAS requires expected `stateVersion`: queued→running; queued→failed only for verified pre-claim enqueue exhaustion; running→succeeded|failed; terminal never transitions.
- Report creation, success/relation, artifact metadata, and final checkpoint commit atomically; failed/nonterminal runs own no report.

## Initial Aspect Seed

U5/S06 seeds one published ES/EN/PT-complete catalog in this exact `sortOrder` and key order. These are stable initial identities, not a permanent global catalog; later versions remain CMS-managed under the published-version immutability contract.

| Order | `aspectKey` | ES | EN | PT |
|---:|---|---|---|---|
| 0 | `cable-car` | Viaje en teleférico | Cable car ride | Viagem de teleférico |
| 1 | `views` | Paisajes y vistas | Landscapes and views | Paisagens e vistas |
| 2 | `staff` | Atención del personal | Staff service | Atendimento da equipe |
| 3 | `wait` | Organización y tiempos de espera | Organization and waiting times | Organização e tempos de espera |
| 4 | `signage` | Señalización y orientación | Signage and wayfinding | Sinalização e orientação |
| 5 | `cleanliness` | Instalaciones y limpieza | Facilities and cleanliness | Instalações e limpeza |
| 6 | `mobility` | Comodidad para moverse por el complejo | Ease of moving around the complex | Facilidade para circular pelo complexo |
| 7 | `activities` | Actividades en la cumbre | Summit activities | Atividades no cume |
| 8 | `rotating-cafe` | Confitería Giratoria | Rotating Café | Confeitaria Giratória |
| 9 | `food` | Comidas y bebidas | Food and drinks | Comidas e bebidas |
| 10 | `stores` | Tiendas y opciones de compra | Shops and shopping options | Lojas e opções de compra |
| 11 | `bus` | Transporte en bus | Bus transportation | Transporte de ônibus |
| 12 | `price` | Precio y relación con la experiencia | Price and value for the experience | Preço e relação com a experiência |
| 13 | `other` | Otro aspecto | Other aspect | Outro aspecto |
