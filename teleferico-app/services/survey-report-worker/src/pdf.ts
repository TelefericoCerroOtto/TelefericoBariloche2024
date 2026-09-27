import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";

import {
  buildReportCharts,
  canonicalizeJson,
  validateSnapshotEnvelope,
  type ChartViewModelV1,
  type SnapshotEnvelopeV1,
  type SnapshotV1,
} from "../../../packages/survey-reporting-core/src";

import {
  PUBLISHED_SECTION_KEYS,
  type PdfRenderer,
  type PublishedAnalysisV1,
} from "./contracts";
import { renderChartHtml, validateChartViewModels } from "./renderer";

const SECTION_TITLES = [
  "Portada",
  "Resumen ejecutivo",
  "Panorama oficial",
  "Distribución y evolución",
  "Aspectos",
  "Puntos QR",
  "Voz del visitante",
  "Cobertura y limitaciones",
] as const;

const MAX_ANALYSIS_PARAGRAPHS = 8;
const MAX_ANALYSIS_PARAGRAPH_LENGTH = 4_000;
const EVIDENCE_REF = /\be_[a-z0-9]{20}\b/i;
const PINNED_NODE_VERSION = "v22.22.0";
const PINNED_CHROMIUM_SHA256 =
  "2d18db9d8608b052b6a552ee00ec1e830f93692e928b65ecc67d693bd33fe801";
const PINNED_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const PINNED_FONT_SHA256 =
  "ae7b7855e115a5966d8b1b3f80f254ccc117ec86f9965e202ee2940453837280";
const REPORT_CHART_IDS = [
  "star-distribution",
  "satisfaction-evolution",
  "response-volume-evolution",
  "aspect-comparison",
  "qr-point-comparison",
] as const;

export type PdfArtifact = {
  readonly bytes: Uint8Array;
  readonly mimeType: "application/pdf";
  readonly sha256: string;
  readonly size: number;
};

export class PdfValidationError extends Error {
  readonly code = "INVALID_OUTPUT" as const;

  constructor(message: string) {
    super(message);
    this.name = "PdfValidationError";
  }
}

export class PdfRendererError extends Error {
  readonly code: "RENDERER_UNAVAILABLE" | "RENDER_FAILED";

  constructor(code: PdfRendererError["code"], message: string) {
    super(message);
    this.name = "PdfRendererError";
    this.code = code;
  }
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );

function exactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === keys.length &&
    actual.every((key, index) => key === [...keys].sort()[index])
  );
}

export function validatePublishedAnalysis(value: unknown): PublishedAnalysisV1 {
  if (
    typeof value !== "object" ||
    value === null ||
    !exactKeys(value, ["schemaVersion", "sections"]) ||
    (value as { schemaVersion?: unknown }).schemaVersion !==
      "survey-published-analysis.v1" ||
    !Array.isArray((value as { sections?: unknown }).sections) ||
    (value as { sections: unknown[] }).sections.length !==
      PUBLISHED_SECTION_KEYS.length
  )
    throw new PdfValidationError("Unknown published analysis contract");

  const sections = (value as { sections: unknown[] }).sections;
  sections.forEach((section, index) => {
    if (
      typeof section !== "object" ||
      section === null ||
      !exactKeys(section, ["key", "status", "paragraphsEs"])
    )
      throw new PdfValidationError(`Analysis section ${index} is invalid`);
    const typed = section as {
      key?: unknown;
      status?: unknown;
      paragraphsEs?: unknown;
    };
    if (
      typed.key !== PUBLISHED_SECTION_KEYS[index] ||
      (typed.status !== "supported" &&
        typed.status !== "insufficient_evidence") ||
      !Array.isArray(typed.paragraphsEs) ||
      typed.paragraphsEs.length > MAX_ANALYSIS_PARAGRAPHS
    )
      throw new PdfValidationError(
        `Analysis section ${index} violates its contract`,
      );
    (typed.paragraphsEs as unknown[]).forEach((paragraph, paragraphIndex) => {
      if (
        typeof paragraph !== "string" ||
        paragraph.length === 0 ||
        paragraph.length > MAX_ANALYSIS_PARAGRAPH_LENGTH ||
        EVIDENCE_REF.test(paragraph)
      )
        throw new PdfValidationError(
          `Analysis paragraph ${index}:${paragraphIndex} is unsafe`,
        );
    });
  });
  return value as PublishedAnalysisV1;
}

