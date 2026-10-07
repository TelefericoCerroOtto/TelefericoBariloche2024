import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSnapshot } from "@teleferico/survey-reporting-core";
import { authenticatedInternalApiFetch } from "@/lib/http/clients/auth-internal-fetch";
import { projectAspects, projectQrPoints, projectSummary, type FeedbackAdminSource } from "@/lib/feedback/admin-read";
import {
  AspectsModule,
  CommentsReportsModule,
  FEEDBACK_MODULE_ORDER,
  QrModule,
  SummaryModule,
  formatSummaryChartDateTick,
  getSummaryChartTickLabels,
  getSummaryLineChartGeometry,
  default as FeedbackDashboard,
} from "./FeedbackDashboard";

vi.mock("next/dynamic", () => ({
  default: () => ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/http/clients/auth-internal-fetch", () => ({ authenticatedInternalApiFetch: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

beforeEach(() => {
  vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
    if (String(path).includes("/generations?")) {
      return Promise.resolve(Response.json({ contractVersion: "feedback-admin.v1", data: { items: [], total: 0, page: 1, pageSize: 25 }, meta: {} }));
    }
    return Promise.reject(new Error("Unexpected feedback request"));
  });
});

function snapshotFor(pointKey: string | null) {
  return createSnapshot({
  sourceRevision: "revision-u8-c",
  createdAt: "2026-09-20T12:00:00.000Z",
  dataCutoffAt: "2026-09-20T12:00:00.000Z",
  range: { from: "2026-09-11", to: "2026-09-20" },
  filters: { pointKey, versionKey: null },
  definitions: [{ aspectKey: "views", sortOrder: 1 }],
  points: [
    { pointKey: "base", displayName: "Base", sortOrder: 1 },
    { pointKey: "summit", displayName: "Summit", sortOrder: 2 },
  ],
  submissions: [
    {
      recordId: "current-four-record",
      receipt: "current-four",
      acceptedAt: "2026-09-16T12:00:00.000Z",
      source: "valid_qr",
      versionKey: "v1",
      pointKey: "summit",
      overallRating: 4,
      locale: "es",
      commentText: null,
      payloadDigest: "current-four-digest",
      aspects: [{ aspectKey: "views", label: "Views", sortOrder: 1, sentiment: "positive" }],
    },
    {
      recordId: "current-record",
      receipt: "current",
      acceptedAt: "2026-09-15T12:00:00.000Z",
      source: "valid_qr",
      versionKey: "v1",
      pointKey: "base",
      overallRating: 5,
      locale: "es",
      commentText: "Great views",
      payloadDigest: "current-digest",
      aspects: [{ aspectKey: "views", label: "Views", sortOrder: 1, sentiment: "positive" }],
    },
    {
      recordId: "previous-record",
      receipt: "previous",
      acceptedAt: "2026-09-05T12:00:00.000Z",
      source: "valid_qr",
      versionKey: "v1",
      pointKey: "base",
      overallRating: 3,
      locale: "es",
      commentText: null,
      payloadDigest: "previous-digest",
      aspects: [],
    },
  ],
  }).payload;
}

const snapshot = snapshotFor(null);

const source: FeedbackAdminSource = { snapshot, comments: [], reports: [] };
const noop = () => undefined;

describe("feedback analytics UI projections", () => {
  it("keeps the normative top-level order", () => {
    expect(FEEDBACK_MODULE_ORDER).toEqual([
      "Resumen",
      "Aspectos",
      "Puntos QR",
      "Comentarios e informes",
    ]);
  });

  it("shows relative response change and retains the absolute audit delta", () => {
    render(<SummaryModule data={projectSummary(source)} />);

    expect(screen.getByText(/^\+[\d,]+ %$/)).toBeInTheDocument();
    expect(screen.getByText("Auditoría: diferencia absoluta +1")).toHaveAttribute(
      "data-audit-absolute-delta",
      "1",
    );
    expect(screen.getByText(/^\+[\d,]+ puntos$/)).toBeInTheDocument();
    expect(screen.getAllByText(/^[+−]?[\d,]+ puntos porcentuales$/)).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Evolución de la satisfacción" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Último informe generado por IA" })).toBeInTheDocument();
  });

  it("switches the single Summary temporal chart and exposes selected values accessibly", () => {
    const data = projectSummary(source);
    const days = data.calendar.filter((item) => item.period === "current" && item.unit === "day");
    render(<SummaryModule data={data} />);

    const metricGroup = screen.getByRole("group", { name: "Métrica del gráfico" });
    const satisfactionButton = within(metricGroup).getByRole("button", { name: "Satisfacción" });
    const responsesButton = within(metricGroup).getByRole("button", { name: "Encuestas respondidas" });
    expect(screen.getByRole("heading", { name: "Evolución de la satisfacción" })).toBeInTheDocument();
    expect(satisfactionButton).toHaveAttribute("aria-pressed", "true");
    expect(responsesButton).toHaveAttribute("aria-pressed", "false");
    const satisfactionValues = screen.getByRole("list", { name: "Valores de satisfacción" });
    expect(satisfactionValues.querySelectorAll("[tabindex]")).toHaveLength(0);
    const satisfactionDay = days[0]!;
    const satisfactionValue = satisfactionDay.satisfactionRateBps === null
      ? "No disponible"
      : `${(satisfactionDay.satisfactionRateBps / 100).toFixed(1)}%`;
    expect(within(satisfactionValues).getByText(`${satisfactionDay.from}: ${satisfactionValue}; ${satisfactionDay.submissionCount} respuestas`)).toBeInTheDocument();
    expect(screen.queryByText("Consultar valores exactos del gráfico")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver datos exactos")).not.toBeInTheDocument();
    expect(satisfactionValues).toHaveClass("sr-only");
    expect(screen.getByRole("progressbar", { name: "5 estrellas" })).toHaveAttribute("aria-valuetext");

    const chartGrid = screen.getByRole("region", { name: "Evolución y distribución del período" });
    expect(chartGrid).toHaveClass("min-w-0", "w-full");
    expect(chartGrid.firstElementChild).toHaveClass("min-w-0", "w-full");
    expect(chartGrid.lastElementChild).toHaveClass("min-w-0", "w-full");

    responsesButton.focus();
    fireEvent.click(responsesButton);
    expect(responsesButton).toHaveFocus();
    expect(satisfactionButton).toHaveAttribute("aria-pressed", "false");
    expect(responsesButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Evolución de encuestas respondidas" })).toBeInTheDocument();
    const responseValues = screen.getByRole("list", { name: "Valores de encuestas respondidas" });
    expect(within(responseValues).getByText(`${days[0]!.from}: ${days[0]!.submissionCount}; ${days[0]!.submissionCount} respuestas`)).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Evolución temporal de respuestas: datos exactos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Evolución temporal de satisfacción: datos exactos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Distribución de estrellas: datos exactos" })).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "5 estrellas" })).toHaveAttribute("aria-valuetext", "50.0%; 1 respuesta");
  });

  it("switches authoritative Summary week and month buckets independently from the metric", () => {
    const data = projectSummary(source);
    const weeks = data.calendar.filter((item) => item.period === "current" && item.unit === "week");
    const months = data.calendar.filter((item) => item.period === "current" && item.unit === "month");
    const interval = (bucket: (typeof data.calendar)[number]) => bucket.unit === "day" ? bucket.from : `${bucket.from}–${bucket.to}`;
    const satisfactionText = (bucket: (typeof weeks)[number]) => bucket.satisfactionRateBps === null
      ? "No disponible"
      : `${(bucket.satisfactionRateBps / 100).toFixed(1)}%`;
    render(<SummaryModule data={data} />);

    const temporalGroup = screen.getByRole("group", { name: "Presentación temporal" });
    const dayButton = within(temporalGroup).getByRole("button", { name: "Día" });
    const weekButton = within(temporalGroup).getByRole("button", { name: "Semana" });
    const monthButton = within(temporalGroup).getByRole("button", { name: "Mes" });
    const metricGroup = screen.getByRole("group", { name: "Métrica del gráfico" });
    const satisfactionButton = within(metricGroup).getByRole("button", { name: "Satisfacción" });
    const responsesButton = within(metricGroup).getByRole("button", { name: "Encuestas respondidas" });
    expect(dayButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(weekButton);
    expect(weekButton).toHaveAttribute("aria-pressed", "true");
    expect(dayButton).toHaveAttribute("aria-pressed", "false");
    expect(satisfactionButton).toHaveAttribute("aria-pressed", "true");
    const weekValues = screen.getByRole("list", { name: "Valores de satisfacción" });
    expect(within(weekValues).getAllByRole("listitem")).toHaveLength(weeks.length);
    for (const bucket of weeks) {
      expect(within(weekValues).getByText(`${interval(bucket)}: ${satisfactionText(bucket)}; ${bucket.submissionCount} respuestas`)).toBeInTheDocument();
    }

    fireEvent.click(responsesButton);
    expect(weekButton).toHaveAttribute("aria-pressed", "true");
    expect(responsesButton).toHaveAttribute("aria-pressed", "true");
    const weeklyResponses = screen.getByRole("list", { name: "Valores de encuestas respondidas" });
    for (const bucket of weeks) {
      expect(within(weeklyResponses).getByText(`${interval(bucket)}: ${bucket.submissionCount}; ${bucket.submissionCount} respuestas`)).toBeInTheDocument();
    }

    fireEvent.click(monthButton);
    expect(monthButton).toHaveAttribute("aria-pressed", "true");
    expect(responsesButton).toHaveAttribute("aria-pressed", "true");
    const monthlyResponses = screen.getByRole("list", { name: "Valores de encuestas respondidas" });
    expect(within(monthlyResponses).getAllByRole("listitem")).toHaveLength(months.length);
    for (const bucket of months) {
      expect(within(monthlyResponses).getByText(`${interval(bucket)}: ${bucket.submissionCount}; ${bucket.submissionCount} respuestas`)).toBeInTheDocument();
    }
  });

  it("keeps null satisfaction unavailable while displaying zero response counts for a selected bucket", () => {
    const summary = projectSummary(source);
    const week = summary.calendar.find((item) => item.period === "current" && item.unit === "week")!;
    const data = {
      ...summary,
      calendar: summary.calendar.map((item) => item === week
        ? { ...item, satisfactionRateBps: null, submissionCount: 0 }
        : item),
    };
    render(<SummaryModule data={data} />);

    const weekButton = screen.getByRole("button", { name: "Semana" });
    fireEvent.click(weekButton);
    expect(screen.getByRole("list", { name: "Valores de satisfacción" })).toHaveTextContent(`${week.from}–${week.to}: No disponible`);
    fireEvent.click(screen.getByRole("button", { name: "Encuestas respondidas" }));
    expect(weekButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("list", { name: "Valores de encuestas respondidas" })).toHaveTextContent(`${week.from}–${week.to}: 0`);
  });

  it("pads Summary chart boundaries while keeping axis ticks inside metric ranges", () => {
    const satisfaction = getSummaryLineChartGeometry([
      { label: "first", primary: 0 },
      { label: "last", primary: 10_000 },
    ], "percent");
    expect(satisfaction.xAxisPadding).toEqual({ left: 12, right: 12 });
    expect(satisfaction.yAxisDomain[0]).toBeLessThan(0);
    expect(satisfaction.yAxisDomain[1]).toBeGreaterThan(10_000);
    expect(satisfaction.yAxisTicks).toEqual([0, 2_500, 5_000, 7_500, 10_000]);
    expect(satisfaction.yAxisTicks.every((tick) => tick >= 0 && tick <= 10_000)).toBe(true);

    const responses = getSummaryLineChartGeometry([
      { label: "first", primary: 0 },
      { label: "last", primary: 80 },
    ], "count");
    expect(responses.xAxisPadding).toEqual({ left: 12, right: 12 });
    expect(responses.yAxisDomain[0]).toBeLessThan(0);
    expect(responses.yAxisDomain[1]).toBeGreaterThan(80);
    expect(responses.yAxisTicks[0]).toBe(0);
    expect(responses.yAxisTicks.at(-1)).toBe(80);
    expect(responses.yAxisTicks.every((tick) => tick >= 0 && tick <= 80)).toBe(true);
    expect(responses.yAxisTicks.every(Number.isInteger)).toBe(true);
  });

  it("formats Summary axis dates compactly in es-AR across days and month boundaries", () => {
    expect(formatSummaryChartDateTick("2026-06-01", "day")).toBe("1 jun");
    expect(formatSummaryChartDateTick("2026-05-31–2026-06-06", "week")).toBe("31 may–6 jun");
    expect(formatSummaryChartDateTick("2026-06-01–2026-06-30", "month")).toBe("1 jun–30 jun");
    expect(formatSummaryChartDateTick("Not a date", "day")).toBe("Not a date");
  });

  it("chooses readable Summary satisfaction ticks for sparse high and boundary values", () => {
    const high = getSummaryLineChartGeometry([
      { label: "first", primary: 8_400 },
      { label: "last", primary: 9_800 },
    ], "percent");
    expect(high.yAxisTicks).toEqual([7_000, 8_000, 9_000, 10_000]);

    const constantHigh = getSummaryLineChartGeometry([
      { label: "first", primary: 10_000 },
      { label: "last", primary: 10_000 },
    ], "percent");
    expect(constantHigh.yAxisTicks).toEqual([7_000, 8_000, 9_000, 10_000]);
    expect(constantHigh.yAxisDomain[1]).toBeGreaterThan(10_000);
    expect(constantHigh.yAxisDomain[1]).toBeLessThanOrEqual(10_500);
    expect(constantHigh.yAxisDomain[0]).toBeGreaterThanOrEqual(6_500);

    const constantZero = getSummaryLineChartGeometry([
      { label: "first", primary: 0 },
      { label: "last", primary: 0 },
    ], "percent");
    expect(constantZero.yAxisTicks).toEqual([0, 1_000]);
    expect(constantZero.yAxisDomain[0]).toBeLessThan(0);
    expect(constantZero.yAxisDomain[0]).toBeGreaterThanOrEqual(-500);

    const unavailable = getSummaryLineChartGeometry([
      { label: "first", primary: null },
      { label: "last", primary: null },
    ], "percent");
    expect(unavailable.yAxisTicks).toEqual([0, 2_500, 5_000, 7_500, 10_000]);

    const extremes = getSummaryLineChartGeometry([
      { label: "zero", primary: 0 },
      { label: "full", primary: 10_000 },
    ], "percent");
    expect(extremes.yAxisTicks).toEqual([0, 2_500, 5_000, 7_500, 10_000]);
    expect(extremes.yAxisDomain[0]).toBeLessThan(0);
    expect(extremes.yAxisDomain[1]).toBeGreaterThan(10_000);
  });

  it("selects at most five evenly distributed Summary date ticks without changing exact values", () => {
    const labels = Array.from({ length: 30 }, (_, index) => `2026-06-${String(index + 1).padStart(2, "0")}`);
    const selected = getSummaryChartTickLabels(labels);

    expect(selected).toHaveLength(5);
    expect(selected[0]).toBe(labels[0]);
    expect(selected.at(-1)).toBe(labels.at(-1));
    expect(selected[2]).toBe(labels[15]);
    expect(getSummaryChartTickLabels(labels.slice(0, 4))).toEqual(labels.slice(0, 4));
  });

  it("shows the selected Summary period in its chart caption and a truthful status strip", () => {
    const summary = projectSummary(source);
    render(<SummaryModule data={summary} period={{ from: "2026-09-11", to: "2026-09-20" }} />);

    const periodFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    const caption = screen.getByText(`Tiempo · ${periodFormat.format(new Date("2026-09-11T00:00:00Z"))}–${periodFormat.format(new Date("2026-09-20T00:00:00Z"))} · Satisfacción (%)`);
    expect(caption).toBeInTheDocument();
    expect(screen.getByText("Los puntos representan intervalos con datos disponibles; los intervalos sin datos se conservan sin conectar.")).toBeInTheDocument();
    const metricGroup = screen.getByRole("group", { name: "Métrica del gráfico" });
    expect(within(metricGroup).getByRole("button", { name: "Satisfacción" })).toHaveClass("aria-pressed:border-primary", "aria-pressed:bg-white");
    const temporalGroup = screen.getByRole("group", { name: "Presentación temporal" });
    expect(within(temporalGroup).getByRole("button", { name: "Día" })).toHaveClass("rounded-full");
    expect(screen.queryByText(/Tab.*puntos/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /datos exactos/i })).not.toBeInTheDocument();
  });

  it("renders the Summary KPI introduction, copy, order, and responsive layout", () => {
    const summary = projectSummary(source);
    render(<SummaryModule data={summary} />);

    const kpis = screen.getByRole("region", { name: "Indicadores del período" });
    const intro = within(kpis).getByText("Los valores mostrados corresponden al período elegido.");
    expect(intro).toBeInTheDocument();
    const cards = within(kpis).getAllByRole("article");
    expect(cards).toHaveLength(4);
    expect(intro.compareDocumentPosition(cards[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cards.map((card) => card.querySelector("p")?.textContent)).toEqual([
      "Respuestas recibidas",
      "Valoración general",
      "Índice de satisfacción",
      "Experiencias negativas",
    ]);
    expect(within(kpis).getByText("Cuenta todas las encuestas recibidas; un aumento significa mayor participación.")).toBeInTheDocument();
    expect(within(kpis).getByText("Es el promedio de todas las valoraciones, de 1 a 5 estrellas; más alto es mejor.")).toBeInTheDocument();
    expect(within(kpis).getByText("Porcentaje de respuestas con 4 o 5 estrellas; más alto es mejor.")).toBeInTheDocument();
    expect(within(kpis).getByText("Porcentaje de respuestas con 1 o 2 estrellas; más bajo es mejor.")).toBeInTheDocument();

    const countFormat = new Intl.NumberFormat("es-AR");
    const decimalFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
    const oneDecimalFormat = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const signed = (value: number, formatter: Intl.NumberFormat) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatter.format(Math.abs(value))}`;
    expect(within(cards[0]!).getByText(countFormat.format(summary.current.submissionCount))).toBeInTheDocument();
    expect(within(cards[1]!).getByText(`${oneDecimalFormat.format(summary.current.averageMilliStars! / 1000)} ★`)).toBeInTheDocument();
    expect(within(cards[2]!).getByText(`${decimalFormat.format(summary.current.satisfied.rateBps! / 100)} %`)).toBeInTheDocument();
    expect(within(cards[0]!).getByText(`${signed(summary.deltas.submissionPercentBps! / 100, decimalFormat)} %`)).toBeInTheDocument();
    expect(within(cards[1]!).getByText(`${signed(summary.deltas.averageMilliStars! / 1000, decimalFormat)} puntos`)).toBeInTheDocument();
    expect(within(cards[2]!).getByText(`${signed(summary.deltas.satisfiedRateBps! / 100, decimalFormat)} puntos porcentuales`)).toBeInTheDocument();
    expect(kpis.querySelector(":scope > div")).toHaveClass(
      "grid-cols-1",
      "min-[421px]:grid-cols-2",
      "min-[901px]:grid-cols-4",
    );
  });

  it("presents Summary evolution and live star distribution in a responsive two-column layout", () => {
    const summary = projectSummary(source);
    render(<SummaryModule data={summary} />);

    expect(screen.getByRole("region", { name: "Evolución y distribución del período" })).toHaveClass(
      "grid",
      "w-full",
      "min-w-0",
      "min-[1051px]:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)]",
    );
    expect(screen.getByText(/Porcentaje de respuestas satisfechas a lo largo del tiempo/)).toBeInTheDocument();
    expect(screen.getByText("Porcentaje de respuestas satisfechas a lo largo del tiempo.")).toBeInTheDocument();
    expect(screen.queryByText(/Cada punto muestra la fecha/)).not.toBeInTheDocument();
    const distribution = screen.getByRole("list", { name: "Distribución de estrellas" });
    const rows = within(distribution).getAllByRole("listitem");
    expect(rows.map((row) => row.querySelector('[aria-hidden="true"]')?.textContent)).toEqual(["5 ★", "4 ★", "3 ★", "2 ★", "1 ★"]);
    expect(rows.map((row) => within(row).getByText(/^[1-5] estrellas?$/, { selector: ".sr-only" }).textContent)).toEqual([
      "5 estrellas", "4 estrellas", "3 estrellas", "2 estrellas", "1 estrella",
    ]);
    const fiveStars = rows[0]!;
    const fiveStarValue = summary.current.starDistribution.find((item) => item.star === 5)!;
    const responseCopy = fiveStarValue.count === 1 ? "1 respuesta" : `${fiveStarValue.count} respuestas`;
    expect(fiveStars).toHaveTextContent(responseCopy);
    expect(fiveStars).toHaveTextContent(`${(fiveStarValue.rateBps! / 100).toFixed(1)}%`);
    expect(within(fiveStars).getByRole("progressbar", { name: "5 estrellas" })).toHaveAttribute(
      "aria-valuenow",
      String(fiveStarValue.count),
    );
    expect(within(fiveStars).getByRole("progressbar", { name: "5 estrellas" })).toHaveAttribute(
      "aria-valuetext",
      `${(fiveStarValue.rateBps! / 100).toFixed(1)}%; ${responseCopy}`,
    );
    expect(within(rows[4]!).getByRole("progressbar", { name: "1 estrella" })).toBeInTheDocument();
    const chartCard = screen.getByRole("heading", { name: "Evolución de la satisfacción" }).closest("section")!;
    expect(screen.queryByText("Consultar valores exactos del gráfico")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver datos exactos")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Distribución de estrellas: datos exactos" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Valores de satisfacción" })).toHaveClass("sr-only");
    expect(chartCard).toHaveClass("h-full");
    expect(screen.getByRole("heading", { name: "Distribución de estrellas" }).closest("section")).toHaveClass("h-full", "w-full", "min-w-0");
  });

  it("uses singular response copy for a one-star Summary count", () => {
    const summary = projectSummary(source);
    const oneResponse = {
      ...summary,
      current: {
        ...summary.current,
        submissionCount: 3,
        starDistribution: summary.current.starDistribution.map((item) => item.star === 1
          ? { ...item, count: 1, rateBps: 3_333 }
          : item),
      },
    };
    render(<SummaryModule data={oneResponse} />);

    const oneStarRow = within(screen.getByRole("list", { name: "Distribución de estrellas" })).getAllByRole("listitem")[4]!;
    expect(oneStarRow).toHaveTextContent("1 ★");
    expect(oneStarRow).toHaveTextContent("33.3% · 1 respuesta");
    const progressbar = within(oneStarRow).getByRole("progressbar", { name: "1 estrella" });
    expect(progressbar).toHaveAttribute("aria-valuenow", "1");
    expect(progressbar).toHaveAttribute("aria-valuemax", "3");
    expect(progressbar).toHaveAttribute("aria-valuetext", "33.3%; 1 respuesta");
  });

  it("uses 8px neutral Summary panels without changing shared panels in Aspects", () => {
    const summary = projectSummary(source);
    const view = render(<SummaryModule data={summary} />);
    const summaryPanel = screen.getByRole("heading", { name: "Distribución de estrellas" }).closest("section")!;
    expect(summaryPanel).toHaveClass("rounded-[8px]", "border-[#e3e3e5]", "bg-white", "shadow-none");

    view.rerender(<AspectsModule data={projectAspects(source)} selectedKey="views" onSelect={noop} />);
    const sharedPanel = screen.getByRole("heading", { name: "Detalle del aspecto seleccionado" }).closest("section")!;
    expect(sharedPanel).toHaveClass("border-red-500/15", "shadow-sm");
    expect(sharedPanel).not.toHaveClass("rounded-[8px]");
  });

  it("keeps selected response values accessible without an exact-values disclosure", () => {
    const summary = projectSummary(source);
    render(<SummaryModule data={summary} />);

    fireEvent.click(screen.getByRole("button", { name: "Encuestas respondidas" }));
    expect(screen.getByText("Cantidad de encuestas recibidas en cada intervalo.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Valores de encuestas respondidas" })).toHaveClass("sr-only");
    expect(screen.queryByText(/Cada punto muestra la fecha/)).not.toBeInTheDocument();
  });

  it("uses authoritative aspect counts and rates for classifications and keeps the real-report empty state", () => {
    const summary = projectSummary(source);
    const viewAspect = summary.aspects.find((item) => item.aspectKey === "views")!;
    const classified = {
      ...summary,
      strengths: ["views"],
      aspects: summary.aspects.map((item) => item.aspectKey === "views" ? {
        ...item,
        hasSufficientEvidence: true,
        selectionCount: 20,
        current: { ...item.current, total: 20, positive: { count: 15, rateBps: 7500 } },
      } : item),
    };
    const view = render(<SummaryModule data={summary} />);
    expect(screen.getAllByText("Evidencia insuficiente para clasificar fortalezas u oportunidades con este volumen de respuestas.")).toHaveLength(2);
    view.rerender(<SummaryModule data={classified} />);

    expect(screen.getByRole("heading", { name: "Fortalezas y oportunidades de mejora" })).toBeInTheDocument();
    expect(screen.getByText(/Las fortalezas son los aspectos con predominio de valoraciones positivas/)).toBeInTheDocument();
    expect(screen.getByText(viewAspect.labelVariants[0]!.label)).toBeInTheDocument();
    expect(screen.getByText("15 respuestas")).toBeInTheDocument();
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("No se identificaron aspectos con predominio negativo en este período.")).toBeInTheDocument();
    expect(screen.getByText("No hay un informe exitoso disponible para este período.")).toBeInTheDocument();
  });

  it("shows only persisted successful report metadata and routes report actions to the existing history", () => {
    const onViewReports = vi.fn();
    const summary = {
      ...projectSummary(source),
      latestSuccessfulReport: {
        reportId: "report-1",
        reportRunId: "run-1",
        name: "Feedback report 2026-09-11–2026-09-20",
        period: { from: "2026-09-11", to: "2026-09-20" },
        status: "succeeded" as const,
        analyzedResponseCount: 2,
        analyzedCommentCount: 1,
        dataCutoffAt: "2026-09-20T12:00:00.000Z",
        createdAt: "2026-09-20T13:00:00.000Z",
        requestedBy: null,
        generatedBy: null,
        canDownload: true,
        artifactSize: 512,
        artifactSha256: "a".repeat(64),
      },
    };
    render(<SummaryModule data={summary} onViewReports={onViewReports} />);

    const report = screen.getByRole("heading", { name: "Último informe generado por IA" }).closest("section")!;
    expect(within(report).getByText(summary.latestSuccessfulReport.name)).toBeInTheDocument();
    expect(within(report).getByText("2", { selector: "dd" })).toBeInTheDocument();
    expect(within(report).getByText("1", { selector: "dd" })).toBeInTheDocument();
    expect(within(report).getByRole("button", { name: "Ver informes e historial" })).toBeInTheDocument();
    expect(within(report).queryByRole("button", { name: /Descargar/ })).not.toBeInTheDocument();
    fireEvent.click(within(report).getByRole("button", { name: "Ver informes e historial" }));
    expect(onViewReports).toHaveBeenCalledOnce();
  });

  it("explains zero and unavailable previous-period baselines without duplicate placeholders", () => {
    const summary = projectSummary(source);
    const withoutBaseline = {
      ...summary,
      previous: {
        ...summary.previous,
        submissionCount: 0,
        averageMilliStars: null,
        satisfied: { ...summary.previous.satisfied, rateBps: null },
        unfavorable: { ...summary.previous.unfavorable, rateBps: null },
      },
      deltas: {
        ...summary.deltas,
        submissionPercentBps: null,
        averageMilliStars: null,
        satisfiedRateBps: null,
        unfavorableRateBps: null,
      },
    };
    render(<SummaryModule data={withoutBaseline} />);

    const kpis = screen.getByRole("region", { name: "Indicadores del período" });
    expect(within(kpis).getByText("Sin base del período anterior.")).toBeInTheDocument();
    expect(within(kpis).getAllByText("Sin datos comparables del período anterior.")).toHaveLength(3);
    expect(within(kpis).queryByText("No disponible")).not.toBeInTheDocument();
    expect(within(kpis).getByText(/Auditoría: diferencia absoluta/)).toHaveAttribute("data-audit-absolute-delta");
  });

  it("emphasizes only an available favorable delta and omits context for a null baseline", () => {
    const summary = projectSummary(source);
    const view = render(<SummaryModule data={summary} />);
    const kpis = screen.getByRole("region", { name: "Indicadores del período" });
    const responseCard = within(kpis).getAllByRole("article")[0]!;
    const delta = within(responseCard).getByText(/^\+[\d,]+ %$/);
    const context = within(responseCard).getByText("frente al período anterior.");

    expect(delta).toHaveClass("font-bold", "text-[#045009]");
    expect(context).toHaveClass("text-[#5e6066]");
    expect(context).not.toHaveClass("font-bold", "text-[#045009]");

    view.rerender(<SummaryModule data={{ ...summary, deltas: { ...summary.deltas, submissionPercentBps: null } }} />);
    const updatedResponseCard = within(screen.getByRole("region", { name: "Indicadores del período" })).getAllByRole("article")[0]!;
    const fallback = within(updatedResponseCard).getByText("Sin base del período anterior.");
    expect(fallback).not.toHaveClass("font-bold", "text-[#045009]");
    expect(within(updatedResponseCard).queryByText("frente al período anterior.")).not.toBeInTheDocument();
  });

  it("shows the shared inclusive Summary period and keeps period editing available on every view", async () => {
    const summary = projectSummary(source);
    vi.mocked(authenticatedInternalApiFetch).mockResolvedValueOnce(Response.json({
      contractVersion: "feedback-admin.v1",
      data: summary,
      meta: { population: snapshot.population },
    }));
    render(<FeedbackDashboard />);

    const scope = await screen.findByRole("region", { name: "Período analizado" });
    expect(within(scope).getByText("Período anterior")).toBeInTheDocument();
    expect(within(scope).getByText("Los resultados se comparan con el período inmediatamente anterior de la misma cantidad de días.")).toBeInTheDocument();
    expect(within(scope).getAllByText("10 días")).toHaveLength(2);
    const changePeriod = within(scope).getByRole("button", { name: "Cambiar período" });
    expect(changePeriod).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(changePeriod);
    expect(changePeriod).toHaveAttribute("aria-expanded", "true");
    const appliedRange = new URLSearchParams(String(vi.mocked(authenticatedInternalApiFetch).mock.calls[0]?.[0]).split("?")[1]);
    expect(within(scope).getByLabelText("Desde")).toHaveValue(appliedRange.get("from"));

    fireEvent.click(screen.getByRole("button", { name: "Aspectos" }));
    expect(screen.queryByRole("button", { name: "Cambiar período" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toBeVisible();
    expect(screen.getByRole("button", { name: "Analizar período" })).toBeVisible();
  });

  it("omits the opening KPI cards from Aspects while retaining the selected aspect", () => {
    render(<AspectsModule data={projectAspects(source)} selectedKey="views" onSelect={noop} />);

    for (const label of ["Respuestas", "Calificación promedio", "Satisfacción", "Desfavorable"]) {
      expect(screen.queryByText(label, { exact: true })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Detalle del aspecto seleccionado" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Aspectos del período" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Aspecto" })).not.toBeInTheDocument();
  });

  it("shows every aspect and selects its existing detail from the point-scoped table", async () => {
    const projected = projectAspects(source);
    const first = projected.aspects[0]!;
    const noEvidence = {
      ...first,
      aspectKey: "service",
      labelVariants: first.labelVariants.map((variant) => ({ ...variant, label: "Atención" })),
      selectionCount: 0,
      selectionRateBps: 0,
      current: {
        total: 0,
        positive: { count: 0, rateBps: null },
        neutral: { count: 0, rateBps: null },
        negative: { count: 0, rateBps: null },
      },
    };
    const data = { ...projected, aspects: [first, noEvidence] };
    const onSelect = vi.fn();

    const { rerender } = render(<AspectsModule data={data} selectedKey="views" onSelect={onSelect} />);

    const table = screen.getByRole("table", { name: "Aspectos del período" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("Views");
    expect(rows[2]).toHaveTextContent("Atención");
    const firstCells = within(rows[1]!).getAllByRole("cell");
    expect(firstCells[0]?.children[0]).toHaveTextContent(String(first.selectionCount));
    expect(firstCells[0]?.children[1]).toHaveTextContent(`${(first.selectionRateBps! / 100).toFixed(1)}%`);
    expect(firstCells[1]?.children[0]).toHaveTextContent(String(first.current.positive.count));
    expect(firstCells[1]?.children[1]).toHaveTextContent(`${(first.current.positive.rateBps! / 100).toFixed(1)}%`);
    const noEvidenceCells = within(rows[2]!).getAllByRole("cell");
    expect(noEvidenceCells[0]?.children[0]).toHaveTextContent("0");
    expect(noEvidenceCells[0]?.children[1]).toHaveTextContent("0.0%");
    expect(noEvidenceCells.slice(1).every((cell) => cell.textContent?.includes("No disponible"))).toBe(true);
    expect(screen.queryByRole("combobox", { name: "Aspecto" })).not.toBeInTheDocument();

    const selectAspect = within(rows[2]!).getByRole("button", { name: "Seleccionar aspecto Atención" });
    expect(selectAspect).toHaveAttribute("aria-pressed", "false");
    selectAspect.focus();
    await act(async () => { fireEvent.click(selectAspect); });

    expect(selectAspect).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith("service");
    rerender(<AspectsModule data={data} selectedKey="service" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "Seleccionar aspecto Atención" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Atención", { selector: "strong" })).toBeInTheDocument();
  });

  it("renders authoritative matrix and five-star exact tables", () => {
    const aspectData = projectAspects(source);
    const matrixData: typeof aspectData = { ...aspectData, matrix: [{ aspectKey: "views", xSelectionCount: 8, yNegativeRateBps: 4000, medianSelectionCountTimesTwo: 16, medianNegativeRateBpsTimesTwo: 8000, state: "classified", quadrant: "strength" }, { aspectKey: "other", xSelectionCount: 16, yNegativeRateBps: 8000, medianSelectionCountTimesTwo: 16, medianNegativeRateBpsTimesTwo: 8000, state: "excluded", quadrant: null }] };
    render(<AspectsModule data={matrixData} selectedKey="views" onSelect={noop} />);
    expect(screen.getByRole("img", { name: "Matriz de prioridades con ejes de relevancia y negatividad" })).not.toHaveAttribute("aria-hidden");
    expect(screen.getByTestId("matrix-point-views")).toHaveStyle({ left: "50%", bottom: "40%" });
    expect(screen.getByTestId("matrix-x-median")).toHaveStyle({ left: "50%" });
    expect(screen.getByTestId("matrix-y-median")).toHaveStyle({ bottom: "40%" });
    expect(screen.getByRole("table", { name: "Datos exactos de la matriz de prioridades" })).toBeInTheDocument();
    expect(screen.getByText("Prioridad")).toBeInTheDocument();
    expect(screen.getByText(/X = 8/)).toBeInTheDocument();
    expect(screen.getAllByRole("status")[1]).toHaveTextContent("Aspecto seleccionado: Views");
    expect(screen.getByRole("table", { name: "Asociación exacta con cinco estrellas" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Otras calificaciones (1–4)" })).toBeInTheDocument();
    expect(screen.getByText("0.0 pp")).toBeInTheDocument();
  });

  it("focuses an announced invalid period and preserves global feedback navigation", () => {
    vi.mocked(authenticatedInternalApiFetch).mockImplementation(() => new Promise<Response>(() => undefined));
    render(<FeedbackDashboard />);
    const skipLink = screen.getByRole("link", { name: "Saltar al contenido de Feedback del público" });
    const tabs = screen.getByRole("navigation", { name: "Módulos de Feedback del público" });
    const pageHeader = screen.getByRole("heading", { level: 1, name: "Feedback del público" }).closest("header")!;
    fireEvent.click(screen.getByRole("button", { name: "Cambiar período" }));
    const periodForm = screen.getByRole("button", { name: "Analizar período" }).closest("form")!;
    const content = screen.getByRole("region", { name: "Contenido de Feedback del público" });
    const moduleButtons = within(tabs).getAllByRole("button");
    expect(skipLink.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tabs.compareDocumentPosition(pageHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pageHeader.compareDocumentPosition(periodForm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(periodForm.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tabs).toHaveClass("h-[53px]", "overflow-x-auto", "border-b", "bg-transparent");
    expect(tabs).not.toHaveClass("rounded-xl", "border", "bg-background");
    expect(moduleButtons.map((button) => button.textContent)).toEqual(FEEDBACK_MODULE_ORDER);
    expect(moduleButtons[0]).toHaveAttribute("aria-current", "page");
    expect(moduleButtons.every((button) => button.getAttribute("type") === "button")).toBe(true);
    expect(moduleButtons[0]).toHaveClass("!bg-transparent", "!rounded-none", "!text-primary", "after:absolute", "after:h-0.5", "after:bg-primary");
    expect(moduleButtons[1]).toHaveClass("!bg-transparent", "!rounded-none", "!text-foreground/60", "after:bg-transparent");
    expect(screen.getByRole("button", { name: "Analizar período" })).toHaveAttribute("type", "submit");

    fireEvent.click(moduleButtons[1]!);
    expect(moduleButtons[1]).toHaveAttribute("aria-current", "page");
    expect(moduleButtons[1]).toHaveClass("!text-primary", "after:bg-primary");
    expect(moduleButtons[0]).not.toHaveClass("!text-primary", "after:bg-primary");
    expect(moduleButtons[0]).toHaveClass("after:bg-transparent");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar período" }));
    const error = screen.getByRole("alert");
    expect(error).toHaveFocus();
    expect(screen.getByLabelText("Desde")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Desde")).toHaveAttribute("aria-describedby", error.id);
    expect(screen.getByRole("heading", { level: 1, name: "Feedback del público" })).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#feedback-dashboard-main");
    expect(document.querySelector("#feedback-dashboard-main")).toBeInTheDocument();
  });

  it("announces read failures and retries", async () => {
    vi.mocked(authenticatedInternalApiFetch).mockRejectedValue(new Error("unavailable"));
    render(<FeedbackDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("no está disponible temporalmente");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(2));
  });

  it("retries the active Aspects and QR requests without changing filters", async () => {
    const summaryData = projectSummary(source);
    const aspectsData = projectAspects(source);
    const qrData = projectQrPoints(source, { route: "qr-comparison", from: "2026-09-11", to: "2026-09-20", pointKeys: ["base", "summit"] });
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: { filters: { from: "2026-09-11", to: "2026-09-20" }, population: snapshot.population } }), { status: 200, headers: { "content-type": "application/json" } });
    vi.mocked(authenticatedInternalApiFetch)
      .mockResolvedValueOnce(envelope(summaryData))
      .mockRejectedValueOnce(new Error("aspects unavailable"))
      .mockResolvedValueOnce(envelope(aspectsData))
      .mockRejectedValueOnce(new Error("qr unavailable"))
      .mockResolvedValueOnce(envelope(qrData));
    render(<FeedbackDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Aspectos" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole("button", { name: "Puntos QR" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(5));
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls[2]?.[0]).toContain("/api/admin/feedback/aspects");
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls[4]?.[0]).toContain("/api/admin/feedback/qr-points");
    const initialPeriod = new URLSearchParams(String(vi.mocked(authenticatedInternalApiFetch).mock.calls[0]?.[0]).split("?")[1]);
    const retriedPeriod = new URLSearchParams(String(vi.mocked(authenticatedInternalApiFetch).mock.calls[4]?.[0]).split("?")[1]);
    expect(retriedPeriod.get("from")).toBe(initialPeriod.get("from"));
    expect(retriedPeriod.get("to")).toBe(initialPeriod.get("to"));
  });

  it("keeps the QR-point filter scoped to the Aspects request and returned rows", async () => {
    const summaryData = projectSummary(source);
    const allAspects = projectAspects(source);
    const summitAspects = projectAspects({ ...source, snapshot: snapshotFor("summit") });
    const envelope = (data: unknown) => Response.json({ contractVersion: "feedback-admin.v1", data, meta: { population: snapshot.population } });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      const url = String(path);
      if (url.includes("/aspects?")) return Promise.resolve(envelope(url.includes("pointKey=summit") ? summitAspects : allAspects));
      return Promise.resolve(envelope(summaryData));
    });

    render(<FeedbackDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Aspectos" }));
    expect(await screen.findByRole("table", { name: "Aspectos del período" })).toBeInTheDocument();
    const pointFilter = screen.getByRole("combobox", { name: "Punto QR" });
    fireEvent.change(pointFilter, { target: { value: "summit" } });

    await waitFor(() => {
      expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.some(([path]) => String(path).includes("/api/admin/feedback/aspects?") && new URLSearchParams(String(path).split("?")[1]).get("pointKey") === "summit")).toBe(true);
    });
    const filteredTable = await screen.findByRole("table", { name: "Aspectos del período" });
    expect(within(filteredTable).getAllByRole("row")[1]).toHaveTextContent(String(summitAspects.aspects[0]!.selectionCount));
  });

  it("refreshes Summary metadata before new-period Aspects data", async () => {
    const summaryData = projectSummary(source);
    const aspectsData = projectAspects(source);
    const nextPoint = { ...summaryData.availablePoints[0], pointKey: "valley", displayName: "Valley" };
    const nextSummaryData = { ...summaryData, availablePoints: [nextPoint] };
    const nextAspectsData = {
      ...aspectsData,
      aspects: aspectsData.aspects.map((item) => ({ ...item, labelVariants: [{ label: "New views" }] })),
    };
    const nextPopulation = { ...snapshot.population, current: { ...snapshot.population.current, from: "2026-10-01", to: "2026-10-10" } };
    const envelope = (data: unknown, population = snapshot.population) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: { filters: { from: population.current.from, to: population.current.to }, population } }), { status: 200, headers: { "content-type": "application/json" } });
    vi.mocked(authenticatedInternalApiFetch)
      .mockResolvedValueOnce(envelope(summaryData))
      .mockResolvedValueOnce(envelope(aspectsData))
      .mockResolvedValueOnce(envelope(nextSummaryData, nextPopulation))
      .mockResolvedValueOnce(envelope(nextAspectsData, nextPopulation));

    render(<FeedbackDashboard />);
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Aspectos" }));
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar período" }));
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(4));

    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls[2]?.[0]).toBe("/api/admin/feedback/summary?from=2026-10-01&to=2026-10-10");
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls[3]?.[0]).toBe("/api/admin/feedback/aspects?from=2026-10-01&to=2026-10-10");
    expect(screen.getByText("Analizado: 2026-10-01–2026-10-10 · Anterior: 2026-09-01–2026-09-10")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Valley" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seleccionar aspecto New views" })).toBeInTheDocument();
  });

  it("refreshes Summary metadata and QR options before new-period QR data", async () => {
    const summaryData = projectSummary(source);
    const qrData = projectQrPoints(source, { route: "qr-comparison", from: "2026-09-11", to: "2026-09-20", pointKeys: ["base", "summit"] });
    const nextPoint = { ...summaryData.availablePoints[0], pointKey: "valley", displayName: "Valley" };
    const nextSummaryData = { ...summaryData, availablePoints: [nextPoint] };
    const nextQrData = { ...qrData, points: [nextPoint] };
    const nextPopulation = { ...snapshot.population, current: { ...snapshot.population.current, from: "2026-10-01", to: "2026-10-10" } };
    const envelope = (data: unknown, population = snapshot.population) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: { filters: { from: population.current.from, to: population.current.to }, population } }), { status: 200, headers: { "content-type": "application/json" } });
    vi.mocked(authenticatedInternalApiFetch)
      .mockResolvedValueOnce(envelope(summaryData))
      .mockResolvedValueOnce(envelope(qrData))
      .mockResolvedValueOnce(envelope(nextSummaryData, nextPopulation))
      .mockResolvedValueOnce(envelope(nextQrData, nextPopulation));

    render(<FeedbackDashboard />);
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Puntos QR" }));
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar período" }));
    await waitFor(() => expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(4));

    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls[2]?.[0]).toBe("/api/admin/feedback/summary?from=2026-10-01&to=2026-10-10");
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls[3]?.[0]).toBe("/api/admin/feedback/qr-points?from=2026-10-01&to=2026-10-10&view=comparison&pointKeys=valley");
    expect(screen.getByText("Analizado: 2026-10-01–2026-10-10 · Anterior: 2026-09-01–2026-09-10")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Valley" })).toBeChecked();
    expect(screen.getAllByRole("columnheader", { name: "Valley" })).toHaveLength(2);
  });

  it("keeps temporal evolution out of comparison and in point detail", () => {
    const onMode = vi.fn();
    const comparison = {
      ...projectQrPoints(source, {
        route: "qr-comparison",
        from: "2026-09-11",
        to: "2026-09-20",
        pointKeys: ["base", "summit"],
      }),
      view: "comparison" as const,
    };
    const view = render(
      <QrModule data={comparison} options={snapshot.metrics.qrPoints} mode="comparison" onMode={onMode} selectedKeys={["base", "summit"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );
    expect(screen.queryByRole("heading", { name: "Evolución temporal del punto QR" })).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Datos exactos de comparación por punto QR" })).toBeInTheDocument();
    const comparisonTab = screen.getByRole("tab", { name: "Comparación" });
    const detailTab = screen.getByRole("tab", { name: "Detalle" });
    expect(comparisonTab).toHaveAttribute("aria-controls", "qr-panel-comparison");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "qr-tab-comparison");
    fireEvent.keyDown(comparisonTab, { key: "ArrowRight" });
    expect(onMode).toHaveBeenCalledWith("detail");
    expect(detailTab).toHaveFocus();

    const detail = {
      ...projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" }),
      view: "detail" as const,
    };
    view.rerender(
      <QrModule data={detail} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base", "summit"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );
    expect(screen.getByRole("heading", { name: "Evolución temporal" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Datos exactos de Base" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Ver datos exactos"));
    expect(screen.getByRole("table", { name: "Datos exactos de evolución temporal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir aspectos filtrados por punto" })).toBeInTheDocument();
  });

  it("frames QR comparison with a selected-points surface and compact point summaries", () => {
    const onToggle = vi.fn();
    const comparison = {
      ...projectQrPoints(source, {
        route: "qr-comparison",
        from: "2026-09-11",
        to: "2026-09-20",
        pointKeys: ["base", "summit"],
      }),
      view: "comparison" as const,
    };

    const { rerender } = render(
      <QrModule data={comparison} options={snapshot.metrics.qrPoints} mode="comparison" onMode={noop} selectedKeys={["base", "summit"]} onToggle={onToggle} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    const selection = screen.getByRole("region", { name: "Puntos seleccionados para comparar" });
    expect(screen.getByText("Revisá los indicadores del período para los puntos seleccionados. La tabla conserva los valores exactos.")).toBeInTheDocument();
    expect(within(selection).getByText("2 puntos seleccionados")).toBeInTheDocument();
    expect(within(selection).getByRole("checkbox", { name: "Base" })).toBeChecked();
    expect(within(selection).getByRole("checkbox", { name: "Summit" })).toBeChecked();
    fireEvent.click(within(selection).getByRole("checkbox", { name: "Base" }));
    expect(onToggle).toHaveBeenCalledWith("base");

    const summaries = screen.getByRole("region", { name: "Resumen por punto QR" });
    expect(summaries.querySelectorAll(":scope > article")).toHaveLength(2);
    expect(summaries).toHaveClass("md:grid-cols-2", "xl:grid-cols-2");
    expect(screen.getByRole("table", { name: "Datos exactos de comparación por punto QR" })).toBeInTheDocument();

    rerender(
      <QrModule data={comparison} options={snapshot.metrics.qrPoints} mode="comparison" onMode={noop} selectedKeys={["base"]} onToggle={onToggle} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );
    expect(screen.getByRole("checkbox", { name: "Base" })).toBeDisabled();
  });

  it("frames QR point detail with a scoped selector, period metrics, grouped charts, and Aspectos action", () => {
    const detail = {
      ...projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" }),
      view: "detail" as const,
    };
    const onDetail = vi.fn();
    const onOpenAspects = vi.fn();

    render(
      <QrModule data={detail} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base"]} onToggle={noop} detailKey="base" onDetail={onDetail} onOpenAspects={onOpenAspects} />,
    );

    expect(screen.getByRole("heading", { name: "Detalle del punto QR" })).toBeInTheDocument();
    expect(screen.getByText("Consultá los indicadores y la evolución de respuestas del punto seleccionado.")).toBeInTheDocument();
    const selector = screen.getByRole("region", { name: "Punto QR analizado" });
    expect(within(selector).getByText("El período y los indicadores corresponden al punto seleccionado.")).toBeInTheDocument();
    fireEvent.change(within(selector).getByLabelText("Punto"), { target: { value: "summit" } });
    expect(onDetail).toHaveBeenCalledWith("summit");

    const indicators = screen.getByRole("region", { name: "Indicadores del punto QR" });
    expect(within(indicators).getAllByRole("article")).toHaveLength(4);
    expect(within(indicators).getAllByText(/^Anterior:/)).toHaveLength(4);

    const temporalContext = screen.getByRole("group", { name: "Contexto del intervalo seleccionado" });
    const currentDay = detail.calendar.find((item) => item.period === "current" && item.unit === "day")!;
    const previousDay = detail.calendar.find((item) => item.period === "previous" && item.unit === "day")!;
    expect(within(temporalContext).getByText(`${currentDay.from}–${currentDay.to}`)).toBeInTheDocument();
    expect(within(temporalContext).getByText(`${previousDay.from}–${previousDay.to}`)).toBeInTheDocument();
    expect(within(temporalContext).getAllByText("Satisfacción: Sin datos")).toHaveLength(2);

    const trends = screen.getByRole("region", { name: "Tendencias del punto QR" });
    expect(within(trends).getByRole("heading", { name: "Distribución de estrellas" })).toBeInTheDocument();
    expect(within(trends).getByRole("heading", { name: "Evolución temporal" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Datos exactos de Base" })).not.toBeInTheDocument();
    const exactData = screen.getByText("Ver datos exactos");
    expect(exactData.tagName).toBe("SUMMARY");
    expect(exactData.closest("details")).not.toHaveProperty("open", true);
    fireEvent.click(exactData);
    expect(within(trends).getByRole("table", { name: "Datos exactos de evolución temporal" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir aspectos filtrados por punto" }));
    expect(onOpenAspects).toHaveBeenCalledOnce();
  });

  it("renders QR detail metrics before five-to-one star counts and shares", () => {
    const detail = {
      ...projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" }),
      view: "detail" as const,
    };
    render(
      <QrModule data={detail} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    const selector = screen.getByRole("region", { name: "Punto QR analizado" });
    const indicators = screen.getByRole("region", { name: "Indicadores del punto QR" });
    const cards = within(indicators).getAllByRole("article");
    expect(cards.map((card) => within(card).getByRole("heading").textContent)).toEqual([
      "Respuestas recibidas",
      "Calificación promedio",
      "Satisfechos (4–5 estrellas)",
      "Negativos (1–2 estrellas)",
    ]);
    expect(selector.compareDocumentPosition(indicators) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    const point = detail.points[0]!;
    expect(cards[0]).toHaveTextContent(String(point.current.submissionCount));
    expect(cards[0]).toHaveTextContent(`Anterior: ${point.previous.submissionCount}`);
    expect(cards[1]).toHaveTextContent("5,0 ★");
    expect(cards[1]).toHaveTextContent("Anterior: 3,0 ★");
    expect(cards[2]).toHaveTextContent("100 %");
    expect(cards[2]).toHaveTextContent("Anterior: 0 %");
    expect(cards[3]).toHaveTextContent("0 %");

    const distribution = screen.getByRole("list", { name: "Distribución de estrellas del punto QR" });
    expect(indicators.compareDocumentPosition(distribution) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    const rows = within(distribution).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent?.match(/([1-5]) estrellas/)?.[1])).toEqual(["5", "4", "3", "2", "1"]);
    for (const [index, row] of rows.entries()) {
      const star = 5 - index;
      const value = point.current.starDistribution.find((item) => item.star === star)!;
      expect(row).toHaveTextContent(`${value.count} / ${point.current.submissionCount}`);
      expect(row).toHaveTextContent(value.rateBps === null ? "No disponible" : `${(value.rateBps / 100).toFixed(1)}%`);
      expect(within(row).getByRole("progressbar", { name: `${star} estrellas` })).toHaveAttribute("aria-valuenow", String(value.count));
    }
    expect(selector).toContainElement(screen.getByRole("combobox", { name: "Punto" }));
    expect(screen.getByRole("button", { name: "Abrir aspectos filtrados por punto" })).toBeInTheDocument();
  });

  it("keeps QR detail selection available and reports zero and unknown values honestly", () => {
    const projected = projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" });
    const detail = {
      ...projected,
      view: "detail" as const,
      points: projected.points.map((point) => ({
        ...point,
        current: {
          ...point.current,
          submissionCount: 0,
          averageMilliStars: null,
          satisfied: { ...point.current.satisfied, rateBps: null },
          unfavorable: { ...point.current.unfavorable, rateBps: null },
          starDistribution: point.current.starDistribution.map((item) => ({ ...item, count: 0, rateBps: null })),
        },
        previous: {
          ...point.previous,
          submissionCount: 0,
          averageMilliStars: null,
          satisfied: { ...point.previous.satisfied, rateBps: null },
          unfavorable: { ...point.previous.unfavorable, rateBps: null },
        },
      })),
    };
    const onDetail = vi.fn();
    render(
      <QrModule data={detail} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base"]} onToggle={noop} detailKey="base" onDetail={onDetail} onOpenAspects={noop} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("No hay respuestas para este punto en el período seleccionado.");
    expect(screen.getByRole("combobox", { name: "Punto" })).toBeEnabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Punto" }), { target: { value: "summit" } });
    expect(onDetail).toHaveBeenCalledWith("summit");
    const indicators = screen.getByRole("region", { name: "Indicadores del punto QR" });
    const metricCards = within(indicators).getAllByRole("article");
    for (const card of metricCards.slice(1)) {
      expect(card).toHaveTextContent("No disponible");
      expect(card).toHaveTextContent("Anterior: No disponible");
    }
    expect(screen.getByRole("button", { name: "Abrir aspectos filtrados por punto" })).toBeInTheDocument();
  });

  it("switches QR temporal metric and unit independently with aligned exact current and previous intervals", () => {
    const detail = {
      ...projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" }),
      view: "detail" as const,
    };
    render(
      <QrModule data={detail} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    expect(screen.getByRole("heading", { name: "Evolución temporal" })).toBeInTheDocument();
    const metricControls = screen.getByRole("group", { name: "Métrica temporal" });
    const unitControls = screen.getByRole("group", { name: "Intervalo temporal" });
    const satisfaction = within(metricControls).getByRole("button", { name: "Satisfacción" });
    const volume = within(metricControls).getByRole("button", { name: "Volumen" });
    const day = within(unitControls).getByRole("button", { name: "Día" });
    const week = within(unitControls).getByRole("button", { name: "Semana" });
    expect(satisfaction).toHaveAttribute("aria-pressed", "true");
    expect(day).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(volume);
    fireEvent.click(week);
    expect(volume).toHaveAttribute("aria-pressed", "true");
    expect(week).toHaveAttribute("aria-pressed", "true");
    expect(day).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(satisfaction);
    expect(satisfaction).toHaveAttribute("aria-pressed", "true");
    expect(week).toHaveAttribute("aria-pressed", "true");

    const current = detail.calendar.filter((item) => item.period === "current" && item.unit === "week");
    const previous = detail.calendar.filter((item) => item.period === "previous" && item.unit === "week");
    const table = screen.getByRole("table", { name: "Datos exactos de evolución temporal" });
    const firstInterval = within(table).getByRole("row", { name: /^Intervalo 1\s/ });
    expect(firstInterval).toHaveTextContent(`${current[0]!.from}–${current[0]!.to}`);
    expect(firstInterval).toHaveTextContent(`${previous[0]!.from}–${previous[0]!.to}`);
    expect(firstInterval).toHaveTextContent("Sin datos");

    const selectedInterval = screen.getByRole("combobox", { name: "Intervalo seleccionado" });
    fireEvent.change(selectedInterval, { target: { value: "1" } });
    const selectedCurrent = current[1]!;
    const selectedPrevious = previous[1]!;
    const context = screen.getByRole("group", { name: "Contexto del intervalo seleccionado" });
    expect(within(context).getByText(`${selectedCurrent.from}–${selectedCurrent.to}`)).toBeInTheDocument();
    expect(within(context).getByText(`${selectedPrevious.from}–${selectedPrevious.to}`)).toBeInTheDocument();
  });

  it("preserves zero volume, null satisfaction, and missing prior ordinals in QR temporal data", () => {
    const projected = projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" });
    const firstPreviousDay = projected.calendar.find((item) => item.period === "previous" && item.unit === "day")!;
    const detail = {
      ...projected,
      view: "detail" as const,
      calendar: projected.calendar.filter((item) => item.period !== "previous" || item.unit !== "day" || item.from === firstPreviousDay.from),
    };
    render(
      <QrModule data={detail} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    const day = screen.getByRole("button", { name: "Día" });
    fireEvent.click(day);
    const intervalSelect = screen.getByRole("combobox", { name: "Intervalo seleccionado" });
    fireEvent.change(intervalSelect, { target: { value: "1" } });
    const table = screen.getByRole("table", { name: "Datos exactos de evolución temporal" });
    const secondInterval = within(table).getByRole("row", { name: /^Intervalo 2\s/ });
    const currentDays = detail.calendar.filter((item) => item.period === "current" && item.unit === "day");
    const secondCurrentDay = currentDays[1]!;
    expect(secondCurrentDay.submissionCount).toBe(0);
    expect(secondInterval).toHaveTextContent("0");
    expect(secondInterval).toHaveTextContent("Sin intervalo comparable");

    fireEvent.click(screen.getByRole("button", { name: "Satisfacción" }));
    const firstInterval = within(table).getByRole("row", { name: /^Intervalo 1\s/ });
    expect(firstInterval).toHaveTextContent("Sin datos");
  });

  it("resets the selected QR temporal ordinal when the selected point changes", () => {
    const base = {
      ...projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" }),
      view: "detail" as const,
    };
    const summit = {
      ...projectQrPoints({ ...source, snapshot: snapshotFor("summit") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "summit" }),
      view: "detail" as const,
    };
    const view = render(
      <QrModule data={base} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    const intervalSelect = screen.getByRole("combobox", { name: "Intervalo seleccionado" });
    fireEvent.change(intervalSelect, { target: { value: "4" } });
    expect(intervalSelect).toHaveValue("4");
    view.rerender(
      <QrModule data={summit} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["summit"]} onToggle={noop} detailKey="summit" onDetail={noop} onOpenAspects={noop} />,
    );

    expect(screen.getByRole("combobox", { name: "Intervalo seleccionado" })).toHaveValue("0");
    const firstCurrent = summit.calendar.find((item) => item.period === "current" && item.unit === "day")!;
    const context = screen.getByRole("group", { name: "Contexto del intervalo seleccionado" });
    expect(within(context).getByText(`${firstCurrent.from}–${firstCurrent.to}`)).toBeInTheDocument();
  });

  it("uses full-width even QR tabs and balanced comparison and detail grids", () => {
    const comparison = {
      ...projectQrPoints(source, { route: "qr-comparison", from: "2026-09-11", to: "2026-09-20", pointKeys: ["base", "summit"] }),
      view: "comparison" as const,
    };
    const detail = {
      ...projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" }),
      view: "detail" as const,
    };
    const onMode = vi.fn();
    const view = render(
      <QrModule data={comparison} options={snapshot.metrics.qrPoints} mode="comparison" onMode={onMode} selectedKeys={["base", "summit"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    const tablist = screen.getByRole("tablist", { name: "Vistas de puntos QR" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tablist).toHaveClass("w-full");
    expect(tabs).toHaveLength(2);
    tabs.forEach((tab) => expect(tab).toHaveClass("flex-1", "basis-0"));
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveClass("bg-red-50");

    const pointCards = screen.getByRole("region", { name: "Resumen por punto QR" });
    expect(pointCards).toHaveClass("md:grid-cols-2", "xl:grid-cols-2");
    const comparisonKpis = pointCards.querySelector(":scope > article > div > div");
    expect(comparisonKpis).toHaveClass("sm:grid-cols-2", "xl:grid-cols-4");

    view.rerender(
      <QrModule data={detail} options={snapshot.metrics.qrPoints} mode="detail" onMode={onMode} selectedKeys={["base"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    const detailTabs = within(screen.getByRole("tablist", { name: "Vistas de puntos QR" })).getAllByRole("tab");
    expect(detailTabs).toHaveLength(2);
    detailTabs.forEach((tab) => expect(tab).toHaveClass("flex-1", "basis-0"));
    expect(detailTabs[1]).toHaveAttribute("aria-selected", "true");
    expect(detailTabs[1]).toHaveClass("bg-red-50");
    const detailKpis = screen.getByRole("region", { name: "Indicadores del punto QR" }).querySelector(":scope > div");
    expect(detailKpis).toHaveClass("sm:grid-cols-2", "xl:grid-cols-4");
    expect(screen.getByRole("region", { name: "Tendencias del punto QR" })).toHaveClass("space-y-4");
  });

  it("balances odd QR comparison card counts and keeps half-width KPIs readable", () => {
    const comparison = {
      ...projectQrPoints(source, { route: "qr-comparison", from: "2026-09-11", to: "2026-09-20", pointKeys: ["base", "summit"] }),
      view: "comparison" as const,
    };
    const firstPoint = comparison.points[0]!;
    const thirdPoint = { ...firstPoint, pointKey: "base-layout-copy", displayName: "Base layout copy" };
    const singlePointData = { ...comparison, points: [firstPoint] };
    const threePointData = { ...comparison, points: [...comparison.points, thirdPoint] };
    const view = render(
      <QrModule data={singlePointData} options={snapshot.metrics.qrPoints} mode="comparison" onMode={noop} selectedKeys={["base"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    const singleCards = screen.getByRole("region", { name: "Resumen por punto QR" }).querySelectorAll(":scope > article");
    expect(singleCards).toHaveLength(1);
    expect(singleCards[0]).toHaveClass("md:col-span-2");
    expect(singleCards[0]?.querySelector(":scope > div")).toHaveClass("[&>div]:xl:grid-cols-4");

    view.rerender(
      <QrModule data={threePointData} options={snapshot.metrics.qrPoints} mode="comparison" onMode={noop} selectedKeys={["base", "summit", "base-layout-copy"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );

    const threeCards = screen.getByRole("region", { name: "Resumen por punto QR" }).querySelectorAll(":scope > article");
    expect(threeCards).toHaveLength(3);
    expect(threeCards[0]).not.toHaveClass("md:col-span-2");
    expect(threeCards[1]).not.toHaveClass("md:col-span-2");
    expect(threeCards[2]).toHaveClass("md:col-span-2");
    expect(threeCards[0]?.querySelector(":scope > div")).toHaveClass("[&>div]:xl:grid-cols-2");
    expect(threeCards[2]?.querySelector(":scope > div")).toHaveClass("[&>div]:xl:grid-cols-4");
  });

  it("filters comments, preserves per-aspect detail, and exposes immutable report history", async () => {
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [{ aspectKey: "views", rating: "positive" as const }], text: "Excelente vista" }], total: 1, page: 1, pageSize: 25 };
    const generations = { items: [{ reportRunId: "run-1", status: "succeeded" as const, period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: "2026-09-21T01:10:00.000Z", failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: { reportId: "report-1", createdAt: "2026-09-21T01:10:00.000Z", period: { from: "2026-09-01", to: "2026-09-20" }, analyzedResponseCount: 4, analyzedCommentCount: 1, canDownload: true } }], total: 1, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockResolvedValueOnce(envelope(comments)).mockResolvedValueOnce(envelope(generations));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);

    const commentButton = (await screen.findAllByRole("button", { name: /Excelente vista/ }))[0]!;
    expect(commentButton).toBeInTheDocument();
    const aiCard = screen.getByRole("region", { name: "Análisis con IA" });
    expect(within(aiCard).getByText(/comentarios de encuestas anónimas/)).toBeInTheDocument();
    expect(screen.getByText(/Hay pocos comentarios en este alcance/)).toBeInTheDocument();
    expect(screen.getByText("Feedback report 2026-09-01–2026-09-20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeEnabled();
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path, init) => {
      if (init?.method === "POST") return Promise.resolve(Response.json({ reportRunId: "run-2", status: "queued" }, { status: 202 }));
      return Promise.resolve(envelope(String(path).includes("/comments?") ? comments : generations));
    });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar informe" }));
    expect(await screen.findByText(/Solicitud run-2/)).toBeInTheDocument();
    const [, commandInit] = vi.mocked(authenticatedInternalApiFetch).mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(commandInit?.method).toBe("POST");
    expect(JSON.parse(String(commandInit?.body))).not.toHaveProperty("commentFilters");
    fireEvent.click(commentButton);
    expect(screen.getByRole("dialog")).toHaveTextContent("Evaluaciones por aspecto");
    expect(screen.getByRole("dialog")).toHaveTextContent("Views");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(commentButton).toHaveFocus();
    fireEvent.click(commentButton);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(commentButton).toHaveFocus();
  });

  it("presents comment filters in design order with a separate search row and conditional reset", async () => {
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(envelope(
      String(path).includes("/comments?")
        ? { items: [], total: 0, page: 1, pageSize: 25 }
        : { items: [], total: 0, page: 1, pageSize: 25 },
    )));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay comentarios para estos filtros. Probá con otro aspecto, punto, idioma o rango.");

    const filters = screen.getByRole("region", { name: "Filtros de comentarios" });
    const commentsHeading = screen.getByRole("heading", { level: 2, name: "Comentarios" });
    expect(filters.compareDocumentPosition(commentsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(filters).getByText("Filtrá las opiniones por su contexto y después buscá únicamente dentro del texto escrito por visitantes.")).toBeInTheDocument();
    const orderedControls = ["Aspecto", "Valoración", "Punto QR", "Idioma"].map((name) =>
      within(filters).getByText(name, { selector: "label, legend" }),
    );
    expect(orderedControls).toHaveLength(4);
    expect(orderedControls[0]!.compareDocumentPosition(orderedControls[1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(orderedControls[1]!.compareDocumentPosition(orderedControls[2]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(orderedControls[2]!.compareDocumentPosition(orderedControls[3]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(orderedControls[0]!.parentElement).toHaveClass("grid-cols-1", "min-[761px]:grid-cols-2", "min-[1051px]:grid-cols-4");
    const search = within(filters).getByRole("textbox", { name: "Buscar en comentarios" });
    expect(search).toHaveAttribute("placeholder", "Buscar texto del comentario…");
    expect(orderedControls[3]!.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(filters).queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();

    fireEvent.change(within(filters).getByRole("combobox", { name: "Aspecto" }), { target: { value: "views" } });
    const clear = await within(filters).findByRole("button", { name: "Limpiar filtros" });
    expect(clear).toBeEnabled();
    expect(search.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(clear.parentElement).not.toBe(search.parentElement?.parentElement);
    expect(clear.parentElement).toHaveClass("justify-end");
    fireEvent.click(clear);
    expect(within(filters).getByRole("combobox", { name: "Aspecto" })).toHaveValue("");
    expect(within(filters).queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });

  it("groups AI analysis guidance and report generation in one card", async () => {
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(envelope(
      String(path).includes("/comments?")
        ? { items: [], total: 0, page: 1, pageSize: 25 }
        : { items: [], total: 0, page: 1, pageSize: 25 },
    )));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay comentarios para estos filtros. Probá con otro aspecto, punto, idioma o rango.");

    const aiCard = screen.getByRole("region", { name: "Análisis con IA" });
    expect(within(aiCard).getByText("El informe combina estadísticas calculadas por el sistema y comentarios de encuestas anónimas del período seleccionado con los del período anterior equivalente. La IA identifica patrones y elabora conclusiones a partir de los comentarios y las estadísticas proporcionadas. Las métricas oficiales las calcula el sistema.")).toBeInTheDocument();
    const generationHeading = within(aiCard).getByRole("heading", { level: 3, name: "Generación de informe" });
    const generationSection = generationHeading.closest("section");
    expect(generationSection).not.toBeNull();
    expect(within(generationSection!).getByText("Al ingresar, estas fechas toman el período global. Después podés ajustarlas sin cambiar el análisis del tablero. El período anterior de igual duración se calcula automáticamente.")).toBeInTheDocument();
    const form = within(generationSection!).getByRole("form");
    expect(form).toContainElement(within(form).getByLabelText("Fecha inicial"));
    expect(form).toContainElement(within(form).getByLabelText("Fecha final"));
    expect(form).toContainElement(within(form).getByRole("button", { name: "Solicitar informe" }));
    expect(within(aiCard).getByText("Los filtros exploratorios del tablero y la paginación de comentarios no modifican el alcance del informe.")).toBeInTheDocument();
  });

  it("renders one all-status report table from generations without duplicate succeeded reports", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const generations = {
      items: [
        { reportRunId: "queued-run", status: "queued", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: null, failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, cancellationIdentity: { stateVersion: 3 }, report: null },
        { reportRunId: "running-run", status: "running", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T02:00:00.000Z", completedAt: null, failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: null },
        { reportRunId: "succeeded-run", status: "succeeded", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T03:00:00.000Z", completedAt: "2026-09-21T03:10:00.000Z", failureCode: null, safeFailureMessage: null, retryOfReportRunId: "failed-source", report: { reportId: "immutable-report", createdAt: "2026-09-21T03:10:00.000Z", period: { from: "2026-09-01", to: "2026-09-20" }, analyzedResponseCount: 12, analyzedCommentCount: 3, canDownload: true } },
        { reportRunId: "failed-run", status: "failed", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T04:00:00.000Z", completedAt: "2026-09-21T04:10:00.000Z", failureCode: "PROVIDER_TRANSIENT", safeFailureMessage: "El proveedor no está disponible temporalmente.", retryOfReportRunId: null, report: null },
        { reportRunId: "undownloadable-run", status: "succeeded", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T05:00:00.000Z", completedAt: "2026-09-21T05:10:00.000Z", failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: { reportId: "undownloadable-report", createdAt: "2026-09-21T05:10:00.000Z", period: { from: "2026-09-01", to: "2026-09-20" }, analyzedResponseCount: 8, analyzedCommentCount: 2, canDownload: false } },
      ],
      total: 5,
      page: 1,
      pageSize: 25,
    };
    const envelope = (data: unknown) => Response.json({ contractVersion: "feedback-admin.v1", data, meta: {} });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(
      envelope(String(path).includes("/comments?") ? comments : generations),
    ));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    const table = await screen.findByRole("table", { name: "Historial de informes" });
    const rows = within(table).getAllByRole("row");
    expect(within(table).getByRole("caption")).toHaveTextContent("Historial de informes");
    expect(rows).toHaveLength(6);
    expect(screen.getAllByRole("heading", { name: "Historial de informes" })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Historial de generaciones" })).not.toBeInTheDocument();
    expect(within(table).getByText("En cola")).toBeInTheDocument();
    expect(within(table).getByText("En curso")).toBeInTheDocument();
    expect(within(table).getAllByText("Completada")).toHaveLength(2);
    expect(within(table).getByText("Fallida")).toBeInTheDocument();
    expect(within(table).getAllByText("Feedback report 2026-09-01–2026-09-20")).toHaveLength(2);
    expect(within(table).getByText("12 respuestas · 3 comentarios")).toBeInTheDocument();
    expect(within(table).getByText("El proveedor no está disponible temporalmente.")).toBeInTheDocument();
    expect(within(table).getByText("failed-source")).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "Descargar PDF" })).toBeEnabled();
    const undownloadableRow = within(table).getByText("undownloadable-report").closest("tr");
    expect(undownloadableRow).not.toBeNull();
    expect(within(undownloadableRow!).queryByRole("button", { name: "Descargar PDF" })).not.toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "Reintentar generación" })).toBeEnabled();
    expect(within(table).getAllByText("immutable-report")).toHaveLength(1);
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/reports?")).length).toBe(0);
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).length).toBe(1);
  });

  it("keeps one unified report history inside the AI card with one generation source", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const generations = { items: [
      { reportRunId: "queued-run", status: "queued", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T02:00:00.000Z", completedAt: null, failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: null },
      { reportRunId: "succeeded-run", status: "succeeded", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T03:00:00.000Z", completedAt: "2026-09-21T03:10:00.000Z", failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: { reportId: "report-1", createdAt: "2026-09-21T03:10:00.000Z", period: { from: "2026-09-01", to: "2026-09-20" }, analyzedResponseCount: 4, analyzedCommentCount: 1, canDownload: true } },
    ], total: 26, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => Response.json({ contractVersion: "feedback-admin.v1", data, meta: {} });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      const url = String(path);
      return Promise.resolve(envelope(url.includes("/comments?") ? comments : generations));
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("Feedback report 2026-09-01–2026-09-20");

    const aiCard = screen.getByRole("region", { name: "Análisis con IA" });
    const historyHeading = within(aiCard).getByRole("heading", { level: 3, name: "Historial de informes" });
    expect(within(aiCard).getAllByRole("heading", { name: "Historial de informes" })).toHaveLength(1);
    expect(within(aiCard).queryByRole("heading", { name: "Historial de generaciones" })).not.toBeInTheDocument();
    const table = within(aiCard).getByRole("table", { name: "Historial de informes" });
    expect(historyHeading.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(table).getByText("queued-run")).toBeInTheDocument();
    const queuedRow = within(table).getByRole("row", { name: /queued-run/ });
    expect(within(queuedRow).queryByRole("button", { name: "Cancelar solicitud en cola" })).not.toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "Descargar PDF" })).toBeEnabled();
    expect(within(aiCard).getByRole("combobox", { name: "Estado del informe" })).toBeInTheDocument();
    expect(within(aiCard).getByRole("button", { name: "Actualizar historial" })).toBeEnabled();
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).length).toBe(1);
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/reports?")).length).toBe(0);
  });

  it("shows the normalized equal-duration prior period and safely handles invalid generation periods", async () => {
    const emptyComments = { items: [], total: 0, page: 1, pageSize: 25 };
    const generations = {
      items: [
        { reportRunId: "valid-period-run", status: "succeeded", period: { from: "2026-09-11", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: "2026-09-21T01:10:00.000Z", failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: { reportId: "valid-period-report", createdAt: "2026-09-21T01:10:00.000Z", period: { from: "2026-09-11", to: "2026-09-20" }, analyzedResponseCount: 4, analyzedCommentCount: 1, canDownload: false } },
        { reportRunId: "invalid-period-run", status: "queued", period: { from: "2026-09-31", to: "2026-10-01" }, dataCutoffAt: "2026-10-02T00:00:00.000Z", createdAt: "2026-10-02T01:00:00.000Z", completedAt: null, failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: null },
      ],
      total: 2,
      page: 1,
      pageSize: 25,
    };
    const envelope = (data: unknown) => Response.json({ contractVersion: "feedback-admin.v1", data, meta: {} });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(
      envelope(String(path).includes("/comments?") ? emptyComments : generations),
    ));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    const table = await screen.findByRole("table", { name: "Historial de informes" });
    const validRow = within(table).getByText("valid-period-run").closest("tr");
    const invalidRow = within(table).getByText("invalid-period-run").closest("tr");

    expect(within(table).getByRole("columnheader", { name: "Período anterior equivalente" })).toBeInTheDocument();
    expect(validRow).not.toBeNull();
    expect(within(validRow!).getAllByRole("cell")[2]).toHaveTextContent("2026-09-01–2026-09-10");
    expect(invalidRow).not.toBeNull();
    expect(within(invalidRow!).getAllByRole("cell")[2]).toHaveTextContent("No disponible");
  });

  it("opens the rating selector on demand and closes it with Escape or outside interaction", async () => {
    const emptyPage = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((_path) => Promise.resolve(envelope(emptyPage)));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay comentarios para estos filtros. Probá con otro aspecto, punto, idioma o rango.");

    const trigger = screen.getByRole("button", { name: "Todas las valoraciones" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "comment-rating-options");
    expect(document.getElementById("comment-rating-options")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "1 estrella" })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const options = screen.getByRole("group", { name: "Seleccionar valoraciones" });
    expect(options).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Filtros de comentarios" }).contains(options)).toBe(true);
    expect(options).toHaveClass("grid-cols-1");
    expect(within(options).getByText("1 ★")).toBeInTheDocument();
    expect(within(options).getByText("5 ★")).toBeInTheDocument();
    expect(within(options).getByRole("checkbox", { name: "1 estrella" })).toBeInTheDocument();
    expect(within(options).getByRole("checkbox", { name: "2 estrellas" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("comment-rating-options")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("comment-rating-options")).not.toBeInTheDocument();
  });

  it("rejects an invalid independent report range before issuing a command", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const reports = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch)
      .mockResolvedValueOnce(envelope(comments))
      .mockResolvedValueOnce(envelope(reports));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay comentarios para estos filtros. Probá con otro aspecto, punto, idioma o rango.");
    const reportForm = screen.getByRole("form", { name: "Generación de informe" });
    fireEvent.change(within(reportForm).getByLabelText("Fecha inicial"), { target: { value: "2026-09-20" } });
    fireEvent.change(within(reportForm).getByLabelText("Fecha final"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar informe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("la fecha inicial debe ser anterior o igual");
    expect(screen.getByText("No hay informes para este período y estado.")).toBeInTheDocument();
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?") || String(path).includes("/generations?")).length).toBe(2);
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.some(([path]) => String(path).includes("/reports?"))).toBe(false);
  });

  it("sends every comment filter with OR ratings without refetching report history", async () => {
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "en" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [{ aspectKey: "views", rating: "positive" as const }], text: "View" }], total: 51, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(envelope(String(path).includes("/comments?") ? comments : { items: [], total: 0, page: 1, pageSize: 25 })));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findAllByText("View");
    fireEvent.change(screen.getByLabelText("Buscar en comentarios"), { target: { value: "view" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Aspecto" }), { target: { value: "views" } });
    fireEvent.click(screen.getByRole("button", { name: "Todas las valoraciones" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "5 estrellas" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "2 estrellas" }));
    expect(screen.getByRole("button", { name: "2 ★, 5 ★" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Punto QR" }), { target: { value: "base" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Idioma" }), { target: { value: "en" } });

    await waitFor(() => {
      const commentCall = vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).at(-1)?.[0];
      const params = new URLSearchParams(String(commentCall).split("?")[1]);
      expect(params.get("text")).toBe("view");
      expect(params.get("aspectKey")).toBe("views");
      expect(params.getAll("rating").sort()).toEqual(["2", "5"]);
      expect(params.get("pointKey")).toBe("base");
      expect(params.get("locale")).toBe("en");
    });
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).length).toBe(1);
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.some(([path]) => String(path).includes("/reports?"))).toBe(false);
  });

  it("paginates comments and unified report history independently", async () => {
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [], text: "Comment" }], total: 51, page: 1, pageSize: 25 };
    const generations = { items: [{ reportRunId: "run-1", status: "queued", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: null, failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: null }], total: 51, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      const url = String(path);
      const params = new URLSearchParams(url.split("?")[1]);
      const page = Number(params.get("page"));
      return Promise.resolve(envelope(url.includes("/comments?") ? { ...comments, page } : { ...generations, page }));
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findAllByText("Comment");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Paginación de comentarios" })).getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).at(-1)?.[0]).toContain("page=2"));
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).length).toBe(1);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Paginación de informes" })).getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).at(-1)?.[0]).toContain("page=2"));
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).length).toBe(2);
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).length).toBe(2);
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.some(([path]) => String(path).includes("/reports?"))).toBe(false);
  });

  it("resets comment pagination when the reporting period changes", async () => {
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [], text: "Comment" }], total: 51, page: 1, pageSize: 25 };
    const reports = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(envelope(String(path).includes("/comments?") ? comments : reports)));

    const view = render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findAllByText("Comment");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Paginación de comentarios" })).getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).at(-1)?.[0]).toContain("page=2"));
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();

    view.rerender(<CommentsReportsModule period={{ from: "2026-10-01", to: "2026-10-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await waitFor(() => {
      const commentCall = vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).at(-1)?.[0];
      expect(commentCall).toContain("from=2026-10-01");
      expect(commentCall).toContain("page=1");
    });
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.queryByText("Página 2 de 3")).not.toBeInTheDocument();
  });

  it("formats comment timestamps in the reporting timezone", async () => {
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T02:30:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [], text: "Boundary timestamp" }], total: 1, page: 1, pageSize: 25 };
    const reports = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(envelope(String(path).includes("/comments?") ? comments : reports)));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);

    expect(await screen.findAllByText(/19\/9\/2026, 23:30:00/)).not.toHaveLength(0);
  });

  it("keeps unified report history visible when comments fail and retries only comments", async () => {
    let failComments = false;
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [], text: "Current comment" }], total: 1, page: 1, pageSize: 25 };
    const generations = { items: [{ reportRunId: "run-1", status: "succeeded", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: "2026-09-21T01:10:00.000Z", failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: { reportId: "report-1", createdAt: "2026-09-21T01:10:00.000Z", period: { from: "2026-09-01", to: "2026-09-20" }, analyzedResponseCount: 4, analyzedCommentCount: 1, canDownload: false } }], total: 1, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => String(path).includes("/comments?") && failComments ? Promise.reject(new Error("comments unavailable")) : Promise.resolve(envelope(String(path).includes("/comments?") ? comments : generations)));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findAllByText("Current comment");
    failComments = true;
    fireEvent.change(screen.getByLabelText("Buscar en comentarios"), { target: { value: "failed" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Los comentarios no están disponibles");
    expect(screen.queryByText("Current comment")).not.toBeInTheDocument();
    expect(screen.getByText("Feedback report 2026-09-01–2026-09-20")).toBeInTheDocument();
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).length).toBe(1);
    failComments = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar comentarios" }));
    await screen.findAllByText("Current comment");
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).length).toBe(1);
  });

  it("keeps comments visible when unified report history fails and retries its generation read", async () => {
    let failGenerations = false;
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [], text: "Current comment" }], total: 1, page: 1, pageSize: 25 };
    const generations = { items: [{ reportRunId: "run-1", status: "succeeded", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: "2026-09-21T01:10:00.000Z", failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: { reportId: "report-1", createdAt: "2026-09-21T01:10:00.000Z", period: { from: "2026-09-01", to: "2026-09-20" }, analyzedResponseCount: 4, analyzedCommentCount: 1, canDownload: false } }], total: 51, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => String(path).includes("/generations?") && failGenerations ? Promise.reject(new Error("reports unavailable")) : Promise.resolve(envelope(String(path).includes("/comments?") ? comments : generations)));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("Feedback report 2026-09-01–2026-09-20");
    failGenerations = true;
    fireEvent.click(within(screen.getByRole("navigation", { name: "Paginación de informes" })).getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El historial de informes no está disponible");
    expect(screen.getAllByText("Current comment").length).toBeGreaterThan(0);
    expect(screen.queryByText("Feedback report 2026-09-01–2026-09-20")).not.toBeInTheDocument();
    failGenerations = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar historial" }));
    await screen.findByText("Feedback report 2026-09-01–2026-09-20");
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).length).toBe(1);
  });

  it("renders persisted generation states, safe failures, lineage, and no private metadata", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const generations = {
      items: [
        { reportRunId: "queued-run", status: "queued", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: null, failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, cancellationIdentity: { stateVersion: 3 }, report: null },
        { reportRunId: "running-run", status: "running", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T02:00:00.000Z", completedAt: null, failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: null },
        { reportRunId: "succeeded-run", status: "succeeded", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T03:00:00.000Z", completedAt: "2026-09-21T03:10:00.000Z", failureCode: null, safeFailureMessage: null, retryOfReportRunId: "failed-source", report: { reportId: "immutable-report", createdAt: "2026-09-21T03:10:00.000Z", period: { from: "2026-09-01", to: "2026-09-20" }, analyzedResponseCount: 12, analyzedCommentCount: 3 } },
        { reportRunId: "failed-run", status: "failed", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T04:00:00.000Z", completedAt: "2026-09-21T04:10:00.000Z", failureCode: "PROVIDER_TRANSIENT", safeFailureMessage: "El proveedor no está disponible temporalmente.", retryOfReportRunId: null, report: null, privateSnapshot: "never render this", modelName: "private-model", usageCost: 99 },
      ], total: 4, page: 1, pageSize: 25,
    };
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      const value = String(path).includes("/comments?") ? comments : generations;
      return Promise.resolve(Response.json({ contractVersion: "feedback-admin.v1", data: value, meta: {} }));
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);

    expect(await screen.findByText("queued-run")).toBeInTheDocument();
    expect(document.querySelector('[data-generation-status="running"]')).toHaveTextContent("En curso");
    expect(document.querySelector('[data-generation-status="succeeded"]')).toHaveTextContent("Completada");
    expect(document.querySelector('[data-generation-status="failed"]')).toHaveTextContent("Fallida");
    expect(screen.getByText("El proveedor no está disponible temporalmente.")).toBeInTheDocument();
    expect(screen.getByText("immutable-report")).toBeInTheDocument();
    expect(screen.getByText("failed-source")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /queued-run/ })).getByRole("button", { name: "Cancelar solicitud en cola" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar solicitud en cola" })).toBeInTheDocument();
    expect(screen.queryByText(/never render this|private-model|usageCost/)).not.toBeInTheDocument();
  });

  it("applies the status filter and paginates the unified report history with bounded requests", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const generation = (page: number, status = "queued") => ({ items: [{ reportRunId: `run-${page}`, status, period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: null, failureCode: null, safeFailureMessage: null, retryOfReportRunId: null, report: null }], total: 26, page, pageSize: 25 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      const value = String(path).includes("/comments?") ? comments : generation(Number(new URLSearchParams(String(path).split("?")[1]).get("page")), new URLSearchParams(String(path).split("?")[1]).get("status") ?? "queued");
      return Promise.resolve(Response.json({ contractVersion: "feedback-admin.v1", data: value, meta: {} }));
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    expect(await screen.findByText("run-1")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Paginación de informes" })).getByRole("button", { name: "Siguiente" }));
    await screen.findByText("run-2");
    fireEvent.change(screen.getByRole("combobox", { name: "Estado del informe" }), { target: { value: "failed" } });
    await waitFor(() => {
      const call = vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/generations?")).at(-1)?.[0];
      const params = new URLSearchParams(String(call).split("?")[1]);
      expect(params.get("status")).toBe("failed");
      expect(params.get("page")).toBe("1");
      expect(params.get("pageSize")).toBe("25");
    });
  });

  it("refreshes persisted history after create and retry commands", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    let historyReads = 0;
    let latestGeneration: { reportRunId: string; status: string; period: { from: string; to: string }; dataCutoffAt: string; createdAt: string; completedAt: string | null; failureCode: string | null; safeFailureMessage: string | null; retryOfReportRunId: string | null; report: null } = { reportRunId: "failed-source", status: "failed", period: { from: "2026-09-01", to: "2026-09-20" }, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", completedAt: "2026-09-21T02:00:00.000Z", failureCode: "PROVIDER_TRANSIENT", safeFailureMessage: "Fallo temporal seguro.", retryOfReportRunId: null, report: null };
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path, init) => {
      const url = String(path);
      if (url.includes("/comments?")) return Promise.resolve(Response.json({ contractVersion: "feedback-admin.v1", data: comments, meta: {} }));
      if (init?.method === "POST") {
        if (url.endsWith("/retry")) {
          latestGeneration = { ...latestGeneration, reportRunId: "retry-run", status: "queued", retryOfReportRunId: "failed-source", safeFailureMessage: null };
          return Promise.resolve(Response.json({ reportRunId: "retry-run", status: "queued" }, { status: 202 }));
        }
        latestGeneration = { ...latestGeneration, reportRunId: "created-run", status: "queued", retryOfReportRunId: null, safeFailureMessage: null };
        return Promise.resolve(Response.json({ reportRunId: "created-run", status: "queued" }, { status: 202 }));
      }
      historyReads += 1;
      const data = historyReads === 1 ? { items: [latestGeneration], total: 1, page: 1, pageSize: 25 } : { items: [latestGeneration], total: 1, page: 1, pageSize: 25 };
      return Promise.resolve(Response.json({ contractVersion: "feedback-admin.v1", data, meta: {} }));
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    expect(await screen.findByText("failed-source")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar generación" }));
    expect(await screen.findByText("retry-run")).toBeInTheDocument();
    await waitFor(() => expect(historyReads).toBeGreaterThanOrEqual(2));
    const retryCall = vi.mocked(authenticatedInternalApiFetch).mock.calls.find(([path, init]) => String(path).endsWith("/failed-source/retry") && init?.method === "POST");
    expect(retryCall).toBeDefined();
    expect(JSON.parse(String(retryCall?.[1]?.body))).toEqual({ contractVersion: "feedback-admin.v1" });

    fireEvent.click(screen.getByRole("button", { name: "Solicitar informe" }));
    expect(await screen.findByText("created-run")).toBeInTheDocument();
    await waitFor(() => expect(historyReads).toBeGreaterThanOrEqual(3));
  });

  it("confirms queued cancellation, sends the expected identity, and refreshes history after conflict and success", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const queuedGeneration = {
      reportRunId: "00000000-0000-4000-8000-000000000117",
      status: "queued" as const,
      period: { from: "2026-09-01", to: "2026-09-20" },
      dataCutoffAt: "2026-09-21T00:00:00.000Z",
      createdAt: "2026-09-21T01:00:00.000Z",
      completedAt: null,
      failureCode: null,
      safeFailureMessage: null,
      retryOfReportRunId: null,
      cancellationIdentity: {
        stateVersion: 3,
      },
      report: null,
    };
    let historyReads = 0;
    let cancellationAttempts = 0;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path, init) => {
      const url = String(path);
      if (url.includes("/comments?"))
        return Promise.resolve(Response.json({ contractVersion: "feedback-admin.v1", data: comments, meta: {} }));
      if (init?.method === "POST") {
        cancellationAttempts += 1;
        return Promise.resolve(cancellationAttempts === 1
          ? Response.json({ error: { code: "INVALID_STATE", message: "The report generation changed" } }, { status: 409 })
          : Response.json({ reportRunId: queuedGeneration.reportRunId, status: "failed", failureCode: "OPERATOR_CANCELLED" }));
      }
      historyReads += 1;
      return Promise.resolve(Response.json({
        contractVersion: "feedback-admin.v1",
        data: { items: [queuedGeneration], total: 1, page: 1, pageSize: 25 },
        meta: {},
      }));
    });

    try {
      render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
      expect(await screen.findByText(queuedGeneration.reportRunId)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancelar solicitud en cola" }));
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining(queuedGeneration.reportRunId));
      expect(await screen.findByRole("alert")).toHaveTextContent("La ejecución cambió o ya no está en cola.");
      await waitFor(() => expect(historyReads).toBeGreaterThanOrEqual(2));

      fireEvent.click(screen.getByRole("button", { name: "Cancelar solicitud en cola" }));
      await waitFor(() => expect(cancellationAttempts).toBe(2));
      await waitFor(() => expect(historyReads).toBeGreaterThanOrEqual(3));
      const cancelCall = vi.mocked(authenticatedInternalApiFetch).mock.calls.find(([path, init]) => String(path).endsWith("/cancel") && init?.method === "POST");
      expect(cancelCall).toBeDefined();
      expect(JSON.parse(String(cancelCall?.[1]?.body))).toEqual({
        contractVersion: "feedback-admin.v1",
        expectedStateVersion: 3,
      });
    } finally {
      confirm.mockRestore();
    }
  });

  it("recovers generation-history read errors and renders an empty state", async () => {
    let historyReads = 0;
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      if (String(path).includes("/generations?")) {
        historyReads += 1;
        if (historyReads === 1) return Promise.reject(new Error("private transport detail"));
        return Promise.resolve(Response.json({ contractVersion: "feedback-admin.v1", data: { items: [], total: 0, page: 1, pageSize: 25 }, meta: {} }));
      }
      const data = String(path).includes("/comments?") ? { items: [], total: 0, page: 1, pageSize: 25 } : { items: [], total: 0, page: 1, pageSize: 25 };
      return Promise.resolve(Response.json({ contractVersion: "feedback-admin.v1", data, meta: {} }));
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("El historial de informes no está disponible temporalmente.");
    expect(screen.queryByText("private transport detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar historial" }));
    expect(await screen.findByText("No hay informes para este período y estado.")).toBeInTheDocument();
    expect(historyReads).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar historial" }));
    await waitFor(() => expect(historyReads).toBe(3));
  });

  it("prevents duplicate commands while busy and requires overlap confirmation", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    const overlap = { overlaps: [{ reportRunId: "run-existing", period: { from: "2026-09-01", to: "2026-09-20" }, intersection: { from: "2026-09-10", to: "2026-09-20" } }], overlapDigest: "d".repeat(64), adjustment: "Choose another range" };
    let generationCalls = 0;
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      if (String(path).includes("/comments?")) return Promise.resolve(envelope(comments));
      if (String(path).includes("/generations?")) return Promise.resolve(envelope({ items: [], total: 0, page: 1, pageSize: 25 }));
      generationCalls += 1;
      return Promise.resolve(generationCalls === 1 ? new Response(JSON.stringify({ error: { message: "Overlap", details: overlap } }), { status: 409 }) : Response.json({ reportRunId: "run-2", status: "queued" }, { status: 202 }));
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay informes para este período y estado.");
    const reportForm = screen.getByRole("form", { name: "Generación de informe" });
    const submit = screen.getByRole("button", { name: "Solicitar informe" });
    fireEvent.click(submit);
    await waitFor(() => expect(generationCalls).toBe(1));
    expect(screen.getByText(/El rango se cruza con historial existente/)).toBeInTheDocument();
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(generationCalls).toBe(1);
    fireEvent.click(screen.getByRole("checkbox", { name: /Confirmo generar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Solicitar informe" }));
    expect(await screen.findByText(/Solicitud run-2/)).toBeInTheDocument();
    fireEvent.change(within(reportForm).getByLabelText("Fecha inicial"), { target: { value: "2026-10-01" } });
    expect(screen.queryByText("El rango se cruza con historial existente")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Confirmo generar/ })).not.toBeInTheDocument();
  });

  it("does not issue a second command when generation is still pending", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    let resolveCommand!: (_response: Response) => void;
    const pendingCommand = new Promise<Response>((resolve) => { resolveCommand = resolve; });
    let generationCalls = 0;
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      if (String(path).includes("/comments?")) return Promise.resolve(envelope(comments));
      if (String(path).includes("/generations?")) return Promise.resolve(envelope({ items: [], total: 0, page: 1, pageSize: 25 }));
      generationCalls += 1;
      return pendingCommand;
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay informes para este período y estado.");
    const submit = screen.getByRole("button", { name: "Solicitar informe" });
    fireEvent.click(submit);
    const busySubmit = await screen.findByRole("button", { name: "Solicitando…" });
    await waitFor(() => expect(busySubmit).toBeDisabled());
    expect(busySubmit).toHaveAttribute("data-loading", "true");
    fireEvent.click(submit);
    expect(generationCalls).toBe(1);
    resolveCommand(Response.json({ reportRunId: "run-3", status: "queued" }, { status: 202 }));
    expect(await screen.findByText(/Solicitud run-3/)).toBeInTheDocument();
  });
});
