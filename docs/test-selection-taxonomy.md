# Fail-Closed Test Selection Taxonomy

TB-127 defines the repository's minimum test-selection model and closes when this design is approved. It does not change current CI behavior: implementation pull requests still use legacy `smoke`, trusted `development -> staging` promotions still use legacy `full`, both legacy profiles include blocking real-auth acceptance, and production public smoke remains isolated.

## Outcome and invariants

- Selection applies only to internal implementation pull requests targeting `development`.
- Selection is additive, deterministic, and evaluated by trusted base-branch policy.
- Evidence is bound to exact base and head commit SHAs and includes every paginated pull-request file result.
- Renames and copies are classified from the union of their old and new paths.
- Unknown or root-ambiguous executable surfaces use the complete available pre-merge fallback. Incomplete, truncated, or contradictory evidence produces a typed error instead of a partial selection.
- `staging.full` bypasses impact selection and runs every staging-relevant CI-executable app/CMS suite while reporting relevant unavailable suites.
- Production public smoke is never selected by a pre-merge profile.
- Running a suite is not a substitute for adding or updating representative tests when changed behavior lacks coverage.
- Public output never contains paths, filenames, provider messages, or pull-request-controlled strings.

Implementation is deliberately outside TB-127. Selector code, contract tests, workflow integration, shadow rollout, app Vitest CI adoption, remaining TB-122 runtime acceptance and production work, and TB-126 staging-impact research are separate work units.

## Core model

- **Atomic suite:** an independently invocable evidence unit with one stable suite ID.
- **Execution profile:** a versioned composition of suites for an execution context. A profile may be fixed or may use trusted selection rules.
- **Domain:** a changed-surface classification consumed by selection rules. Domains describe impact, not commands.
- **Executor:** infrastructure that validates trusted policy output and runs fixed commands for selected suites. Pull-request input never supplies commands.

The initial profile model is:

| Profile | Version 1 behavior |
| --- | --- |
| `implementation` | Select suites additively from classified implementation-PR changes. |
| `staging.full` | Bypass impact rules and include every staging-relevant app/CMS suite according to capability state. |
| `production-public-smoke` | Run only the isolated, read-only post-deployment production probe. |

## Suite catalog and capability state

Catalog order is normative and is used for deterministic public collections.

| Order and suite ID | Evidence and current capability |
| --- | --- |
| 1. `app.vitest` | Existing app unit, component, guard, and Route Handler suite. Local only and not yet CI-executable. When relevant, it is required blocking evidence; enforcement cannot begin until the suite is CI-executable. |
| 2. `app.playwright.fixture-standard` | Fixture-backed standard browser smoke. CI-executable; a selected failure blocks its profile. |
| 3. `app.playwright.fixture-maintenance` | Fixture-backed maintenance-only browser coverage. CI-executable; a selected failure blocks its profile. |
| 4. `app-cms.real-stack-readiness` | PostgreSQL, Strapi, and Next.js build, start, and readiness evidence. CI-executable; a selected failure blocks its profile. It does not prove functional authentication. |
| 5. `app-cms.playwright.real-auth` | Authenticated app/CMS coverage activated by TB-122. It is CI-executable and blocking in both legacy pre-merge profiles; exact-SHA runtime 3/3 acceptance remains required before treating delivery as proven. |
| 6. `app.playwright.production-public-smoke` | Read-only post-deployment production probe. CI-executable only in its isolated production profile and never eligible for pre-merge selection. |
| 7. `tools.image-pipeline.vitest` | Known local-only Image Pipeline suite. It has no CI executor or profile membership and is never reported as unavailable CI evidence. |

There is no `cms.vitest` suite. It should be introduced only when the CMS gains maintained custom observable behavior that app tests, real-stack readiness, and end-to-end coverage cannot prove adequately.

Every suite declaration must state CI executability. Every required non-CI-executable suite must also state a `blocking` or `advisory` disposition and appear in `requiredButUnavailable`, except a suite explicitly classified as local-only with no CI profile membership.

