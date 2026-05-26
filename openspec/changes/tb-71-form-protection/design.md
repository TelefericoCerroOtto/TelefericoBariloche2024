# Design: Production-safe Public Form Protection

## Technical Approach

Restore the approved two-layer protection architecture after the existing public-form chain: Server Action captcha/IP extraction → server-only service self-call → `withFormGuards` → honeypot/form-age/schema/provider work. Contact and postulation share one protection module in `teleferico-app`; staging/production IP enforcement uses Redis/Memorystore-style shared storage; email/business decisions live in one Strapi collection. The prior app-only/in-memory limiter is rejected for this change because it cannot coordinate Cloud Run instances and cannot enforce email business rules.

## Architecture Decisions

| Decision | Choice | Rejected/Alternative | Rationale |
|---|---|---|---|
| Shared guard module | Centralize policy, Redis adapter, Strapi business-rule client, typed decisions and events under `teleferico-app/src/lib/http/guards` plus server-only services. | Per-route logic. | Keeps contact/postulation behavior consistent and preserves thin route handlers. |
| IP layer | Redis-backed fixed-window counters: postulation `5/15min`, contact `10/1h`. Missing IP skips only IP limiting and logs `missing_client_ip`. Redis errors fail open with critical observability. | App-local `Map`; Cloud Armor-only. | Shared store is required for multi-instance Cloud Run; Cloud Armor alone cannot express email rules. |
| Email layer | One Strapi collection for submissions/protection decisions with future-ready fields: form, normalized email hash, `sectorDocumentId` as the active duplicate key, optional `positionKey` metadata, decision, window metadata, duplicate marker, review status, ban flags, notes, raw metadata, fingerprint/signals. | Reusing only `postulation`; separate per-form collections. | One collection gives auditable cross-form business rules without duplicating models. |
| Failure semantics | Redis failure = fail open; Strapi business-layer failure = fail closed with UI-safe message. Both emit critical logs and alert signals. | One failure policy for both layers. | Volumetric protection may degrade; business-rule uncertainty must not silently accept duplicates/abuse. |

## Data Flow

```text
Browser ─captcha + honeypot + formLoadedAt──▶ Server Action
  └─ resolves optional client IP, never trusts browser-provided protection headers
Server Action ─internal headers──▶ /api/contact or /api/postulation
Route Handler ─core guards──▶ Shared form protection
  ├─ IP decision ─▶ Redis/Memorystore counter
  └─ Email decision ─▶ Strapi form-protection collection
Allowed contact ─▶ Gmail
Allowed postulation ─▶ private CV storage ─▶ Strapi postulation create
Events ─JSON stdout──▶ Cloud Logging ─metrics──▶ alert policy/dev@telefericobariloche.com.ar
```

## File Changes

| File | Action | Description |
|---|---|---|
| `teleferico-app/src/lib/http/guards/form-protection-policy.ts` | Modify | Replace app-local thresholds with typed Redis + email policies and approved defaults. |
| `teleferico-app/src/lib/http/guards/rate-limit.ts` | Modify | Introduce async Redis store contract; keep local Redis-compatible adapter for development/tests only. |
| `teleferico-app/src/lib/http/guards/form-guards.ts`, `ip.ts`, `form-guard-events.ts` | Modify | Wire shared decisions, missing-IP skip, critical events and non-PII hashes. |
| `teleferico-app/src/lib/services/{contact,postulation}.ts` and `src/app/api/{contact,postulation}/route.ts` | Modify | Preserve internal self-call pattern and apply shared protection before provider/CMS writes. |
| `teleferico-app/src/types/api/form-guards.d.ts`, `src/types/cms/*` | Modify | Add strict decision/result, env and Strapi collection contracts without `any`. |
| `teleferico-cms/src/api/form-protection-submission/**` | Create | One Strapi collection plus controller/service defaults following `src/api/<collection>` pattern. |
| `docs/STRAPI_PERMISSIONS.md`, `docs/form-protection.md`, `docs/INFRA.md`, `docs/infra/cloud-build/app-{staging,production}.yaml` | Modify | Document permissions, env, local Redis, alerting, Docker MCP/GCP approval boundaries and rollout. |

## Interfaces / Contracts

### App ↔ Redis

`FormRateLimitStore.increment(key, windowMs): Promise<{ count; resetAt }>` uses keys `public-form:{env}:{form}:ip:{ipHash}` with TTL equal to the window. App only stores hashed IP identity. Required env: `FORM_PROTECTION_REDIS_URL` plus per-form limits. Local development MUST use a local Redis container/emulation URL; local defaults MUST NOT point to managed Redis. Staging/production use managed Redis/Memorystore-style shared storage.

### App ↔ Strapi collection

`form-protection-submission` is server-only through `STRAPI_FORMS_TOKEN`. Required checks: contact email `5/24h`; postulation email `2/30d`; postulation same normalized email + same `sectorDocumentId` hard-blocks as duplicate because that field is the selected sector identifier used by the current app flow. `positionKey` remains optional future-ready metadata only. Fingerprint is signal-only in v1 and never sole block reason. Strapi read/write timeout, rejection or unavailable response fails closed with stable UI-safe code and critical event.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | IP resolution, policy parsing, Redis store contract, Strapi decision mapping, fingerprint signal-only. | Vitest + strict TypeScript; fake Redis/Strapi adapters. |
| Integration | `runFormGuards` fail-open/fail-closed, thresholds, duplicate same email+`sectorDocumentId`, structured event redaction. | Vitest + jsdom where needed, MSW for Strapi, Testing Library for UI-safe error mapping. |
| Route smoke | Contact/postulation preserve captcha, honeypot, form-age, origin, internal-key and provider behavior. | NextRequest tests plus mocked Gmail/CV/Strapi services. |
| Verification | `pnpm --dir teleferico-app run check` and `pnpm --dir teleferico-app run test`. | Record command output in verify report. |

## Migration / Rollout

Create the Strapi collection and permission docs in the PR. Local runs require local Redis. Staging validates Redis, Strapi collection rules, logs and alerts before promotion. Production changes, managed Redis provisioning and alert creation require explicit approval; GCP commands must go through the Docker MCP path using the running `google-cloud-sdk` container, with preview/dry-run first where available. Delivery remains one final PR to `development`; no direct console deploys.

## Open Questions

None.
