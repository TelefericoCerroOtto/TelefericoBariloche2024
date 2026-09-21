# Strapi permissions model

This document defines the expected Strapi access model for `teleferico-cms` and the server-side consumers in `teleferico-app`. It documents permission profiles, roles and reproduction steps; it must never contain real token values or secrets.

## Maintenance rule

This document is part of the expected CMS access contract.

Whenever a Strapi collection/content-type is added, removed, renamed or needs different access actions, this document must be reviewed and updated in the same change.

Every Strapi collection that is relevant to API tokens or application roles must appear in the permission matrices. Components are not listed as permission targets unless they change the access expectations of a documented collection.

Anything not listed remains outside the expected permission model.

generic collection CRUD remains outside the access model unless a focused
application boundary documents the exact read or command action.

## Summary

| Access profile                  | Kind                     | Used by                      | Purpose                                                                                                                             | Duration  | Type       |
| ------------------------------- | ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| `Public Content Read (Nextjs)`  | API token                | `teleferico-app`             | Server-only access to public-facing CMS content through backend/server routes. Not for user authentication or direct browser usage. | Unlimited | Custom     |
| `Public Forms (Next.js)`        | API token                | `teleferico-app`             | Server-only access for public form processing, Strapi business-rule reads, and form collection writes. Never exposed to the client. | Unlimited | Custom     |
| `Local → Remote Data Migration` | Transfer token           | CMS operators                | One-time transfer token for migrating content and schemas from a local Strapi instance to a remote environment.                     | 7 days    | Push       |
| `Public`                        | Users & Permissions role | Unauthenticated visitors     | Default role for unauthenticated users.                                                                                             | N/A       | Role       |
| `Authenticated`                 | Users & Permissions role | Authenticated users          | Default role for authenticated users.                                                                                               | N/A       | Role       |
| `Administrator`                 | Users & Permissions role | CMS administrators           | Administrative access for managing application features and users.                                                                  | N/A       | Role       |
| `Super Admin`                   | Strapi Admin Panel role  | Project maintainer/developer | Full direct CMS administration. Not used by `teleferico-app`, API tokens or public user flows.                                      | N/A       | Admin role |

## Secret names

The repository documents the expected variable names, not the credential values.

| Access profile                 | Environment variable         | Consumer         | Exposure rule                                             |
| ------------------------------ | ---------------------------- | ---------------- | --------------------------------------------------------- |
| `Public Content Read (Nextjs)` | `BUILD_STRAPI_CONTENT_TOKEN` | `teleferico-app` | Server-side only; never expose to browser/client bundles. |
| `Public Forms (Next.js)`       | `STRAPI_FORMS_TOKEN`         | `teleferico-app` | Server-side only; never expose to browser/client bundles. |

## Environment parity

These profiles are expected to exist with the same permission shape in every runtime environment.

| Profile                        | Local                     | Staging                   | Production                |
| ------------------------------ | ------------------------- | ------------------------- | ------------------------- |
| `Public Content Read (Nextjs)` | Same permissions          | Same permissions          | Same permissions          |
| `Public Forms (Next.js)`       | Same permissions          | Same permissions          | Same permissions          |
| `Public` role                  | Same default permissions  | Same default permissions  | Same default permissions  |
| `Authenticated` role           | Same default permissions  | Same default permissions  | Same default permissions  |
| `Administrator` role           | Same permissions          | Same permissions          | Same permissions          |
| `Super Admin` admin role       | Maintainer/developer only | Maintainer/developer only | Maintainer/developer only |

Content exposed through the public-facing application must be treated as published/public content. Draft or preview access is not part of the token model described here.

## Application proxy authorization policy

`teleferico-app` exposes Strapi reads to browser code through `/api/proxy`. The browser never receives Strapi credentials; the Route Handler chooses the server-side credential based on the requested endpoint.

| Proxy endpoint family                                                                                                   | Credential sent to Strapi    | Rule                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public content reads (`activity`, `bus-trip`, `component-translation`, `faq`, `new`, `service-state`, `ticket`, `zone`) | `BUILD_STRAPI_CONTENT_TOKEN` | Used for anonymous and authenticated browser reads so the public UI does not depend on the Strapi `Public` role. |
| Private operational reads (`postulation`)                                                                               | Authenticated session JWT    | Requires a logged-in app session. Never falls back to `BUILD_STRAPI_CONTENT_TOKEN`.                              |

The Strapi `Public` role must not be used to make the public website work. Public website reads go through the server-side content token instead.

