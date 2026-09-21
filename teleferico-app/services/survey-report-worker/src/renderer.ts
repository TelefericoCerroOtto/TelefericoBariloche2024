import * as echarts from "echarts";

import type { ChartViewModelV1 } from "../../../packages/survey-reporting-core/src";

const COLORS = {
  positive: "#16794b",
  neutral: "#4263a3",
  negative: "#b42318",
} as const;

const MAX_CHARTS = 5;
const MAX_CATEGORIES = 500;
const MAX_SERIES = 8;
const MAX_LABEL_LENGTH = 512;
const MAX_ANNOTATIONS = 16;

export type RendererSemantic = {
  readonly type: "bar" | "line" | "scatter";
  readonly categories: readonly string[];
  readonly series: readonly {
    readonly name: string;
    readonly values: readonly (number | null)[];
  }[];
};

export class RendererValidationError extends Error {
  readonly code = "INVALID_OUTPUT" as const;

  constructor(message: string) {
    super(message);
    this.name = "RendererValidationError";
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

const valueText = (value: string | number | null): string =>
  value === null ? "Sin dato" : String(value);

function assertLabel(value: unknown, name: string): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_LABEL_LENGTH
  )
    throw new RendererValidationError(`${name} is outside the renderer limit`);
}

function assertSeriesValues(
  values: unknown,
  categoryCount: number,
  name: string,
): asserts values is readonly (number | null)[] {
  if (!Array.isArray(values) || values.length !== categoryCount)
    throw new RendererValidationError(
      `${name} length does not match categories`,
    );
  if (
    values.some(
      (value) =>
        value !== null &&
        (typeof value !== "number" || !Number.isSafeInteger(value)),
    )
  )
    throw new RendererValidationError(`${name} contains a non-integer value`);
}

export function validateChartViewModels(
  charts: readonly ChartViewModelV1[],
): readonly ChartViewModelV1[] {
  if (charts.length !== MAX_CHARTS)
    throw new RendererValidationError(
      "The report must contain exactly five charts",
    );

  const ids = new Set<string>();
  for (const chart of charts) {
    if (chart.version !== "chart-view-model.v1")
      throw new RendererValidationError("Unknown chart contract version");
    assertLabel(chart.id, "chart id");
    if (ids.has(chart.id))
      throw new RendererValidationError("Duplicate chart id");
    ids.add(chart.id);
    assertLabel(chart.title, "chart title");
    assertLabel(chart.description, "chart description");
    assertLabel(chart.emptyState, "empty state");
    if (
      !Array.isArray(chart.categories) ||
      chart.categories.length > MAX_CATEGORIES
    )
      throw new RendererValidationError(
        "Chart category count exceeds the limit",
      );
    chart.categories.forEach((category, index) =>
      assertLabel(category, `category ${index}`),
    );
    if (!Array.isArray(chart.series) || chart.series.length > MAX_SERIES)
      throw new RendererValidationError("Chart series count exceeds the limit");
    chart.series.forEach((series, index) => {
      assertLabel(series.name, `series ${index} name`);
      if (!(series.color in COLORS))
        throw new RendererValidationError(`Unknown color for series ${index}`);
      assertSeriesValues(
        series.values,
        chart.categories.length,
        `series ${index}`,
      );
    });
    if (
      !Array.isArray(chart.legend) ||
      chart.legend.length !== chart.series.length
    )
      throw new RendererValidationError("Chart legend does not match series");
    if (
      !Array.isArray(chart.annotations) ||
      chart.annotations.length > MAX_ANNOTATIONS
    )
      throw new RendererValidationError("Chart annotations exceed the limit");
    chart.annotations.forEach((annotation, index) =>
      assertLabel(annotation, `annotation ${index}`),
    );
    if (
      !chart.table ||
      !Array.isArray(chart.table.headers) ||
      !Array.isArray(chart.table.rows)
    )
      throw new RendererValidationError("Chart table is invalid");
    if (chart.table.rows.length !== chart.categories.length)
      throw new RendererValidationError(
        "Chart table rows do not match categories",
      );
    chart.table.headers.forEach((header, index) =>
      assertLabel(header, `table header ${index}`),
    );
    chart.table.rows.forEach((row, rowIndex) => {
      if (row.length !== chart.table.headers.length)
        throw new RendererValidationError(
          `Table row ${rowIndex} has the wrong width`,
        );
      (row as readonly unknown[]).forEach((cell, cellIndex) => {
        if (
          cell !== null &&
          typeof cell !== "string" &&
          (typeof cell !== "number" || !Number.isSafeInteger(cell))
        )
          throw new RendererValidationError(
            `Table cell ${rowIndex}:${cellIndex} is invalid`,
          );
      });
    });
  }
  return charts;
}