## Domains and selection rules

The policy classifies all old and new paths before selecting suites. A change may belong to multiple domains, and the result is the union of all applicable rules.

### CMS surfaces

- An app-consumed CMS schema, component, authentication, payload, localization, slug, permission, or response-envelope contract requires `app.vitest` and `app-cms.real-stack-readiness`.
- The same contract change must add or update a representative app-side contract test. If that evidence is absent, selection fails with a typed contract-coverage error; merely running the existing suite is insufficient.
- Add `app.playwright.fixture-standard` only when the contract affects a browser scenario or resource represented by the fixture-backed standard suite.
- Purely operational CMS configuration requires `app-cms.real-stack-readiness` without automatically requiring `app.vitest`.
- Authentication, roles, permissions, and protected operations require the blocking `app-cms.playwright.real-auth` suite.

### App surfaces

- Unit, component, guard, service, utility, and Route Handler logic requires `app.vitest`.
- Public routing, anonymous administration, proxy behavior, and fixture-backed browser flows additionally require `app.playwright.fixture-standard`.
- Maintenance behavior additionally requires `app.playwright.fixture-maintenance`.
- Authentication, protected administration, sessions, roles, permissions, and CMS mutations require `app-cms.playwright.real-auth`.
- Dependency, lockfile, and cross-cutting runtime or test configuration changes use the complete pre-merge fallback.
- Public assets and CSS are executable app surfaces. They never qualify for `no-ci-tests`; browser or fallback evidence is required according to impact.

### Unknown, root, and cross-domain surfaces

- A recognized multi-domain change receives the additive union of all domain selections.
- An unknown or root-ambiguous executable surface applies the complete available pre-merge fallback and reports all relevant unavailable suites.
- Unclassified executable surfaces never produce `no-ci-tests`.
- Invalid path data, missing pagination evidence, count mismatches, truncation, or evidence that no longer matches the head SHA produces `error`.

The complete available pre-merge fallback consists of every CI-executable, pre-merge app/CMS suite. It excludes production public smoke and Image Pipeline Vitest. Relevant non-CI-executable pre-merge suites are reported separately in `requiredButUnavailable`.

## `no-ci-tests` policy

The terminal status is `no-ci-tests`; `no-tests` is not valid.

`no-ci-tests` is allowed only when every changed old and new path is either:

- present in a closed, trusted passive-path allowlist; or
- under `tools/image-pipeline/**` while that package remains formally local-only and outside every CI execution profile.

The passive allowlist must enumerate accepted path patterns in trusted policy. It must not contain a blanket `docs/**` rule. In particular, `docs/infra/**`, this selector design and its future selector documentation, executable configuration snapshots, and CI contracts are classified as `operational-contract`. They require a trusted static validator when one is cataloged or the conservative fallback until then.

An input that combines a passive or Image Pipeline-only path with any executable, operational-contract, unknown, or ambiguous path cannot produce `no-ci-tests`.

## Selection result and capability semantics

The public status is derived after rule evaluation and capability resolution, with this precedence:

1. `error` when evidence or a required policy contract is invalid.
2. `required-but-unavailable` when at least one relevant required suite is not CI-executable, regardless of whether its disposition is blocking or advisory.
3. `selected` when at least one available suite is selected and no required suite is unavailable.
4. `no-ci-tests` only under the closed policy above.

`selected` contains only CI-executable suites. Required non-CI-executable suites belong only in `requiredButUnavailable`. Once a suite becomes CI-executable, the same rule places it in `selected`; no domain rule should change solely because executor capability changed.

## Public JSON v1

The selector publishes one sanitized JSON object. The following schema is normative at the field and value level; implementations may use a formal schema language without changing it.