`image-asset` does not need a browser proxy route. It is read only as part of server-side CMS content requests authorized with `BUILD_STRAPI_CONTENT_TOKEN`.

## API tokens

### `Public Content Read (Nextjs)`

This token is for server-side content reads from `teleferico-app`. It must not grant write, delete, user-management or role-management permissions.

The Playwright real-auth harness creates one narrower ephemeral custom token in its disposable CMS. It grants only `api::service-state.service-state.find`, the single dashboard runtime read exercised by this capability; it intentionally does not reproduce the persistent profile below. Its name and description are bound to the run marker. Only bounded non-secret ownership metadata is stored; plaintext is handed once to the lifecycle through anonymous file descriptor 3, supplied only to the Turbopack Next dev process, and revoked only after ownership and permission scope are revalidated during cleanup.

| Content type            | `find` | `findOne` | `create` | `update` | `delete` |
| ----------------------- | :----: | :-------: | :------: | :------: | :------: |
| `activity`              |   ✅   |    ✅     |    —     |    —     |    —     |
| `activity-translation`  |   ✅   |    ✅     |    —     |    —     |    —     |
| `bus-trip`              |   ✅   |    ✅     |    —     |    —     |    —     |
| `component-translation` |   ✅   |    ✅     |    —     |    —     |    —     |
| `faq`                   |   ✅   |    ✅     |    —     |    —     |    —     |
| `image-asset`           |   ✅   |    ✅     |    —     |    —     |    —     |
| `new`                   |   ✅   |    ✅     |    —     |    —     |    —     |
| `page`                  |   ✅   |    ✅     |    —     |    —     |    —     |
| `sector`                |   ✅   |     —     |    —     |    —     |    —     |
| `sector-name`           |   ✅   |    ✅     |    —     |    —     |    —     |
| `service-state`         |   ✅   |     —     |    —     |    —     |    —     |
| `station`               |   ✅   |    ✅     |    —     |    —     |    —     |
| `station-translation`   |   ✅   |    ✅     |    —     |    —     |    —     |
| `ticket`                |   ✅   |    ✅     |    —     |    —     |    —     |
| `zone`                  |   ✅   |    ✅     |    —     |    —     |    —     |
| `zone-translation`      |   ✅   |    ✅     |    —     |    —     |    —     |

### `Public Forms (Next.js)`

This token is for server-side public form processing from `teleferico-app`. It can query and create `form-protection-submission` records, create postulation records, and read sectors required by form flows.

Curriculum files are not uploaded to Strapi. The Next.js route handler stores the uploaded file through the app CV storage service, then sends only CV metadata and the storage object key to Strapi when creating the postulation record.

| Content type                   | `find` | `findOne` | `create` | `update` | `delete` |
| ------------------------------ | :----: | :-------: | :------: | :------: | :------: |
| `form-protection-submission`   |   ✅   |     —     |    ✅    |    —     |    —     |
| `image-asset`                  |   —    |     —     |    —     |    —     |    —     |
| `postulation`                  |   —    |     —     |    ✅    |    —     |    —     |
| `sector`                       |   ✅   |     —     |    —     |    —     |    —     |

No Strapi Upload API permission is required for this token.

### `Visitor Feedback CMS Transport (Next.js)`

This server-only token is used exclusively by the visitor feedback CMS transport. Public survey resolution reads the native Strapi REST surfaces for `survey-settings`, `survey-version`, and `survey-qr-point`; submission persistence remains the closed `survey-submission` command family below. It grants no administration, user-management, or role-management actions.

| Native/custom action | Access |
| --- | :---: |
| `survey-settings.find` / `findOne` | ✅ |
| `survey-version.find` / `findOne` | ✅ |
| `survey-qr-point.find` / `findOne` | ✅ |
| `survey-submission.find` / `findOne` | ✅ for admin readers only |
| `survey-report.find` / `findOne` | ✅ for admin readers only |
| `survey-submission.submit` | ✅ |

## Transfer tokens

### `Local → Remote Data Migration`

| Property  | Expected value                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------ |
| Direction | Local Strapi instance → remote environment                                                       |
| Type      | Push                                                                                             |
| Duration  | 7 days                                                                                           |
| Usage     | One-time migration of content and schemas                                                        |
| Lifecycle | Create only when needed, use for the migration window, then let it expire or revoke it manually. |

## Users & Permissions roles

These roles belong to the Users & Permissions plugin and are separate from Strapi Admin Panel roles.

### Ephemeral Playwright real-auth roles

