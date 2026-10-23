import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import {
  buildReportCharts,
  canonicalizeJson,
  validateSnapshotEnvelope,
  type ChartViewModelV1,
  type SnapshotEnvelopeV1,
  type SnapshotV1,
} from "@teleferico/survey-reporting-core";

import {
  PUBLISHED_SECTION_KEYS,
  type PdfRenderer,
  type PublishedAnalysisV1,
} from "./contracts";
import { renderChartHtml, validateChartViewModels } from "./renderer";
import type { OutputRejection, OutputRejectionCategory } from "./output-rejection";

const SECTION_TITLES = ["El informe", "Datos de la visita", "Lectura de comentarios"] as const;

const MAX_ANALYSIS_PARAGRAPHS = 8;
const MAX_ANALYSIS_PARAGRAPH_LENGTH = 4_000;
const PINNED_NODE_VERSION = "v22.23.4";
const PINNED_CHROMIUM_SHA256 =
  "2d18db9d8608b052b6a552ee00ec1e830f93692e928b65ecc67d693bd33fe801";
const PINNED_HEADLESS_SHELL_SHA256 =
  "670ba079b75107746ba41abad131180a31a7c7219aa1bd4061fb471f4535d541";
const PINNED_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const PINNED_FONT_SHA256 =
  "abdc775b21b1bc470d50c97e790d276f2054b7504e56e5bd3e64f48d68582322";
const REPORT_CHART_IDS = [
  "star-distribution",
  "aspect-comparison",
] as const;

export type PdfArtifact = {
  readonly bytes: Uint8Array;
  readonly mimeType: "application/pdf";
  readonly sha256: string;
  readonly size: number;
};

export class PdfValidationError extends Error {
  readonly code = "INVALID_OUTPUT" as const;
  readonly reasonCategory: OutputRejectionCategory;
  readonly outputRejection: OutputRejection;

  constructor(
    message: string,
    reasonCategory: OutputRejectionCategory = "unclassified",
  ) {
    super(message);
    this.name = "PdfValidationError";
    this.reasonCategory = reasonCategory;
    this.outputRejection = Object.freeze({
      stage: "render",
      reasonCategory,
    });
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
    throw new PdfValidationError(
      "Unknown published analysis contract",
      "published_analysis_contract",
    );

  const sections = (value as { sections: unknown[] }).sections;
  sections.forEach((section, index) => {
    if (
      typeof section !== "object" ||
      section === null ||
      !exactKeys(section, ["key", "status", "paragraphsEs"])
    )
      throw new PdfValidationError(
        `Analysis section ${index} is invalid`,
        "published_analysis_contract",
      );
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
        "published_analysis_contract",
      );
    (typed.paragraphsEs as unknown[]).forEach((paragraph, paragraphIndex) => {
      if (
        typeof paragraph !== "string" ||
        paragraph.length === 0 ||
        paragraph.length > MAX_ANALYSIS_PARAGRAPH_LENGTH
      )
        throw new PdfValidationError(
          `Analysis paragraph ${index}:${paragraphIndex} is unsafe`,
          "published_analysis_contract",
        );
    });
  });
  return value as PublishedAnalysisV1;
}

function analysisDigest(analysis: PublishedAnalysisV1): string {
  return createHash("sha256").update(canonicalizeJson(analysis)).digest("hex");
}

