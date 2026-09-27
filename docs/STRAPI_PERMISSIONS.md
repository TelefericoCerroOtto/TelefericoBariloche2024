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
`survey-submission` command listed above. U8-B uses the native Strapi core
routes for `survey-report-generation` through the server-mediated application
user JWT from the Auth.js session. The corresponding Users & Permissions role
may receive only the native `find` and `create` actions needed by the command
helper, plus the explicit `survey-report-generation.dispatchFailure` action for
verified pre-enqueue exhaustion compensation. That custom action is denied
unless separately granted; the isolated HTTP harness grants it only to its
synthetic test role. U10-A adds the separate `survey-report-generation.dispatchState`
action for server-mediated task-name reservation and bounded outcome recording;
it is also denied unless separately granted and is not called by the app yet.
It permits only reservation, created, and unknown states; it rejects claimed
absence and cannot compensate a queued generation. These custom actions use the
application user JWT, not an API token. The worker
`survey-report-generation.workerClaim`, `workerSnapshot`, `workerCheckpoint`,
`workerSourceRead`, `workerReportDownloadMetadata`, `workerComplete`, and `workerFail` actions are available only through Strapi's native
`content-api-token` strategy, each with its own exact custom API-token action
scope. Their controllers also require Strapi's runtime-selected strategy,
`kind: "content-api"`, and `type: "custom"` before controller body measurement,
validation, or database access. A Users & Permissions JWT is denied even if its
role is granted the same action. This intentionally changes compatibility:
existing application JWT roles with any of these worker action grants no longer
authorize the worker routes; those grants are not a fallback and must not be
used to authorize a worker. The worker owner must separately authorize and provision a custom
content API token with only the required worker action. This repository adds no
role/token grant and does not define credential issuance or rotation.

`workerClaim` returns checkpoints/model/pricing state only to its scoped custom
token. `workerSnapshot` returns the immutable snapshot only for a running
generation and verifies the stored `survey-snapshot.v1` payload digest before
exposing its private comments. `workerCheckpoint` recomputes the direct checkpoint
graph and digests from the locked generation and immutable snapshot before
state-version CAS. It only accepts the local zero-comment direct contract: the
CountTokens result must fit the configured direct budget, all analysis sections
must contain no claims, and publication must use fixed insufficient-evidence
copy. Nonempty-comment semantic output and map/reduce remain rejected.
`workerComplete` revalidates the full persisted graph, output digest, final
object identity, and fixed analysis, then inserts the immutable report and marks
the generation succeeded in one transaction. Both actions require separate exact
custom content API token scopes; no default or persistent grant is added.
`workerFail` accepts only a
closed 4 KiB command with an exact failure-code-to-safe-message mapping. It
fails only a running generation through state-version CAS and creates no report
or partial PDF. Identical terminal replay returns the current version without a
write; changed replay and non-running states return bounded conflicts. This
action does not send failure alerts; any future alert integration must run only
after terminal state commits. No default permission is added.
Report history remains owned by U8-A. U12 adds only the server-mediated private
metadata action; production artifact storage/download remains unavailable until
separately approved reader and credential wiring exists. No production permission
mutation is performed.
Anonymous requests and ungranted actions remain denied. Application-level
capabilities are enforced by the Next.js administration routes, and the
`update`/`delete` core actions remain outside the command access model.

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
| `feedback.reports.read` | Reports, generations, and mediated report download | U8 administration routes / U12 deterministic delivery |

Exact intake, administration, and worker actions and grants remain owned by U7,
U8, and U10 respectively. U9-A1 adds only the registered
`api::survey-report-generation.survey-report-generation.dispatchFailure` action;
the app calls it with the server-mediated application user JWT only for a typed,
verified enqueue-exhaustion result. That user's Users & Permissions role must
explicitly grant the action for compensation to be available. No API token or
generic `update`/`delete` action is required or permitted by this boundary.
U10-A adds the registered
`api::survey-report-generation.survey-report-generation.dispatchState` action,
which must be explicitly granted to the server-mediated application user for
the future coordinator to reserve identities or record created/unknown outcomes.
It does not expose an absence or compensation operation. The
isolated HTTP test grants it only to its synthetic role. No production role is
changed by this repository update. U10-A also registers
`api::survey-report-generation.survey-report-generation.workerClaim` for the
bounded worker claim command. It returns checkpoint/model/pricing state only to
a custom content API token with this exact action and omits comments; the route
rejects Users & Permissions JWTs even when their roles carry the same action.
It has no default role or API-token grant. Credential provisioning and any
non-default grant remain separately authorized operational work. No production
role or token is changed here.
U10-A4 registers
`api::survey-report-generation.survey-report-generation.workerSnapshot` for the
bodyless worker snapshot read. It requires an explicit grant, returns data only
for running generations, and rejects unsupported snapshot versions or digest
mismatches. It requires the `content-api-token` strategy and an exact custom
content API token action scope; a JWT grant is intentionally insufficient. The
action does not grant native collection reads or expose the snapshot through a
public/admin route. The isolated HTTP harness grants it only to a synthetic
custom token; no production role or token is changed.