function analysisDigest(analysis: PublishedAnalysisV1): string {
  return createHash("sha256").update(canonicalizeJson(analysis)).digest("hex");
}

function officialSummary(snapshot: SnapshotV1): string {
  const current = snapshot.metrics.current;
  return `Respuestas: ${current.submissionCount}. Promedio: ${current.averageMilliStars ?? "No disponible"}. Satisfacción: ${current.satisfied.rateBps ?? "No disponible"} puntos base.`;
}

function reportChartMarkup(
  charts: readonly ChartViewModelV1[],
  ids: readonly string[],
): string {
  return charts
    .filter((chart) => ids.includes(chart.id))
    .map(renderChartHtml)
    .join("");
}

function assertNoProhibitedReportContent(
  html: string,
  snapshot: SnapshotV1,
): void {
  if (EVIDENCE_REF.test(html))
    throw new PdfValidationError("Report HTML contains a prohibited evidence reference");

  for (const comment of snapshot.comments) {
    const text = comment.text.trim();
    if (text.length > 0 && (html.includes(text) || html.includes(escapeHtml(text))))
      throw new PdfValidationError("Report HTML contains verbatim visitor comment text");
  }
}

function normalizePdfTransportMetadata(bytes: Uint8Array): Uint8Array {
  const pdf = Buffer.from(bytes).toString("latin1");
  let replacements = 0;
  const normalized = pdf.replace(
    /\/(CreationDate|ModDate)\s*\(D:\d{14}[+-]\d{2}'\d{2}'\)/g,
    (_metadata, key: string) => {
      replacements += 1;
      return `/${key} (D:20000101000000+00'00')`;
    },
  );
  if (replacements < 2)
    throw new PdfRendererError(
      "RENDER_FAILED",
      "Chromium PDF transport metadata could not be normalized",
    );
  return Buffer.from(normalized, "latin1");
}

function analysisMarkup(analysis: PublishedAnalysisV1): string {
  return analysis.sections
    .map(
      (section) =>
        `<div data-analysis-key="${escapeHtml(section.key)}" data-analysis-status="${escapeHtml(section.status)}">${section.paragraphsEs
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join("")}</div>`,
    )
    .join("");
}

function selectedAnalysisMarkup(
  analysis: PublishedAnalysisV1,
  keys: readonly PublishedAnalysisV1["sections"][number]["key"][],
): string {
  return analysisMarkup({
    ...analysis,
    sections: analysis.sections.filter((section) =>
      keys.includes(section.key),
    ) as unknown as PublishedAnalysisV1["sections"],
  });
}

