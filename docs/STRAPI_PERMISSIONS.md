# Strapi permissions model

This document defines the expected Strapi access model for `teleferico-cms` and the server-side consumers in `teleferico-app`. It documents permission profiles, roles and reproduction steps; it must never contain real token values or secrets.

## Maintenance rule

This document is part of the expected CMS access contract.

Whenever a Strapi collection/content-type is added, removed, renamed or needs different access actions, this document must be reviewed and updated in the same change.

Every Strapi collection that is relevant to API tokens or application roles must appear in the permission matrices. Components are not listed as permission targets unless they change the access expectations of a documented collection.

Anything not listed remains outside the expected permission model.

## Summary

| Access profile                  | Kind                     | Used by                      | Purpose                                                                                                                             | Duration  | Type       |
| ------------------------------- | ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| `Public Content Read (Nextjs)`  | API token                | `teleferico-app`             | Server-only access to public-facing CMS content through backend/server routes. Not for user authentication or direct browser usage. | Unlimited | Custom     |
| `Public Forms (Next.js)`        | API token                | `teleferico-app`             | Server-only access for public form processing and form collection writes. Never exposed to the client.                              | Unlimited | Custom     |
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

## API tokens

### `Public Content Read (Nextjs)`

This token is for server-side content reads from `teleferico-app`. It must not grant write, delete, user-management or role-management permissions.

| Content type            | `find` | `findOne` | `create` | `update` | `delete` |
| ----------------------- | :----: | :-------: | :------: | :------: | :------: |
| `activity`              |   ✅   |    ✅     |    —     |    —     |    —     |
| `activity-translation`  |   ✅   |    ✅     |    —     |    —     |    —     |
| `bus-trip`              |   ✅   |    ✅     |    —     |    —     |    —     |
| `component-translation` |   ✅   |    ✅     |    —     |    —     |    —     |
| `faq`                   |   ✅   |    ✅     |    —     |    —     |    —     |
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

This token is for server-side public form processing from `teleferico-app`. It can create postulation records and read sectors required by form flows.

Curriculum files are not uploaded to Strapi. The Next.js route handler stores the uploaded file through the app CV storage service, then sends only CV metadata and the storage object key to Strapi when creating the postulation record.

| Content type  | `find` | `findOne` | `create` | `update` | `delete` |
| ------------- | :----: | :-------: | :------: | :------: | :------: |
| `postulation` |   —    |     —     |    ✅    |    —     |    —     |
| `sector`      |   ✅   |     —     |    —     |    —     |    —     |

No Strapi Upload API permission is required for this token.

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

### `Public`

Default role assigned to unauthenticated users.

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
- [ ] Confirm Strapi Admin Panel access is limited to the expected `Super Admin` maintainer/developer account.
- [ ] For migrations only, create a `Local → Remote Data Migration` transfer token with type `Push` and duration `7 days`.
- [ ] Revoke or let the transfer token expire after the migration window.
- [ ] Verify that no documented token value is committed to the repository.
