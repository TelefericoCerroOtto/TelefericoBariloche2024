# Normative PDF and Renderer POC

Production depends on `ChartViewModelV1`. Recharts/ECharts 6.1 and worker-only Playwright/Chromium remain candidates; no manifest/lock adoption precedes the gate. Research produced zero provider/library claims.

## Evidence and Pass Threshold

Owner: reporting/PDF implementer. Evidence: current version-matched official docs plus reproducible local/staging measurements. Worker POC fixtures cover zero/one record, long ES/PT labels, five charts, null/zero/negative values, 200 points, and scatter/matrix; dashboard parity fixture is `src/components/administration/feedback/__tests__/chart-parity.fixture.ts`.

Reviewed `poc-result.json` records versions, lock/image/font/browser/runtime/fixture digests, measurements, criteria, artifacts, and no visitor data. All pass:

1. Dashboard/PDF canonical titles, labels, series, values/nulls, units, order, annotations, empty state, and tables: 100% equal.
2. All charts produce zero chart-raster image objects; chart text remains selectable at 400%.
3. Five renders/fixture yield one semantic-document digest after allowed PDF transport metadata removal; pagination anchors match.
4. Embedded fonts cover all fixture glyphs; DOM overflow/clipping=0; extracted PDF contains each label exactly.
5. Named charts plus keyboard-readable tables; one captioned HTML table/chart; zero serious/critical accessibility violations.
6. Reduced-motion animation/transition duration=0; PDF never animates.
7. Bar, line, comparison, scatter/matrix outputs are nonempty and reconcile with tables.
8. A static source-graph audit of public client roots and their transitive runtime imports finds no reachability to ECharts, Playwright, Chromium, Vertex, or worker modules. This audit is not exact production-bundle analysis.
9. Compressed worker image growth≤750 MiB; five staging-equivalent cold starts have p95 ready≤15s and none exceeds task deadline.

Missing evidence or any failure blocks renderer implementation/adoption. Recharts and ECharts 6.1 remain conditional; no substitute renderer, dependency-free adapter, or raster fallback may be selected silently. Failure requires explicit design/spec revision; Chromium failure keeps generation/storage disabled. Dependencies/lockfile remain separately approval-gated after reviewed pass evidence.

## Offline Worker Adapter Status

The app-owned worker now has an explicitly injected offline Chromium adapter that reuses the already pinned ECharts/Playwright stack without changing manifests or locks. It validates the fixed report structure and privacy boundary, embeds the POC font, audits accessible vector charts/tables, and normalizes PDF creation/modification timestamps before hashing. Identical synthetic inputs therefore produce the same PDF bytes and artifact digest in the verified local runtime.

This is local synthetic evidence only, not production renderer adoption or runtime readiness. The initial POC run failed criterion 8 (`publicGraphExcluded=false`); that is historical failure evidence. After correcting the static source-graph classifier, the current local POC passes all nine criteria under the documented static client-root/transitive-import interpretation. Parent spotcheck passed the focused worker/POC suite (2 files, 32 tests), app typecheck, and `git diff --check`. Criterion 8 does not establish exact production Next.js bundle reachability. Keep U12 unchecked and production renderer wiring disabled until production renderer/image integration, storage/download, and operational gates pass; no real GCS was used.

## PDF Contract

Input is only `SnapshotV1+PublishedAnalysisV1`. Order: cover; executive summary; official overview; distribution/evolution; aspects; QR points; visitor voice; coverage/limitations. Charts: star distribution; satisfaction evolution; response-volume evolution; aspect comparison; QR-point comparison. Official tables/charts precede narrative. Comments, refs, prompts, and internal errors are prohibited.

Pin worker image, runtime/browser, font files, locale `es-AR`, Buenos Aires time zone, CSS, adapter, and input digests. Before storage completion validate section/chart order, table reconciliation, prohibited-content absence, PDF MIME/positive size/SHA-256.
