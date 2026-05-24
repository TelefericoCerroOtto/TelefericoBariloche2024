# Proposal: Production-safe Public Form Protection

## Intent

Restore the user-approved architecture for public form protection. The prior app-only/in-memory limiter scope is rejected as insufficient because it cannot coordinate across instances and does not enforce email business rules.

## Scope

### In Scope
- Shared protection for contact and postulation in `teleferico-app`.
- Distributed IP rate limiting through Redis/Memorystore-style shared storage.
- One Strapi collection for email business-rule decisions and audit-safe submission signals.
- Strong structured observability, debugging fields, critical logs, and alert hooks.
- Vitest + Testing Library + jest-dom + jsdom + MSW strategy for `teleferico-app`.
- One PR from this branch to `development`; no chained PR delivery.

### Out of Scope
- App-local in-memory limiting as the final architecture.
- Cloud Armor-only enforcement, public UX redesign, direct production deploys.
- Content fingerprinting as a hard-block rule; v1 is signal/flag only.

## Capabilities

### New Capabilities
- `public-form-protection`: shared IP, email-rule, observability, failure-mode, and test requirements for public forms.

### Modified Capabilities
- None; no existing OpenSpec specs are present.

## Approach

Use two layers after existing captcha, origin, body-size, internal-key, honeypot, form-age, and schema guards:

1. Fast IP volumetric control in shared Redis/Memorystore storage: postulation `5/15min`, contact `10/1h`. If client IP cannot be resolved, skip only IP limiting and emit `missing_client_ip`. If the backend fails, fail open with critical log + alert.
2. Email business rules in one Strapi collection: postulation `2/30d`, hard duplicate block for same email + same `sectorDocumentId` because that is the selected sector identifier used by the current app flow; contact `5/24h`. If Strapi lookup/write fails, fail closed with UI-safe error, critical log + alert.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `teleferico-app/src/lib/http/guards` | Modified | Shared policy, Redis limiter adapter, IP resolution, events. |
| `teleferico-app/src/app/api/{contact,postulation}/route.ts` | Modified | Apply shared form protection and UI-safe failures. |
| `teleferico-app/src/lib/services/{contact,postulation}.ts` | Modified | Server-only Strapi business-rule calls. |
| `teleferico-cms/src/api/*` | New/Modified | One collection for email limits, duplicate checks, fingerprint flags. |
| `docs`, infra config, tests | Modified | Alerts, env/secret contract, rollout, Vitest/MSW coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Redis outage weakens IP limits | Med | Fail open only for IP layer; alert critical. |
| Strapi outage blocks submissions | Med | Intentional fail-closed with safe user copy and alerts. |
| Schema/permission drift | Med | Single modeled collection, docs sync, contract tests. |
| Oversized review | High | Maintainer-approved size exception; single PR required. |

## Rollback Plan

Disable the shared Redis limiter flags first; keep core guards and Strapi email rules. If business-rule collection behavior is wrong, revert the PR/migration through the normal branch flow and preserve existing submission paths. Remove alert/config changes separately; no console deploys.

## Dependencies

- Redis/Memorystore endpoint, secrets, and env config.
- Strapi collection schema, permissions, migration/rollback plan, and generated types policy.
- Alert route for critical Redis/Strapi/form-guard failures.

## Success Criteria

- [ ] Thresholds and duplicate rules match the approved architecture.
- [ ] Missing IP skips IP limit and logs `missing_client_ip`.
- [ ] Redis failure fails open; Strapi business failure fails closed.
- [ ] Fingerprints are logged as signal only, never sole block reason.
- [ ] `teleferico-app` tests use Vitest, Testing Library, jest-dom, jsdom, and MSW.
