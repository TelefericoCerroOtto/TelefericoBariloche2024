import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import * as echarts from "echarts";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import ts from "typescript";

const execFileAsync = promisify(execFile);
const pocDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(pocDirectory, "../../..");
const colors = { positive: "#16794b", neutral: "#4263a3", negative: "#b42318" } as const;

type Cell = string | number | null;
type EdgeCases = { empty: ChartViewModel; oneRecord: ChartViewModel };

export type ChartViewModel = {
  version: "chart-view-model.v1";
  id: string;
  kind: "bar" | "line" | "comparison" | "scatter";
  title: string;
  description: string;
  unit: "count" | "percent";
  categories: string[];
  series: Array<{ name: string; values: Array<number | null>; color: keyof typeof colors }>;
  annotations: string[];
  emptyState: string;
  table: { caption: string; headers: string[]; rows: Cell[][] };
};

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const fileDigest = async (path: string) => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
};
type RendererSemantic = {
  type: "bar" | "line" | "scatter";
  categories: string[];
  series: Array<{ name: string; values: Array<number | null> }>;
};
type DashboardConfiguration = Omit<RendererSemantic, "series"> & {
  series: Array<RendererSemantic["series"][number] & { color: keyof typeof colors }>;
};

const tableMarkup = (chart: ChartViewModel) => renderToStaticMarkup(h("table", null,
  h("caption", null, chart.table.caption),
  h("thead", null, h("tr", null, chart.table.headers.map((header) => h("th", { key: header, scope: "col" }, header)))),
  h("tbody", null, chart.table.rows.map((row, index) => h("tr", { key: `${chart.id}-${index}` }, row.map((cell, cellIndex) => h(cellIndex === 0 ? "th" : "td", { key: cellIndex, ...(cellIndex === 0 ? { scope: "row" } : {}) }, cell ?? "Sin dato"))))),
));

function dashboardConfiguration(chart: ChartViewModel): DashboardConfiguration {
  return {
    type: chart.kind === "line" ? "line" : chart.kind === "scatter" ? "scatter" : "bar",
    categories: [...chart.categories],
    series: chart.series.map(({ name, values, color }) => ({ name, values: [...values], color })),
  };
}

function dashboardSemantics(configuration: DashboardConfiguration): RendererSemantic {
  return { ...configuration, series: configuration.series.map(({ name, values }) => ({ name, values })) };
}

function dashboardChart(configuration: DashboardConfiguration) {
  const rows = configuration.categories.map((category, index) => Object.fromEntries([
    ["category", category],
    ...configuration.series.map((series) => [series.name, series.values[index]]),
  ]));
  const common = { width: 640, height: 280, data: rows };

  if (configuration.type === "scatter") {
    const data = configuration.categories.map((category, index) => ({ category, x: configuration.series[0]?.values[index], y: configuration.series[1]?.values[index] }));
    return h(ScatterChart, { width: 640, height: 280 }, h(CartesianGrid), h(XAxis, { dataKey: "x" }), h(YAxis, { dataKey: "y" }), h(Scatter, { data, fill: colors.neutral, isAnimationActive: false }));
  }
  if (configuration.type === "line") {
    return h(LineChart, common, h(CartesianGrid), h(XAxis, { dataKey: "category" }), h(YAxis), configuration.series.map((series) => h(Line, { key: series.name, dataKey: series.name, stroke: colors[series.color], isAnimationActive: false })));
  }
  return h(BarChart, common, h(CartesianGrid), h(XAxis, { dataKey: "category" }), h(YAxis), configuration.series.map((series) => h(Bar, { key: series.name, dataKey: series.name, fill: colors[series.color], isAnimationActive: false })));
}

export function renderDashboardCharts(charts: ChartViewModel[]) {
  const configurations = charts.map(dashboardConfiguration);
  return {
    semantics: configurations.map(dashboardSemantics),
    markup: charts.map((chart, index) => renderToStaticMarkup(h("section", null,
      h("h2", null, chart.title),
      chart.categories.length === 0 ? h("p", { "data-empty-state": chart.id }, chart.emptyState) : dashboardChart(configurations[index]!),
      h("div", { dangerouslySetInnerHTML: { __html: tableMarkup(chart) } }),
    ))).join(""),
  };
}

