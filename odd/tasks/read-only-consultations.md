# Read-only consultations without repository consent prompts

## Objective

Remove repository-level requirements to ask for user authorization before task-scoped read-only consultations. Runtime permission prompts remain in force.

## Problem and scope

Routing guidance currently conflates consultation with mutation, causing repeated approval questions for GitHub, Notion, GCP, and other external reads. Update the relevant repository policies and one focused contract test. Do not weaken target identification, tool availability, credential and secret-value restrictions, mutation approvals, or deployment rules.

## Authorized outcome

The user authorized a new worktree, implementation, one or more work-unit commits, a non-force push, and one implementation PR to `development`. Use the current repository and active tool sessions; do not read credential files.

## Plan

- [x] T1 — Align repository read-only consultation policy across routing, GCP guidance, and the SDD slice-transition skill; add and run a focused regression check.

## Acceptance criteria

- Ordinary task-scoped read-only consultations require no separate repository-semantic approval.
- Sensitive credential or secret-value access remains prohibited; runtime permission denials remain binding.
- Ambiguous targets still require clarification, and writes or operational changes retain their approval rules.
- Relevant contract test demonstrates RED before policy edits and GREEN afterward; `git diff --check` passes.

## Execution

- Route: delegated writer; the change spans at least four policy/test files and requires contextual reading.
- TDD: enabled by the active project instructions; runner: `node --test .github/scripts/implementation-pr-vitest.test.js`.
- Delivery: `ask-on-risk`; forecast below 400 authored changed lines, one PR slice.
- Current status: T1 implemented and verified, including parent-requested policy-consistency follow-up. Work-unit commit: `a44794a55b00dbf2258853c88d8788bb46887df6`. Engram mirror synced.
- Verification evidence: RED — `node --test .github/scripts/implementation-pr-vitest.test.js` exited 1 before policy edits; the new contract assertion rejected the previous consultation policy. GREEN — `node --test .github/scripts/implementation-pr-vitest.test.js` passed (1 test file), `node .github/scripts/implementation-pr-vitest.test.js` passed 24/24, and `git diff --check` passed. Parent-requested policy-consistency follow-ups also passed; no new RED cycle was needed because these only tightened the existing contract.
- Follow-ups: corrected the GitHub publication-governance link, clarified Notion destination creation/change versus reading, made the practical-default and unavailable-tool wording explicit about read-only consultations, restored the original INFRA ADC login URL unchanged, clarified that ambiguous-command handling is classification/target clarification before running—not approval for a confirmed read-only consultation, and aligned failed-governance diagnostics with task-scoped GitHub CLI reads through the current active session. Fresh authorization remains required for later metadata-repair writes.
- Next step: publish the verified branch through one implementation PR to `development`.
