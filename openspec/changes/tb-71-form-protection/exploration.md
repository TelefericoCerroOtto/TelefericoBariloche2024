## Exploration: tb-71-form-protection

### Current State
Public contact and postulation forms already use a layered protection pipeline in `teleferico-app`: client-side honeypot + `formLoadedAt`, server-action CAPTCHA verification (`ensureValidCaptcha`), internal service calls with `x-internal-api-key` and `Origin`, and route-level guards via `withFormGuards` (`internal-api-key`, trusted origin, body-size limit, optional IP rate limiting). `contact` currently has in-memory rate limiting enabled (`Map`, 2 requests/hour), while `postulation` has rate limiting explicitly paused after a production false-positive incident. Both handlers still enforce honeypot and form-age checks; postulation additionally validates sector activity and persists CV metadata before creating the Strapi record. There are no automated tests in `teleferico-app` covering these guards today.

### Affected Areas
- `teleferico-app/src/lib/http/guards/form-guards.ts` — central guard pipeline and optional rate-limit hook.
- `teleferico-app/src/lib/http/guards/ip.ts` — client IP derivation (`x-client-ip`, `x-forwarded-for`, `x-real-ip`) and spoofing risk surface.
- `teleferico-app/src/lib/http/guards/rate-limit.ts` — in-memory limiter behavior and store lifecycle.
- `teleferico-app/src/app/api/contact/route.ts` — active rate-limited contact endpoint baseline.
- `teleferico-app/src/app/api/postulation/route.ts` — paused rate limiting with incident comment and multipart flow.
- `teleferico-app/src/app/[locale]/(institutional)/contact/_components/actions.ts` — CAPTCHA + server-action IP extraction before internal API call.
- `teleferico-app/src/app/[locale]/(institutional)/jobs/_components/actions.ts` — same protection entrypoint for postulation.
- `teleferico-app/src/lib/services/contact.ts` — internal request headers and IP forwarding contract.
- `teleferico-app/src/lib/services/postulation.ts` — internal multipart request headers and IP forwarding contract.
- `teleferico-cms/src/api/postulation/content-types/postulation/schema.json` — downstream contract boundary to preserve (no schema/permission change required).

### Approaches
1. **Harden existing app-level limiter (in-memory)** — Keep current `Map` strategy but add explicit per-form config, structured allow/block logs, and staged re-enable for postulation.
   - Pros: Minimal code churn, fastest rollout, fits existing guard architecture.
   - Cons: Not shared across instances; effectiveness varies with horizontal scaling.
   - Effort: Medium

2. **Move rate limiting to shared store (Redis/Memorystore)** — Replace in-memory store with centralized counters keyed by normalized client identity.
   - Pros: Consistent behavior across Cloud Run instances; stronger abuse control.
   - Cons: Infra dependency, networking/config overhead, rollout risk if misconfigured.
   - Effort: High

3. **Edge-first protection (Cloud Armor / LB policy) + app fallback** — Push coarse throttling/WAF to edge and keep app guards for business-specific checks.
   - Pros: Reduces load before app execution; better DDoS posture.
   - Cons: Requires infra policy management and still needs app-level semantic checks.
   - Effort: High

### Recommendation
Start with **Approach 1** as the immediate recovery path: preserve current multi-layer guards, make postulation rate limiting configurable and re-enabled only after staged IP-header validation, and add structured observability with clear rollback toggles. Keep **Approach 2** as the contingency if multi-instance drift or false positives persist under production traffic.

### Risks
- Incorrect client-IP trust chain in production proxy path can recreate false positives or allow bypasses.
- In-memory rate limiting can under-enforce when traffic is distributed across instances.
- Missing structured telemetry can delay incident diagnosis and rollback decisions.
- Tight thresholds may block legitimate users during peak campaigns.

### Ready for Proposal
Yes — the exploration is sufficient to propose a phased, reversible protection plan scoped primarily to `teleferico-app`, with explicit CMS contract preservation and infra-observability follow-up.