- `schemaVersion`: integer `1`.
- `status`: one of `selected`, `required-but-unavailable`, `no-ci-tests`, or `error`.
- `selected`: ordered array of available suite IDs.
- `requiredButUnavailable`: ordered array of objects with `suiteId` and `disposition`, where disposition is `blocking` or `advisory`.
- `fallback`: object with Boolean `applied` and a stable typed `code`. Use `none` when no fallback applied.
- `reasons`: ordered array of objects with stable `id` and aggregate integer `count` only.
- `evidence`: object with exact lowercase 40-character `baseSha` and `headSha` plus aggregate integer counts. It contains no paths.
- `errors`: ordered array of objects with stable `kind` and `code`. Raw provider messages are prohibited.

All arrays and nested collections are deterministically ordered and deduplicated. Suite collections use catalog order. Reason IDs, aggregate domain keys, and error pairs use ascending stable identifier order. Counts are non-negative integers.

Implementations must never reflect paths, filenames, GitHub messages, exception text, API response fragments, branch names, pull-request titles, or other pull-request-controlled strings into this public object.

This schema-valid example uses non-zero illustrative SHAs; they are examples, not repository revisions:

```json
{
  "schemaVersion": 1,
  "status": "required-but-unavailable",
  "selected": [
    "app.playwright.fixture-standard",
    "app-cms.real-stack-readiness"
  ],
  "requiredButUnavailable": [
    {
      "suiteId": "app.vitest",
      "disposition": "blocking"
    }
  ],
  "fallback": {
    "applied": false,
    "code": "none"
  },
  "reasons": [
    {
      "id": "rule.cms.app-consumed-contract",
      "count": 2
    }
  ],
  "evidence": {
    "baseSha": "1111111111111111111111111111111111111111",
    "headSha": "2222222222222222222222222222222222222222",
    "changedFileCount": 2,
    "renameCount": 0,
    "copyCount": 0,
    "domainCounts": {
      "cms-contract": 2
    }
  },
  "errors": []
}
```

Fallback codes must distinguish at least `none`, `unknown-surface`, and `root-ambiguous`. Error kinds and codes must distinguish evidence acquisition, evidence consistency, path validation, and policy-contract failures without exposing provider text.

## Trusted evidence and security boundary

- The selector executes trusted base-branch code, not pull-request code.
- It receives exact base and head SHAs and validates both before classification.
- It retrieves all changed-file pages from the trusted GitHub API boundary and verifies aggregate counts against provider metadata.
- Pagination continues beyond 100 files and stops only at verified completion or a typed error.
- A head SHA change during evidence acquisition invalidates the snapshot and produces `error`; it never reuses a partial result.
- Rename and copy records contribute both previous and current paths to classification.
- Invalid, missing, truncated, duplicate-contradictory, or count-inconsistent evidence produces a typed error.
- Public reporting contains aggregate counts and stable identifiers only.

## Cloud Build transport

Version 1 transports atomic suite decisions through these substitutions:

- `_RUN_APP_VITEST`
- `_RUN_FIXTURE_STANDARD`
- `_RUN_FIXTURE_MAINTENANCE`
- `_RUN_REAL_STACK_READINESS`
- `_RUN_REAL_AUTH_E2E`

Every value must be explicitly present and exactly `true` or `false`. Validation occurs before Corepack, dependency installation, or any pull-request-selected executable step. After validation, each `true` flag maps to one fixed trusted command; flags never carry command text. `app.playwright.production-public-smoke` remains outside this transport.

## Legacy compatibility

During coexistence, `_TEST_SELECTION_MODE` is mandatory and accepts only `legacy` or `v1`. Implementation must remove the effective default from `_PLAYWRIGHT_SUITE` so omitted mode or mixed input cannot silently select smoke.

| Mode | Valid input and behavior |
| --- | --- |
| `legacy` | `_PLAYWRIGHT_SUITE` is exactly `smoke` or `full`; no atomic flag is present. `smoke` maps to fixture standard plus real-stack readiness. `full` maps to fixture standard, fixture maintenance, plus real-stack readiness. |
| `v1` | `_PLAYWRIGHT_SUITE` is empty and all five atomic flags are explicitly `true` or `false`. The executor runs only the fixed commands enabled by validated flags. |

