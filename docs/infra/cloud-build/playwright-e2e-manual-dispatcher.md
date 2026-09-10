# Provisioned manual Playwright dispatcher target

**Status: development smoke dispatch, manual same-SHA staging parity, and automatic staging OIDC full dispatch are proven. The accepted parity cutover removed the redundant GitHub-hosted fixture jobs; the manual exact-SHA trigger remains the fallback.** This snapshot records external state but does not create, update, disable, or enable it.

## Target

- Type: regional manual trigger `playwright-e2e-dispatch` in `southamerica-east1`.
- Immutable trigger ID: `3946c022-59cf-42cc-97cf-827c19f73291`.
- Default source branch: `development`; no approval requirement.
- Source revision: the exact lowercase 40-character PR head SHA supplied as `--sha`.
- Build configuration: `cloudbuild.playwright-e2e.json`.
- Build timeout from the selected revision: 45 minutes (`2700s`).
- Suite substitution: `_PLAYWRIGHT_SUITE=smoke|full`; omission defaults safely to `smoke`.

## Dispatch scope

The repository dispatcher implementation on default `main` covers relevant same-repository pull requests to `development` and `staging`. It covers `teleferico-app/**`, `teleferico-cms/**`, `cloudbuild.playwright-e2e.json`, `scripts/run-playwright-real-stack-readiness.sh`, the dispatcher and parity workflows, and the static contract test. Documentation-only changes and `tools/**` are intentionally excluded. Pull requests to `development` derive `smoke`; only a `development` head targeting `staging` derives `full`; other staging heads skip before OIDC.

## Provisioned identities

- GitHub dispatcher/invoker: `github-cloud-build-dispatcher@teleferico-bariloche-2024.iam.gserviceaccount.com`. Its custom role permits only `cloudbuild.builds.create` and `cloudbuild.builds.get`; it may act as the test executor only.
- Cloud Build test executor: `cloud-build-playwright-tests@teleferico-bariloche-2024.iam.gserviceaccount.com`, configured on the manual trigger and granted project `roles/logging.logWriter`.

## Workload Identity Federation

- STS API, pool `github-actions`, and provider `teleferico-pr-dispatch` are active.
- The provider is ACTIVE with condition `assertion.repository_id=='857375731' && assertion.repository_owner_id=='181292897' && assertion.event_name=='pull_request_target' && (assertion.base_ref=='development' || (assertion.base_ref=='staging' && assertion.head_ref=='development')) && assertion.workflow_ref=='TelefericoCerroOtto/TelefericoBariloche2024/.github/workflows/cloud-build-playwright-dispatch.yml@refs/heads/main'`.
- The workflow and WIF prerequisites for automatic staging dispatch are configured. This condition preserves the repository ID, owner ID, event, trusted default-branch workflow ref, principal binding, and keyless token flow while allowing only the exact internal staging route. PR #273 supplied the accepted automatic proof. This repository cutover does not alter GCP or IAM.
- The provider principal set has `roles/iam.workloadIdentityUser` only on the dispatcher identity.

## Repository variables

- `CLOUD_BUILD_PROJECT_ID`
- `CLOUD_BUILD_REGION`
- `CLOUD_BUILD_WIF_PROVIDER`
- `CLOUD_BUILD_DISPATCHER_SERVICE_ACCOUNT`
- `CLOUD_BUILD_PLAYWRIGHT_MANUAL_TRIGGER_ID`

All five values exist; `CLOUD_BUILD_PLAYWRIGHT_MANUAL_TRIGGER_ID` holds the immutable trigger ID. They are repository variables, not secrets. No service-account key, static secret, permanent credential, or Secret Manager value exists for this dispatcher: credential policy forbids agents and humans from creating keys. The workflow requests an action-generated access token without a workspace credential file, stores it owner-only under the ephemeral runner temporary directory for `gcloud --access-token-file`, and removes it on exit. Do not add remote-build cancellation permission.

## Manual trigger pilot

- Build `7cebdf89-08be-49ed-97c4-f49fb319c647` succeeded for exact commit `dea11bff40de5926f879bc04c9e92e73b6491e76` through trigger `3946c022-59cf-42cc-97cf-827c19f73291`.
- It was created `2026-09-08T19:54:30Z`, ran from `19:54:31Z` to `20:03:23Z` (about 8m52s), and used the dedicated test executor.
- Workspace revision, package-manager, locked-dependency, fixture-backed Chromium smoke, and real-stack-readiness steps all succeeded. No Secret Manager reference, inline secret, `secretEnv`, credential, environment value, source content, or raw log was exposed.
- This proves the manual trigger, exact-SHA execution, and dedicated executor only. It does not prove GitHub OIDC/dispatcher behavior, authenticated flows, staging, production, or final migration cutover.