The real-auth harness creates run-scoped role equivalents with the exact application-visible names `Administrator` and `Media Manager`. Their unique role types and descriptions contain the synthetic run marker; they never replace or update persistent roles. Provisioning fails if either exact name already belongs to another role in the disposable database.

| Synthetic role | `users-permissions.role.find` | `users-permissions.user.me` | `postulation.find` | `service-state.update` |
| --- | :---: | :---: | :---: | :---: |
| `Administrator` | ✅ | ✅ | ✅ | ✅ |
| `Media Manager` | ✅ | ✅ | — | — |

`users-permissions.role.find` is required for Strapi to retain the populated role relation when sanitizing `/users/me?populate=*`; it does not grant role mutation. The Strapi JWT remains server-only.

The default synthetic-database `Public` role must already expose `users-permissions.auth.callback`; the provisioner verifies it and does not modify that role. No delete, user/role-management, upload, Strapi Admin, or unused permission is granted. Confirmed/unblocked users, one service-state, one sector, and one marker-owned postulation exist only for the run. A bounded `0600` manifest stores only resource IDs and deterministic selectors. Cleanup restores service state first and deletes only records whose exact ownership is proven. Final PostgreSQL container removal is the interruption-recovery boundary.

### `Public`

Default role assigned to unauthenticated users.

The `Public` role has no `image-asset` permissions.

| Permission                                |
| ----------------------------------------- |
| `users-permissions.callback`              |
| `users-permissions.emailConfirmation`     |
| `users-permissions.sendEmailConfirmation` |
| `users-permissions.forgotPassword`        |
| `users-permissions.register`              |
| `users-permissions.connect`               |
| `users-permissions.resetPassword`         |

### `Authenticated`

Default role assigned to authenticated users.

The `Authenticated` role has no `image-asset` permissions.

| Permission                         |
| ---------------------------------- |
| `users-permissions.changePassword` |
| `users-permissions.me`             |

### `Administrator`

Administrative role for managing CMS application features and users.

| Content type            | `find` | `findOne` | `create` | `update` | `delete` |
| ----------------------- | :----: | :-------: | :------: | :------: | :------: |
| `activity`              |   ✅   |    ✅     |    ✅    |    ✅    |    —     |
| `activity-translation`  |   ✅   |    ✅     |    ✅    |    ✅    |    —     |
| `bus-trip`              |   ✅   |    ✅     |    ✅    |    ✅    |    ✅    |
| `component-translation` |   ✅   |    ✅     |    —     |    —     |    —     |
| `faq`                   |   ✅   |    ✅     |    ✅    |    ✅    |    ✅    |
| `form-protection-submission` | ✅ | ✅ | — | ✅ | — |
| `new`                   |   ✅   |    ✅     |    ✅    |    ✅    |    ✅    |
| `page`                  |   ✅   |    ✅     |    —     |    —     |    —     |
| `postulation`           |   ✅   |    ✅     |    —     |    ✅    |    —     |
| `sector`                |   ✅   |    ✅     |    —     |    —     |    —     |
| `sector-name`           |   ✅   |    ✅     |    —     |    —     |    —     |
| `service-state`         |   ✅   |     —     |    —     |    ✅    |    —     |
| `station`               |   ✅   |    ✅     |    —     |    —     |    —     |
| `station-translation`   |   ✅   |    ✅     |    ✅    |    ✅    |    —     |
| `ticket`                |   ✅   |    ✅     |    ✅    |    ✅    |    ✅    |
| `zone`                  |   ✅   |    ✅     |    ✅    |    ✅    |    —     |
| `zone-translation`      |   ✅   |    ✅     |    ✅    |    ✅    |    —     |

## Strapi Admin Panel access

The Strapi Admin Panel is managed by the project maintainer/developer.

| Admin role    | Purpose                 | Notes                                                                                                   |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `Super Admin` | Full CMS administration | Used only for direct CMS administration. Not used by `teleferico-app`, API tokens or public user flows. |

Admin panel credentials must never be documented in this repository.

## Deny-by-default rule

Anything not listed in this document is not part of the expected permission model.

### TB-113 current baseline

