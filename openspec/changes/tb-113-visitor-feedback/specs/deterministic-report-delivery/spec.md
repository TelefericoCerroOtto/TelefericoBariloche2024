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

The PDF MUST contain exactly these ordered sections: cover; executive summary; official overview; distribution/evolution; aspects; QR points; visitor voice; coverage/limitations. It MUST contain the five charts: star distribution, satisfaction evolution, response-volume evolution, aspect comparison, and QR-point comparison. Official evidence MUST precede AI narrative. Raw or verbatim comments and opaque evidence references MUST NOT appear. (Primary: D81-D83)

#### Scenario: Validate complete PDF structure
- GIVEN a successful render
- WHEN its typed document structure is inspected
- THEN all eight sections and five charts MUST appear in the prescribed order with accessible data equivalents.

#### Scenario: Block sensitive report content
- GIVEN rendered content contains a raw comment or evidence reference
- WHEN prepublication validation runs
- THEN publication MUST fail and no downloadable report MUST be created.

## Traceability

Primary decisions: D80-D84.
