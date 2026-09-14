// @vitest-environment node

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  renderDashboardCharts,
  renderPdfCharts,
  runRendererPoc,
} from "../../../../../services/survey-report-worker/poc/renderer-poc";
import { chartParityFixture, edgeCaseFixtures } from "./chart-parity.fixture";

describe("renderer adoption POC", () => {
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
      const result = await runRendererPoc(chartParityFixture, edgeCaseFixtures);

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
      expect(JSON.parse(await readFile(result.resultPath, "utf8"))).toMatchObject({ criteria: result.criteria });
    },
    120_000,
  );
});