export function chartSemantics(chart: ChartViewModelV1): RendererSemantic {
  return {
    type:
      chart.kind === "line"
        ? "line"
        : chart.kind === "scatter"
          ? "scatter"
          : "bar",
    categories: [...chart.categories],
    series: chart.series.map(({ name, values }) => ({
      name,
      values: [...values],
    })),
  };
}

export function renderChartSemantics(
  charts: readonly ChartViewModelV1[],
): readonly RendererSemantic[] {
  return validateChartViewModels(charts).map(chartSemantics);
}

function chartOption(chart: ChartViewModelV1): echarts.EChartsOption {
  const isScatter = chart.kind === "scatter";
  return {
    animation: false,
    title: { text: chart.title, subtext: chart.description },
    tooltip: { show: false },
    xAxis: isScatter
      ? { type: "value", name: chart.series[0]?.name ?? "" }
      : { type: "category", data: [...chart.categories] },
    yAxis: {
      type: "value",
      ...(isScatter ? { name: chart.series[1]?.name ?? "" } : {}),
    },
    series: isScatter
      ? [
          {
            name: chart.series[0]?.name ?? "",
            type: "scatter",
            symbolSize: 5,
            data: chart.categories.map((category, index) => ({
              name: category,
              value: [
                chart.series[0]?.values[index] ?? null,
                chart.series[1]?.values[index] ?? null,
              ],
            })),
          },
        ]
      : chart.series.map((series) => ({
          name: series.name,
          type: chart.kind === "line" ? "line" : "bar",
          data: [...series.values],
          itemStyle: { color: COLORS[series.color] },
          lineStyle: { color: COLORS[series.color] },
        })),
  };
}

function renderSvg(chart: ChartViewModelV1): string {
  const instance = echarts.init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 640,
    height: 280,
  });
  try {
    instance.setOption(chartOption(chart));
    return instance.renderToSVGString();
  } finally {
    instance.dispose();
  }
}

function renderTable(chart: ChartViewModelV1): string {
  const headers = chart.table.headers
    .map((header) => `<th scope="col">${escapeHtml(header)}</th>`)
    .join("");
  const rows = chart.table.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, index) =>
            index === 0
              ? `<th scope="row">${escapeHtml(valueText(cell))}</th>`
              : `<td>${escapeHtml(valueText(cell))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<table><caption>${escapeHtml(chart.table.caption)}</caption><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderChartHtml(chart: ChartViewModelV1): string {
  const content =
    chart.categories.length === 0
      ? `<p data-empty-state="${escapeHtml(chart.id)}">${escapeHtml(chart.emptyState)}</p>`
      : `<figure role="img" tabindex="0" aria-label="${escapeHtml(`${chart.title}: ${chart.description}`)}">${renderSvg(chart)}</figure>`;
  return `<section class="chart" data-chart-id="${escapeHtml(chart.id)}"><h2>${escapeHtml(chart.title)}</h2>${content}${renderTable(chart)}</section>`;
}

export function renderCharts(charts: readonly ChartViewModelV1[]): {
  readonly semantics: readonly RendererSemantic[];
  readonly markup: string;
} {
  const validatedCharts = validateChartViewModels(charts);
  return {
    semantics: validatedCharts.map(chartSemantics),
    markup: validatedCharts.map(renderChartHtml).join(""),
  };
}
