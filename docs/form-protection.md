# Form Protection Operations

This change restores the approved two-layer public form protection architecture without mutating live GCP resources in this batch.

## Quick path

1. Run local development with a local Redis container and never point local dev to managed Redis.
2. Validate staging with shared Redis enabled and the Strapi `form-protection-submission` collection/token permissions in place.
3. Apply any managed Redis, Secret Manager, or alerting mutations later through the Docker MCP path using the running `google-cloud-sdk` container.

## Runtime contract

| Area | Decision |
| --- | --- |
| Contact IP limiter default | Enabled, `10` hits per `3600000` ms through shared Redis. |
| Postulation IP limiter default | Enabled, `5` hits per `900000` ms through shared Redis. |
| Contact email business rule | `5` submissions per `86400000` ms in Strapi. |
| Postulation email business rule | `2` submissions per `2592000000` ms in Strapi. |
| Postulation hard duplicate | Same normalized email hash + same `sectorDocumentId` blocks immediately. In this app flow `sectorDocumentId` is the selected sector/role identifier; `positionKey` stays future-ready metadata only. |
| Non-rate guards | `captcha`, `honeypot`, `formLoadedAt`, trusted `Origin`, `Content-Length`, and `x-internal-api-key` stay active even when a limiter is disabled. |
| Missing IP behavior | Missing trusted IP emits a structured degraded event and skips IP limiting instead of sharing an `unknown` bucket. |
| Redis/backend failure behavior | Shared limiter failures fail open, emit `rate_limit_degraded`, and continue to Strapi business validation. |
| Strapi failure behavior | Business-layer read/write failures fail closed with UI-safe copy and emit `business_rule_unavailable`. |
| CMS boundary | Strapi now owns one `form-protection-submission` collection for email windows, duplicate markers, review/bans, notes, metadata, and fingerprint signals. |

## Local development

Use a local Redis container or emulator. Do not point local development to staging or production Memorystore.

Example:

```bash
docker run --rm --name tb71-redis -p 6379:6379 redis:7-alpine
```

Recommended local env values:

| Variable | Local default |
| --- | --- |
| `FORM_PROTECTION_REDIS_URL` | `redis://127.0.0.1:6379` |
| `FORM_PROTECTION_REDIS_NAMESPACE` | `local` |
| `FORM_PROTECTION_REDIS_CONNECT_TIMEOUT_MS` | `500` |
| `CONTACT_RATE_LIMIT_ENABLED` | `true` |
| `CONTACT_RATE_LIMIT_MAX` | `10` |
| `CONTACT_RATE_LIMIT_WINDOW_MS` | `3600000` |
| `CONTACT_EMAIL_LIMIT_MAX` | `5` |
| `CONTACT_EMAIL_LIMIT_WINDOW_MS` | `86400000` |
| `POSTULATION_RATE_LIMIT_ENABLED` | `true` |
| `POSTULATION_RATE_LIMIT_MAX` | `5` |
| `POSTULATION_RATE_LIMIT_WINDOW_MS` | `900000` |
| `POSTULATION_EMAIL_LIMIT_MAX` | `2` |
| `POSTULATION_EMAIL_LIMIT_WINDOW_MS` | `2592000000` |

## Staging checklist

- [ ] Confirm staging deploy documents Redis connection settings plus both IP/email threshold families explicitly.
- [ ] Submit a valid contact form and confirm success without raw IP, email, or captcha token appearing in logs.
- [ ] Submit a valid postulation and confirm CV storage + Strapi postulation create still succeed after the business-rule write.
- [ ] Trigger a contact rate-limit block and confirm a `public_form_guard` event with `action="block"` and `reason="too_many_requests"`.
- [ ] Trigger a contact email block and confirm the Strapi record stores `decision="blocked_email_limit"`.
- [ ] Trigger a duplicate postulation with the same email and `sectorDocumentId`, then confirm the Strapi record stores `decision="blocked_duplicate"` plus `duplicateMarker=true`.
- [ ] Trigger a missing-IP path from staging or a controlled replay and confirm `action="degraded"` with `reason="missing_client_ip"`.
- [ ] Trigger a Redis failure path and confirm `action="degraded"` with `reason="rate_limit_degraded"` while the request still reaches Strapi business validation.
- [ ] Trigger a Strapi business-layer failure path and confirm `action="degraded"` with `reason="business_rule_unavailable"` plus a fail-closed response.
- [ ] Confirm postulation requests still reject invalid honeypot, stale `formLoadedAt`, bad `Origin`, and missing `x-internal-api-key` before any business-rule write.

