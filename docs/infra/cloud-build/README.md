# Cloud Build trigger snapshots

This directory contains documentation snapshots of the Cloud Build configurations used by the platform.

## Convention

- `app-staging.yaml`
- `app-production.yaml`
- `cms-staging.yaml`
- `cms-production.yaml`
- `playwright-e2e-pr.yaml`
- `playwright-e2e-manual-dispatcher.md`

## Scope

- The operational source of truth remains the inline configuration of the triggers in Google Cloud Platform.
- These files exist solely for documentation and auditing purposes.
- If re-exported from GCP, make sure they do not include sensitive values.
- `playwright-e2e-pr.yaml` records verified metadata for the disabled legacy pull-request trigger. Its runtime build configuration remains `cloudbuild.playwright-e2e.json` at the repository root; editing either file does not change the trigger.
- `playwright-e2e-manual-dispatcher.md` records the manual trigger, its historical pilot, the proven GitHub OIDC dispatch, and the cutover state.

## Provisioned GitHub dispatcher

The `pull_request_target` dispatcher on default `main` filters repository and CI-contract paths, rejects fork heads before OIDC, and derives the suite from trusted refs: `smoke` for internal PRs to `development`, and `full` only for same-repository `development` to `staging` promotions. It runs the exact head SHA through regional manual trigger `playwright-e2e-dispatch` (`3946c022-59cf-42cc-97cf-827c19f73291`) and waits for terminal status. Unrelated staging heads skip privileged execution. The dispatcher never checks out or executes PR code in GitHub.

PR #268 proved OIDC/WIF and exact-SHA smoke dispatch without static credentials: GitHub run `34373237590` and Cloud Build `b29e46c1-10a4-4d28-bf2b-21b7d985b22d` passed for `8a0185fa70ee0dedc53573f0f6dafbffd9a4199c`, alongside GitHub Chromium parity. Final legacy `/gcbrun` build `3ce4566d-030c-4dcf-b533-f9c97dc71b7c` passed the same five steps and SHA before `playwright-e2e-pr` was disabled. Dispatcher-only run `34381586085` and Cloud Build `bf5ce7c0-74d6-4e89-9c5e-28aadb38d645` later passed at `1dbf18ed28975fc45beb786816e42c690d304cda`. The manual exact-SHA trigger remains the fallback executor, and the legacy native trigger remains disabled and retained.

Manual same-SHA bootstrap is complete. PR #269 merged into `development`. PR #270 used head SHA `317483acb566fbeb6077a0c10a8c70f721e1c2ca`; GitHub full run `34399083297` and manual Cloud Build full build `b2639432-a76e-4c65-b2f3-5c6fd779afc6` passed on that SHA. PR #270 merged into `staging` as `d46a448d996d24a421b4d4a320cb6f3e84f58506`, and PR #271 merged into `main` as `465f1f02262a67c14a2a4c8fe0c0ed16fcdbbdd2`.

The live WIF condition now permits the exact staging route while preserving repository, owner, event, and trusted default-branch workflow restrictions. The workflow and WIF prerequisites are configured, but automatic staging OIDC full dispatch remains unproven until a later genuine eligible PR exercises it. GitHub-hosted `chromium-smoke`, temporary `chromium-full`, and `production-public-smoke` remain during parity. Production-smoke migration, authenticated E2E, diagnostic artifacts, final redundant-job removal, Vitest migration, deployments, and legacy-trigger deletion remain pending or out of scope under issue #261. This documentation follow-up performs no deployment or GCP/IAM change.

## GitHub deployment bridge

`app-staging.yaml` and `app-production.yaml` are reviewed snapshots of the Cloud Build → GitHub Deployments bridge. An approved operator must copy each reviewed snapshot into its corresponding inline Cloud Build trigger; editing these files does not change a live trigger.

- Both snapshots create a GitHub Deployment for the full Cloud Build `$COMMIT_SHA`, set it to `in_progress`, and post `success` only after `gcloud run deploy` succeeds.
- Build or deploy failures attempt to post GitHub `failure` while the final reporter returns the original build/deploy non-zero exit code. A GitHub API/reporting failure can leave the deployment `in_progress`, including after an ordinary build/deploy failure.
- The reporter uses the immutable linux/amd64 OCI image manifest `node@sha256:1471ea646673136b8308550ac14b36d847ffb21c24bc31828279e443c924e488`, resolved for `node:22.16.0-bookworm-slim` on 2026-09-04.
- The GitHub App needs **Deployments: Read and write** access and its installation must include `TelefericoCerroOtto/TelefericoBariloche2024`. The verified `staging` and `production` GitHub environments already exist.
- Both triggers read only `APP__PRODUCTION__GITHUB_DEPLOYMENTS_APP_PRIVATE_KEY` through Cloud Build `availableSecrets` and reporter-step `secretEnv`. This is one repository-scoped GitHub App credential: duplicating the same PEM would not reduce blast radius and would complicate rotation.
- The Cloud Build execution service account needs `roles/secretmanager.secretAccessor` on that one secret. Do not add a PEM path, copy the credential, or expose it outside Secret Manager.

### Limitation

Cloud Build cannot run the final reporter after a whole-build timeout or cancellation that stops the container execution. GitHub API/reporting failures can also prevent a final status. Each case can leave a GitHub Deployment at `in_progress`; operators must mark it failed manually in GitHub after confirming the build outcome.
