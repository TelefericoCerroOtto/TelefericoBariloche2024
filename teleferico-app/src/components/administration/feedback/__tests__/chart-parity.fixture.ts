import type { ChartViewModel } from "../../../../../services/survey-report-worker/poc/renderer-poc";

const longLabels = [
  "Atención excelente en la estación superior",
  "Informações claras durante todo o percurso",
];

const chart = (
  id: string,
  kind: ChartViewModel["kind"],
  title: string,
  categories: string[],
  series: ChartViewModel["series"],
): ChartViewModel => ({
  version: "chart-view-model.v1",
  id,
  kind,
  title,
  description: `${title}: datos oficiales`,
  unit: kind === "line" ? "percent" : "count",
  categories,
  series,
  annotations: ["Fuente: respuestas QR válidas"],
  emptyState: "Sin datos para el período seleccionado",
  table: {
    caption: `${title}: tabla de datos`,
    headers: ["Categoría", ...series.map((item) => item.name)],
    rows: categories.map((category, index) => [
      category,
      ...series.map((item) => item.values[index]),
    ]),
  },
});

export const chartParityFixture: ChartViewModel[] = [
  chart("stars", "bar", "Distribución de estrellas", ["1", "2", "3", "4", "5"], [
    { name: "Respuestas", values: [0, 1, 4, 12, 23], color: "positive" },
  ]),
  chart("satisfaction", "line", "Evolución de satisfacción", ["2026-09-01", "2026-09-02"], [
    { name: "Satisfacción", values: [null, 8750], color: "positive" },
  ]),
  chart("volume", "line", "Evolución del volumen", ["2026-09-01", "2026-09-02"], [
    { name: "Respuestas", values: [0, 40], color: "neutral" },
  ]),
  chart("aspects", "comparison", "Comparación de aspectos", longLabels, [
    { name: "Actual", values: [17, 11], color: "positive" },
    { name: "Anterior", values: [9, -2], color: "negative" },
  ]),
  chart("points", "scatter", "Comparación de puntos QR", Array.from({ length: 200 }, (_, index) => `P${index + 1}`), [
    { name: "Selecciones", values: Array.from({ length: 200 }, (_, index) => index), color: "neutral" },
    { name: "Negatividad", values: Array.from({ length: 200 }, (_, index) => (index * 47) % 10001), color: "negative" },
  ]),
];

export const edgeCaseFixtures = {
  empty: chart("empty", "bar", "Sin respuestas", [], []),
  oneRecord: chart("one", "bar", "Una respuesta", ["Excelente"], [
    { name: "Respuestas", values: [1], color: "positive" },
  ]),
};
