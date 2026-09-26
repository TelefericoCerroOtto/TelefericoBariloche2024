// @vitest-environment node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  auditPublicClientGraph,
  renderDashboardCharts,
  renderPdfCharts,
  runRendererPoc,
} from "../../../../../services/survey-report-worker/poc/renderer-poc";
import { chartParityFixture, edgeCaseFixtures } from "./chart-parity.fixture";

describe("renderer adoption POC", () => {
  it("rejects a synthetic client root that imports the worker source", async () => {
    const sourceRoot = resolve(process.cwd(), "src");
    const result = await auditPublicClientGraph({
      additionalClientRoots: [
        {
          fileName: resolve(sourceRoot, "lib/__synthetic_client_root__.tsx"),
          sourceText:
            '"use client"; import "../../services/survey-report-worker/poc/renderer-poc";',
        },
      ],
    });

    expect(result.isolated).toBe(false);
    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        source: "src/lib/__synthetic_client_root__.tsx",
        specifier: "../../services/survey-report-worker/poc/renderer-poc",
        reason: "forbidden-worker-module",
      }),
    );
  });

  it("rejects an empty named runtime import from a JavaScript client root", async () => {
    const sourceRoot = resolve(process.cwd(), "src");
    const result = await auditPublicClientGraph({
      additionalClientRoots: [
        {
          fileName: resolve(sourceRoot, "lib/__synthetic_client_root__.js"),
          sourceText: '"use client"; import {} from "playwright";',
        },
      ],
    });

    expect(result.isolated).toBe(false);
    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        source: "src/lib/__synthetic_client_root__.js",
        specifier: "playwright",
        reason: "forbidden-worker-package",
      }),
    );
  });

  it("elides type-only imports from worker-only packages", async () => {
    const sourceRoot = resolve(process.cwd(), "src");
    const result = await auditPublicClientGraph({
      additionalClientRoots: [
        {
          fileName: resolve(sourceRoot, "lib/__synthetic_type_only_client_root__.js"),
          sourceText: '"use client"; import type { Browser } from "playwright";',
        },
      ],
    });

    expect(result.isolated, JSON.stringify(result.blockers)).toBe(true);
    expect(result.blockers).not.toContainEqual(
      expect.objectContaining({ specifier: "playwright" }),
    );
  });

  it("walks actual client roots and excludes imports from server-only modules", async () => {
    const result = await auditPublicClientGraph();

    expect(result.clientRootCount).toBeGreaterThan(0);
    expect(result.isolated, JSON.stringify(result.blockers)).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("preserves one renderer-neutral semantic contract across Recharts and ECharts", () => {
    const dashboard = renderDashboardCharts(chartParityFixture);
    const pdf = renderPdfCharts(chartParityFixture);
    const expectedSemantics = chartParityFixture.map((chart) => ({
      type: chart.kind === "line" ? "line" : chart.kind === "scatter" ? "scatter" : "bar",
      categories: chart.categories,
      series: chart.series.map(({ name, values }) => ({ name, values })),
    }));

    expect(dashboard.semantics).toEqual(expectedSemantics);
    expect(pdf.semantics).toEqual(expectedSemantics);
    expect(dashboard.semantics).toEqual(pdf.semantics);
    expect(dashboard.semantics).toHaveLength(5);
    expect(dashboard.markup).toContain("recharts-wrapper");
    expect(pdf.markup).toContain("<svg");
    expect(pdf.markup).not.toMatch(/<image\b/i);
    expect(pdf.markup).toContain("Atención excelente en la estación superior");
  });

  it("renders empty and one-record states through both renderer paths", () => {
    const dashboardEmpty = renderDashboardCharts([edgeCaseFixtures.empty]);
    const dashboardOneRecord = renderDashboardCharts([edgeCaseFixtures.oneRecord]);
    const pdfEmpty = renderPdfCharts([edgeCaseFixtures.empty]);
    const pdfOneRecord = renderPdfCharts([edgeCaseFixtures.oneRecord]);

    expect(dashboardEmpty.markup).toContain(edgeCaseFixtures.empty.emptyState);
    expect(dashboardOneRecord.markup).toContain("recharts-wrapper");
    expect(dashboardOneRecord.markup).toContain("Excelente");
    expect(pdfEmpty.markup).toContain(edgeCaseFixtures.empty.emptyState);
    expect(pdfOneRecord.markup).toContain("<svg");
    expect(pdfOneRecord.markup).toContain("Excelente");
  });

  it(
    "proves the complete Appendix-05 Chromium and PDF gate",
    async () => {
      const temporaryDirectory = await mkdtemp(join(tmpdir(), "tb113-renderer-poc-test-"));
      const temporaryResultPath = join(temporaryDirectory, "poc-result.json");
      const trackedResultPath = new URL("../../../../../services/survey-report-worker/poc/poc-result.json", import.meta.url);

      try {
        const trackedResultBefore = await readFile(trackedResultPath);
        const result = await runRendererPoc(chartParityFixture, edgeCaseFixtures, { resultPath: temporaryResultPath });

        expect(result.criteria).toEqual(Object.fromEntries(Array.from({ length: 9 }, (_, index) => [String(index + 1), true])));
        expect(new Set(result.pdf.semanticDigests).size).toBe(1);
        expect(new Set(result.pdf.paginationDigests).size).toBe(1);
        expect(result.accessibility.seriousOrCriticalViolations).toBe(0);
        expect(result.browser.coldStartMilliseconds).toHaveLength(5);
        expect(result.browser.p95ReadyMilliseconds).toBeLessThanOrEqual(15_000);
        expect(result.worker.compressedGrowthBytes).toBeLessThanOrEqual(750 * 1024 * 1024);
        expect(result.cleanup.browserProcessesAfter).toBe(0);
        expect(Object.keys(result.digests).sort()).toEqual(["browser", "fixture", "font", "image", "lock", "runtime"]);
        expect(result.artifacts).toEqual({ pdfSemantic: result.pdf.semanticDigests[0], pagination: result.pdf.paginationDigests[0] });
        expect(result.edgeCases).toEqual({ dashboard: true, chromiumPdf: true });
        expect(result.clientGraph.isolated).toBe(true);
        expect(result.clientGraph.blockers).toEqual([]);
        expect(resolve(result.resultPath)).toBe(temporaryResultPath);
        expect(JSON.parse(await readFile(result.resultPath, "utf8"))).toMatchObject({ criteria: result.criteria });
        expect(await readFile(trackedResultPath)).toEqual(trackedResultBefore);
      } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
      }
    },
    120_000,
  );
});