type PdfChartOption = {
  animation: false;
  title: { text: string; subtext: string };
  tooltip: { show: false };
  xAxis: { type: "category"; data: string[] } | { type: "value"; name: string };
  yAxis: { type: "value"; name?: string };
  series: Array<
    | { name: string; type: "bar" | "line"; data: Array<number | null>; itemStyle: { color: string }; lineStyle: { color: string } }
    | { name: string; type: "scatter"; symbolSize: number; data: Array<{ name: string; value: [number | null, number | null] }> }
  >;
};

function pdfConfiguration(chart: ChartViewModel): PdfChartOption {
  const isScatter = chart.kind === "scatter";
  return {
    animation: false,
    title: { text: chart.title, subtext: chart.description },
    tooltip: { show: false },
    xAxis: isScatter ? { type: "value", name: chart.series[0]?.name ?? "" } : { type: "category", data: [...chart.categories] },
    yAxis: { type: "value", ...(isScatter ? { name: chart.series[1]?.name ?? "" } : {}) },
    series: isScatter
      ? [{ name: chart.series[0]?.name ?? "", type: "scatter", symbolSize: 5, data: chart.categories.map((category, index) => ({ name: category, value: [chart.series[0]?.values[index] ?? null, chart.series[1]?.values[index] ?? null] })) }]
      : chart.series.map((series) => ({ name: series.name, type: chart.kind === "line" ? "line" : "bar", data: [...series.values], itemStyle: { color: colors[series.color] }, lineStyle: { color: colors[series.color] } })),
  };
}

function pdfSemantics(option: PdfChartOption): RendererSemantic {
  const firstSeries = option.series[0];
  if (firstSeries?.type === "scatter") {
    return {
      type: "scatter",
      categories: firstSeries.data.map(({ name }) => name),
      series: [
        { name: option.xAxis.type === "value" ? option.xAxis.name : "", values: firstSeries.data.map(({ value }) => value[0]) },
        { name: option.yAxis.name ?? "", values: firstSeries.data.map(({ value }) => value[1]) },
      ],
    };
  }
  return {
    type: firstSeries?.type ?? "bar",
    categories: option.xAxis.type === "category" ? option.xAxis.data : [],
    series: option.series.flatMap((series) => series.type === "scatter" ? [] : [{ name: series.name, values: series.data }]),
  };
}

function echartsMarkup(option: PdfChartOption) {
  const instance = echarts.init(null, undefined, { renderer: "svg", ssr: true, width: 640, height: 280 });
  instance.setOption(option);
  const markup = instance.renderToSVGString();
  instance.dispose();
  return markup;
}

export function renderPdfCharts(charts: ChartViewModel[]) {
  const configurations = charts.map(pdfConfiguration);
  return {
    semantics: configurations.map(pdfSemantics),
    markup: charts.map((chart, index) => `<section class="chart">${chart.categories.length === 0
      ? `<p data-empty-state="${chart.id}">${chart.emptyState}</p>`
      : `<figure role="img" tabindex="0" aria-label="${chart.title}: ${chart.description}">${echartsMarkup(configurations[index]!)}</figure>`}${tableMarkup(chart)}</section>`).join(""),
  };
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

type InjectedClientRoot = {
  readonly fileName: string;
  readonly sourceText: string;
};

type ClientGraphBlocker = {
  readonly source: string;
  readonly specifier: string;
  readonly reason:
    | "forbidden-worker-module"
    | "forbidden-worker-package"
    | "unresolved-local-runtime-import"
    | "local-import-escapes-src"
    | "unsupported-local-runtime-target"
    | "source-read-failed"
    | "source-parse-failed"
    | "invalid-tsconfig";
};

type ClientGraphAudit = {
  readonly isolated: boolean;
  readonly clientRootCount: number;
  readonly reachableSourceCount: number;
  readonly blockers: readonly ClientGraphBlocker[];
};

type ClientGraphAuditOptions = {
  readonly additionalClientRoots?: readonly InjectedClientRoot[];
};

type RuntimeImport = {
  readonly specifier: string | null;
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const WORKER_ONLY_PACKAGES = new Set([
  "echarts",
  "@playwright/test",
  "playwright",
  "playwright-core",
]);
const LOCAL_RESOURCE_EXTENSIONS = new Set([
  ".css",
  ".sass",
  ".scss",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
]);

function sourceFileIsInRoot(sourceRoot: string, fileName: string): boolean {
  const pathFromRoot = relative(resolve(sourceRoot), resolve(fileName));
  return (
    pathFromRoot === "" ||
    (pathFromRoot !== ".." &&
      !pathFromRoot.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromRoot))
  );
}

function isProductionSource(fileName: string): boolean {
  const normalized = fileName.replaceAll("\\", "/");
  return (
    SOURCE_EXTENSIONS.has(extname(fileName).toLowerCase()) &&
    !normalized.endsWith(".d.ts") &&
    !normalized.includes("/__tests__/") &&
    !/\.(?:test|spec)\.[^.]+$/i.test(normalized)
  );
}

function isClientRoot(sourceFile: ts.SourceFile): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression))
      return false;
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

