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

## Direct verification profile

- Focused RED/GREEN tests for the selected behavior remain part of implementation.
- Local runtime harnesses are intentionally deferred by default on this TB-113 direct route.
- Broad local final verification is also intentionally deferred by default, including package-wide suites and full local typecheck, lint, format, and E2E passes.
- Record every deferred command or scenario, its reason, acceptance criteria, residual risk, and intended future checkpoint and owner in the ledger.
- Implementation PR CI, later integrated human validation on `development`, and promotion CI are future evidence checkpoints. Their expected execution does not provide automatic `passed` evidence.
- Correct the implementation when focused tests, CI, or integrated validation report a failure, and link the correction to the originating work unit.

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
