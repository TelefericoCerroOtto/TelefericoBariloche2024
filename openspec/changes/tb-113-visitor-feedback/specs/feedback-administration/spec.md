# Feedback Administration Specification

## Purpose

Define application-user authorization and browser-facing administrative resource contracts.

## Slice ownership

U8-B implements only the authenticated generate/retry command boundary and its
browser-facing validation, capability checks, and overlap disclosure transport.
U8-A owns report reads/history. Lifecycle races, state transitions, retry
lineage, and cutoff semantics belong to U9. PDF artifact storage and download
belong to U12-A (`deterministic-report-pdf`) and are not implemented by U8-B.

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

The Summary response MUST expose both the absolute response-count delta and relative percent change from the previous period. Relative percent change MUST be `null` when the previous count is zero; the UI MUST display relative percent while preserving absolute delta as audit data.

#### Scenario: Reconcile filtered resources
- GIVEN the same normalized period/filter contract
- WHEN summary, aspects, QR-point, and comment resources are requested
- THEN each MUST report the same eligible-population metadata.

#### Scenario: Reject resource conflation
- GIVEN a comments or analytics request
- WHEN it attempts report generation, retry, mutation, or download semantics
- THEN the API MUST reject it rather than multiplexing the operation.

### Requirement: Fixed administration information architecture

The top-level administration order MUST be: Summary; Aspects; QR points; Comments and reports. All four surfaces MUST share one analyzed period and its immediately previous equal-duration comparison. Responsive variants MAY change navigation shell, layout, or table-to-card presentation only; they MUST NOT change module order, meaning, filters, formulas, or data.

Summary MUST order four KPIs (responses, average rating, satisfaction, unfavorable), temporal evolution, star distribution, strengths/opportunities, and the latest successful AI report. Aspects MUST order period overview, selected-aspect detail (sentiment distribution, related overall rating by sentiment, temporal evolution), priority matrix, positive aspects in five-star experiences, and structured `other` entries. QR points MUST order tabs Comparison then Detail. Comparison MUST contain selectors, the four KPIs, volume by point, and a comparison table; it MUST NOT contain temporal evolution. Detail MUST contain one point selector, the four KPIs, star distribution, temporal evolution, an exact-data table, and context/linkage to aspects filtered by that point. Comments and reports MUST contain route-specific comment filters, filtered results/pagination/detail, an AI explanation, independent report generation, and immutable report history.

#### Scenario: Preserve module semantics responsively
- GIVEN an administrator moves between desktop and compact layouts
- WHEN any feedback route is rendered
- THEN top-level and module order, formulas, filters, and meaning MUST remain unchanged.

### Requirement: Route-specific query and result contracts

Summary MUST accept only the shared period. Aspects MUST accept the shared period and optional point. QR comparison MUST use its own selected point set; QR detail MUST select exactly one point. Comments MUST use the shared period plus optional aspect, rating, point, language, and text filters. Report generation MUST use its own range and MUST ignore comment filters.

Comments MUST order `acceptedAt DESC, receipt ASC`; counts, pagination, detail, and empty state MUST derive from the same filtered population. Reports MUST be immutable. The latest report MUST mean the newest successful report ordered `createdAt DESC, reportId ASC`, never a hard-coded row. Each report row MUST expose formal name, analyzed response count, analyzed comment count, generation timestamp, analyzed range, status, and authorized download capability. No normative synthetic row may be prepended; history order derives only from persisted timestamps and identifiers.

The administration MUST NOT display an invitation, scan, or response rate until a formal denominator contract exists. Prior-zero, zero-denominator, low-evidence, and empty states MUST be explicit.

#### Scenario: Keep report generation independent
- GIVEN comment filters are active
- WHEN an authorized user requests a report for another valid range
- THEN generation MUST use only its independent range and immutable snapshot contract.

### Requirement: Global report visibility and audit attribution

Reports MUST be global to every user holding the relevant capability. U8-B uses
native Strapi core create/read operations with a selected application role or
API-token actor; it MUST NOT synthesize `requestedBy` through custom CMS code.
The nullable `requestedBy` relation therefore remains null for this slice and
MUST NOT confer ownership, hide records, or authorize access. (Primary: D30)

#### Scenario: Read another requester's report
- GIVEN an authorized report reader and a report requested by another user
- WHEN global history is listed
- THEN the report MUST appear subject only to global filters and capability checks.

## Traceability

Primary decisions: D27-D32, D34.