export function renderReportHtml(
  snapshot: SnapshotV1,
  analysis: PublishedAnalysisV1,
): {
  readonly html: string;
  readonly chartCount: number;
  readonly analysisDigest: string;
} {
  const charts = validateChartViewModels(buildReportCharts(snapshot));
  const chartIds = charts.map(({ id }) => id);
  if (
    chartIds.length !== REPORT_CHART_IDS.length ||
    REPORT_CHART_IDS.some((id) => !chartIds.includes(id))
  )
    throw new PdfValidationError("Report chart set does not match its fixed contract");

  const content = [
    `<p>Informe determinista de satisfacción del visitante. Período analizado: ${escapeHtml(snapshot.population.current.from)} – ${escapeHtml(snapshot.population.current.to)}.</p>`,
    `<p>${escapeHtml(officialSummary(snapshot))}</p>${selectedAnalysisMarkup(analysis, ["executive_summary"])}`,
    `<p>${escapeHtml(officialSummary(snapshot))}</p><p>Fuente: respuestas aceptadas mediante QR; corte de datos: ${escapeHtml(snapshot.population.dataCutoffAt)}.</p>`,
    reportChartMarkup(charts, [
      "star-distribution",
      "satisfaction-evolution",
      "response-volume-evolution",
    ]),
    `${reportChartMarkup(charts, ["aspect-comparison"])}${selectedAnalysisMarkup(analysis, ["observed_changes", "strengths", "unfavorable_areas"])}`,
    `${reportChartMarkup(charts, ["qr-point-comparison"])}<p>Los puntos QR se presentan con los denominadores y filtros oficiales del período.</p>`,
    `<p>La voz del visitante se representa mediante evidencia agregada; no se incluyen comentarios originales.</p>${selectedAnalysisMarkup(analysis, ["recurrent_themes", "minority_signals"])}`,
    selectedAnalysisMarkup(analysis, [
      "coverage_limitations",
    ]),
  ];
  const sections = SECTION_TITLES.map(
    (title, index) =>
      `<section class="report" data-section="${index}" data-section-title="${escapeHtml(title)}"><h1>${escapeHtml(title)}</h1>${content[index] ?? "<p>Contenido validado.</p>"}</section>`,
  ).join("");
  const html = `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>*{box-sizing:border-box;animation:none!important;transition:none!important}body{font-family:TB113Report,sans-serif;margin:0;color:#1b1b1b}section.report{break-before:page;min-height:260mm;padding:12mm}section.report:first-child{break-before:auto}.chart{break-inside:avoid}figure{margin:0}svg{max-width:100%;height:auto}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px}th,td{padding:2px;overflow-wrap:anywhere;border:1px solid #d7d7d7}th:first-child,td:first-child{width:65%}</style></head><body>${sections}</body></html>`;
  return {
    html,
    chartCount: charts.length,
    analysisDigest: analysisDigest(analysis),
  };
}

export function createUnavailablePdfRenderer(reason: string): PdfRenderer {
  return {
    rendererVersion: "unavailable",
    async render() {
      throw new PdfRendererError("RENDERER_UNAVAILABLE", reason);
    },
  };
}

export function createInjectedPdfRenderer(
  rendererVersion: string,
  render: PdfRenderer["render"],
): PdfRenderer {
  if (!rendererVersion) throw new TypeError("rendererVersion is required");
  return { rendererVersion, render };
}

