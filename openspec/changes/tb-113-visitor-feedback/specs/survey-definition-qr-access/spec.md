# Survey Definition and QR Access Specification

## Purpose

Define the Strapi survey model, multilingual version lifecycle, permanent QR points, and QR-only resolution boundary.

## Requirements

### Requirement: Exact survey persistence model

The CMS MUST expose exactly five collection types: `survey-version`, `survey-qr-point`, `survey-submission`, `survey-report-generation`, and `survey-report`; one single type, `survey-settings`; and repeatable `survey.aspect-definition` and `survey.aspect-rating` components. It MUST NOT create visitor, ticket, global-aspect, statistics, model-profile, per-LLM-call, or rate-limit collections. (Primary: D04, D36-D39)

| Model | Required semantics |
|---|---|
| `survey-version` | unique immutable `versionKey`; `status: draft\|published`; versioned closed semantic copy map with every visible state in ES/EN/PT; ordered aspect definitions |
| aspect definition | `aspectKey`, `sortOrder`, ES/EN/PT labels; keys unique within a version |
| `survey-settings` | nullable single relation `activeSurveyVersion` to a published version |
| `survey-qr-point` | globally unique immutable `pointKey` and opaque `publicCode`; `displayName`; `status: active\|inactive`; nullable `inactiveAt`; `sortOrder` |
| aspect rating | snapshotted `aspectKey`, displayed `label`, and `rating`; belongs to one submission |

#### Scenario: Reject duplicate identities
- GIVEN an existing version key, point key, public code, or in-version aspect key
- WHEN another record attempts to reuse it
- THEN the CMS MUST reject the write without partial persistence.

#### Scenario: Exclude auxiliary models
- GIVEN schema migration is reviewed
- WHEN its domain models are enumerated
- THEN only the approved types and components MUST exist.

### Requirement: Version and aspect lifecycle

Draft versions MAY change translations and ordered aspects. Published versions MUST be immutable whether active or inactive; ES/EN/PT MUST activate together. `activeSurveyVersion` MUST be the sole active pointer, and rollback MUST repoint it. Label-only translations retain `aspectKey`; semantic changes MUST use a new key. (Primary: D05-D08)

The initial published seed MUST contain the 13 predefined keys `cable-car`, `views`, `staff`, `wait`, `signage`, `cleanliness`, `mobility`, `activities`, `rotating-cafe`, `food`, `stores`, and `bus`, then `price`, followed by the reserved `other` option. Their `sortOrder` values MUST preserve that order and every definition MUST provide the approved ES/EN/PT label. This catalog is only the initial version: later catalogs remain versioned and content-managed in the CMS under the same lifecycle rules.

#### Scenario: Publish and activate
- GIVEN a complete draft with all three locales
- WHEN it is published and selected
- THEN all translations become active as one immutable version.

#### Scenario: Reject published mutation
- GIVEN a published version
- WHEN content, order, or aspects are edited
- THEN the CMS MUST reject the mutation and require a new version.

#### Scenario: Seed the initial ordered catalog
- GIVEN an empty survey catalog
- WHEN the deterministic initial seed is applied
- THEN one ES/EN/PT-complete version MUST contain exactly the 13 predefined keys plus `other` in the required order.

### Requirement: Permanent QR-point lifecycle

A QR payload MUST contain only its stable `publicCode`, never a version. Deactivation MUST set `inactiveAt`, block intake, preserve history, and allow identity-preserving reactivation. Sign replacement at the same semantic point MUST retain identity; relocation or changed meaning MUST create a new point. (Primary: D09, D12-D14)

#### Scenario: Repoint survey without reprinting QR
- GIVEN an active QR point
- WHEN `activeSurveyVersion` changes
- THEN the same QR MUST resolve the newly active version.

#### Scenario: Resolve unavailable QR
- GIVEN an unknown or inactive `publicCode`, or no active version
- WHEN public resolution is requested
- THEN access MUST fail safely without exposing internal records or accepting feedback.

### Requirement: QR-only public access

The survey MUST be reachable only through a valid active-point `publicCode`; ordinary public navigation, links, CTAs, hidden modes, and `public_unverified` MUST NOT exist. A valid QR indicates context only, not identity, ticket ownership, attendance, presence, or route completion. Superseded signed sessions MAY submit for exactly 30 minutes. Locale switching MUST preserve answers and the resolver MUST return ES/EN/PT together. (Primary: D01-D02, D10-D11)

#### Scenario: Switch locale in a valid session
- GIVEN a resolved active QR survey with entered answers
- WHEN the visitor changes among ES, EN, and PT
- THEN answers MUST remain and final submission locale MUST be the selected locale.

#### Scenario: Expire superseded session
- GIVEN the version ceased being active more than 30 minutes ago
- WHEN its session submits
- THEN submission MUST be rejected as expired.

## Traceability

Primary decisions: D01-D02, D04-D14, D36-D39.