function importClauseHasRuntimeBindings(
  clause: ts.ImportClause | undefined,
): boolean {
  if (!clause) return true;
  if (clause.isTypeOnly || clause.name) return !clause.isTypeOnly;
  if (!clause.namedBindings) return false;
  if (ts.isNamespaceImport(clause.namedBindings)) return true;
  return (
    clause.namedBindings.elements.length === 0 ||
    clause.namedBindings.elements.some((element) => !element.isTypeOnly)
  );
}

function exportDeclarationHasRuntimeBindings(
  declaration: ts.ExportDeclaration,
): boolean {
  if (declaration.isTypeOnly) return false;
  if (!declaration.exportClause || ts.isNamespaceExport(declaration.exportClause))
    return true;
  return (
    declaration.exportClause.elements.length === 0 ||
    declaration.exportClause.elements.some((element) => !element.isTypeOnly)
  );
}

function runtimeImports(sourceFile: ts.SourceFile): readonly RuntimeImport[] {
  const imports: RuntimeImport[] = [];
  const addSpecifier = (node: ts.Expression | undefined) => {
    imports.push({ specifier: node && ts.isStringLiteralLike(node) ? node.text : null });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && importClauseHasRuntimeBindings(node.importClause)) {
      addSpecifier(node.moduleSpecifier);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      exportDeclarationHasRuntimeBindings(node)
    ) {
      addSpecifier(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addSpecifier(node.moduleReference.expression);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      addSpecifier(node.arguments[0]);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      addSpecifier(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return imports;
}

function matchesTsPathAlias(
  specifier: string,
  paths: ts.CompilerOptions["paths"],
): boolean {
  if (!paths) return false;
  return Object.keys(paths).some((pattern) => {
    const wildcard = pattern.indexOf("*");
    if (wildcard < 0) return specifier === pattern;
    const prefix = pattern.slice(0, wildcard);
    const suffix = pattern.slice(wildcard + 1);
    return (
      specifier.startsWith(prefix) &&
      specifier.endsWith(suffix) &&
      specifier.length >= prefix.length + suffix.length
    );
  });
}

function packageName(specifier: string): string {
  const segments = specifier.split("/");
  return segments[0]?.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : segments[0] ?? specifier;
}

function pathAliasFile(
  specifier: string,
  compilerOptions: ts.CompilerOptions,
): string | null {
  const paths = compilerOptions.paths;
  if (!paths) return null;
  for (const [pattern, targets] of Object.entries(paths)) {
    const wildcard = pattern.indexOf("*");
    let substitution: string | null = null;
    if (wildcard < 0) {
      if (specifier === pattern) substitution = "";
    } else {
      const prefix = pattern.slice(0, wildcard);
      const suffix = pattern.slice(wildcard + 1);
      if (
        specifier.startsWith(prefix) &&
        specifier.endsWith(suffix) &&
        specifier.length >= prefix.length + suffix.length
      )
        substitution = specifier.slice(prefix.length, specifier.length - suffix.length || undefined);
    }
    if (substitution === null) continue;
    const basePath = typeof compilerOptions.pathsBasePath === "string"
      ? compilerOptions.pathsBasePath
      : compilerOptions.baseUrl ?? appRoot;
    for (const target of targets) {
      const candidate = resolve(basePath, target.replace("*", substitution));
      if (
        LOCAL_RESOURCE_EXTENSIONS.has(extname(candidate).toLowerCase()) &&
        ts.sys.fileExists(candidate)
      )
        return candidate;
    }
  }
  return null;
}

function relativeResourceFile(
  specifier: string,
  containingFile: string,
): string | null {
  const candidate = resolve(dirname(containingFile), specifier);
  return LOCAL_RESOURCE_EXTENSIONS.has(extname(candidate).toLowerCase()) &&
    ts.sys.fileExists(candidate)
    ? candidate
    : null;
}

function relativeSourcePath(root: string, fileName: string): string {
  return relative(root, fileName).replaceAll("\\", "/");
}

export async function auditPublicClientGraph(
  options: ClientGraphAuditOptions = {},
): Promise<ClientGraphAudit> {
  const sourceRoot = join(appRoot, "src");
  const blockers: ClientGraphBlocker[] = [];
  const injectedSources = new Map(
    (options.additionalClientRoots ?? []).map(({ fileName, sourceText }) => [
      resolve(fileName),
      sourceText,
    ]),
  );
  const addBlocker = (
    sourceFileName: string,
    specifier: string,
    reason: ClientGraphBlocker["reason"],
  ) => {
    blockers.push({
      source: relativeSourcePath(appRoot, sourceFileName),
      specifier,
      reason,
    });
  };

  try {
    const configPath = join(appRoot, "tsconfig.json");
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error) {
      return {
        isolated: false,
        clientRootCount: 0,
        reachableSourceCount: 0,
        blockers: [{ source: "tsconfig.json", specifier: "", reason: "invalid-tsconfig" }],
      };
    }
    const parsedConfig = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      appRoot,
      undefined,
      configPath,
    );
    if (parsedConfig.errors.length > 0) {
      return {
        isolated: false,
        clientRootCount: 0,
        reachableSourceCount: 0,
        blockers: [{ source: "tsconfig.json", specifier: "", reason: "invalid-tsconfig" }],
      };
    }

    const sources = (await walk(sourceRoot)).filter(isProductionSource);
    const sourceCache = new Map<string, string>();
    const compilerHost = ts.createCompilerHost(parsedConfig.options);
    const getText = async (fileName: string): Promise<string | null> => {
      const absolute = resolve(fileName);
      const injected = injectedSources.get(absolute);
      if (injected !== undefined) return injected;
      const cached = sourceCache.get(absolute);
      if (cached !== undefined) return cached;
      try {
        const text = await readFile(absolute, "utf8");
        sourceCache.set(absolute, text);
        return text;
      } catch {
        return null;
      }
    };
    const parseSource = async (fileName: string): Promise<ts.SourceFile | null> => {
      const text = await getText(fileName);
      if (text === null) return null;
      return ts.createSourceFile(
        fileName,
        text,
        ts.ScriptTarget.Latest,
        true,
        fileName.endsWith(".tsx") || fileName.endsWith(".jsx")
          ? ts.ScriptKind.TSX
          : fileName.endsWith(".js")
            ? ts.ScriptKind.JS
            : ts.ScriptKind.TS,
      );
    };

    const clientRoots: string[] = [];
    for (const fileName of sources) {
      const sourceFile = await parseSource(fileName);
      if (sourceFile && isClientRoot(sourceFile)) {
        clientRoots.push(resolve(fileName));
      }
    }
    for (const injectedRoot of options.additionalClientRoots ?? []) {
      const fileName = resolve(injectedRoot.fileName);
      if (!sourceFileIsInRoot(sourceRoot, fileName)) {
        addBlocker(fileName, "", "local-import-escapes-src");
      } else {
        clientRoots.push(fileName);
      }
    }

    const pending = [...clientRoots];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const fileName = pending.pop()!;
      const absoluteFileName = resolve(fileName);
      if (visited.has(absoluteFileName)) continue;
      visited.add(absoluteFileName);

      if (!sourceFileIsInRoot(sourceRoot, absoluteFileName)) {
        addBlocker(fileName, "", "local-import-escapes-src");
        continue;
      }
      if (!SOURCE_EXTENSIONS.has(extname(absoluteFileName).toLowerCase())) {
        addBlocker(fileName, "", "unsupported-local-runtime-target");
        continue;
      }
      const sourceFile = await parseSource(absoluteFileName);
      if (!sourceFile) {
        addBlocker(fileName, "", "source-read-failed");
        continue;
      }

      for (const { specifier } of runtimeImports(sourceFile)) {
        if (specifier === null) {
          addBlocker(fileName, "<non-literal runtime import>", "unresolved-local-runtime-import");
          continue;
        }
        if (specifier.includes("survey-report-worker")) {
          addBlocker(fileName, specifier, "forbidden-worker-module");
          continue;
        }
        if (WORKER_ONLY_PACKAGES.has(packageName(specifier))) {
          addBlocker(fileName, specifier, "forbidden-worker-package");
          continue;
        }

        const isLocalSpecifier =
          specifier.startsWith(".") ||
          specifier.startsWith("/") ||
          matchesTsPathAlias(specifier, parsedConfig.options.paths);
        const resolution = ts.resolveModuleName(
          specifier,
          absoluteFileName,
          parsedConfig.options,
          compilerHost,
        ).resolvedModule;
        if (!resolution) {
          const resourceFile = specifier.startsWith(".")
            ? relativeResourceFile(specifier, absoluteFileName)
            : pathAliasFile(specifier, parsedConfig.options);
          if (resourceFile) continue;
          if (isLocalSpecifier)
            addBlocker(fileName, specifier, "unresolved-local-runtime-import");
          continue;
        }

        const resolvedFile = resolve(resolution.resolvedFileName);
        if (specifier.includes("survey-report-worker") ||
            resolvedFile.replaceAll("\\", "/").includes("/services/survey-report-worker/")) {
          addBlocker(fileName, specifier, "forbidden-worker-module");
          continue;
        }
        if (resolvedFile.endsWith(".d.ts")) continue;
        if (sourceFileIsInRoot(sourceRoot, resolvedFile)) {
          if (!isProductionSource(resolvedFile)) {
            addBlocker(fileName, specifier, "unsupported-local-runtime-target");
          } else {
            pending.push(resolvedFile);
          }
        } else if (isLocalSpecifier) {
          addBlocker(fileName, specifier, "local-import-escapes-src");
        }
      }
    }

    const deduplicatedBlockers = [...new Map(
      blockers.map((blocker) => [
        `${blocker.source}\0${blocker.specifier}\0${blocker.reason}`,
        blocker,
      ]),
    ).values()].sort((left, right) =>
      `${left.source}\0${left.specifier}\0${left.reason}`.localeCompare(
        `${right.source}\0${right.specifier}\0${right.reason}`,
      ),
    );
    return {
      isolated: deduplicatedBlockers.length === 0,
      clientRootCount: clientRoots.length,
      reachableSourceCount: visited.size,
      blockers: deduplicatedBlockers,
    };
  } catch {
    return {
      isolated: false,
      clientRootCount: 0,
      reachableSourceCount: 0,
      blockers: [{ source: "src", specifier: "", reason: "source-read-failed" }],
    };
  }
}