Missing, mixed, contradictory, or unknown mode/input combinations fail before Corepack or dependency installation. Production public smoke does not use either pre-merge mode.

## Shadow and enforcement gates

Shadow evaluation runs for every internal implementation pull request to `development`, including changes omitted by current workflow path filters. Legacy remains authoritative during shadow, selector output contains no filenames, and staging continues to bypass selector decisions.

Version 1 enforcement requires all of the following:

- at least 14 consecutive days of valid shadow evidence;
- at least 10 unique head SHAs in that window;
- every contract vector passing;
- zero false `no-ci-tests` results;
- zero final-window snapshot or evidence failures;
- conservative fallback for every unknown or root-ambiguous executable surface;
- every difference from legacy behavior classified and reviewed; and
- explicit maintainer approval.

A material rule, domain, capability, output-contract, or fallback change resets the evidence window. Editorial changes that cannot affect selection do not reset it.

## Rollout order

1. Publish and approve the TB-127 design.
2. Implement the selector, JSON v1 output, and contract vectors without CI authority.
3. Run legacy-authoritative shadow evaluation for every internal implementation pull request.
4. Integrate app Vitest into CI so required app evidence becomes CI-executable.
5. Satisfy the complete shadow gate and obtain maintainer approval.
6. Enable v1 enforcement for implementation pull requests.
7. Observe 10 successful v1 implementation builds and two successful fixed v1 `staging.full` promotions using the definitive suite set.
8. Prove that no legacy callers remain, including manual and documented callers.
9. Obtain final maintainer confirmation, then remove `_PLAYWRIGHT_SUITE` and legacy mode.

TB-122 runtime acceptance and native-trigger cleanup are independent of this rollout order:

- Real-auth is active and blocking in legacy profiles. Selector implementation must preserve that capability and fail closed as blocking if it becomes unavailable; exact-SHA runtime 3/3 evidence remains a separate acceptance gate.
- Cleanup of the disabled native trigger follows TB-122's own rollback-acceptance criteria and does not depend on selector enforcement.
- Removing `_PLAYWRIGHT_SUITE` and legacy selector mode still requires definitive v1 evidence, zero legacy callers, proof that the native trigger no longer depends on the legacy protocol, and final human confirmation.

No later step is implied or authorized by approval of this document.

## Minimum contract vectors

The following 24 vectors are minimum observable contracts. Tests may add cases, but these behaviors must remain explicit. The vectors describe public outcomes and do not prescribe internal function names.

### Selection vectors

| # | Vector | Expected public status and behavior |
| --- | --- | --- |
| 1 | Passive documentation only | `no-ci-tests`; no suites, unavailable evidence, fallback, or errors. Every path must match the closed passive allowlist. |
| 2 | Image Pipeline only while formally local-only | `no-ci-tests`; `tools.image-pipeline.vitest` is neither selected nor unavailable. |
| 3 | App unit/component/handler source | `required-but-unavailable` before app Vitest CI adoption; `app.vitest` appears as blocking unavailable evidence. After adoption, `selected` includes it. |
| 4 | Maintenance-only fixture browser surface | `selected`; include `app.playwright.fixture-maintenance`. App logic in the same change additionally applies vector 3. |
| 5 | Pure operational CMS configuration | `selected`; include `app-cms.real-stack-readiness` without automatically adding app Vitest. |
| 6 | App-consumed CMS contract with an added or updated app contract test | `required-but-unavailable` before app Vitest CI adoption; select readiness, report app Vitest as blocking unavailable evidence, and add fixture standard only for a represented browser contract. After adoption, include app Vitest in `selected`. |
| 7 | App-consumed CMS contract without added or updated app contract evidence | `error`; emit a typed policy-contract error and do not treat suite execution as sufficient coverage. |
| 8 | Authentication/protected-operation impact if real-auth capability regresses to unavailable | `required-but-unavailable`; report `app-cms.playwright.real-auth` as blocking and include any other available selected suites. |
| 9 | Authentication/protected-operation impact with active real-auth | `selected`; include `app-cms.playwright.real-auth`, whose omission or failure is blocking. |
| 10 | Combined app and CMS impact | Derived `selected` or `required-but-unavailable`; return the deduplicated additive union in catalog order and apply the stricter relevant capability disposition. |
| 11 | Unknown or root-ambiguous executable surface | `required-but-unavailable` when relevant required suites are unavailable, otherwise `selected`; apply the complete available pre-merge fallback with typed `unknown-surface` or `root-ambiguous` code. |
| 12 | Rename or copy across domains | Derived `selected` or `required-but-unavailable`; classify the old-plus-new path union, deduplicate suites, and publish aggregate rename/copy counts only. |

