# Feedback Administration Specification

## Purpose

Define application-user authorization and browser-facing administrative resource contracts.

## Requirements

### Requirement: Distinct actors and exact capabilities

The system MUST keep Strapi `plugin::users-permissions.user` application users distinct from `admin::user` panel users. Application authorization MUST use exactly `feedback.read`, `feedback.comments.read`, `feedback.reports.read`, `feedback.reports.generate`, and `feedback.reports.download`; absent capabilities MUST deny by default. Strapi Super Admin MUST retain standard control. (Primary: D27, D29, D31)

| Operation | Required capability |
|---|---|
| summary, aspects, QR analytics | `feedback.read` |
| comments | `feedback.comments.read` |
| reports, generations | `feedback.reports.read` |
| generate, retry | `feedback.reports.generate` |
| download | `feedback.reports.download` |

#### Scenario: Permit one authorized resource
- GIVEN an authenticated application user with only `feedback.comments.read`
- WHEN comments are requested
- THEN comments MUST be returned but summary and report resources MUST remain denied.

#### Scenario: Deny management and mutation
- GIVEN any application-user capability combination
- WHEN surveys, versions, QR points, submissions, or reports are created/updated/deleted outside approved generate/retry operations
- THEN the CMS MUST deny the operation.

### Requirement: Next.js administrative mediation

Every browser request MUST terminate at a Next.js Route Handler that authenticates the session, enforces trusted-origin/CSRF rules for mutations, checks the required capability, validates bounded inputs, and uses server-held CMS credentials. Browsers MUST NOT call Strapi or Google services directly. (Primary: D28, D32)

#### Scenario: Authorized mediated mutation
- GIVEN a trusted authenticated request with `feedback.reports.generate`
- WHEN a valid generation request is sent
- THEN Next.js MUST mediate it and return only the bounded domain response.

#### Scenario: Reject before downstream access
- GIVEN a missing session, untrusted origin, invalid CSRF token, or missing capability
- WHEN an administrative request arrives
- THEN it MUST fail without invoking the protected downstream operation.

### Requirement: Separate versioned administrative resources

The API MUST expose GET `/api/admin/feedback/{summary|aspects|qr-points|comments|reports|generations}`, POST `/api/admin/feedback/generations`, POST `/api/admin/feedback/generations/{reportRunId}/retry`, and GET `/api/admin/feedback/reports/{reportId}/download`. Reads MUST return `{contractVersion,data,meta}` with bounded pagination and normalized filters; commands MUST return `{reportRunId,status}`; failures MUST return `{error:{code,reportRunId?}}`. Download MUST stream an authorized immutable report without exposing storage URLs. (Primary: D34)

#### Scenario: Reconcile filtered resources
- GIVEN the same normalized period/filter contract
- WHEN summary, aspects, QR-point, and comment resources are requested
- THEN each MUST report the same eligible-population metadata.

#### Scenario: Reject resource conflation
- GIVEN a comments or analytics request
- WHEN it attempts report generation, retry, mutation, or download semantics
- THEN the API MUST reject it rather than multiplexing the operation.

### Requirement: Global report visibility and audit attribution

Reports MUST be global to every user holding the relevant capability. `requestedBy` on a generation and `generatedBy` on a report MUST be immutable audit relations to application users when available; they MUST NOT confer ownership, hide records, or authorize access. (Primary: D30)

#### Scenario: Read another requester's report
- GIVEN an authorized report reader and a report requested by another user
- WHEN global history is listed
- THEN the report MUST appear subject only to global filters and capability checks.

## Traceability

Primary decisions: D27-D32, D34.