export function createPlaywrightPdfRenderer(): PdfRenderer {
  return {
    rendererVersion: "playwright-chromium-echarts-6.1-pdf.v2",
    async render({ html, charts }) {
      validateChartViewModels(charts);
      if (
        (html.match(/<section class="report"/g) ?? []).length !==
          SECTION_TITLES.length ||
        (html.match(/<section class="chart"/g) ?? []).length !==
          REPORT_CHART_IDS.length ||
        /(?:src|href)=["']https?:\/\//i.test(html)
      )
        throw new PdfRendererError("RENDER_FAILED", "Report document failed structural validation");

      const { chromium } = await import("@playwright/test");
      if (process.version !== PINNED_NODE_VERSION)
        throw new PdfRendererError("RENDERER_UNAVAILABLE", "Pinned Node runtime is unavailable");

      const font = await readFile(PINNED_FONT_PATH).catch(() => {
        throw new PdfRendererError("RENDERER_UNAVAILABLE", "Pinned report font is unavailable");
      });
      if (createHash("sha256").update(font).digest("hex") !== PINNED_FONT_SHA256)
        throw new PdfRendererError("RENDERER_UNAVAILABLE", "Pinned report font digest does not match");

      const browserPath = chromium.executablePath();
      const browserHash = createHash("sha256");
      for await (const chunk of createReadStream(browserPath)) browserHash.update(chunk);
      if (browserHash.digest("hex") !== PINNED_CHROMIUM_SHA256)
        throw new PdfRendererError("RENDERER_UNAVAILABLE", "Pinned Chromium binary is unavailable");

      const reportHtml = html
        .replace(
          "<style>",
          `<style>@font-face{font-family:TB113Report;src:url(data:font/ttf;base64,${font.toString("base64")}) format("truetype");font-display:block}`,
        );
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({
          locale: "es-AR",
          timezoneId: "America/Argentina/Buenos_Aires",
        });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setContent(reportHtml, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const audit = await page.evaluate(() => {
          const sections = [...document.querySelectorAll("section.report")];
          const charts = [...document.querySelectorAll("section.chart")];
          const figures = [...document.querySelectorAll("figure[role=img]")];
          const tables = [...document.querySelectorAll("table")];
          const elements = [...document.querySelectorAll<HTMLElement>("body *")];
          return {
            sectionTitles: sections.map((section) => section.getAttribute("data-section-title")),
            chartCount: charts.length,
            accessibleFigures: figures.every((figure) => Boolean(figure.getAttribute("aria-label"))),
            accessibleTables: tables.length === charts.length && tables.every((table) =>
              Boolean(table.querySelector("caption")) && Boolean(table.querySelector("th[scope]"))),
            svgTextCount: document.querySelectorAll(".chart svg text").length,
            rasterChartImages: document.querySelectorAll(".chart img,.chart image").length,
            fontReady: document.fonts.check("16px TB113Report"),
            motion: elements.some((element) => {
              const style = getComputedStyle(element);
              return parseFloat(style.animationDuration) > 0 || parseFloat(style.transitionDuration) > 0;
            }),
          };
        });
        if (
          audit.sectionTitles.join("|") !== SECTION_TITLES.join("|") ||
          audit.chartCount !== REPORT_CHART_IDS.length ||
          !audit.accessibleFigures ||
          !audit.accessibleTables ||
          audit.svgTextCount === 0 ||
          audit.rasterChartImages !== 0 ||
          !audit.fontReady ||
          audit.motion
        )
          throw new PdfRendererError("RENDER_FAILED", "Rendered report failed accessibility or structure checks");

        const bytes = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });
        const normalizedBytes = normalizePdfTransportMetadata(bytes);
        const text = Buffer.from(normalizedBytes).toString("latin1");
        if (!text.startsWith("%PDF-") || !text.trimEnd().endsWith("%%EOF"))
          throw new PdfRendererError("RENDER_FAILED", "Chromium returned an invalid PDF artifact");
        return normalizedBytes;
      } finally {
        await browser.close();
      }
    },
  };
}

export function createDeterministicTestPdfRenderer(): PdfRenderer {
  return {
    rendererVersion: "deterministic-test-pdf.v1",
    async render({ html }) {
      const digest = createHash("sha256").update(html).digest("hex");
      return new TextEncoder().encode(`TB113-PDF-TEST-V1\n${digest}\n${html}`);
    },
  };
}

export async function renderValidatedPdf(
  snapshotEnvelope: SnapshotEnvelopeV1,
  analysisInput: unknown,
  renderer: PdfRenderer,
): Promise<PdfArtifact> {
  const snapshot = validateSnapshotEnvelope(snapshotEnvelope);
  const analysis = validatePublishedAnalysis(analysisInput);
  const document = renderReportHtml(snapshot, analysis);
  assertNoProhibitedReportContent(document.html, snapshot);
  let bytes: Uint8Array;
  try {
    bytes = await renderer.render({
      html: document.html,
      snapshot,
      charts: buildReportCharts(snapshot),
    });
  } catch (error) {
    if (error instanceof PdfRendererError) throw error;
    throw new PdfRendererError("RENDER_FAILED", "PDF renderer failed");
  }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0)
    throw new PdfRendererError(
      "RENDER_FAILED",
      "PDF renderer returned an empty artifact",
    );
  return {
    bytes,
    mimeType: "application/pdf",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.byteLength,
  };
}