The survey catalog (`survey-version`, `survey-settings`, `survey-qr-point`,
`survey-submission`, `survey-report-generation`, and `survey-report`) remains
disabled by default. The feedback transport uses only bounded native `find`/
`findOne` reads for the survey catalog plus the token-authenticated
`survey-submission` command listed above. U8-B uses the
native Strapi core routes for `survey-report-generation`; the selected native
application role or API token may receive only the `find` and `create` actions
needed by the server-side command helper. Report history remains owned by U8-A,
and PDF artifact storage/download remains deferred to U12. The isolated
permission harness provisions those native grants only inside its test database;
no production permission mutation or custom CMS command code is added.
Anonymous requests and ungranted actions remain denied. Application-level
capabilities are enforced by the Next.js administration routes, and the
`update`/`delete` core actions remain outside the U8-B access model.

### Future application capabilities

These names are application-level capabilities enforced by the Next.js
administration routes. They are not current Strapi action IDs or durable Users
& Permissions rows.

| Future capability | Future operation | Route owner |
| --- | --- | --- |
| `feedback.read` | Summary, aspect, and QR analytics | U8 administration routes |
| `feedback.comments.read` | Filtered comments | U8 administration routes |
| `feedback.reports.read` | Reports and generations | U8 administration routes |
| `feedback.reports.generate` | Generate and retry | U8 administration routes |
| `feedback.reports.download` | Mediated report download | U12 deterministic delivery |

Exact intake, administration, and worker actions and grants remain owned by U7,
U8, and U10 respectively. Each route-owning slice must add only its registered
actions and update this document. U8-B adds no durable Strapi grant or
permission mutation.

Verify the baseline with:

```bash
npm --prefix teleferico-cms test -- feedback/permissions
```

The test uses only an isolated local PostgreSQL database. It reads registered
actions, application roles, role permissions, and API-token permission actions;
it never reads Admin Panel roles or mutates roles, permissions, or tokens. Strapi
and all owned processes, containers, and volumes are cleaned up even on failure.
Rollback removes the focused tests, their runner selector, and this S06a section;
no data rollback exists. Never copy credential values into diagnostics or this
document.

In particular, public-facing application tokens must not grant:

- write permissions unless explicitly listed for the token;
- delete permissions;
- user or role management;
- Strapi admin panel access;
- direct browser/client-side access;
- access to private operational data.

## Reproduction checklist

Use this checklist when creating or rebuilding a Strapi environment.

- [ ] Create the `Public Content Read (Nextjs)` API token as a custom unlimited token.
- [ ] Grant only the permissions listed under `Public Content Read (Nextjs)`.
- [ ] Store its value as `BUILD_STRAPI_CONTENT_TOKEN` in the target environment secret/config store.
- [ ] Create the `Public Forms (Next.js)` API token as a custom unlimited token.
- [ ] Grant only the permissions listed under `Public Forms (Next.js)`.
- [ ] Store its value as `STRAPI_FORMS_TOKEN` in the target environment secret/config store.
- [ ] Confirm the `Public` role matches the default permissions listed above.
- [ ] Confirm the `Authenticated` role matches the default permissions listed above.
- [ ] Confirm the `Administrator` role matches the permissions listed above.
- [ ] Run the TB-113 permission test and confirm every survey action/grant count is zero.
- [ ] Configure the `image-asset` Entry Title as `name` in each environment.
- [ ] Confirm Strapi Admin Panel access is limited to the expected `Super Admin` maintainer/developer account.
- [ ] For migrations only, create a `Local → Remote Data Migration` transfer token with type `Push` and duration `7 days`.
- [ ] Revoke or let the transfer token expire after the migration window.
- [ ] Verify that no documented token value is committed to the repository.

## Change review log

| Change | Date | Result | Evidence |
| --- | --- | --- | --- |
| `tb-113-visitor-feedback` S06a deny baseline | 2026-09-16 | Documented and tested the existing deny baseline; no grants or mutation. | Focused direct tests cover application roles, API tokens, route/controller inventory, read-only inspection, and isolated Strapi/PostgreSQL cleanup. |
| `tb-113-visitor-feedback` S04 foundation | 2026-09-15 | Added disabled definition/QR schemas with no permission grants. | Catalog tests verify disabled defaults and the approved model subset; permission bootstrap remains out of scope. |
| `tb-71-form-protection` | 2026-05-20 | Added `form-protection-submission` collection and token delta; existing `postulation` contract stays intact. | Verified `teleferico-cms/src/api/postulation/content-types/postulation/schema.json` stayed unchanged, added `teleferico-cms/src/api/form-protection-submission/**`, expanded `Public Forms (Next.js)` token to `form-protection-submission.find/create`, and kept `teleferico-app/src/lib/services/{contact,postulation}.ts` as server-only internal callers using `Origin`, `x-internal-api-key`, and optional `x-client-ip` without exposing Strapi access client-side. |
