# Cloud Build trigger snapshots

This directory contains documentation snapshots of the Cloud Build configurations used by the platform.

## Convention

- `app-staging.yaml`
- `app-production.yaml`
- `cms-staging.yaml`
- `cms-production.yaml`
- `playwright-e2e-pr.yaml`

## Scope

- The operational source of truth remains the inline configuration of the triggers in Google Cloud Platform.
- These files exist solely for documentation and auditing purposes.
- If re-exported from GCP, make sure they do not include sensitive values.
- `playwright-e2e-pr.yaml` records verified metadata for the live pull-request trigger. Its runtime build configuration remains `cloudbuild.playwright-e2e.json` at the repository root; editing either file does not change the trigger.

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