## Rollback toggles

Use per-form env flags only. Do not remove any other protection layer.

| Variable | Safe default | Rollback use |
| --- | --- | --- |
| `CONTACT_RATE_LIMIT_ENABLED` | `true` | Set to `false` only if contact rate limiting causes verified false positives. |
| `CONTACT_RATE_LIMIT_MAX` | `10` | Raise temporarily only with evidence and review. |
| `CONTACT_RATE_LIMIT_WINDOW_MS` | `3600000` | Shorten or widen only through PR review. |
| `CONTACT_EMAIL_LIMIT_MAX` | `5` | Business-rule threshold; change only with Strapi contract review. |
| `CONTACT_EMAIL_LIMIT_WINDOW_MS` | `86400000` | Business-rule threshold; change only with Strapi contract review. |
| `POSTULATION_RATE_LIMIT_ENABLED` | `true` | Set to `false` only for temporary IP-layer rollback; business rules remain enforced. |
| `POSTULATION_RATE_LIMIT_MAX` | `5` | Applies to the shared Redis IP layer. |
| `POSTULATION_RATE_LIMIT_WINDOW_MS` | `900000` | Applies to the shared Redis IP layer. |
| `POSTULATION_EMAIL_LIMIT_MAX` | `2` | Business-rule threshold; change only with Strapi contract review. |
| `POSTULATION_EMAIL_LIMIT_WINDOW_MS` | `2592000000` | Business-rule threshold; change only with Strapi contract review. |
| `FORM_PROTECTION_REDIS_URL` | environment-specific | Local dev should target local Redis only; managed Redis changes stay out of this PR. |
| `FORM_PROTECTION_REDIS_NAMESPACE` | `local` / `staging` / `production` | Keep environments isolated even if backends are reused. |

## Log queries

Use Cloud Logging on the Cloud Run service for `teleferico-app`.

### Guard events

```text
resource.type="cloud_run_revision"
jsonPayload.event="public_form_guard"
jsonPayload.form="contact"
```

### Rate-limit blocks

```text
resource.type="cloud_run_revision"
jsonPayload.event="public_form_guard"
jsonPayload.action="block"
jsonPayload.reason="too_many_requests"
```

### Degraded missing-IP path

```text
resource.type="cloud_run_revision"
jsonPayload.event="public_form_guard"
jsonPayload.action="degraded"
jsonPayload.reason="missing_client_ip"
```

### Limiter backend degradation

```text
resource.type="cloud_run_revision"
jsonPayload.event="public_form_guard"
jsonPayload.action="degraded"
jsonPayload.reason="rate_limit_degraded"
```

### Business-layer degradation

```text
resource.type="cloud_run_revision"
jsonPayload.event="public_form_guard"
jsonPayload.action="degraded"
jsonPayload.reason="business_rule_unavailable"
```

## Verification notes

- Automated verification completed on 2026-05-20 after the semantic/doc alignment batch:
  - `pnpm --dir teleferico-app run check` ✅
    - `pnpm run typecheck` ✅
    - `pnpm run lint` ✅
    - Note: `next lint` printed the existing Next.js 16 deprecation notice, but reported no ESLint warnings or errors.
  - `pnpm --dir teleferico-app run test` ✅
    - `vitest run`: `4` files passed, `17` tests passed, duration `868ms`.
- `captcha` remains enforced in the server-action layer; this batch restores the shared Redis + Strapi layers behind the same internal API boundary.
- Managed Redis provisioning, secret wiring, and alert creation are intentionally deferred to a later approved ops step through the Docker MCP `google-cloud-sdk` container path.