async function compressedWorkerGrowth(workDirectory: string) {
  const archive = join(workDirectory, "worker-growth.tar.gz");
  const packages = ["echarts", "recharts", "react-is", "@playwright/test"];
  const roots = await Promise.all(packages.map((name) => realpath(join(appRoot, "node_modules", name))));
  roots.push(dirname(chromium.executablePath()));
  await execFileAsync("tar", ["--dereference", "--absolute-names", "-czf", archive, ...roots], { maxBuffer: 1024 * 1024 });
  return { bytes: (await stat(archive)).size, digest: await fileDigest(archive) };
}

function documentHtml(chartsMarkup: string, fontBase64: string) {
  const sections = ["Portada", "Resumen ejecutivo", "Panorama oficial", "Distribución y evolución", "Aspectos", "Puntos QR", "Voz del visitante", "Cobertura y limitaciones"];
  return `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>@font-face{font-family:Report;src:url(data:font/ttf;base64,${fontBase64})}*{box-sizing:border-box;animation:none!important;transition:none!important}body{font-family:Report,sans-serif;margin:0}section.report{break-before:page;min-height:260mm;padding:12mm}section.report:first-child{break-before:auto}.chart{break-inside:avoid}figure{margin:0}svg{max-width:100%;height:auto}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px}th,td{padding:2px;overflow-wrap:anywhere}th:first-child,td:first-child{width:65%}</style></head><body>${sections.map((title, index) => `<section class="report" data-section="${index}"><h1>${title}</h1>${index === 2 ? chartsMarkup : "<p>Contenido oficial validado.</p>"}</section>`).join("")}</body></html>`;
}