### Evidence and security vectors

| # | Vector | Expected public status and behavior |
| --- | --- | --- |
| 13 | More than 100 changed files | Normal derived status after complete pagination; aggregate count equals the verified full result. |
| 14 | Provider count differs from accumulated pages | `error`; emit a typed evidence-consistency code and no partial selection. |
| 15 | Head SHA changes during acquisition | `error`; emit a typed snapshot-stability code and discard the acquired snapshot. |
| 16 | Invalid path metadata or truncated/incomplete evidence | `error`; emit a typed path-validation or evidence-acquisition code and no partial selection. |
| 17 | Provider filename or raw API message attempts to enter public output | Derived semantic status with the value omitted; output contains only stable IDs, exact SHAs, and aggregate counts. |
| 18 | Equivalent input arrives in a different order | Byte-stable semantic JSON ordering after canonical serialization; status, suites, reasons, counts, fallback, and errors are unchanged. |

### Compatibility and routing vectors

| # | Vector | Expected public status and behavior |
| --- | --- | --- |
| 19 | Valid legacy `smoke` | `selected`; fixture standard, real-stack readiness, and real-auth acceptance, with no atomic flags accepted. |
| 20 | Valid legacy `full` | `selected`; fixture standard, fixture maintenance, real-stack readiness, and real-auth acceptance, with no atomic flags accepted. |
| 21 | Valid v1 atomic flags | `selected`, `required-but-unavailable`, or `no-ci-tests` according to the policy result; `_PLAYWRIGHT_SUITE` is empty and all flags are explicit strict Booleans. |
| 22 | Mixed or contradictory legacy/v1 input | `error`; reject before Corepack or dependency installation with a typed compatibility code. |
| 23 | Trusted `development -> staging` promotion | Bypass selector impact rules under `staging.full`; run every staging-relevant CI-executable app/CMS suite and report relevant unavailable suites, yielding `required-but-unavailable` while any such suite is unavailable. |
| 24 | Production deployment smoke | Isolated production result selecting only `app.playwright.production-public-smoke`; no pre-merge flag, fixture profile, readiness suite, or selector fallback can route into it. |

## Relationship to current repository behavior

The current executor accepts `_PLAYWRIGHT_SUITE=smoke|full`, defaults to `smoke`, maps smoke to the standard fixture suite, maps full to standard plus maintenance, and runs real-stack readiness followed by blocking real-auth acceptance in both cases. The trusted dispatcher derives smoke for same-repository implementation pull requests to `development` and full for the exact internal `development -> staging` route. These are the legacy semantics preserved during coexistence.

The current app Vitest suite discovers `src/**/*.{test,spec}.{ts,tsx}` and remains local rather than CI-executable. The CMS has no configured automated test suite. Production-safe browser specs remain isolated from fixture-backed Playwright configuration. See [Playwright E2E testing](./playwright-e2e.md), [Infrastructure](./INFRA.md), and [GitHub Actions Automation & Governance](./CI-AUTOMATION.md).
