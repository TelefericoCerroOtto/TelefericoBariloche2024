# Deterministic Report Delivery Specification

## Purpose

Define renderer-neutral chart semantics, the dependency adoption POC, deterministic PDF structure, private artifacts, and downloads.

## Requirements

### Requirement: Renderer-neutral chart contract and adoption gate

`ChartViewModel` MUST express titles, series, categories/axes, values, units, legends, colors, annotations, empty states, and accessible table rows without renderer-specific options. Dashboard Recharts and PDF Apache ECharts 6.1 SVG SSR MUST consume the same view model with semantic, not pixel, parity. Dependency adoption MUST wait for a POC proving vector SVG, Spanish fonts/clipping, accessible tables, reduced motion, deterministic bar and scatter/matrix cases, dashboard/PDF parity, public-app bundle exclusion, and acceptable worker image/cold-start impact. (Primary: D84)

#### Scenario: Prove semantic parity
- GIVEN one chart fixture
- WHEN rendered for dashboard and PDF
- THEN titles, labels, series, values, units, ordering, and accessible rows MUST match.

#### Scenario: Fail adoption gate
- GIVEN any required POC acceptance contract fails
- WHEN dependency adoption is reviewed
- THEN production adoption MUST remain blocked and the failing criterion recorded.

### Requirement: Deterministic validated rendering pipeline

Only validated analysis JSON and immutable official snapshot data MAY enter the pipeline `typed view model -> deterministic HTML/CSS/SVG -> pinned Chromium/Playwright -> PDF`. Browser, runtime, fonts, locale, time zone, CSS, and renderer versions MUST be pinned and recorded; identical canonical inputs MUST produce semantically identical output. (Primary: D80)

#### Scenario: Render known inputs
- GIVEN validated known-version inputs and pinned rendering assets
- WHEN PDF generation runs repeatedly
- THEN section content, chart data, pagination rules, and artifact metadata MUST remain deterministic.

#### Scenario: Reject unvalidated inputs
- GIVEN raw model output, unknown contract version, or digest mismatch
- WHEN rendering is requested
- THEN rendering and storage MUST not begin.

### Requirement: Fixed evidence-first report

The PDF MUST contain exactly these ordered sections: cover; executive summary; official overview; distribution/evolution; aspects; QR points; visitor voice; coverage/limitations. It MUST contain the five charts: star distribution, satisfaction evolution, response-volume evolution, aspect comparison, and QR-point comparison. Official evidence MUST precede AI narrative. Only validated analysis and immutable official snapshot data may enter rendering; no PDF prose/content scan rejects literal visitor comments, incidental evidence references, numbers, or private-data patterns. The approved residual disclosure risk remains even when model-bound copies have recognizable email, URL, and phone spans redacted. (Primary: D81-D83; former content ban superseded.)

#### Scenario: Validate complete PDF structure
- GIVEN a successful render
- WHEN its typed document structure is inspected
- THEN all eight sections and five charts MUST appear in the prescribed order with accessible data equivalents.

#### Scenario: Preserve structure without a content veto
- GIVEN validated analysis contains a literal visitor comment or an incidental evidence reference in a paragraph
- WHEN the fixed report renders with the required sections, charts, accessible data, and valid artifact metadata
- THEN publication MUST NOT fail solely because of that prose; malformed structure or a mismatched digest MUST still block rendering or storage.

### Requirement: Private deterministic report object

The worker MAY stage only a validated PDF at the exact key `private/feedback-reports/{reportId}/report.pdf`, where `reportId` is deterministically bound to the UUID `reportRunId` and PDF SHA-256. The storage boundary MUST require an explicitly injected private bucket port, atomic create-if-absent and metadata-matched deletion, `application/pdf`, private/no-store metadata, positive bounded size, and matching SHA-256. Identical replay MUST preserve the original bytes; mismatched ownership, key, metadata, or bytes MUST fail closed. The app reader MUST accept only this exact key and MUST return bytes only after private metadata, size, PDF signature, run/report binding, and digest agree. No public ACL, URL, arbitrary object path, or global/default storage composition is allowed.

#### Scenario: Replay or clean up an owned staged object
- GIVEN a staged PDF with matching run ID, deterministic report ID, and digest
- WHEN the same artifact is staged again or its owner discards it
- THEN identical staging MUST be idempotent and cleanup MUST conditionally delete only the exact owned object.

#### Scenario: Reject altered or foreign object state
- GIVEN public, malformed, oversized, cross-run, wrong-key, or digest-mismatched object metadata or bytes
- WHEN the worker resumes or an authenticated app reader fetches the PDF
- THEN no object bytes MUST be returned or deleted.

## Traceability

Primary decisions: D80-D84.