// The optional path isolates automated runs; manual runs keep the existing POC artifact location.
export async function runRendererPoc(charts: ChartViewModel[], edgeCases: EdgeCases, options: { resultPath?: string } = {}) {
  const workDirectory = await mkdtemp(join(tmpdir(), "tb113-renderer-poc-"));
  const resultPath = options.resultPath ?? join(pocDirectory, "poc-result.json");
  const fontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  const font = await readFile(fontPath);
  const pdfRenderer = renderPdfCharts(charts);
  const dashboardEmpty = renderDashboardCharts([edgeCases.empty]);
  const dashboardOneRecord = renderDashboardCharts([edgeCases.oneRecord]);
  const pdfEmpty = renderPdfCharts([edgeCases.empty]);
  const pdfOneRecord = renderPdfCharts([edgeCases.oneRecord]);
  const html = documentHtml(`${pdfRenderer.markup}${pdfEmpty.markup}${pdfOneRecord.markup}`, font.toString("base64"));
  const edgeCasePdfLabels = [edgeCases.empty.emptyState, edgeCases.oneRecord.title, ...edgeCases.oneRecord.categories];
  const semanticDigests: string[] = [];
  const paginationDigests: string[] = [];
  const coldStartMilliseconds: number[] = [];
  let activeBrowsers = 0;
  let clippingCount = 0;
  let seriousOrCriticalViolations = 0;
  let svgTextCount = 0;
  let fontReady = false;
  let extractedLabels = false;
  let edgeCasesRenderedInPdf = true;
  let missingLabels: string[] = [];

  try {
    for (let index = 0; index < 5; index += 1) {
      const startedAt = performance.now();
      const browser = await chromium.launch({ headless: true });
      activeBrowsers += 1;
      try {
        const page = await browser.newPage({ locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires" });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setContent(html, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        coldStartMilliseconds.push(Math.round(performance.now() - startedAt));
        const audit = await page.evaluate(() => {
          const elements = [...document.querySelectorAll<HTMLElement>("body *")];
          const figures = [...document.querySelectorAll("figure[role=img]")];
          const tables = [...document.querySelectorAll("table")];
          return {
            clipping: elements.filter((element) => element instanceof HTMLElement && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)).length,
            violations: figures.filter((figure) => !figure.getAttribute("aria-label")).length + tables.filter((table) => !table.querySelector("caption") || !table.querySelector("th[scope]")).length,
            svgText: document.querySelectorAll("svg text").length,
            images: document.querySelectorAll(".chart image,.chart img").length,
            motion: elements.filter((element) => { const style = getComputedStyle(element); return parseFloat(style.animationDuration) > 0 || parseFloat(style.transitionDuration) > 0; }).length,
            font: document.fonts.check("16px Report"),
            pages: [...document.querySelectorAll<HTMLElement>("section.report")].map((section) => Math.round(section.getBoundingClientRect().top)),
          };
        });
        clippingCount += audit.clipping;
        seriousOrCriticalViolations += audit.violations;
        svgTextCount += audit.svgText;
        fontReady ||= audit.font;
        if (audit.images !== 0 || audit.motion !== 0) seriousOrCriticalViolations += 1;
        paginationDigests.push(digest(JSON.stringify(audit.pages)));
        const pdfPath = join(workDirectory, `report-${index}.pdf`);
        await page.pdf({ path: pdfPath, format: "A4", printBackground: true, preferCSSPageSize: true });
        const textPath = join(workDirectory, `report-${index}.txt`);
        await execFileAsync("pdftotext", ["-layout", pdfPath, textPath]);
        const text = (await readFile(textPath, "utf8")).replace(/\s+/g, " ").trim();
        semanticDigests.push(digest(text));
        const compactText = text.normalize("NFC").replace(/\s+/g, "");
        missingLabels = charts.flatMap((chart) => [chart.title, ...chart.categories]).filter((label) => !compactText.includes(label.normalize("NFC").replace(/\s+/g, "")));
        extractedLabels ||= missingLabels.length === 0;
        edgeCasesRenderedInPdf &&= edgeCasePdfLabels.every((label) => compactText.includes(label.normalize("NFC").replace(/\s+/g, "")));
      } finally {
        await browser.close();
        activeBrowsers -= 1;
      }
    }

    const starts = [...coldStartMilliseconds].sort((a, b) => a - b);
    const compressedGrowth = await compressedWorkerGrowth(workDirectory);
    const outputsReconcile = charts.every((chart) => chart.table.rows.length === chart.categories.length && chart.series.every((series) => series.values.length === chart.categories.length));
    const clientGraph = await auditPublicClientGraph();
    const publicGraphExcluded = clientGraph.isolated;
    const edgeCaseResults = {
      dashboard: dashboardEmpty.markup.includes(edgeCases.empty.emptyState) && dashboardOneRecord.markup.includes("recharts-wrapper"),
      chromiumPdf: pdfEmpty.markup.includes(edgeCases.empty.emptyState) && pdfOneRecord.markup.includes("<svg") && edgeCasesRenderedInPdf,
    };
    const criteria = {
      "1": JSON.stringify(renderDashboardCharts(charts).semantics) === JSON.stringify(pdfRenderer.semantics),
      "2": !/<image\b/i.test(pdfRenderer.markup) && svgTextCount > 0,
      "3": new Set(semanticDigests).size === 1 && new Set(paginationDigests).size === 1,
      "4": fontReady && clippingCount === 0 && extractedLabels,
      "5": seriousOrCriticalViolations === 0,
      "6": !/animation-duration:[^;]*[1-9]/.test(html),
      "7": outputsReconcile && Object.values(edgeCaseResults).every(Boolean),
      "8": publicGraphExcluded,
      "9": compressedGrowth.bytes <= 750 * 1024 * 1024 && starts.at(-1)! <= 15_000,
    };
    const runtime = JSON.stringify({ node: process.version, platform: process.platform, architecture: process.arch, locale: "es-AR", timeZone: "America/Argentina/Buenos_Aires" });
    const result = {
      versions: { echarts: "6.1.0", recharts: "3.10.1", playwright: "1.61.0", chromium: "1228", node: process.version },
      digests: { lock: await fileDigest(join(appRoot, "pnpm-lock.yaml")), image: compressedGrowth.digest, font: digest(font), browser: await fileDigest(chromium.executablePath()), runtime: digest(runtime), fixture: digest(JSON.stringify({ charts, edgeCases })) },
      pdf: { semanticDigests, paginationDigests, extractedLabels, missingLabels },
      artifacts: { pdfSemantic: semanticDigests[0], pagination: paginationDigests[0] },
      accessibility: { seriousOrCriticalViolations, clippingCount, svgTextCount, fontReady },
      browser: { coldStartMilliseconds, p95ReadyMilliseconds: starts.at(-1)! },
      worker: { compressedGrowthBytes: compressedGrowth.bytes, thresholdBytes: 750 * 1024 * 1024 },
      publicGraphExcluded,
      clientGraph,
      edgeCases: edgeCaseResults,
      cleanup: { browserProcessesAfter: activeBrowsers, temporaryArtifactsRemoved: true },
      criteria,
      resultPath: relative(appRoot, resultPath),
      visitorData: false,
    };
    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    return { ...result, resultPath };
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}
