# TB-113 Implementation Route

Ordinary future implementation work for TB-113 uses direct implementation by default. This repository-local decision applies even though this change already has OpenSpec artifacts.

## Required route

- Read the [proposal](./proposal.md), [specifications](./specs/), [design](./design.md), and [tasks](./tasks.md) as the normative scope, requirement, design, and work-breakdown references.
- Before writing design-significant U8 administration or public-form UI, complete the required OpenDesign inspection and visual reconciliation in the [UI Design Evidence Boundary](./design/06-migration-testing-rollout.md#ui-design-evidence-boundary). Stop when the artifact is unavailable or a material divergence remains undecided; report the blocker or obtain an explicit decision rather than inventing visual details.
- Implement the selected work unit directly and record its evidence in the [direct implementation ledger](./direct-implementation-ledger.md).
- Do not dispatch `sdd-apply`, `sdd-verify`, `sdd-archive`, or any other SDD phase for ordinary implementation. The presence of OpenSpec artifacts does not authorize or imply that dispatch.
- Use a formal SDD lifecycle operation only when the user explicitly requests one, such as formal verification, remediation, or archive.

**Stop condition:** If the request does not explicitly name a formal SDD lifecycle operation, remain on the direct implementation route.

## Feedback capability release lock

The feedback capability is controlled only by the server-side `FEEDBACK_CAPABILITY_ENABLED` flag. Exactly `true` enables it in local, staging, or production; absent or any other value disables it. This applies to the localized administration page, the public QR page, public survey/submission APIs, every browser-facing administration read/command handler, and sidebar projection. A direct page request returns the framework's not-found response; disabled APIs return a bounded 503 before runtime creation, authentication, CMS access, or mutation. Global maintenance mode is not used for this capability. Existing authentication, CSRF, origin, and QR protections remain required when enabled.

Local synthetic fixtures opt in through the same server-side flag in the fixture process. While TB-113 remains incomplete, both app deployment snapshots set the runtime value to `false`, so every deploy closes the feature and resets any manually enabled test window. An approved bounded operational test window may set the flag to `true` and must return it to `false` afterward; it does not change deployment defaults or authorize deployment, broader environment changes, or completion of pending formal tasks. A separate approval is required to change deployment defaults after feature completion.

## Direct verification profile and successor acceptance

The admin generation command requires an injected server-only source/configuration port. It obtains every private CMS source page and explicitly supplied versioned model configuration, pricing snapshot, and nonsecret evidence key ID, then validates and materializes the immutable snapshot before CMS creation or dispatch. The default runtime factory does not supply an approved CMS origin/token provider or model/pricing/key-ID configuration, so generation returns a bounded unavailable response before create/dispatch rather than persisting placeholders. Retry uses a new cutoff and source read without changing the failed generation. This local fail-closed wiring does not provision credentials, approve operational configuration, or enable the feature.

- Focused RED/GREEN tests for the selected behavior remain part of implementation.
- The historical direct-route default deferred local runtime harnesses and broad local verification. For the remaining U10 work, follow the prospective [execution plan](./tasks.md#execution-after-u10-a16): the cohesive local worker deliverable requires focused behavior/security tests and synthetic app–CMS–worker integration with a fake provider; no real remote calls are made.
- The local executor now proves synthetic zero- and nonempty-comment direct routes plus a two-chunk map/reduce route using injected CountTokens, map/reduce, and per-run evidence-key fakes; CMS-recomputed checkpoint digests/membership/CAS; deterministic PDF bytes; and atomic report completion/replay. Reduce accepts only digests from the CMS-verified map checkpoint graph and receives immutable core metrics. Semantic truth is intentionally not evaluated and per-report human editorial approval is not required. This remains local synthetic evidence only: U10/U11/U12 formal checkboxes stay pending, generation remains disabled, and no live provider, key provisioning, storage, queue, deployment, or operational readiness is claimed. See the latest direct ledger entry for exact evidence and deferred gates.
- Broad synthetic/local acceptance follows integration on `development`, alongside the existing required PR CI and repository governance. Package-wide suites, full typecheck/lint, and E2E are not claimed as passed until actually run; preserve the existing mandatory exact-SHA Cloud Build fixture, real-stack readiness, and real-auth acceptance checks.
- Google configuration/credential/Vertex/Cloud Tasks/Cloud Run/GCS operational checks and bounded staging smoke are post-development and separately approved. Their failure blocks real operation and enablement, not offline code. Keep `FEEDBACK_CAPABILITY_ENABLED` false, do not add Google-live CI or credentials, and fail closed when operational configuration is absent. Use only the approved `gemini-3.8-flash` in Vertex `us` through `aiplatform.us.rep.googleapis.com`; no fallback.
- Record every deferred command or scenario, its reason, acceptance criteria, residual risk, and intended future checkpoint and owner in the ledger.
- Implementation PR CI, later integrated human validation on `development`, and promotion CI are future evidence checkpoints. Their expected execution does not provide automatic `passed` evidence.
- Correct the implementation when focused tests, CI, or integrated validation report a failure, and link the correction to the originating work unit.

## Standing TB-113 review-size exception

Each remaining logical TB-113 PR may contain up to 6,000 authored additions plus deletions, measured once against its exact immediate parent. Do not ask for another size exception within this limit, code-golf, or omit useful tests or documentation. Above 6,000 changed lines, stop and rethink scope.

## Evidence rules

- Report only checks that were actually executed and their exact observed results.
- For design-significant U8 administration or public-form work, record the visual-reconciliation result in the ledger: OpenDesign artifact identity and revision when available, reviewed visual decisions, intentional divergences, and reasons.
- Never claim a deferred check as passed. Record it as `not run` with the exact deferred command or scenario and the reason.
- Treat direct implementation evidence as an implementation bridge only. It does not become retroactive native SDD attempt state, receipts, review authority, or formal verification evidence.
- Keep formal task completion, verification, and archive claims pending until the corresponding formal evidence is executed and admitted by the formal workflow.

## Later formal closure

Formal SDD closure can be reconstructed later, but it must use fresh evidence:

1. Compare the integrated implementation and ledger against the normative proposal, specifications, design, and tasks.
2. Execute every deferred command and scenario required for formal acceptance.
3. Remediate any divergence or failed evidence.
4. Produce a fresh formal verification result through an explicitly requested SDD operation.
5. Archive only if that verification evidence is admitted by the formal workflow.

Direct implementation history may inform this reconstruction, but it cannot substitute for any of these steps.