## GitHub-dispatched proof

- PR #268 head SHA: `8a0185fa70ee0dedc53573f0f6dafbffd9a4199c`.
- GitHub dispatcher run `34373237590`: `validate-trusted-pr` and `dispatch-and-wait` succeeded.
- OIDC/WIF authentication succeeded without a service-account key.
- Trigger `3946c022-59cf-42cc-97cf-827c19f73291` launched Cloud Build `b29e46c1-10a4-4d28-bf2b-21b7d985b22d`.
- All five Cloud Build steps succeeded; `COMMIT_SHA` and `REVISION_ID` exactly matched the PR SHA.
- GitHub-hosted Chromium smoke passed on the same SHA.

This proves the GitHub-dispatched development fixture smoke path. By itself, it does not prove the full staging suite, production-smoke migration, authenticated E2E, or diagnostic artifacts.

- Dispatcher-only GitHub run `34381586085` and Cloud Build `bf5ce7c0-74d6-4e89-9c5e-28aadb38d645` passed the smoke route at exact SHA `1dbf18ed28975fc45beb786816e42c690d304cda` after the legacy trigger was disabled.
- PR #269 checks proved the development smoke route before it merged.

## Completed first-promotion bootstrap

PR #269 merged into `development`. PR #270 used exact head SHA `317483acb566fbeb6077a0c10a8c70f721e1c2ca`; GitHub full run `34399083297` and manual Cloud Build full build `b2639432-a76e-4c65-b2f3-5c6fd779afc6` passed on that SHA. PR #270 merged into `staging` as `d46a448d996d24a421b4d4a320cb6f3e84f58506`, and PR #271 merged into `main` as `465f1f02262a67c14a2a4c8fe0c0ed16fcdbbdd2`.

The approved manual command shape was:

```bash
gcloud builds triggers run 3946c022-59cf-42cc-97cf-827c19f73291 \
  --project=teleferico-bariloche-2024 \
  --region=southamerica-east1 \
  --sha=<EXACT_PROMOTION_HEAD_SHA> \
  --substitutions=_PLAYWRIGHT_SUITE=full
```

These matching results prove manual same-SHA full-suite parity only. They do not prove automatic GitHub OIDC staging dispatch. Keep the legacy trigger disabled and retained; future manual runs still require explicit operational approval. Production smoke, authenticated E2E, Vitest migration, deployments, and legacy-trigger deletion are outside this bootstrap.

## Automatic staging dispatch proof

- Promotion PR #273 used exact head SHA `16fab46f3781088ea4b310d6bb4e265c170372a9` and merged to staging as `983c933f9b0a77ccdbb8472d0bcecd3bc425eb8e`.
- GitHub dispatcher run [34409554758](https://github.com/TelefericoCerroOtto/TelefericoBariloche2024/actions/runs/34409554758) authenticated through OIDC/WIF and completed successfully.
- Cloud Build `dcf5a6e9-b9b1-430d-a41e-cf98a9e84ade` completed with `SUCCESS`; its source Git revision and `COMMIT_SHA` both matched the exact promotion head SHA, and `_PLAYWRIGHT_SUITE=full`.
- The parallel GitHub `Playwright Chromium full` job and every governance check passed on the promotion.

This evidence was accepted for the parity cutover. GitHub GraphQL reported no `branchProtectionRules`, so no required status context was configured for replacement.

## Cutover and rollback

- Final legacy `/gcbrun` build `3ce4566d-030c-4dcf-b533-f9c97dc71b7c` passed the same SHA and five steps; its historical PR check reached success.
- Native trigger `playwright-e2e-pr` (`c2133674-afdc-46ae-87d0-afe06e605ca6`) is disabled.
- Later eligible PR updates use the configured automatic GitHub OIDC dispatcher. After accepted proof from PR #273, the redundant GitHub-hosted `chromium-smoke` and temporary `chromium-full` jobs and their `pull_request` trigger were removed. `production-public-smoke` remains unchanged.
- The manual exact-SHA trigger remains the fallback executor. The disabled native trigger is not a canonical fallback.
- Retain the disabled native trigger for reversible rollback; do not delete it during this bootstrap.
- Roll back this cutover by restoring the removed GitHub parity jobs and `pull_request` trigger. Reverting suite selection or staging routing is a broader rollback of the proven Cloud Build path. Disabling the dispatcher or removing its repository-variable configuration remains an operational change. GitHub cancellation can leave a bounded remote build running until the 45-minute Cloud Build timeout.

## Pending issue #261 scope

- Production-public-smoke execution migration.
- Authenticated real-stack E2E completion and diagnostic artifacts.
- Disabled native-trigger cleanup after its rollback window is no longer needed.
