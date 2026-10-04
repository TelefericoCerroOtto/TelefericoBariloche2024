# TB-113 survey status collision and staging snapshots

## Objective

Allow Content Manager to create and edit survey records without confusing domain status fields with Strapi's draft/published document status. Preserve existing PostgreSQL values and the eleven already-modified TB-113 staging snapshot files in one fresh implementation branch and one PR.

## Problem and scope

- Strapi 5.45.1's Content Manager validates a submitted `status` field as document status (`draft` or `published`), even for these non-Draft & Publish collections. A QR point with domain status `active` fails with `Invalid status`; the isolated validator reproduction rejected `active` and accepted `published`.
- Rename the three CMS schema attributes named `status`: survey QR point, survey version, and survey report generation. Migrate their existing database columns without dropping rows or constraints. Update only the consumers whose field represents the renamed content attribute. Preserve native Strapi document status, HTTP status, and independent public/custom response contracts unless an explicit mapping requires adjustment.
- Include the eleven pre-existing dirty paths from the prior staging-infrastructure work without overwriting or silently repairing them. The user explicitly requested their inclusion in this same branch and PR. Keep unrelated changes attributable to their own work unit in the commit history and disclose them in the PR body.
- No secrets, credential files, live GCP resource changes, direct deployment, force push, merge, or branch deletion. The PR targets `development`; publication is explicitly requested, but no deployment is authorized.

## Branch and checks

- Branch: `fix/app-cms-root-tb-113-survey-status`, created in the current worktree from freshly fetched `origin/development` at `09dff093c0dc79eb3fd297da3a03b3dd77e1386f`. The old branch was merged; its HEAD tree matched this base and its eleven tracked modifications survived the branch switch unchanged. The initial local branch name was corrected before any commit to cover the app, CMS, and root paths in this work unit.
- Tracking: Notion Backlog unificado Work ID `TB-113`, `Formalizado`, `Canal formal: GitHub Issue`, formal issue #227 open. No Notion write was authorized.
- Effective testing: the direct TB-113 route requires focused RED/GREEN evidence; strict project-wide TDD mode is not established by this request. CMS focused Node harness and app Vitest are the relevant runners; isolated PostgreSQL cases need Docker. No check is passed merely because a tool exists.
- Route: delegated direct. The status rename spans CMS schemas, migrations, app consumers, tests, generated types, and documentation (multiple non-trivial files). Read-only mapping was delegated before implementation. About 400 authored changed lines per task is advisory only; do not omit tests or compress code to fit it. The TB-113 change-local standing PR exception allows up to 6,000 authored changed lines per logical PR.

## Tasks

- [ ] **SNAP-1 — Preserve and close the existing staging snapshot work unit.** Verify the exact pre-existing eleven-file diff, focused worker contract, all six Cloud Build YAML parses, and `git diff --check`. Keep the existing task file's prior history and the user's staging flag. Commit only this verified snapshot work unit and this feature document before editing CMS/app source. Route: delegated direct for any non-trivial correction; otherwise read-only verification and one work-unit commit. Record its commit SHA and rollback boundary here afterward.
- [ ] **CMS-1 — Rename all three schema attributes and preserve rows.** Choose distinct domain names for QR point, version, and generation statuses. Add a migration that runs before Strapi schema synchronization to preserve existing values and constraints/indexes; make fresh database initialization and repeated startup safe. Update CMS services, raw SQL, seed, app consumers, generated types, and contract documentation without changing unrelated wire-status semantics. Route: one bounded delegated writer. Acceptance: no `status` content-type attribute remains in CMS API/component schemas; existing active/inactive, draft/published, and queued/running/succeeded/failed rows retain their values.
- [ ] **TEST-1 — Prove the regression and close the fix work unit.** Reproduce QR-point Content Manager create's `Invalid status` against the old shape, then show a passing create/edit scenario on the new shape. Run focused CMS schema/lifecycle/seed/submission/generation/migration tests and app CMS transport/type checks; distinguish PostgreSQL/Docker unavailable from passing. Verify docs, generated declarations, candidate paths, and `git diff --check`. Commit the cohesive CMS/app fix with its tests/docs, record the SHA and rollback boundary. Route: delegated writer verification plus parent spot check; no unobserved PASS.
- [ ] **PR-1 — Publish and observe governance.** Inspect status/diff/recent commits; check complete candidate path names for sensitive inputs, keep the pre-existing snapshot paths in a visible English Scope Disclosure, and retain the tracked Work ID/issue linkage. Non-force-push to `origin`, open one implementation PR against `development`, run the repository governance helper once, and report functional/Cloud Build checks separately. No merge or direct deployment. Route: bounded publication action after verified commits.

## Progress and next step

The branch is established and the tracking read is complete. No source change, test, or commit for this new work unit has occurred. Next: verify the existing snapshot work unit, then implement the three-field migration and its regression proof. Keep this document and its Engram mirror synchronized after each task.
