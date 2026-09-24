# TB-113 Runtime Boundary Debt

## Current state

The following modules are ordinary exported JavaScript helpers. They are not
registered Strapi lifecycle hook modules, so Strapi does not invoke them
automatically for `beforeCreate`, `beforeUpdate`, or other persistence events:

- `teleferico-cms/src/api/survey-version/services/lifecycle.js`
- `teleferico-cms/src/api/survey-qr-point/services/lifecycle.js`
- `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js`
- `teleferico-cms/src/api/survey-submission/services/lifecycle.js`

The current consumers are explicit service methods:

- `survey-version` exposes `preparePublish` and `prepareActivation` through its
  core service; `survey-settings` reuses `prepareActivation`.
- `survey-qr-point` exposes `prepareQrStatus` through its core service.
- `survey-report-generation` exposes `assertReportCreation` and
  `prepareTransition` through its core service.
- `survey-submission` exposes `prepareSubmission` through its core service;
  the submission controller uses the separate persistence service for the
  transactional acceptance path.
- `teleferico-cms/test/feedback/lifecycle/lifecycle.test.js` calls the helpers
  directly as unit-level domain contracts.

## Future decision

Before enabling production authoring or worker mutations, choose one explicit
boundary for each invariant:

1. Register the invariant in native Strapi lifecycle hooks when the invariant
   belongs to CMS persistence and can be enforced without hidden side effects.
2. Move the invariant to the app-owned worker or command boundary when it is a
   report-generation or cross-system transition concern.
3. Delete the helper after proving that the invariant is enforced elsewhere and
   the focused tests have moved to that owner.

Do not assume that exporting a function from a `services/lifecycle.js` file
registers it with Strapi.

## Acceptance criteria for closing this debt

- Each helper has one documented owner and one invocation boundary.
- Native Strapi hooks, the app command boundary, or the worker boundary invoke
  the invariant in an integration test; direct helper tests alone are not
  sufficient.
- Published-version immutability, QR identity/status, submission snapshot
  preparation, and report state/CAS rules remain covered with safe failure
  behavior.
- The chosen owner is exercised by a transaction or HTTP test that proves no
  invalid state can be persisted or published through an alternate path.
- Any helper deleted as redundant has no remaining service, controller, worker,
  or test consumers.
- The decision and evidence are recorded in this document and the direct
  implementation ledger before the debt is marked complete.

**Status:** documented debt; implementation intentionally deferred from the
TB-113 runtime-boundary migration.

## Direct worker/PDF boundary update

The app-owned worker boundary is now explicit in
`teleferico-app/services/survey-report-worker/src/`. It validates the immutable
snapshot envelope, reuses only digest-matching render/store checkpoints,
rejects stale state versions, stages artifacts privately, and calls CMS
completion before publication. The PDF renderer is injected; deterministic
test and explicit unavailable implementations are available, while the
Playwright adapter remains worker-only.

The administrator command path exposes the same limitation through the typed
dispatcher result `DISPATCH_UNAVAILABLE` and leaves the CMS generation queued.
This does not close the CMS lifecycle debt or prove Cloud Tasks, Cloud Run,
OIDC, Vertex, GCS, or production image readiness.
