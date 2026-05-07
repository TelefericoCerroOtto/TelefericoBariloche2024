# Cloud Build trigger snapshots

This directory contains documentation snapshots of the Cloud Build configurations used by the platform.

## Convention

- `app-staging.yaml`
- `app-production.yaml`
- `cms-staging.yaml`
- `cms-production.yaml`

## Scope

- The operational source of truth remains the inline configuration of the triggers in Google Cloud Platform.
- These files exist solely for documentation and auditing purposes.
- If re-exported from GCP, make sure they do not include sensitive values.
