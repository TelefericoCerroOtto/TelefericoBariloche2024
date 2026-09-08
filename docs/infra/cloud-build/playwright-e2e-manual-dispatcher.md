# Provisioned manual Playwright dispatcher target

**Status: infrastructure provisioned; manual trigger proven once, GitHub dispatcher unactivated and OIDC unproven.** This snapshot records external state but does not create, update, or enable it.

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

## Activation and rollback

The committed and pushed `pull_request_target` workflow is under review in [PR #264](https://github.com/TelefericoCerroOtto/TelefericoBariloche2024/pull/264). It becomes trusted only after it reaches default branch `main`; it has not dispatched a build, so WIF and GitHub-dispatcher behavior remain unproven. The GitHub job is limited to 40 minutes, its polling loop to 36 minutes, and the remote Cloud Build to 35 minutes. The native `playwright-e2e-pr` remains enabled and manual. Roll back by disabling the dispatcher workflow or removing its repository-variable configuration. GitHub cancellation can leave a bounded remote build running until the Cloud Build timeout.
