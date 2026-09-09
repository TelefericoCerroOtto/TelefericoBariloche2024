# Provisioned manual Playwright dispatcher target

**Status: GitHub OIDC dispatcher proven and active for eligible pull requests; manual exact-SHA trigger retained as its executor and fallback.** This snapshot records external state but does not create, update, disable, or enable it.

## Target

- Type: regional manual trigger `playwright-e2e-dispatch` in `southamerica-east1`.
- Immutable trigger ID: `3946c022-59cf-42cc-97cf-827c19f73291`.
- Default source branch: `development`; no approval requirement.
- Source revision: the exact lowercase 40-character PR head SHA supplied as `--sha`.
- Build configuration: `cloudbuild.playwright-e2e.json`.
- Build timeout: 35 minutes (`2100s`).

## Dispatch scope

The GitHub dispatcher runs only when a pull request to `development` changes `teleferico-app/**`, `teleferico-cms/**`, `cloudbuild.playwright-e2e.json`, or `scripts/run-playwright-real-stack-readiness.sh`. Documentation-only changes and `tools/**` are intentionally excluded.

## Provisioned identities

- GitHub dispatcher/invoker: `github-cloud-build-dispatcher@teleferico-bariloche-2024.iam.gserviceaccount.com`. Its custom role permits only `cloudbuild.builds.create` and `cloudbuild.builds.get`; it may act as the test executor only.
- Cloud Build test executor: `cloud-build-playwright-tests@teleferico-bariloche-2024.iam.gserviceaccount.com`, configured on the manual trigger and granted project `roles/logging.logWriter`.

## Workload Identity Federation

- STS API, pool `github-actions`, and provider `teleferico-pr-dispatch` are active.
- The provider condition restricts repository ID `857375731`, owner ID `181292897`, event `pull_request_target`, base `development`, and `workflow_ref` `TelefericoCerroOtto/TelefericoBariloche2024/.github/workflows/cloud-build-playwright-dispatch.yml@refs/heads/main`.
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

This proves the GitHub-dispatched development fixture smoke path. It does not prove the full staging suite, production-smoke migration, authenticated E2E, diagnostic artifacts, or final redundant-job removal.

## Cutover and rollback

- Final legacy `/gcbrun` build `3ce4566d-030c-4dcf-b533-f9c97dc71b7c` passed the same SHA and five steps; its historical PR check reached success.
- Native trigger `playwright-e2e-pr` (`c2133674-afdc-46ae-87d0-afe06e605ca6`) is disabled.
- Future eligible PR updates use the automatic GitHub OIDC dispatcher plus GitHub parity smoke.
- The manual exact-SHA trigger remains the fallback executor. The disabled native trigger is not a canonical fallback.
- Retain the disabled native trigger for reversible rollback and delete it only after a later dispatcher-only SHA proves its check does not return.
- Roll back the dispatcher by disabling its workflow or removing its repository-variable configuration. GitHub cancellation can leave a bounded remote build running until the 35-minute Cloud Build timeout.

## Pending issue #261 scope

- Full staging suite and production-smoke execution migration.
- Authenticated E2E and diagnostic artifacts.
- Final removal of redundant GitHub jobs and the disabled native trigger.
- Dispatcher path coverage for `.github/workflows/cloud-build-playwright-dispatch.yml` and `.github/scripts/playwright-e2e.test.js`; current filters exclude both.