U10-A13 applies that same native custom-token boundary to `workerClaim`,
`workerSnapshot`, `workerCheckpoint`, `workerComplete`, and `workerFail`. Each route names
only its own action scope. A shared controller guard checks Strapi's selected
strategy and token `kind`/`type` before body measurement/validation or database
access; `workerSourceRead` retains the same boundary. The native core generation
`find`/`create`, submission/report reads, and admin `dispatch-state`/
`dispatch-failure` actions remain on their existing Users & Permissions JWT
contracts. No global auth behavior or default grant changes. The isolated
HTTP test proves that JWTs with each worker action artificially granted are
denied and exact-scope custom tokens reach their respective handlers; no
production role/token was changed.

U10-A14 adds the
`api::survey-report-generation.survey-report-generation.workerFail` action for
terminal worker failure. It is restricted to the native `content-api-token`
strategy and its exact custom-token scope; the controller checks the selected
strategy and custom-token identity before measuring or reading the command or
accessing the lifecycle service. Users & Permissions JWTs remain denied even
when granted the action. The command persists only the fixed safe message
associated with its known `RuntimeFailureCodeV1`, and only for a running
generation under a locked state-version transition. Identical replay is
read-only; no report, partial PDF, alert, default grant, persistent permission,
or production token is created. The isolated synthetic HTTP test covers denied
and allowed identities, bounded commands, concurrent identical replay,
conflicts, and safe persisted output.

U10-A8 registers
`api::survey-report-generation.survey-report-generation.workerSourceRead` for
the bounded private report-source page action. The route accepts only Strapi's
`content-api-token` auth strategy and that exact action scope; it does not
include the Users & Permissions strategy as a fallback. The controller also
checks the actual Strapi auth result (`ctx.state.auth.strategy.name`, token
`kind`, and custom token `type`) before measuring or validating the body or
calling the source service. This uses the runtime auth context populated by
Strapi's content API auth middleware, not a role name or caller-supplied field.
The worker source is read with explicit SQL projections and does not grant
native `survey-submission.find` or `findOne`. The response includes the original
nullable comment and `payloadDigest`, plus canonical submission, version, point,
and rating fields required by the authoritative snapshot adapter.

The isolated HTTP harness proves anonymous denial; denial of an ordinary
application-user JWT even after its synthetic Users & Permissions role is
granted the same action; denial of a custom API token without that action; and
allow only for a synthetic custom content API token with that one action. The
authorized token still cannot call native `survey-submission.find`. Test tokens
and role permissions exist only in the disposable database. No persistent
role/token grant, schema change, generated-type change, or credential setup is
included. Provisioning the real custom content API token remains separately
authorized operational work owned by the TB-113 worker/platform owner.

The page input is a closed `survey-generation-source.v1` contract with an
inclusive UTC accepted-time window, immutable `dataCutoffAt`, resource, cursor,
and page size `1..25`; raw request bodies above 4 KiB fail with 413. Submissions
are restricted to `source=valid_qr` and the requested window. Rows after the
cutoff are deliberately still returned within that window so the authoritative
snapshot core can count and exclude them against the frozen cutoff. The cutoff
is bound into every cursor, not substituted with a fresh time or used to trim
the source set. Receipt-keyset submission pages and document-ID-keyset
version/point pages return stable totals and no partial-success mode; malformed
or incomplete reads fail closed. The local HTTP test proves the exact private
projection and pagination only in a disposable PostgreSQL/Strapi instance.

U10-A5 registers
`api::survey-report-generation.survey-report-generation.workerCheckpoint` for
the bounded worker checkpoint PUT. It accepts only the CMS-verified empty-comment
direct graph, validates the CountTokens budget and each stage's canonical input
and output digests, and commits each checkpoint with state-version CAS.
`workerComplete` is a separate exact-scope action that rechecks the complete
graph and atomically inserts the immutable report while transitioning the
generation to succeeded. Nonempty-comment semantic output and map/reduce remain
fail-closed. Neither action returns checkpoint payloads or adds a default or
production grant; the synthetic HTTP harness grants each scope only to a
disposable custom content API token.

U12 registers
`api::survey-report-generation.survey-report-generation.workerReportDownloadMetadata`
on `GET /api/tb113/worker/reports/:reportId/download-metadata`. It requires
Strapi's native `content-api-token` strategy and this exact custom-token scope.
The controller checks Strapi's selected strategy and custom-token identity before
validating the report ID or querying the database. It returns only the report ID,
owning generation ID/status, private object key, SHA-256, byte size, and fixed PDF
MIME after confirming the immutable report belongs to a succeeded generation.
It returns no signed/storage URL, report content, comments, or prompts. It does
not authorize native report collection reads. JWT and anonymous callers are
denied even if a synthetic Users & Permissions role is granted the same action;
the isolated HTTP harness grants this action only to a disposable custom content
API token. This repository adds no persistent role/token grant and provisions no
production credential.

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