const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const percent = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const cutoff = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function officialSummary(snapshot: SnapshotV1): string {
  const current = snapshot.metrics.current;
  const average = current.averageMilliStars === null ? "No disponible" : `${decimal.format(current.averageMilliStars / 1000)} / 5`;
  const satisfied = current.satisfied.rateBps === null ? "No disponible" : `${percent.format(current.satisfied.rateBps / 100)} %`;
  return `<ul class="kpis"><li>Respuestas: <strong>${current.submissionCount}</strong></li><li>Calificación promedio: <strong>${average}</strong></li><li>Satisfacción: <strong>${satisfied}</strong></li><li>Comentarios escritos analizados: <strong>${snapshot.comments.length}</strong></li></ul>`;
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

const ANALYSIS_TITLES: Record<PublishedAnalysisV1["sections"][number]["key"], string> = {
  executive_summary: "En síntesis",
  observed_changes: "Cambios observados",
  strengths: "Aspectos favorables",
  unfavorable_areas: "Aspectos desfavorables",
  recurrent_themes: "Temas recurrentes",
  minority_signals: "Señales minoritarias",
  coverage_limitations: "Alcance y limitaciones",
};

function analysisMarkup(snapshot: SnapshotV1, analysis: PublishedAnalysisV1): string {
  if (snapshot.comments.length === 0)
    return "<p>No hay comentarios escritos para analizar en el período actual ni en el anterior.</p>";
  const supported = analysis.sections.filter((section) => section.status === "supported");
  if (supported.length === 0)
    return "<p>No hay hallazgos suficientemente respaldados por los comentarios disponibles.</p>";
  return `<p>Análisis generado con IA a partir de ${snapshot.comments.length} comentarios escritos; las cifras anteriores se calculan por separado.</p>${supported.map((section) =>
    `<div class="finding" data-analysis-key="${escapeHtml(section.key)}"><h3>${ANALYSIS_TITLES[section.key]}</h3>${section.paragraphsEs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>`
  ).join("")}`;
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
  if (REPORT_CHART_IDS.some((id) => !charts.some((chart) => chart.id === id)))
    throw new PdfValidationError(
      "Report chart set does not match its fixed contract",
      "chart_contract",
    );

  const qrPoints = snapshot.metrics.qrPoints.map((point) =>
    `${escapeHtml(point.displayName)}: ${point.current.submissionCount} ${point.current.submissionCount === 1 ? "respuesta" : "respuestas"}`
  ).join("; ");
  const content = [
    `<header><h1>Informe de comentarios de visitantes</h1><p>Período analizado: ${date.format(new Date(`${snapshot.population.current.from}T00:00:00Z`))} – ${date.format(new Date(`${snapshot.population.current.to}T00:00:00Z`))}</p><p>Corte de datos: ${cutoff.format(new Date(snapshot.population.dataCutoffAt))} (hora de Buenos Aires)</p></header>${officialSummary(snapshot)}`,
    `<h2>Las respuestas en contexto</h2>${reportChartMarkup(charts, REPORT_CHART_IDS)}<p>Puntos QR: ${qrPoints || "Sin puntos registrados"}.</p>`,
    `<h2>Lectura de comentarios</h2>${analysisMarkup(snapshot, analysis)}<p class="scope">Fuente: respuestas aceptadas mediante QR. Comentarios del período actual: ${snapshot.population.currentCommentCount}; período anterior: ${snapshot.population.previousCommentCount}. Los hallazgos se limitan a los comentarios disponibles.</p>`,
  ];
  const sections = SECTION_TITLES.map(
    (title, index) =>
      `<section class="report" data-section="${index}" data-section-title="${escapeHtml(title)}">${content[index]}</section>`,
  ).join("");
  const html = `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>*{box-sizing:border-box;animation:none!important;transition:none!important}@page{size:A4;margin:14mm}body{font-family:TB113Report,sans-serif;margin:0;color:#1b1b1b;font-size:11px;line-height:1.45}section.report{margin-bottom:7mm}header{border-bottom:1px solid #d7d7d7;padding-bottom:4mm}h1{font-size:18px;margin:0 0 2mm}h2{font-size:14px;margin:4mm 0 2mm;break-after:avoid}h3{font-size:11px;margin:3mm 0 1mm;break-after:avoid}.kpis{display:flex;flex-wrap:wrap;gap:3mm 7mm;list-style:none;padding:0;margin:4mm 0}.kpis li{break-inside:avoid}.chart{margin-bottom:3mm}.chart figure{break-inside:avoid}figure{margin:0}svg{width:100%;max-height:45mm}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:2px;overflow-wrap:anywhere;border:1px solid #d7d7d7}th:first-child,td:first-child{width:65%}.finding{border-left:2px solid #4263a3;padding-left:3mm;margin:3mm 0}.scope{color:#555;border-top:1px solid #d7d7d7;padding-top:3mm}</style></head><body>${sections}</body></html>`;
  return {
    html,
    chartCount: REPORT_CHART_IDS.length,
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

export function createPlaywrightPdfRenderer(
  options: {
    readonly fontPath?: string;
  } = {},
): PdfRenderer {
  return {
    rendererVersion: "playwright-chromium-echarts-6.1-pdf.v3",
    async render({ html, charts }) {
      validateChartViewModels(charts);
      if (
        (html.match(/<section class="report"/g) ?? []).length !==
          SECTION_TITLES.length ||
        (html.match(/<section class="chart"/g) ?? []).length !==
          REPORT_CHART_IDS.length ||
        /(?:src|href)=["']https?:\/\//i.test(html)
      )
        throw new PdfRendererError(
          "RENDER_FAILED",
          "Report document failed structural validation",
        );

      const { chromium } = await import("@playwright/test");
      if (process.version !== PINNED_NODE_VERSION)
        throw new PdfRendererError(
          "RENDERER_UNAVAILABLE",
          "Pinned Node runtime is unavailable",
        );

      const font = await readFile(options.fontPath ?? PINNED_FONT_PATH).catch(
        () => {
          throw new PdfRendererError(
            "RENDERER_UNAVAILABLE",
            "Pinned report font is unavailable",
          );
        },
      );
      if (
        createHash("sha256").update(font).digest("hex") !== PINNED_FONT_SHA256
      )
        throw new PdfRendererError(
          "RENDERER_UNAVAILABLE",
          "Pinned report font digest does not match",
        );

      const browserPath = chromium.executablePath();
      const chromiumDirectory = dirname(dirname(browserPath));
      const revision = basename(chromiumDirectory).replace(/^chromium-/, "");
      const headlessShellPath = join(
        dirname(chromiumDirectory),
        `chromium_headless_shell-${revision}`,
        "chrome-headless-shell-linux64",
        "chrome-headless-shell",
      );
      if (
        (await sha256File(browserPath)) !== PINNED_CHROMIUM_SHA256 ||
        (await sha256File(headlessShellPath)) !== PINNED_HEADLESS_SHELL_SHA256
      )
        throw new PdfRendererError(
          "RENDERER_UNAVAILABLE",
          "Pinned Chromium binary is unavailable",
        );

      const reportHtml = html.replace(
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
          const elements = [
            ...document.querySelectorAll<HTMLElement>("body *"),
          ];
          return {
            sectionTitles: sections.map((section) =>
              section.getAttribute("data-section-title"),
            ),
            chartCount: charts.length,
            accessibleFigures: figures.every((figure) =>
              Boolean(figure.getAttribute("aria-label")),
            ),
            accessibleTables:
              tables.length === charts.length &&
              tables.every(
                (table) =>
                  Boolean(table.querySelector("caption")) &&
                  Boolean(table.querySelector("th[scope]")),
              ),
            svgTextCount: document.querySelectorAll(".chart svg text").length,
            rasterChartImages: document.querySelectorAll(
              ".chart img,.chart image",
            ).length,
            fontReady: document.fonts.check("16px TB113Report"),
            motion: elements.some((element) => {
              const style = getComputedStyle(element);
              return (
                parseFloat(style.animationDuration) > 0 ||
                parseFloat(style.transitionDuration) > 0
              );
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
          throw new PdfRendererError(
            "RENDER_FAILED",
            "Rendered report failed accessibility or structure checks",
          );

        const bytes = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });
        const normalizedBytes = normalizePdfTransportMetadata(bytes);
        const text = Buffer.from(normalizedBytes).toString("latin1");
        if (!text.startsWith("%PDF-") || !text.trimEnd().endsWith("%%EOF"))
          throw new PdfRendererError(
            "RENDER_FAILED",
            "Chromium returned an invalid PDF artifact",
          );
        return normalizedBytes;
      } finally {
        await browser.close();
      }
    },
  };
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
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
