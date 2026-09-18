# TB-113 Implementation Route

Ordinary future implementation work for TB-113 uses direct implementation by default. This repository-local decision applies even though this change already has OpenSpec artifacts.

## Required route

- Read the [proposal](./proposal.md), [specifications](./specs/), [design](./design.md), and [tasks](./tasks.md) as the normative scope, requirement, design, and work-breakdown references.
- Implement the selected work unit directly and record its evidence in the [direct implementation ledger](./direct-implementation-ledger.md).
- Do not dispatch `sdd-apply`, `sdd-verify`, `sdd-archive`, or any other SDD phase for ordinary implementation. The presence of OpenSpec artifacts does not authorize or imply that dispatch.
- Use a formal SDD lifecycle operation only when the user explicitly requests one, such as formal verification, remediation, or archive.

**Stop condition:** If the request does not explicitly name a formal SDD lifecycle operation, remain on the direct implementation route.

## Direct verification profile

- Focused RED/GREEN tests for the selected behavior remain part of implementation.
- Local runtime harnesses are intentionally deferred by default on this TB-113 direct route.
- Broad local final verification is also intentionally deferred by default, including package-wide suites and full local typecheck, lint, format, and E2E passes.
- Record every deferred command or scenario, its reason, acceptance criteria, residual risk, and intended future checkpoint and owner in the ledger.
- Implementation PR CI, later integrated human validation on `development`, and promotion CI are future evidence checkpoints. Their expected execution does not provide automatic `passed` evidence.
- Correct the implementation when focused tests, CI, or integrated validation report a failure, and link the correction to the originating work unit.

## Evidence rules

- Report only checks that were actually executed and their exact observed results.
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
