"use client";

import { authenticatedInternalApiFetch } from "@/lib/http/clients/auth-internal-fetch";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { normalizePeriod } from "@teleferico/survey-reporting-core";
import type {
  FeedbackAdminAspectsData,
  FeedbackAdminCommandStatus,
  FeedbackAdminComment,
  FeedbackAdminCommentsData,
  FeedbackAdminGenerationsEnvelope,
  FeedbackAdminPoint,
  FeedbackAdminQrData,
  FeedbackAdminReadEnvelope,
  FeedbackAdminSnapshot,
  FeedbackAdminSummaryData,
  FeedbackAdminOverlapDetails,
} from "@/types/api/admin/feedback";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const Bar = dynamic(() => import("recharts").then((module) => module.Bar), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((module) => module.BarChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((module) => module.Area), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((module) => module.CartesianGrid), { ssr: false });
const ComposedChart = dynamic(() => import("recharts").then((module) => module.ComposedChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((module) => module.Line), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((module) => module.LineChart), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((module) => module.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((module) => module.Tooltip), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((module) => module.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((module) => module.YAxis), { ssr: false });

export const FEEDBACK_MODULE_ORDER = [
  "Resumen",
  "Aspectos",
  "Puntos QR",
  "Comentarios e informes",
] as const;
type Module = "summary" | "aspects" | "qr" | "comments";
type Period = { from: string; to: string };
type ChartRow = { label: string; primary: number | null; secondary?: number | null };

const MODULES: readonly { key: Module; label: (typeof FEEDBACK_MODULE_ORDER)[number] }[] = [
  { key: "summary", label: "Resumen" },
  { key: "aspects", label: "Aspectos" },
  { key: "qr", label: "Puntos QR" },
  { key: "comments", label: "Comentarios e informes" },
];
const EMPTY_AVAILABLE_POINTS: FeedbackAdminSummaryData["availablePoints"] = [];
const SUMMARY_KPI_COPY = [
  {
    label: "Respuestas recibidas",
    description: "Cuenta todas las encuestas recibidas; un aumento significa mayor participación.",
  },
  {
    label: "Valoración general",
    description: "Es el promedio de todas las valoraciones, de 1 a 5 estrellas; más alto es mejor.",
  },
  {
    label: "Índice de satisfacción",
    description: "Porcentaje de respuestas con 4 o 5 estrellas; más alto es mejor.",
  },
  {
    label: "Experiencias negativas",
    description: "Porcentaje de respuestas con 1 o 2 estrellas; más bajo es mejor.",
  },
] as const;

const SUMMARY_INTEGER_FORMAT = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const SUMMARY_NUMBER_FORMAT = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const SUMMARY_STAR_FORMAT = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const SUMMARY_PERIOD_DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const SUMMARY_CHART_DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const percent = (value: number | null) =>
  value === null ? "No disponible" : `${(value / 100).toFixed(1)}%`;
const stars = (value: number | null) =>
  value === null ? "No disponible" : `${(value / 1000).toFixed(1)} / 5`;
const signedPercent = (value: number | null) =>
  value === null ? "Sin base del período anterior" : `${value >= 0 ? "+" : ""}${percent(value)}`;
const signed = (value: number | null, divisor: number, suffix: string) => value === null ? "No disponible" : `${value >= 0 ? "+" : ""}${(value / divisor).toFixed(1)}${suffix}`;
const meaning = (value: number | null, inverse = false) => value === null ? "No disponible" : value === 0 ? "Neutral" : (value > 0) !== inverse ? "Favorable" : "Desfavorable";
function summaryValue(index: number, period: FeedbackAdminPoint["current"]) {
  if (index === 0) return SUMMARY_INTEGER_FORMAT.format(period.submissionCount);
  if (index === 1) return period.averageMilliStars === null
    ? "No disponible"
    : `${SUMMARY_STAR_FORMAT.format(period.averageMilliStars / 1000)} ★`;
  const rateBps = index === 2 ? period.satisfied.rateBps : period.unfavorable.rateBps;
  return rateBps === null ? "No disponible" : `${SUMMARY_NUMBER_FORMAT.format(rateBps / 100)} %`;
}
function signedSummaryNumber(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${SUMMARY_NUMBER_FORMAT.format(Math.abs(value))}`;
}
function summaryComparison(index: number, deltas: FeedbackAdminSummaryData["deltas"] | undefined, result: string | undefined) {
  const delta = index === 0
    ? deltas?.submissionPercentBps
    : index === 1
      ? deltas?.averageMilliStars
      : index === 2
        ? deltas?.satisfiedRateBps
        : deltas?.unfavorableRateBps;
  if (delta === null || delta === undefined) {
    return {
      delta: null,
      fallback: index === 0 ? "Sin base del período anterior." : "Sin datos comparables del período anterior.",
      favorable: false,
    };
  }
  const divisor = index === 0 || index > 1 ? 100 : 1000;
  const unit = index === 0 ? " %" : index === 1 ? " puntos" : " puntos porcentuales";
  return {
    delta: `${signedSummaryNumber(delta / divisor)}${unit}`,
    fallback: null,
    favorable: result === "Favorable",
  };
}
const half = (value: number | null) => value === null ? "No disponible" : (value / 2).toFixed(value % 2 ? 1 : 0);
const sentimentLabel = (value: string) => ({ positive: "Positivo", neutral: "Neutral", negative: "Negativo" }[value] ?? value);
const aspectLabel = (aspect: { aspectKey: string; labelVariants: readonly { label: string }[] }) =>
  aspect.labelVariants[0]?.label ?? aspect.aspectKey;

function initialPeriod(): Period {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return { from: formatter.format(start), to: formatter.format(end) };
}

function inclusiveDays(period: Period) {
  return Math.floor((Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86_400_000) + 1;
}

function displayPeriod(period: Period) {
  const from = SUMMARY_PERIOD_DATE_FORMAT.format(new Date(`${period.from}T00:00:00Z`));
  const to = SUMMARY_PERIOD_DATE_FORMAT.format(new Date(`${period.to}T00:00:00Z`));
  return `${from}–${to}`;
}

export function formatSummaryChartDateTick(label: string, _unit: "day" | "week" | "month") {
  const dates = label.split("–");
  if (dates.length < 1 || dates.length > 2 || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) return label;
  const parsed = dates.map((date) => new Date(`${date}T00:00:00Z`));
  if (parsed.some((date, index) => Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dates[index])) return label;
  const formatted = parsed.map((date) => SUMMARY_CHART_DATE_FORMAT.format(date));
  return formatted.join("–");
}

export function getSummaryChartTickLabels(labels: readonly string[]) {
  if (labels.length <= 5) return [...labels];
  return Array.from({ length: 5 }, (_, index) => labels[Math.round(index * (labels.length - 1) / 4)]!);
}

function query(period: Period, values: Record<string, string | undefined> = {}) {
  const parameters = new URLSearchParams(period);
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) parameters.set(key, value);
  });
  return parameters.toString();
}

async function read<T>(path: string, signal: AbortSignal): Promise<FeedbackAdminReadEnvelope<T>> {
  const response = await authenticatedInternalApiFetch(path, { signal });
  if (!response.ok) throw new Error(`Feedback read failed: ${response.status}`);
  return (await response.json()) as FeedbackAdminReadEnvelope<T>;
}

async function readGenerations(path: string, signal: AbortSignal): Promise<FeedbackAdminGenerationsEnvelope> {
  const response = await authenticatedInternalApiFetch(path, { signal });
  if (!response.ok) throw new Error(`Feedback generation history read failed: ${response.status}`);
  return (await response.json()) as FeedbackAdminGenerationsEnvelope;
}

const GENERATION_STATUS_LABELS: Readonly<Record<FeedbackAdminCommandStatus, string>> = {
  queued: "En cola",
  running: "En curso",
  succeeded: "Completada",
  failed: "Fallida",
};

function Panel({ title, children, variant = "standard" }: { title: string; children: React.ReactNode; variant?: "standard" | "summary" }) {
  return (
    <Card as="section" className={variant === "summary" ? "flex h-full w-full min-w-0 flex-col rounded-[8px] border border-[#e3e3e5] bg-white shadow-none" : "border border-red-500/15 shadow-sm"}>
      <CardBody className={variant === "summary" ? "flex h-full w-full min-w-0 flex-col gap-3 p-4" : "gap-4 p-5 md:p-6"}>
        <h2 className={variant === "summary" ? "text-[14px] font-semibold leading-5 text-foreground" : "text-xl font-semibold text-foreground"}>{title}</h2>
        {children}
      </CardBody>
    </Card>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed p-6 text-center text-base text-foreground/60">{children}</p>;
}

export function getSummaryLineChartGeometry(rows: readonly ChartRow[], unit: "count" | "percent") {
  const values = rows.flatMap(({ primary }) => primary !== null && Number.isFinite(primary) ? [primary] : []);
  const xAxisPadding = { left: 12, right: 12 };
  if (unit === "percent") {
    if (!values.length) {
      return {
        xAxisPadding,
        yAxisDomain: [-500, 10_500] as [number, number],
        yAxisTicks: [0, 2_500, 5_000, 7_500, 10_000],
      };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    if (span >= 7_000) {
      return {
        xAxisPadding,
        yAxisDomain: [-500, 10_500] as [number, number],
        yAxisTicks: [0, 2_500, 5_000, 7_500, 10_000],
      };
    }
    if (span === 0) {
      const lower = min === 10_000 ? 6_500 : min - 500;
      const upper = min === 0 ? 1_000 : min === 10_000 ? 10_500 : min + 500;
      const firstTick = Math.ceil(lower / 1_000) * 1_000;
      const yAxisTicks = [];
      for (let tick = firstTick; tick <= upper; tick += 1_000) yAxisTicks.push(tick);
      if (min === 10_000) yAxisTicks.unshift(7_000);
      if (!yAxisTicks.length) yAxisTicks.push(min);
      return {
        xAxisPadding,
        yAxisDomain: [lower, upper] as [number, number],
        yAxisTicks: [...new Set(yAxisTicks)],
      };
    }
    const padding = Math.max(1_000, span * 0.2);
    const lower = Math.max(0, Math.floor((min - padding) / 1_000) * 1_000);
    const upper = Math.min(10_000, Math.ceil((max + padding) / 1_000) * 1_000);
    const yAxisTicks = [];
    for (let tick = lower; tick <= upper; tick += 1_000) yAxisTicks.push(tick);
    return {
      xAxisPadding,
      yAxisDomain: [Math.min(lower, min - padding), Math.max(upper, max + padding)] as [number, number],
      yAxisTicks,
    };
  }

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const padding = Math.max(1, (max - min) * 0.05);
  const tickStep = Math.max(1, Math.ceil(max / 4));
  const yAxisTicks = [0];
  for (let tick = tickStep; tick < max; tick += tickStep) yAxisTicks.push(tick);
  if (max > 0) yAxisTicks.push(max);
  return {
    xAxisPadding,
    yAxisDomain: [min - padding, max + padding] as [number, number],
    yAxisTicks,
  };
}

function Kpis({ period, previous, deltas, presentation = "standard" }: {
  period: FeedbackAdminPoint["current"];
  previous?: FeedbackAdminPoint["previous"];
  deltas?: FeedbackAdminSummaryData["deltas"];
  presentation?: "standard" | "summary";
}) {
  const isSummary = presentation === "summary";
  const values = [
    ["Respuestas", String(period.submissionCount), previous && String(previous.submissionCount), deltas && signedPercent(deltas.submissionPercentBps), deltas && meaning(deltas.submissionPercentBps)],
    ["Calificación promedio", stars(period.averageMilliStars), previous && stars(previous.averageMilliStars), deltas && signed(deltas.averageMilliStars, 1000, " estrellas"), deltas && meaning(deltas.averageMilliStars)],
    ["Satisfacción", percent(period.satisfied.rateBps), previous && percent(previous.satisfied.rateBps), deltas && signed(deltas.satisfiedRateBps, 100, " pp"), deltas && meaning(deltas.satisfiedRateBps)],
    ["Desfavorable", percent(period.unfavorable.rateBps), previous && percent(previous.unfavorable.rateBps), deltas && signed(deltas.unfavorableRateBps, 100, " pp"), deltas && meaning(deltas.unfavorableRateBps, true)],
  ] as const;
  return (
    <div className={isSummary ? "grid grid-cols-1 gap-[13px] min-[421px]:grid-cols-2 min-[901px]:grid-cols-4" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
      {values.map(([label, value, prior, delta, result], index) => {
        const auditDelta = label === "Respuestas" && deltas && deltas.submissionCount !== null
          ? <p className={isSummary ? "sr-only" : "text-xs text-foreground/50"} data-audit-absolute-delta={deltas.submissionCount}>Auditoría: diferencia absoluta {deltas.submissionCount >= 0 ? "+" : ""}{deltas.submissionCount}</p>
          : null;
        if (isSummary) {
          const copy = SUMMARY_KPI_COPY[index]!;
          const comparison = summaryComparison(index, deltas, result);
          return (
            <article key={label} className="flex min-h-[154px] flex-col rounded-[8px] border border-[#e3e3e5] bg-white p-4 shadow-none">
              <p className="text-[11px] font-semibold leading-[1.45] text-[#5e6066]">{copy.label}</p>
              <p className="mb-1 mt-[6px] text-[26px] font-[650] leading-none tracking-[-0.03em] text-foreground tabular-nums">{summaryValue(index, period)}</p>
              <p className="mt-auto text-[11px] leading-[1.45] text-[#5e6066]">
                {comparison.delta ? <><span className={`font-bold ${comparison.favorable ? "text-[#045009]" : ""}`}>{comparison.delta}</span>{" "}<span className="text-[#5e6066]">frente al período anterior.</span></> : comparison.fallback}
              </p>
              <p className="mt-[5px] text-[11px] leading-[1.45] text-[#4b4d52]">{copy.description}</p>
              {auditDelta}
            </article>
          );
        }
        return (
          <article key={label} className="rounded-xl border bg-background p-4">
            <p className="text-sm font-medium text-foreground/60">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
            {prior ? <p className="text-sm text-foreground/60">Anterior: {prior}</p> : null}
            {delta ? <p className="text-sm font-medium">{delta} · {result}</p> : null}
            {auditDelta}
          </article>
        );
      })}
    </div>
  );
}

function MetricChart({ title, rows, kind = "bar", unit = "count", secondaryLabel, controls, description, showExactTable = true, axisGeometry, panelVariant = "standard", summaryDateUnit, summaryDateTicks, summaryCaption, summaryStatus }: {
  title: string;
  rows: readonly ChartRow[];
  kind?: "bar" | "line";
  unit?: "count" | "percent";
  secondaryLabel?: string;
  controls?: React.ReactNode;
  description?: string;
  showExactTable?: boolean;
  axisGeometry?: ReturnType<typeof getSummaryLineChartGeometry>;
  panelVariant?: "standard" | "summary";
  summaryDateUnit?: "day" | "week" | "month";
  summaryDateTicks?: readonly string[];
  summaryCaption?: string;
  summaryStatus?: string;
}) {
  if (!rows.length) return <Panel title={title} variant={panelVariant}>{controls}<EmptyState>No hay datos disponibles para el período analizado.</EmptyState></Panel>;
  const Chart = kind === "line"
    ? panelVariant === "summary" ? ComposedChart : LineChart
    : BarChart;
  return (
    <Panel title={title} variant={panelVariant}>
      {description ? <p className={panelVariant === "summary" ? "mb-2 text-[11px] leading-4 text-foreground/70" : "mb-3 max-w-3xl text-sm text-foreground/70"}>{description}</p> : null}
      {controls}
      <div className={panelVariant === "summary" ? "h-64 w-full min-w-0" : "h-64 w-full"} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={rows} margin={{ left: 4, right: 12 }}>
            <CartesianGrid vertical={summaryDateUnit ? false : undefined} stroke={summaryDateUnit ? "#e3e3e5" : undefined} strokeDasharray={summaryDateUnit ? undefined : "3 3"} />
            <XAxis dataKey="label" ticks={summaryDateTicks ? [...summaryDateTicks] : undefined} minTickGap={24} padding={axisGeometry?.xAxisPadding} tick={summaryDateUnit ? { fontSize: 11 } : undefined} tickLine={summaryDateUnit ? false : undefined} axisLine={summaryDateUnit ? false : undefined} tickMargin={summaryDateUnit ? 8 : undefined} tickFormatter={summaryDateUnit ? (value) => formatSummaryChartDateTick(String(value), summaryDateUnit) : undefined} />
            <YAxis domain={axisGeometry?.yAxisDomain} ticks={axisGeometry?.yAxisTicks} tick={summaryDateUnit ? { fontSize: 11 } : undefined} tickLine={summaryDateUnit ? false : undefined} axisLine={summaryDateUnit ? false : undefined} tickMargin={summaryDateUnit ? 8 : undefined} tickFormatter={(value) => unit === "percent" ? `${value / 100}%` : String(value)} />
            <Tooltip formatter={(value) => unit === "percent" ? percent(Number(value)) : String(value)} />
            {kind === "line" ? (
              <>
                {panelVariant === "summary" ? <Area isAnimationActive={false} type="monotone" dataKey="primary" name="Actual" stroke="none" fill="#9F1212" fillOpacity={0.1} baseValue={axisGeometry?.yAxisDomain[0] ?? "dataMin"} connectNulls={false} tooltipType="none" /> : null}
                <Line isAnimationActive={false} type="monotone" dataKey="primary" name="Actual" stroke="#9F1212" strokeWidth={2} connectNulls={false} dot={panelVariant === "summary" ? { r: 3, fill: "#ffffff", stroke: "#9F1212", strokeWidth: 2 } : false} activeDot={panelVariant === "summary" ? { r: 4, fill: "#ffffff", stroke: "#9F1212", strokeWidth: 2 } : false} />
                {secondaryLabel ? <Line isAnimationActive={false} type="monotone" dataKey="secondary" name={secondaryLabel} stroke="#64748b" strokeWidth={2} connectNulls={false} /> : null}
              </>
            ) : (
              <>
                <Bar isAnimationActive={false} dataKey="primary" name="Actual" fill="#9F1212" radius={[6, 6, 0, 0]} />
                {secondaryLabel ? <Bar isAnimationActive={false} dataKey="secondary" name={secondaryLabel} fill="#94a3b8" radius={[6, 6, 0, 0]} /> : null}
              </>
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
      {summaryCaption ? <p className="text-[10px] leading-4 text-foreground/60">{summaryCaption}</p> : null}
      {summaryStatus ? <p role="note" className="mt-auto rounded-md bg-[#f5f5f6] px-3 py-2 text-[10px] leading-4 text-foreground/70">{summaryStatus}</p> : null}
      {showExactTable ? <div className="overflow-x-auto">{exactTable()}</div> : null}
    </Panel>
  );

  function exactTable() {
    return <table className="w-full text-left text-sm">
      <caption className="sr-only">{title}: datos exactos</caption>
      <thead><tr><th className="p-2">Categoría</th><th className="p-2">Actual</th>{secondaryLabel ? <th className="p-2">{secondaryLabel}</th> : null}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.label} className="border-t"><th className="p-2 font-medium">{row.label}</th><td className="p-2">{unit === "percent" ? percent(row.primary) : row.primary ?? "No disponible"}</td>{secondaryLabel ? <td className="p-2">{unit === "percent" ? percent(row.secondary ?? null) : row.secondary ?? "No disponible"}</td> : null}</tr>)}</tbody>
    </table>;
  }
}

export function SummaryModule({ data, period, onViewReports }: { data: FeedbackAdminSummaryData; period?: Period; onViewReports?: () => void }) {
  const label = new Map(data.aspects.map((item) => [item.aspectKey, aspectLabel(item)]));
  const hasClassifiableEvidence = data.aspects.some((item) => item.aspectKey !== "other" && item.hasSufficientEvidence);
  const [chartMetric, setChartMetric] = useState<"satisfaction" | "responses">("satisfaction");
  const [chartUnit, setChartUnit] = useState<"day" | "week" | "month">("day");
  const chartBuckets = data.calendar.filter((item) => item.period === "current" && item.unit === chartUnit);
  const chartRows = chartBuckets.map((item) => ({
    label: chartUnit === "day" ? item.from : `${item.from}–${item.to}`,
    primary: chartMetric === "satisfaction" ? item.satisfactionRateBps : item.submissionCount,
  }));
  const chartGeometry = getSummaryLineChartGeometry(chartRows, chartMetric === "satisfaction" ? "percent" : "count");
  const chartTicks = getSummaryChartTickLabels(chartRows.map((row) => row.label));
  const captionPeriod = period ?? { from: chartBuckets[0]?.from ?? "", to: chartBuckets.at(-1)?.to ?? "" };
  const chartCaption = `Tiempo · ${captionPeriod.from && captionPeriod.to ? displayPeriod(captionPeriod) : "Período seleccionado"} · ${chartMetric === "satisfaction" ? "Satisfacción (%)" : "Encuestas respondidas"}`;
  const chartTitle = chartMetric === "satisfaction" ? "Evolución de la satisfacción" : "Evolución de encuestas respondidas";
  const metricControls = <div className="grid w-full grid-cols-2 rounded-md bg-[#f1f1f2] p-1" role="group" aria-label="Métrica del gráfico">
    <Button type="button" className="h-9 w-full rounded-sm border-b-2 border-transparent bg-transparent px-2 text-xs shadow-none aria-pressed:border-primary aria-pressed:bg-white aria-pressed:text-primary" variant="light" color="default" aria-pressed={chartMetric === "satisfaction"} onClick={() => setChartMetric("satisfaction")}>Satisfacción</Button>
    <Button type="button" className="h-9 w-full rounded-sm border-b-2 border-transparent bg-transparent px-2 text-xs shadow-none aria-pressed:border-primary aria-pressed:bg-white aria-pressed:text-primary" variant="light" color="default" aria-pressed={chartMetric === "responses"} onClick={() => setChartMetric("responses")}>Encuestas respondidas</Button>
  </div>;
  const temporalControls = <div className="flex flex-wrap gap-2" role="group" aria-label="Presentación temporal">
    <Button type="button" className="h-8 rounded-full px-3 text-xs" variant={chartUnit === "day" ? "solid" : "bordered"} color={chartUnit === "day" ? "primary" : "default"} aria-pressed={chartUnit === "day"} onClick={() => setChartUnit("day")}>Día</Button>
    <Button type="button" className="h-8 rounded-full px-3 text-xs" variant={chartUnit === "week" ? "solid" : "bordered"} color={chartUnit === "week" ? "primary" : "default"} aria-pressed={chartUnit === "week"} onClick={() => setChartUnit("week")}>Semana</Button>
    <Button type="button" className="h-8 rounded-full px-3 text-xs" variant={chartUnit === "month" ? "solid" : "bordered"} color={chartUnit === "month" ? "primary" : "default"} aria-pressed={chartUnit === "month"} onClick={() => setChartUnit("month")}>Mes</Button>
  </div>;
  const chartControls = <div className="flex w-full flex-col gap-2">{metricControls}{temporalControls}</div>;
  const exactChartValues = <ul className="sr-only" aria-label={`Valores de ${chartMetric === "satisfaction" ? "satisfacción" : "encuestas respondidas"}`}>
    {chartBuckets.map((bucket, index) => {
      const row = chartRows[index]!;
      const metricValue = row.primary === null ? "No disponible" : chartMetric === "satisfaction" ? percent(row.primary) : row.primary;
      return <li key={`${bucket.from}:${bucket.to}`}>{row.label}: {metricValue}; {bucket.submissionCount} respuestas</li>;
    })}
  </ul>;
  return (
    <div className="space-y-5">
      <section aria-label="Indicadores del período">
        <p className="mb-3 text-xs text-foreground/60">Los valores mostrados corresponden al período elegido.</p>
        <Kpis period={data.current} previous={data.previous} deltas={data.deltas} presentation="summary" />
      </section>
      <section aria-label="Evolución y distribución del período" className="grid w-full min-w-0 gap-4 min-[1051px]:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)]">
        <div className="h-full w-full min-w-0">
          <MetricChart
            title={chartTitle}
            kind="line"
            unit={chartMetric === "satisfaction" ? "percent" : "count"}
            rows={chartRows}
            controls={chartControls}
            description={chartMetric === "satisfaction"
              ? "Porcentaje de respuestas satisfechas a lo largo del tiempo."
              : "Cantidad de encuestas recibidas en cada intervalo."}
            showExactTable={false}
            axisGeometry={chartGeometry}
            panelVariant="summary"
            summaryDateUnit={chartUnit}
            summaryDateTicks={chartTicks}
            summaryCaption={chartCaption}
            summaryStatus="Los puntos representan intervalos con datos disponibles; los intervalos sin datos se conservan sin conectar."
          />
          {exactChartValues}
        </div>
        <Panel title="Distribución de estrellas" variant="summary">
          <p className="mb-3 text-sm text-foreground/70">Cantidad de respuestas por puntuación y proporción sobre el total del período.</p>
          <ul className="space-y-3" aria-label="Distribución de estrellas">
            {[...data.current.starDistribution].sort((left, right) => right.star - left.star).map((item) => {
              const share = item.rateBps === null ? null : item.rateBps / 100;
              const starLabel = item.star === 1 ? "1 estrella" : `${item.star} estrellas`;
              const responseLabel = item.count === 1 ? "1 respuesta" : `${item.count} respuestas`;
              return <li key={item.star} className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm">
                <span aria-hidden="true" className="whitespace-nowrap font-semibold">{item.star} ★</span>
                <span className="sr-only">{starLabel}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#e3e3e5]" role="progressbar" aria-label={starLabel} aria-valuemin={0} aria-valuemax={Math.max(data.current.submissionCount, 1)} aria-valuenow={item.count} aria-valuetext={`${share === null ? "No disponible" : `${share.toFixed(1)}%`}; ${responseLabel}`}>
                  <div aria-hidden="true" className="h-full rounded-full bg-[#9F1212]" style={{ width: `${Math.min(100, Math.max(0, share ?? 0))}%` }} />
                </div>
                <span className="col-start-2 text-xs text-foreground/70">{share === null ? "No disponible" : `${share.toFixed(1)}%`} · {responseLabel}</span>
              </li>;
            })}
          </ul>
        </Panel>
      </section>
      <Panel title="Fortalezas y oportunidades de mejora" variant="summary">
        <p className="mb-4 text-sm text-foreground/70">Las fortalezas son los aspectos con predominio de valoraciones positivas; las oportunidades son los que muestran predominio de valoraciones negativas.</p>
        <div className="grid gap-5 md:grid-cols-2">
          {(["Fortalezas", "Oportunidades"] as const).map((title) => {
            const isStrength = title === "Fortalezas";
            const keys = isStrength ? data.strengths : data.opportunities;
            const sentiment = isStrength ? "positive" : "negative";
            return <section key={title} aria-label={title}>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-foreground/70">{isStrength ? "Mayor proporción de valoraciones positivas." : "Mayor proporción de valoraciones negativas."}</p>
              {keys.length ? <ul className="mt-3 space-y-3">{keys.map((key) => {
                const aspect = data.aspects.find((item) => item.aspectKey === key);
                const evidence = aspect?.current[sentiment];
                return <li key={key} className="grid grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-2 text-sm">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isStrength ? "bg-[#9F1212]" : "bg-[#5e6066]"}`} />
                  <span>{label.get(key) ?? key}</span>
                  <span className="text-right"><strong>{evidence?.rateBps === null || evidence?.rateBps === undefined ? "No disponible" : percent(evidence.rateBps)}</strong><span className="block text-xs text-foreground/70">{evidence?.count ?? "No disponible"} respuestas</span></span>
                </li>;
              })}</ul> : <p className="mt-3 text-sm text-foreground/60">{hasClassifiableEvidence
                ? `No se identificaron aspectos con predominio ${isStrength ? "positivo" : "negativo"} en este período.`
                : "Evidencia insuficiente para clasificar fortalezas u oportunidades con este volumen de respuestas."}</p>}
            </section>;
          })}
        </div>
        <p className="mt-4 border-t border-[#e3e3e5] pt-3 text-xs text-foreground/70">Los porcentajes describen la proporción de valoraciones positivas o negativas entre quienes seleccionaron cada aspecto; no son una calificación promedio.</p>
      </Panel>
      <Panel title="Último informe generado por IA" variant="summary">
        {data.latestSuccessfulReport ? <>
          <p className="font-semibold">{data.latestSuccessfulReport.name}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Generado</dt><dd>{dateTime(data.latestSuccessfulReport.createdAt)}</dd></div>
            <div><dt className="font-semibold">Período analizado</dt><dd>{displayPeriod(data.latestSuccessfulReport.period)}</dd></div>
            <div><dt className="font-semibold">Respuestas analizadas</dt><dd>{data.latestSuccessfulReport.analyzedResponseCount}</dd></div>
            <div><dt className="font-semibold">Comentarios analizados</dt><dd>{data.latestSuccessfulReport.analyzedCommentCount}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-foreground/70">Las métricas calculadas por el sistema siguen siendo la referencia.</p>
          {onViewReports ? <Button type="button" variant="bordered" color="primary" className="mt-3" onClick={onViewReports}>Ver informes e historial</Button> : null}
        </> : <EmptyState>No hay un informe exitoso disponible para este período.</EmptyState>}
      </Panel>
    </div>
  );
}

type AspectTrendMetric = "selections" | "ratings";
type AspectTrendUnit = "day" | "week" | "month";
type AspectTrendBucket = FeedbackAdminAspectsData["aspects"][number]["trend"][number];

const ASPECT_TREND_SERIES = [
  { key: "positive", label: "Positivas", color: "#147a32", marker: "circle" },
  { key: "neutral", label: "Neutrales", color: "#ce6700", marker: "diamond" },
  { key: "negative", label: "Negativas", color: "#9F1212", marker: "square" },
] as const;

function aspectCountAxis(maxValue: number) {
  const target = Math.max(1, maxValue / 4);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const maximum = Math.max(step, Math.ceil(maxValue / step) * step);
  return { maximum, ticks: Array.from({ length: Math.round(maximum / step) + 1 }, (_, index) => index * step) };
}

function formatAspectTrendRange(bucket: AspectTrendBucket) {
  return bucket.from === bucket.to ? bucket.from : `${bucket.from}–${bucket.to}`;
}

function AspectTrendChart({ aspect }: { aspect: FeedbackAdminAspectsData["aspects"][number] }) {
  const [metric, setMetric] = useState<AspectTrendMetric>("selections");
  const [unit, setUnit] = useState<AspectTrendUnit>("day");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleSeries, setVisibleSeries] = useState<Record<(typeof ASPECT_TREND_SERIES)[number]["key"], boolean>>({
    positive: true,
    neutral: true,
    negative: true,
  });
  const buckets = aspect.trend.filter((item) => item.unit === unit);
  const rows = buckets.map((bucket) => ({
    label: formatAspectTrendRange(bucket),
    selectionCount: bucket.selectionCount,
    positive: bucket.sentiment.positive.rateBps,
    neutral: bucket.sentiment.neutral.rateBps,
    negative: bucket.sentiment.negative.rateBps,
  }));
  const selectionAxis = aspectCountAxis(Math.max(0, ...rows.map((row) => row.selectionCount)));
  const dateTicks = getSummaryChartTickLabels(rows.map((row) => row.label));
  const selectedBucket = buckets[Math.min(selectedIndex, Math.max(buckets.length - 1, 0))];
  const selectedLabel = selectedBucket
    ? formatSummaryChartDateTick(formatAspectTrendRange(selectedBucket), unit)
    : "No hay intervalos disponibles";

  return (
    <section aria-label="Evolución del aspecto" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Evolución del aspecto</h3>
          <p className="text-sm text-foreground/70">Cada intervalo usa las encuestas del aspecto dentro de ese período.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Vista de evolución">
          {(["selections", "ratings"] as const).map((value) => <Button key={value} type="button" variant={metric === value ? "solid" : "bordered"} color={metric === value ? "primary" : "default"} aria-pressed={metric === value} onClick={() => setMetric(value)}>{value === "selections" ? "Selecciones" : "Valoraciones"}</Button>)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Agrupación temporal">
        {(["day", "week", "month"] as const).map((value) => <Button key={value} type="button" variant={unit === value ? "solid" : "bordered"} color={unit === value ? "primary" : "default"} aria-pressed={unit === value} onClick={() => { setUnit(value); setSelectedIndex(0); }}>{value === "day" ? "Día" : value === "week" ? "Semana" : "Mes"}</Button>)}
      </div>
      {metric === "ratings" ? <div className="flex flex-wrap gap-x-4 gap-y-2" role="group" aria-label="Series visibles">
        {ASPECT_TREND_SERIES.map((series) => <label key={series.key} className="inline-flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" checked={visibleSeries[series.key]} onChange={(event) => setVisibleSeries((current) => ({ ...current, [series.key]: event.target.checked }))} />
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />{series.label}
        </label>)}
      </div> : null}
      {rows.length ? <>
        {metric === "ratings" && !ASPECT_TREND_SERIES.some((series) => visibleSeries[series.key]) ? <p role="status" className="text-sm text-foreground/70">Seleccioná al menos una serie para mostrar el gráfico.</p> : null}
        <div className="h-64 w-full min-w-0" role="img" aria-label={`${metric === "selections" ? "Selecciones" : "Valoraciones"} de ${aspectLabel(aspect)} por ${unit === "day" ? "día" : unit === "week" ? "semana" : "mes"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ left: 8, right: 14, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#e3e3e5" />
              <XAxis dataKey="label" ticks={dateTicks} minTickGap={20} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatSummaryChartDateTick(String(value), unit)} />
              <YAxis domain={metric === "selections" ? [0, selectionAxis.maximum] : [0, 10_000]} ticks={metric === "selections" ? selectionAxis.ticks : [0, 2500, 5000, 7500, 10_000]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => metric === "selections" ? String(value) : `${Number(value) / 100}%`} />
              <Tooltip labelFormatter={(label) => String(label)} formatter={(value) => value === null || value === undefined ? "No disponible" : metric === "selections" ? String(value) : percent(Number(value))} />
              {metric === "selections" ? <Line isAnimationActive={false} type="monotone" dataKey="selectionCount" name="Selecciones" stroke="#143c72" strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: "#ffffff", stroke: "#143c72", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#ffffff", stroke: "#143c72", strokeWidth: 2 }} /> : ASPECT_TREND_SERIES.filter((series) => visibleSeries[series.key]).map((series) => <Line key={series.key} isAnimationActive={false} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: "#ffffff", stroke: series.color, strokeWidth: 2 }} activeDot={{ r: 5, fill: "#ffffff", stroke: series.color, strokeWidth: 2 }} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-foreground/60">Tiempo · {unit === "day" ? "Día" : unit === "week" ? "Semana" : "Mes"} · {metric === "selections" ? "Encuestas que seleccionaron el aspecto" : "Valoraciones dentro del aspecto (%)"}</p>
        {selectedBucket ? <div className="rounded-lg border border-default-200 bg-default-50/70 p-3 text-sm" role="status" aria-label="Intervalo seleccionado">
          <label className="flex flex-wrap items-center gap-2 font-semibold">Intervalo seleccionado
            <select className="max-w-full rounded-lg border border-default-200 bg-background px-2 py-1 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={Math.min(selectedIndex, buckets.length - 1)} onChange={(event) => setSelectedIndex(Number(event.target.value))}>
              {buckets.map((bucket, index) => <option key={`${bucket.from}:${bucket.to}`} value={index}>{formatAspectTrendRange(bucket)}</option>)}
            </select>
          </label>
          {metric === "selections" ? <p className="mt-1">{selectedBucket.selectionCount} {selectedBucket.selectionCount === 1 ? "encuesta seleccionó" : "encuestas seleccionaron"} {aspectLabel(aspect)} en {selectedLabel}.</p> : <p className="mt-1">Positivas {selectedBucket.sentiment.positive.count} de {selectedBucket.selectionCount} ({percent(selectedBucket.sentiment.positive.rateBps)}); neutrales {selectedBucket.sentiment.neutral.count} de {selectedBucket.selectionCount} ({percent(selectedBucket.sentiment.neutral.rateBps)}); negativas {selectedBucket.sentiment.negative.count} de {selectedBucket.selectionCount} ({percent(selectedBucket.sentiment.negative.rateBps)}).</p>}
        </div> : null}
        <details className="rounded-lg border border-default-200 px-3 py-2">
          <summary className="cursor-pointer rounded-sm py-1 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Ver datos exactos por intervalo</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Datos exactos de evolución del aspecto</caption>
              <thead className="bg-default-100/60"><tr><th scope="col" className="p-2">Intervalo</th><th scope="col" className="p-2">Selecciones</th><th scope="col" className="p-2">Positivas</th><th scope="col" className="p-2">Neutrales</th><th scope="col" className="p-2">Negativas</th></tr></thead>
              <tbody>{buckets.map((bucket) => <tr key={`${bucket.from}:${bucket.to}`} className="border-t border-default-200 even:bg-default-50/70"><th scope="row" className="p-2 font-medium">{formatAspectTrendRange(bucket)}</th><td className="p-2 tabular-nums">{bucket.selectionCount}</td>{ASPECT_TREND_SERIES.map((series) => <td key={series.key} className="p-2 tabular-nums">{bucket.sentiment[series.key].count} de {bucket.selectionCount} · {percent(bucket.sentiment[series.key].rateBps)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>
      </> : <EmptyState>No hay intervalos temporales disponibles para este aspecto.</EmptyState>}
    </section>
  );
}

export function AspectsModule({ data, selectedKey, onSelect }: {
  data: FeedbackAdminAspectsData;
  selectedKey: string;
  onSelect: (_key: string) => void;
}) {
  const selected = data.aspects.find((item) => item.aspectKey === selectedKey) ?? data.aspects[0];
  if (!selected) return <EmptyState>No hay evidencia de aspectos disponible para este alcance.</EmptyState>;
  const labels = new Map(data.aspects.map((item) => [item.aspectKey, aspectLabel(item)]));
  const reference = data.matrix.find((item) => item.medianSelectionCountTimesTwo !== null);
  const quadrants = [["priority", "Prioridad"], ["specific", "Específico"], ["strength", "Fortaleza"], ["secondary", "Secundario"]] as const;
  const plottedMatrix = data.matrix.filter((item) => item.yNegativeRateBps !== null);
  const maxSelectionCount = Math.max(1, ...plottedMatrix.map((item) => item.xSelectionCount));
  const maxNegativeRateBps = Math.max(500, Math.ceil(Math.max(0, ...plottedMatrix.map((item) => item.yNegativeRateBps!)) / 500) * 500);
  const xMedian = reference?.medianSelectionCountTimesTwo === null || reference?.medianSelectionCountTimesTwo === undefined ? null : reference.medianSelectionCountTimesTwo / (2 * maxSelectionCount) * 100;
  const yMedian = reference?.medianNegativeRateBpsTimesTwo === null || reference?.medianNegativeRateBpsTimesTwo === undefined ? null : reference.medianNegativeRateBpsTimesTwo / (2 * maxNegativeRateBps) * 100;
  const xTicks = [...new Set([0, Math.ceil(maxSelectionCount / 2), maxSelectionCount])];
  const yTicks = [...new Set([0, Math.round(maxNegativeRateBps / 2), maxNegativeRateBps])];
  return (
    <div className="space-y-5">
      <Panel title="Aspectos del período">
        <div role="region" aria-label="Tabla de aspectos del período" tabIndex={0} className="max-h-[28rem] overflow-auto rounded-lg border">
          <table className="min-w-[760px] w-full text-left text-sm">
            <caption className="sr-only">Aspectos del período</caption>
            <thead className="sticky top-0 bg-background">
              <tr>
                <th scope="col" className="p-3">Aspecto</th>
                <th scope="col" className="p-3 text-right">Encuestas que lo seleccionaron</th>
                <th scope="col" className="p-3 text-right">Positivas</th>
                <th scope="col" className="p-3 text-right">Neutrales</th>
                <th scope="col" className="p-3 text-right">Negativas</th>
              </tr>
            </thead>
            <tbody>
              {data.aspects.map((item) => {
                const isSelected = item.aspectKey === selectedKey;
                return (
                  <tr key={item.aspectKey} aria-current={isSelected ? "true" : undefined} className={isSelected ? "border-t bg-primary/5" : "border-t"}>
                    <th scope="row" className="p-2 text-left">
                      <Button type="button" variant={isSelected ? "solid" : "light"} color={isSelected ? "primary" : "default"} aria-label={`Seleccionar aspecto ${aspectLabel(item)}`} aria-pressed={isSelected} className="h-auto min-h-0 max-w-full whitespace-normal px-2 py-1 text-left font-semibold" onClick={() => onSelect(item.aspectKey)}>
                        {aspectLabel(item)}
                      </Button>
                    </th>
                    <td className="p-3 text-right tabular-nums">
                      <div>{item.selectionCount}</div>
                      <div className="text-xs text-foreground/60">{percent(item.selectionRateBps)}</div>
                    </td>
                    {(["positive", "neutral", "negative"] as const).map((sentiment) => (
                      <td key={sentiment} className="p-3 text-right tabular-nums">
                        <div>{item.current[sentiment].count}</div>
                        <div className="text-xs text-foreground/60">{percent(item.current[sentiment].rateBps)}</div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Detalle del aspecto seleccionado">
        {!selected.hasSufficientEvidence ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-amber-900">Evidencia insuficiente: {selected.selectionCount} selecciones; umbral {selected.evidenceThreshold}.</p> : null}
        <MetricChart title="Distribución de sentimiento" rows={(["positive", "neutral", "negative"] as const).map((sentiment) => ({ label: sentimentLabel(sentiment), primary: selected.current[sentiment].count }))} />
        <div className="grid gap-3 sm:grid-cols-3">{selected.relatedOverallRating.map((item) => <div key={item.sentiment} className="rounded-xl border p-3"><p className="text-foreground/60">{sentimentLabel(item.sentiment)}</p><p className="font-semibold">{stars(item.averageMilliStars)}</p><p className="text-sm">{item.submissionCount} respuestas</p></div>)}</div>
        <AspectTrendChart aspect={selected} />
      </Panel>
      <Panel title="Matriz de prioridades">
        <p className="text-sm text-foreground/60">Eje X: selecciones; la igualdad con la mediana es relevancia alta. Eje Y: negatividad; la igualdad con la mediana es negatividad baja.</p><p className="text-sm font-medium">Referencias: X = {half(reference?.medianSelectionCountTimesTwo ?? null)} · Y = {half(reference?.medianNegativeRateBpsTimesTwo ?? null)} puntos básicos</p>
        <div role="img" aria-label="Matriz de prioridades con ejes de relevancia y negatividad" className="rounded-xl border bg-background p-4">
          <div aria-hidden="true" className="grid grid-cols-2 gap-2 px-2 text-xs font-semibold text-foreground/60"><span>Específicos</span><span className="text-right">Prioridad</span></div>
          <div className="relative mx-5 my-2 min-h-64 border-b border-l border-default-300">
            <span className="absolute -left-7 top-1/2 -rotate-90 text-xs text-foreground/60">Negatividad →</span>
            {xMedian !== null ? <span aria-hidden="true" data-testid="matrix-x-median" className="absolute bottom-0 top-0 border-l border-dashed border-default-400" style={{ left: `${xMedian}%` }} /> : null}
            {yMedian !== null ? <span aria-hidden="true" data-testid="matrix-y-median" className="absolute left-0 right-0 border-t border-dashed border-default-400" style={{ bottom: `${yMedian}%` }} /> : null}
            {yTicks.map((tick) => <span key={tick} aria-hidden="true" data-testid={`matrix-y-tick-${tick}`} className="absolute -left-8 -translate-y-1/2 text-[10px] leading-none text-foreground/60" style={{ bottom: `${tick / maxNegativeRateBps * 100}%` }}>{percent(tick)}</span>)}
            {plottedMatrix.map((item) => {
              const x = item.xSelectionCount / maxSelectionCount * 100;
              const y = item.yNegativeRateBps! / maxNegativeRateBps * 100;
              const markerClass = item.state === "excluded"
                ? "h-3.5 w-3.5 rotate-45 border-2 border-[#634291] bg-background"
                : item.state === "insufficient_evidence"
                  ? "h-3 w-3 border-2 border-dashed border-default-500 bg-background"
                  : item.aspectKey === selectedKey
                    ? "h-3 w-3 border-2 border-[#143c72] bg-background ring-4 ring-[#143c72]/20"
                    : "h-2.5 w-2.5 bg-[#143c72]";
              return <span key={item.aspectKey} data-testid={`matrix-point-${item.aspectKey}`} data-matrix-state={item.state} className={`absolute -translate-x-1/2 translate-y-1/2 rounded-full ${markerClass}`} style={{ left: `${x}%`, bottom: `${y}%` }} />;
            })}
          </div>
          <div aria-hidden="true" className="relative mx-5 -mt-2 h-4 text-[10px] leading-none text-foreground/60">{xTicks.map((tick) => <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${tick / maxSelectionCount * 100}%` }}>{tick}</span>)}</div>
          <p className="text-center text-xs text-foreground/60">Relevancia: selecciones →</p>
          <div aria-hidden="true" className="mt-3 grid grid-cols-2 gap-2 px-2 text-xs font-semibold text-foreground/60"><span>Secundarios</span><span className="text-right">Fortalezas</span></div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground/70" aria-label="Referencias de la matriz">
            <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#143c72]" />Aspecto clasificado</span>
            <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-[#143c72] bg-background" />Aspecto seleccionado</span>
            <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-default-500 bg-background" />Evidencia insuficiente</span>
            <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 border-2 border-[#634291] bg-background" />Otro aspecto, sin clasificación</span>
          </div>
        </div>
        <p role="status" className="text-sm">Aspecto seleccionado: <strong>{aspectLabel(selected)}</strong>. La selección se marca también en la tabla accesible.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption>Datos exactos de la matriz de prioridades</caption><thead><tr><th className="p-2">Aspecto</th><th>Selecciones</th><th>Negatividad</th><th>Estado</th></tr></thead><tbody>{data.matrix.map((item) => <tr key={item.aspectKey} aria-current={item.aspectKey === selectedKey ? "true" : undefined} className={item.aspectKey === selectedKey ? "border-t bg-primary/5" : "border-t"}><th className="p-2">{labels.get(item.aspectKey) ?? item.aspectKey}</th><td>{item.xSelectionCount}</td><td>{percent(item.yNegativeRateBps)}</td><td>{item.state === "classified" ? quadrants.find(([key]) => key === item.quadrant)?.[1] : item.state === "excluded" ? "Excluido" : "Evidencia insuficiente"}</td></tr>)}</tbody></table></div>
      </Panel>
      <Panel title="Aspectos positivos en experiencias de cinco estrellas">
        {data.fiveStarAssociation.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Asociación exacta con cinco estrellas</caption><thead><tr><th className="p-2">Aspecto</th><th>5 estrellas</th><th>Otras calificaciones (1–4)</th><th>Diferencia</th></tr></thead><tbody>{data.fiveStarAssociation.map((item) => <tr key={item.aspectKey} className="border-t"><th className="p-2">{labels.get(item.aspectKey) ?? item.aspectKey}</th><td>{percent(item.fiveStarPositiveRateBps)}</td><td>{percent(item.oneToFourPositiveRateBps)}</td><td>{item.differenceBps === null ? "No disponible" : `${(item.differenceBps / 100).toFixed(1)} pp`}</td></tr>)}</tbody></table></div> : <EmptyState>No hay evidencia de asociación disponible.</EmptyState>}
      </Panel>
      <Panel title="Entradas personalizadas estructuradas">
        {data.otherAspects.length ? <div className="space-y-3">{data.otherAspects.map((item) => <article key={item.receipt} className="rounded-xl border p-3"><p>{item.text}</p><p className="text-sm text-foreground/60">{sentimentLabel(item.sentiment)} · {item.overallRating}/5 · {item.pointKey} · {item.acceptedAt.slice(0, 10)}</p></article>)}</div> : <EmptyState>No hay entradas personalizadas disponibles.</EmptyState>}
      </Panel>
    </div>
  );
}

type QrTemporalMetric = "satisfaction" | "volume";
type QrTemporalUnit = "day" | "week" | "month";
type QrTemporalBucket = FeedbackAdminQrData["calendar"][number];

const QR_CHART_DATE_FORMAT = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });

function formatQrChartDate(value: string) {
  return QR_CHART_DATE_FORMAT.format(new Date(`${value}T00:00:00Z`)).replaceAll(".", "");
}

function formatQrChartRange(bucket: QrTemporalBucket | null) {
  if (!bucket) return "Sin intervalo comparable";
  const from = formatQrChartDate(bucket.from);
  return bucket.from === bucket.to ? from : `${from}–${formatQrChartDate(bucket.to)}`;
}

function formatQrExactRange(bucket: QrTemporalBucket | null) {
  return bucket ? `${bucket.from}–${bucket.to}` : "Sin intervalo comparable";
}

function qrVolumeAxis(maximum: number) {
  if (maximum <= 4) {
    const max = Math.max(1, maximum);
    return { max, ticks: Array.from({ length: Math.floor(max) + 1 }, (_, index) => index) };
  }
  const rawStep = Math.max(maximum, 4) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const max = Math.max(4, Math.ceil(maximum / step) * step);
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step) };
}

function QrComparisonVolumeChart({ points }: { points: readonly FeedbackAdminQrData["points"][number][] }) {
  if (!points.length) return null;
  const maxCount = Math.max(0, ...points.flatMap((point) => [point.current.submissionCount, point.previous.submissionCount]));
  const scale = qrVolumeAxis(maxCount);
  const legend = (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground/70" role="list" aria-label="Períodos comparados">
      <span className="inline-flex items-center gap-2" role="listitem"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-[#0b4795]" />Período analizado</span>
      <span className="inline-flex items-center gap-2" role="listitem"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-[#5f6368]" />Período anterior</span>
    </div>
  );

  return (
    <Panel title="Volumen por punto QR">
      <p className="text-sm text-foreground/70">Respuestas completas de cada punto en el período analizado y en el período anterior equivalente.</p>
      {legend}
      <div className="space-y-5" role="group" aria-label="Volumen por punto QR">
        {points.map((point) => (
          <div key={point.pointKey} className="min-w-0 border-b border-default-200 pb-3 last:border-0 last:pb-0">
            <h3 className="mb-2 break-words text-sm font-semibold">{point.displayName}</h3>
            <div className="space-y-2">
              {(["current", "previous"] as const).map((period) => {
                const count = point[period].submissionCount;
                const periodLabel = period === "current" ? "Período analizado" : "Período anterior";
                return (
                  <div key={period} role="img" aria-label={`${point.displayName}. ${periodLabel}: ${SUMMARY_INTEGER_FORMAT.format(count)} ${count === 1 ? "respuesta completa" : "respuestas completas"}.`} className="grid min-w-0 grid-cols-[minmax(6.5rem,0.8fr)_minmax(4rem,1.4fr)_max-content] items-center gap-2 text-xs sm:grid-cols-[minmax(8rem,0.8fr)_minmax(6rem,1.4fr)_max-content]">
                    <span className="text-foreground/70">{periodLabel}</span>
                    <span aria-hidden="true" className="h-4 min-w-0 overflow-hidden rounded bg-default-100">
                      <span data-testid="qr-volume-bar" data-period={period} className={`block h-full rounded ${period === "current" ? "bg-[#0b4795]" : "bg-[#5f6368]"}`} style={{ width: `${count / scale.max * 100}%` }} />
                    </span>
                    <span className="whitespace-nowrap font-semibold tabular-nums">{SUMMARY_INTEGER_FORMAT.format(count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="ml-[min(33%,8rem)] flex justify-between border-t border-default-200 pt-1 text-[10px] tabular-nums text-foreground/60" role="group" aria-label="Escala común de respuestas">
        {scale.ticks.map((tick) => <span key={tick} data-testid="qr-volume-axis-tick">{SUMMARY_INTEGER_FORMAT.format(tick)}</span>)}
      </div>
    </Panel>
  );
}

function QrTemporalPanel({ calendar, pointKey }: {
  calendar: FeedbackAdminQrData["calendar"];
  pointKey: string;
}) {
  const [metric, setMetric] = useState<QrTemporalMetric>("satisfaction");
  const [unit, setUnit] = useState<QrTemporalUnit>("day");
  const [selection, setSelection] = useState({ pointKey, unit, index: -1 });
  const [focus, setFocus] = useState({ pointKey, unit, index: -1 });
  const sortBuckets = (period: QrTemporalBucket["period"]) => calendar
    .filter((item) => item.period === period && item.unit === unit)
    .toSorted((left, right) => left.from.localeCompare(right.from));
  const currentBuckets = sortBuckets("current");
  const previousBuckets = sortBuckets("previous");
  const intervalCount = Math.max(currentBuckets.length, previousBuckets.length);
  const intervals = Array.from({ length: intervalCount }, (_, index) => {
    const current = currentBuckets[index] ?? null;
    const previous = previousBuckets[index] ?? null;
    return {
      index,
      label: formatQrChartRange(current),
      current,
      previous,
      currentValue: current === null ? null : metric === "satisfaction" ? current.satisfactionRateBps : current.submissionCount,
      previousValue: previous === null ? null : metric === "satisfaction" ? previous.satisfactionRateBps : previous.submissionCount,
    };
  });
  let defaultSelectedIndex = -1;
  for (let index = intervals.length - 1; index >= 0; index -= 1) {
    if (intervals[index]!.currentValue !== null || intervals[index]!.previousValue !== null) {
      defaultSelectedIndex = index;
      break;
    }
  }
  const savedIndex = selection.pointKey === pointKey && selection.unit === unit ? selection.index : -1;
  const selectedIndex = Math.min(savedIndex >= 0 ? savedIndex : Math.max(defaultSelectedIndex, 0), Math.max(intervalCount - 1, 0));
  const focusedIndex = focus.pointKey === pointKey && focus.unit === unit && focus.index >= 0
    ? Math.min(focus.index, Math.max(intervalCount - 1, 0))
    : selectedIndex;
  const selectedInterval = intervals[selectedIndex];
  const formatValue = (bucket: QrTemporalBucket | null, value: number | null) => {
    if (bucket === null) return "Sin intervalo comparable";
    if (metric === "volume") return String(bucket.submissionCount);
    return value === null ? "Sin datos" : percent(value);
  };
  const formatStatusValue = (bucket: QrTemporalBucket | null, value: number | null) => {
    if (bucket === null) return "Sin intervalo comparable";
    if (metric === "volume") {
      const count = bucket.submissionCount;
      return `Volumen: ${SUMMARY_INTEGER_FORMAT.format(count)} ${count === 1 ? "respuesta" : "respuestas"}`;
    }
    return value === null
      ? `Satisfacción: Sin datos · Total: ${SUMMARY_INTEGER_FORMAT.format(bucket.submissionCount)} ${bucket.submissionCount === 1 ? "respuesta" : "respuestas"}`
      : `Satisfacción: ${percent(value)} · Total: ${SUMMARY_INTEGER_FORMAT.format(bucket.submissionCount)} ${bucket.submissionCount === 1 ? "respuesta" : "respuestas"}`;
  };
  const metricName = metric === "satisfaction" ? "Satisfacción" : "Volumen";
  const chartWidth = Math.max(640, Math.min(1700, intervalCount * 52 + 140));
  const chartHeight = 276;
  const margin = { left: 52, right: 20, top: 16, bottom: 42 };
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotBottom = margin.top + plotHeight;
  const maximumValue = metric === "satisfaction"
    ? 10_000
    : Math.max(0, ...intervals.flatMap((interval) => [interval.currentValue ?? 0, interval.previousValue ?? 0]));
  const volumeScale = qrVolumeAxis(maximumValue);
  const yMaximum = metric === "satisfaction" ? 10_000 : volumeScale.max;
  const yTicks = metric === "satisfaction" ? [0, 2_500, 5_000, 7_500, 10_000] : volumeScale.ticks;
  const x = (index: number) => margin.left + (intervalCount <= 1 ? plotWidth / 2 : (index / (intervalCount - 1)) * plotWidth);
  const y = (value: number) => plotBottom - (value / yMaximum) * plotHeight;
  const tickCount = Math.min(intervalCount, Math.max(5, Math.floor(plotWidth / 96)));
  const tickIndexes = new Set(Array.from({ length: tickCount }, (_, index) =>
    intervalCount <= 1 ? 0 : Math.round(index * (intervalCount - 1) / (tickCount - 1)),
  ));
  const selectedBandStart = selectedIndex === 0 ? margin.left : (x(selectedIndex - 1) + x(selectedIndex)) / 2;
  const selectedBandEnd = selectedIndex === intervalCount - 1 ? margin.left + plotWidth : (x(selectedIndex) + x(selectedIndex + 1)) / 2;
  const selectInterval = (index: number) => {
    setSelection({ pointKey, unit, index });
    setFocus({ pointKey, unit, index });
  };
  const moveIntervalFocus = (event: React.KeyboardEvent<SVGRectElement>, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextIndex = Math.max(0, Math.min(intervalCount - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
    setFocus({ pointKey, unit, index: nextIndex });
    event.currentTarget.parentElement?.querySelectorAll<SVGRectElement>("[data-qr-interval-target]")[nextIndex]?.focus();
  };
  const intervalSelectionLabel = (interval: (typeof intervals)[number]) => {
    const current = formatQrChartRange(interval.current);
    const previous = formatQrChartRange(interval.previous);
    return `Seleccionar intervalo ${current}; anterior ${previous}`;
  };
  const grid = yTicks.map((tick) => (
    <g key={tick}>
      <line x1={margin.left} y1={y(tick)} x2={margin.left + plotWidth} y2={y(tick)} stroke="#e3e3e5" />
      <text x={margin.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-foreground/60 text-[10px] tabular-nums">{metric === "satisfaction" ? `${tick / 100}%` : SUMMARY_INTEGER_FORMAT.format(tick)}</text>
    </g>
  ));
  const seriesPath = (key: "currentValue" | "previousValue") => {
    let open = false;
    return intervals.map((interval, index) => {
      const value = interval[key];
      if (value === null) { open = false; return ""; }
      const command = open ? "L" : "M";
      open = true;
      return `${command}${x(index).toFixed(2)},${y(value).toFixed(2)}`;
    }).filter(Boolean).join(" ");
  };
  const markers = metric === "satisfaction" ? intervals.flatMap((interval, index) => ([
    { key: "previous", value: interval.previousValue },
    { key: "current", value: interval.currentValue },
  ].filter((item) => item.value !== null).map(({ key, value }) => (
    <circle key={`${key}-${index}`} data-testid={`qr-marker-${key}-${index}`} data-interval-index={index} cx={x(index)} cy={y(value!)} r={index === selectedIndex ? key === "current" ? 7 : 6 : key === "current" ? 5 : 4} fill={key === "current" ? "#9F1212" : "#ffffff"} stroke={key === "current" ? "#ffffff" : "#5f6368"} strokeWidth={index === selectedIndex ? 3 : 2} onClick={() => selectInterval(index)} />
  )))) : intervals.flatMap((interval, index) => ([
    { key: "current", value: interval.currentValue },
    { key: "previous", value: interval.previousValue },
  ].map(({ key, value }, seriesIndex) => {
    if (value === null) return null;
    const barWidth = Math.min(18, plotWidth / Math.max(intervalCount * 3, 1));
    const barX = x(index) + (seriesIndex === 0 ? -barWidth - 2 : 2);
    return <rect key={`${key}-${index}`} data-testid={`qr-marker-${key}-${index}`} data-interval-index={index} x={barX} y={value === 0 ? plotBottom - 1 : y(value)} width={barWidth} height={Math.max(1, plotBottom - y(value))} rx="3" fill={key === "current" ? "#0b4795" : "#5f6368"} opacity={index === selectedIndex ? 1 : 0.82} onClick={() => selectInterval(index)} />;
  })));

  return (
    <Panel title="Evolución temporal" variant="summary">
      <div className="flex w-full min-w-0 flex-col gap-3">
        <p className="text-xs leading-5 text-foreground/70">Compará la satisfacción disponible y el total de respuestas en cada intervalo real.</p>
        <div className="flex w-full min-w-0 flex-col gap-2">
          <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-default-200 bg-default-100 p-1" role="group" aria-label="Métrica temporal">
            {(["satisfaction", "volume"] as const).map((value) => <button
              key={value}
              type="button"
              aria-pressed={metric === value}
              className="min-h-10 rounded-md border-b-2 border-transparent px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-white aria-pressed:text-foreground"
              onClick={() => setMetric(value)}
            >{value === "satisfaction" ? "Satisfacción" : "Volumen"}</button>)}
          </div>
          <div className="flex w-fit flex-wrap gap-1" role="group" aria-label="Agrupación temporal">
            {(["day", "week", "month"] as const).map((value) => <Button key={value} type="button" variant={unit === value ? "solid" : "bordered"} color={unit === value ? "primary" : "default"} aria-pressed={unit === value} onClick={() => setUnit(value)}>{value === "day" ? "Día" : value === "week" ? "Semana" : "Mes"}</Button>)}
          </div>
        </div>
        {intervalCount ? <>
          <div className="w-full min-w-0" data-testid="qr-temporal-chart" data-metric={metric}>
            <div className="w-full min-w-0 overflow-x-auto rounded-lg" role="region" aria-label="Gráfico temporal desplazable horizontalmente">
              <svg className="block w-full" width="100%" height={chartHeight} style={{ minWidth: `${chartWidth}px` }} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" role="group" aria-label={`${metricName} por intervalo, período actual y anterior`}>
                {selectedInterval ? <rect
                  data-testid="qr-selected-interval-band"
                  data-interval-index={selectedIndex}
                  x={selectedBandStart}
                  y={margin.top}
                  width={Math.max(0, selectedBandEnd - selectedBandStart)}
                  height={plotHeight}
                  fill="#eef2f5"
                /> : null}
                {grid}
                <line x1={margin.left} y1={plotBottom} x2={margin.left + plotWidth} y2={plotBottom} stroke="#a7adb5" />
                {metric === "satisfaction" ? <>
                  <path d={seriesPath("previousValue")} fill="none" stroke="#5f6368" strokeWidth="2.5" strokeDasharray="7 5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={seriesPath("currentValue")} fill="none" stroke="#9F1212" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </> : null}
                {markers}
                {intervals.map((interval, index) => <rect
                  key={`hit-${interval.index}`}
                  data-qr-interval-target="true"
                  data-interval-index={index}
                  x={selectedBandStart === selectedBandEnd ? x(index) - 24 : index === 0 ? margin.left : (x(index - 1) + x(index)) / 2}
                  y={margin.top}
                  width={Math.max(1, index === intervalCount - 1 ? margin.left + plotWidth - (index === 0 ? margin.left : (x(index - 1) + x(index)) / 2) : (x(index) + x(index + 1)) / 2 - (index === 0 ? margin.left : (x(index - 1) + x(index)) / 2))}
                  height={plotHeight}
                  fill="transparent"
                  role="button"
                  tabIndex={index === focusedIndex ? 0 : -1}
                  aria-label={intervalSelectionLabel(interval)}
                  aria-pressed={interval.index === selectedIndex}
                  className="cursor-pointer focus-visible:stroke-primary focus-visible:stroke-2"
                  onClick={() => selectInterval(interval.index)}
                  onKeyDown={(event) => {
                    moveIntervalFocus(event, interval.index);
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectInterval(interval.index);
                    }
                  }}
                />)}
                {intervals.map((interval, index) => tickIndexes.has(index) ? <text key={`label-${interval.index}`} data-qr-x-label="true" x={x(index)} y={plotBottom + 24} textAnchor="middle" className="fill-foreground/60 text-[10px]">{interval.current ? formatQrChartRange(interval.current) : formatQrChartRange(interval.previous)}</text> : null)}
              </svg>
            </div>
            <div className="mt-2 flex w-full flex-wrap gap-x-5 gap-y-2 text-xs text-foreground/70" role="list" aria-label="Períodos comparados">
              <span className="inline-flex items-center gap-2" role="listitem"><span aria-hidden="true" className={`h-0.5 w-5 ${metric === "satisfaction" ? "bg-[#9F1212]" : "bg-[#0b4795]"}`} />Período analizado</span>
              <span className="inline-flex items-center gap-2" role="listitem"><span aria-hidden="true" className={`h-0.5 w-5 ${metric === "satisfaction" ? "border-t-2 border-dashed border-[#5f6368]" : "bg-[#5f6368]"}`} />Período anterior</span>
            </div>
          </div>
          {selectedInterval ? <>
            <h3 className="text-sm font-semibold">Intervalo seleccionado</h3>
            <div role="status" aria-label="Contexto del intervalo seleccionado" className="w-full space-y-0 divide-y divide-[#d6dee5] rounded-lg bg-[#eef2f5] px-4 py-1 text-sm">
              <div role="group" aria-label="Período actual" className="py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Período actual</p>
                <p className="mt-1 font-semibold tabular-nums">{formatQrChartRange(selectedInterval.current)}</p>
                <p className="mt-1 text-sm text-foreground/80">{formatStatusValue(selectedInterval.current, selectedInterval.currentValue)}</p>
              </div>
              <div role="group" aria-label="Período anterior" className="py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Período anterior</p>
                <p className="mt-1 font-semibold tabular-nums">{formatQrChartRange(selectedInterval.previous)}</p>
                <p className="mt-1 text-sm text-foreground/80">{formatStatusValue(selectedInterval.previous, selectedInterval.previousValue)}</p>
              </div>
            </div>
          </> : null}
          <details className="rounded-lg border border-default-200 px-3 py-2">
            <summary className="cursor-pointer rounded-sm py-1 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Ver datos exactos</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Datos exactos de evolución temporal</caption>
                <thead className="bg-default-100/60"><tr><th scope="col" className="p-2">Intervalo</th><th scope="col" className="p-2">Período actual</th><th scope="col" className="p-2 text-right">{metricName} actual</th><th scope="col" className="p-2">Período anterior</th><th scope="col" className="p-2 text-right">{metricName} anterior</th></tr></thead>
                <tbody>{intervals.map((interval) => <tr key={interval.label} className="border-t border-default-200 even:bg-default-50/70">
                  <th scope="row" aria-current={interval.index === selectedIndex ? "true" : undefined} className="p-2 font-medium">{formatQrExactRange(interval.current)}</th>
                  <td className="p-2 tabular-nums">{formatQrExactRange(interval.current)}</td>
                  <td className="p-2 text-right tabular-nums">{formatValue(interval.current, interval.currentValue)}</td>
                  <td className="p-2 tabular-nums">{formatQrExactRange(interval.previous)}</td>
                  <td className="p-2 text-right tabular-nums">{formatValue(interval.previous, interval.previousValue)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </> : <EmptyState>No hay intervalos temporales disponibles para este punto.</EmptyState>}
      </div>
    </Panel>
  );
}

export function QrModule({ data, options, mode, onMode, selectedKeys, onToggle, detailKey, onDetail, onOpenAspects }: {
  data: FeedbackAdminQrData;
  options: readonly FeedbackAdminPoint[];
  mode: "comparison" | "detail";
  onMode: (_mode: "comparison" | "detail") => void;
  selectedKeys: readonly string[];
  onToggle: (_key: string) => void;
  detailKey: string;
  onDetail: (_key: string) => void;
  onOpenAspects: () => void;
}) {
  const detail = data.points.find((point) => point.pointKey === detailKey) ?? data.points[0];
  const detailMetrics = detail ? [
    { label: "Respuestas recibidas", current: SUMMARY_INTEGER_FORMAT.format(detail.current.submissionCount), previous: SUMMARY_INTEGER_FORMAT.format(detail.previous.submissionCount) },
    { label: "Calificación promedio", current: detail.current.averageMilliStars === null ? "No disponible" : `${SUMMARY_STAR_FORMAT.format(detail.current.averageMilliStars / 1000)} ★`, previous: detail.previous.averageMilliStars === null ? "No disponible" : `${SUMMARY_STAR_FORMAT.format(detail.previous.averageMilliStars / 1000)} ★` },
    { label: "Satisfechos (4–5 estrellas)", current: detail.current.satisfied.rateBps === null ? "No disponible" : `${SUMMARY_NUMBER_FORMAT.format(detail.current.satisfied.rateBps / 100)} %`, previous: detail.previous.satisfied.rateBps === null ? "No disponible" : `${SUMMARY_NUMBER_FORMAT.format(detail.previous.satisfied.rateBps / 100)} %` },
    { label: "Negativos (1–2 estrellas)", current: detail.current.unfavorable.rateBps === null ? "No disponible" : `${SUMMARY_NUMBER_FORMAT.format(detail.current.unfavorable.rateBps / 100)} %`, previous: detail.previous.unfavorable.rateBps === null ? "No disponible" : `${SUMMARY_NUMBER_FORMAT.format(detail.previous.unfavorable.rateBps / 100)} %` },
  ] : [];
  const tabs = ["comparison", "detail"] as const;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectAdjacentTab = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onMode(tabs[next]!);
    tabRefs.current[next]?.focus();
  };
  return (
    <div className="space-y-5">
      <div className="flex w-full min-w-0 gap-1 rounded-xl border bg-background p-1" role="tablist" aria-label="Vistas de puntos QR">
        {tabs.map((item, index) => <Button key={item} type="button" variant="light" color="default" className={`h-11 min-w-0 flex-1 basis-0 rounded-lg px-3 ${mode === item ? "bg-red-50 text-foreground shadow-[inset_0_-2px_0_0_#F01414]" : "text-foreground/70"}`} ref={(node: HTMLButtonElement | null) => { tabRefs.current[index] = node; }} id={`qr-tab-${item}`} role="tab" aria-controls={`qr-panel-${item}`} aria-selected={mode === item} tabIndex={mode === item ? 0 : -1} onClick={() => onMode(item)} onKeyDown={(event) => selectAdjacentTab(event, index)}>{item === "comparison" ? "Comparación" : "Detalle"}</Button>)}
      </div>
      <div role="tabpanel" id={`qr-panel-${mode}`} aria-labelledby={`qr-tab-${mode}`} tabIndex={0}>{mode === "comparison" ? (
        <>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Compará los puntos QR</h2>
              <p className="mt-1 text-sm text-foreground/70">Revisá los indicadores del período para los puntos seleccionados. La tabla conserva los valores exactos.</p>
            </div>
            <section aria-label="Puntos seleccionados para comparar" className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">Puntos QR comparados</h3>
                <p className="text-sm text-foreground/70">{selectedKeys.length} {selectedKeys.length === 1 ? "punto seleccionado" : "puntos seleccionados"}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {options.map((point) => <label key={point.pointKey} className="flex min-h-11 items-center rounded-lg border border-default-200 bg-background px-3 py-2 text-sm">
                  <input className="mr-2 h-4 w-4 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="checkbox" checked={selectedKeys.includes(point.pointKey)} disabled={selectedKeys.length === 1 && selectedKeys.includes(point.pointKey)} onChange={() => onToggle(point.pointKey)} />
                  {point.displayName}
                </label>)}
              </div>
            </section>
          </div>
          <section aria-label="Resumen por punto QR" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
            {data.points.map((point, index) => {
              const spansFullRow = data.points.length % 2 === 1 && index === data.points.length - 1;
              return <article key={point.pointKey} className={`rounded-xl border border-default-200 bg-background p-3 shadow-sm ${spansFullRow ? "md:col-span-2" : ""}`}>
                <h3 className="mb-2 text-base font-semibold">{point.displayName}</h3>
                <div className={`[&>div]:grid-cols-1 [&>div]:sm:grid-cols-2 ${spansFullRow ? "[&>div]:xl:grid-cols-4" : "[&>div]:xl:grid-cols-2"} [&_article]:rounded-lg [&_article]:p-3 [&_p:nth-child(2)]:text-xl`}><Kpis period={point.current} /></div>
              </article>;
            })}
          </section>
          <QrComparisonVolumeChart points={data.points} />
          <Panel title="Datos exactos de comparación por punto"><div className="overflow-x-auto rounded-lg border border-default-200"><table className="min-w-[640px] w-full text-left text-sm"><caption className="sr-only">Datos exactos de comparación por punto QR</caption><thead className="bg-default-100/60"><tr><th scope="col" className="p-3">Punto</th><th scope="col" className="p-3 text-right">Respuestas</th><th scope="col" className="p-3 text-right">Calificación</th><th scope="col" className="p-3 text-right">Satisfacción</th><th scope="col" className="p-3 text-right">Desfavorable</th></tr></thead><tbody>{data.points.map((point) => <tr key={point.pointKey} className="border-t border-default-200 even:bg-default-50/70"><th className="p-3 font-semibold">{point.displayName}</th><td className="p-3 text-right tabular-nums">{point.current.submissionCount}</td><td className="p-3 text-right tabular-nums">{stars(point.current.averageMilliStars)}</td><td className="p-3 text-right tabular-nums">{percent(point.current.satisfied.rateBps)}</td><td className="p-3 text-right tabular-nums">{percent(point.current.unfavorable.rateBps)}</td></tr>)}</tbody></table></div></Panel>
        </>
      ) : detail ? (
        <>
          <div className="space-y-4">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/60">Puntos QR</p>
              <h2 className="mt-1 text-xl font-semibold">Detalle del punto QR</h2>
              <p className="mt-1 text-sm text-foreground/70">Consultá los indicadores y la evolución de respuestas del punto seleccionado.</p>
            </header>
            <section aria-label="Punto QR analizado" className="grid gap-3 rounded-xl border border-default-200 bg-content1/40 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,22rem)] sm:items-end">
              <div>
                <h3 className="font-semibold">Punto QR analizado</h3>
                <p className="mt-1 text-sm text-foreground/70">El período y los indicadores corresponden al punto seleccionado.</p>
              </div>
              <label className="flex flex-col gap-2 text-sm font-semibold">Punto<select className="rounded-xl border border-default-200 bg-background p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={detail.pointKey} onChange={(event) => onDetail(event.target.value)}>{options.map((point) => <option key={point.pointKey} value={point.pointKey}>{point.displayName}</option>)}</select></label>
            </section>
          </div>
          <section aria-label="Indicadores del punto QR">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {detailMetrics.map((metric) => <article key={metric.label} className="min-h-0 rounded-lg border border-default-200 bg-background p-3">
                <h3 className="text-sm font-semibold leading-snug text-foreground/70">{metric.label}</h3>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{metric.current}</p>
                <p className="mt-1 text-sm text-foreground/60">Anterior: {metric.previous}</p>
              </article>)}
            </div>
          </section>
          {detail.current.submissionCount === 0 ? <p role="status" className="rounded-lg border border-default-200 bg-default-50 p-3 text-sm text-foreground/70">No hay respuestas para este punto en el período seleccionado.</p> : null}
          <section aria-label="Tendencias del punto QR" className="space-y-4">
            <Panel title="Distribución de estrellas">
              <ul aria-label="Distribución de estrellas del punto QR" className="space-y-3">
                {[...detail.current.starDistribution].sort((left, right) => right.star - left.star).map((item) => (
                  <li key={item.star} className="grid grid-cols-[minmax(5.5rem,auto)_minmax(4rem,1fr)_auto] items-center gap-3 text-sm">
                    <span className="font-medium">{item.star} estrellas</span>
                    <div role="progressbar" aria-label={`${item.star} estrellas`} aria-valuemin={0} aria-valuemax={Math.max(detail.current.submissionCount, 1)} aria-valuenow={item.count} aria-valuetext={`${item.count} de ${detail.current.submissionCount}; ${percent(item.rateBps)}`} className="h-2 overflow-hidden rounded-full bg-default-100">
                      {item.rateBps === null ? null : <div aria-hidden="true" className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, item.rateBps / 100))}%` }} />}
                    </div>
                    <span className="whitespace-nowrap text-right tabular-nums">{item.count} / {detail.current.submissionCount} <span className="text-foreground/60">({percent(item.rateBps)})</span></span>
                  </li>
                ))}
              </ul>
            </Panel>
            <QrTemporalPanel calendar={data.calendar} pointKey={detail.pointKey} />
          </section>
          <Panel title="Contexto de aspectos"><p>{data.aspects.length ? `${data.aspects.length} aspectos disponibles en esta población filtrada por punto.` : "No hay evidencia de aspectos para este punto."}</p><Button type="button" variant="bordered" color="primary" className="mt-3" onClick={onOpenAspects}>Abrir aspectos filtrados por punto</Button></Panel>
        </>
      ) : <EmptyState>No hay puntos QR disponibles para el detalle.</EmptyState>}</div>
    </div>
  );
}

type CommentFilterState = {
  text: string;
  aspectKey: string;
  ratings: (1 | 2 | 3 | 4 | 5)[];
  pointKey: string;
  locale: "" | "es" | "en" | "pt";
};

const EMPTY_COMMENT_FILTERS: CommentFilterState = { text: "", aspectKey: "", ratings: [], pointKey: "", locale: "" };
const REPORTING_TIME_ZONE = "America/Argentina/Buenos_Aires";

function dateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", { hour12: false, timeZone: REPORTING_TIME_ZONE });
}

function previousEquivalentPeriod(range: { from: string; to: string }) {
  try {
    return normalizePeriod(range).previous;
  } catch {
    return null;
  }
}

function commentRating(value: { overallRating: number }) {
  return "★".repeat(value.overallRating) + "☆".repeat(5 - value.overallRating);
}

export function CommentsReportsModule({ period, points, aspects }: {
  period: Period;
  points: readonly FeedbackAdminPoint[];
  aspects: FeedbackAdminSummaryData["aspects"];
}) {
  const [filters, setFilters] = useState<CommentFilterState>(EMPTY_COMMENT_FILTERS);
  const [ratingFilterOpen, setRatingFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [generationsPage, setGenerationsPage] = useState(1);
  const [generationStatus, setGenerationStatus] = useState<FeedbackAdminCommandStatus | "all">("all");
  const [comments, setComments] = useState<FeedbackAdminCommentsData | null>(null);
  const [generations, setGenerations] = useState<FeedbackAdminGenerationsEnvelope["data"] | null>(null);
  const [commentsState, setCommentsState] = useState<"loading" | "ready" | "error">("loading");
  const [commentsRetry, setCommentsRetry] = useState(0);
  const [generationsRetry, setGenerationsRetry] = useState(0);
  const [generationsState, setGenerationsState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedComment, setSelectedComment] = useState<FeedbackAdminComment | null>(null);
  const [reportPeriod, setReportPeriod] = useState(period);
  const [generation, setGeneration] = useState<{ reportRunId: string; status: string } | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [overlap, setOverlap] = useState<FeedbackAdminOverlapDetails | null>(null);
  const [overrideAccepted, setOverrideAccepted] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [retryingGenerationId, setRetryingGenerationId] = useState("");
  const [downloadingReportId, setDownloadingReportId] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const commandBusyRef = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const ratingFilterRef = useRef<HTMLDivElement>(null);
  const ratingTriggerRef = useRef<HTMLButtonElement>(null);
  const closeDetailRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pointLabels = useMemo(() => new Map(points.map((point) => [point.pointKey, point.displayName])), [points]);
  const aspectLabels = useMemo(() => new Map(aspects.map((aspect) => [aspect.aspectKey, aspectLabel(aspect)])), [aspects]);
  const resultKey = `${period.from}:${period.to}:${filters.text}:${filters.aspectKey}:${filters.ratings.join(",")}:${filters.pointKey}:${filters.locale}:${page}`;

  useEffect(() => {
    const controller = new AbortController();
    let requestActive = true;
    const params = new URLSearchParams({ from: period.from, to: period.to, page: String(page), pageSize: "25" });
    if (filters.text) params.set("text", filters.text);
    if (filters.aspectKey) params.set("aspectKey", filters.aspectKey);
    if (filters.pointKey) params.set("pointKey", filters.pointKey);
    if (filters.locale) params.set("locale", filters.locale);
    filters.ratings.forEach((rating) => params.append("rating", String(rating)));
    setComments(null);
    setCommentsState("loading");
    read<FeedbackAdminCommentsData>(`/api/admin/feedback/comments?${params}`, controller.signal)
      .then(({ data }) => {
        if (!requestActive) return;
        setComments(data);
        setCommentsState("ready");
      })
      .catch((error: unknown) => {
        if (requestActive && !(error instanceof DOMException && error.name === "AbortError")) setCommentsState("error");
      });
    return () => { requestActive = false; controller.abort(); };
  }, [filters, page, period.from, period.to, commentsRetry]);

  useEffect(() => {
    const controller = new AbortController();
    let requestActive = true;
    const params = new URLSearchParams({ from: period.from, to: period.to, page: String(generationsPage), pageSize: "25" });
    if (generationStatus !== "all") params.set("status", generationStatus);
    setGenerations(null);
    setGenerationsState("loading");
    readGenerations(`/api/admin/feedback/generations?${params}`, controller.signal)
      .then(({ data }) => {
        if (!requestActive) return;
        setGenerations(data);
        setGenerationsState("ready");
      })
      .catch((error: unknown) => {
        if (requestActive && !(error instanceof DOMException && error.name === "AbortError")) setGenerationsState("error");
      });
    return () => { requestActive = false; controller.abort(); };
  }, [period.from, period.to, generationsPage, generationStatus, generationsRetry]);

  useEffect(() => {
    if (resultsRef.current) resultsRef.current.scrollTop = 0;
  }, [resultKey]);

  useEffect(() => {
    setPage(1);
    setGenerationsPage(1);
    setOverlap(null);
    setOverrideAccepted(false);
  }, [period.from, period.to]);

  useEffect(() => {
    if (!selectedComment) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }
    closeDetailRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedComment(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedComment]);

  useEffect(() => {
    if (!ratingFilterOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !ratingFilterRef.current?.contains(event.target)) {
        setRatingFilterOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setRatingFilterOpen(false);
      ratingTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [ratingFilterOpen]);

  const updateFilters = (next: Partial<CommentFilterState>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };
  const pageCount = comments ? Math.max(1, Math.ceil(comments.total / comments.pageSize)) : 1;
  const generationsPageCount = generations ? Math.max(1, Math.ceil(generations.total / generations.pageSize)) : 1;
  const command = async (path: string, body: unknown) => {
    if (commandBusyRef.current) return;
    commandBusyRef.current = true;
    setCommandBusy(true);
    try {
      const response = await authenticatedInternalApiFetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const value = (await response.json().catch(() => null)) as { reportRunId?: string; status?: string; error?: { message?: string; details?: FeedbackAdminOverlapDetails } } | null;
      if (!response.ok) {
        if (response.status === 409 && value?.error?.details) setOverlap(value.error.details);
        throw new Error(value?.error?.message ?? "El comando del informe no está disponible temporalmente.");
      }
      setOverlap(null);
      setOverrideAccepted(false);
      setGeneration(value?.reportRunId && value.status ? { reportRunId: value.reportRunId, status: value.status } : null);
      setGenerationsRetry((current) => current + 1);
    } finally {
      commandBusyRef.current = false;
      setCommandBusy(false);
    }
  };
  const generate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (commandBusyRef.current) return;
    setGenerationError("");
    if (!reportPeriod.from || !reportPeriod.to || reportPeriod.from > reportPeriod.to) {
      setGenerationError("Elegí un rango válido: la fecha inicial debe ser anterior o igual a la fecha final.");
      return;
    }
    if (overlap && !overrideAccepted) {
      setGenerationError("Confirmá la generación para este rango antes de volver a solicitarla.");
      return;
    }
    try {
      await command("/api/admin/feedback/generations", { contractVersion: "feedback-admin.v1", period: reportPeriod, override: { accepted: overrideAccepted, overlapDigest: overlap?.overlapDigest ?? null } });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "No se pudo solicitar el informe.");
    }
  };
  const retry = async (reportRunId: string) => {
    if (commandBusyRef.current) return;
    setGenerationError("");
    setRetryingGenerationId(reportRunId);
    try {
      await command(`/api/admin/feedback/generations/${reportRunId}/retry`, { contractVersion: "feedback-admin.v1" });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "No se pudo reintentar el informe.");
    } finally {
      setRetryingGenerationId("");
    }
  };
  const downloadReport = async (reportId: string) => {
    if (downloadingReportId) return;
    setDownloadingReportId(reportId);
    setDownloadError("");
    try {
      const response = await authenticatedInternalApiFetch(
        `/api/admin/feedback/reports/${reportId}/download`,
        { method: "GET" },
      );
      if (
        !response.ok ||
        !/^application\/pdf(?:\s*;|$)/i.test(
          response.headers.get("content-type") ?? "",
        )
      )
        throw new Error("REPORT_DOWNLOAD_UNAVAILABLE");
      const blob = await response.blob();
      const signature = new TextDecoder().decode(
        new Uint8Array(await blob.slice(0, 5).arrayBuffer()),
      );
      if (signature !== "%PDF-") throw new Error("INVALID_PDF");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `feedback-report-${reportId}.pdf`;
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch {
      setDownloadError("No se pudo descargar el informe. Probá de nuevo.");
    } finally {
      setDownloadingReportId("");
    }
  };

  return (
    <div className="space-y-5">
      <section aria-label="Filtros de comentarios" className="space-y-4 rounded-xl border bg-background p-4">
          <div>
            <h3 className="font-semibold">Filtros de comentarios</h3>
            <p className="mt-1 text-sm text-foreground/70">Filtrá las opiniones por su contexto y después buscá únicamente dentro del texto escrito por visitantes.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[761px]:grid-cols-2 min-[1051px]:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-semibold text-[#34445c]">Aspecto<select className="h-11 rounded-lg border border-[#a7b8ce] bg-white px-3 text-[#17263c]" value={filters.aspectKey} onChange={(event) => updateFilters({ aspectKey: event.target.value })}><option value="">Todos los aspectos</option>{aspects.map((aspect) => <option key={aspect.aspectKey} value={aspect.aspectKey}>{aspectLabel(aspect)}</option>)}</select></label>
            <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold">Valoración</legend><div ref={ratingFilterRef} className="relative">
              <Button ref={ratingTriggerRef} type="button" variant="bordered" color="default" aria-expanded={ratingFilterOpen} aria-controls="comment-rating-options" className="h-11 min-h-11 w-full justify-between rounded-lg border-[#a7b8ce] px-3 py-2 text-left text-[#17263c]" onClick={() => setRatingFilterOpen((open) => !open)}>
                <span>{filters.ratings.length ? filters.ratings.slice().sort((left, right) => left - right).map((rating) => `${rating} ★`).join(", ") : "Todas las valoraciones"}</span>
                <span aria-hidden="true">⌄</span>
              </Button>
              {ratingFilterOpen ? <div id="comment-rating-options" role="group" aria-label="Seleccionar valoraciones" className="absolute left-0 top-full z-20 mt-2 grid w-full grid-cols-1 gap-2 rounded-lg border border-[#a7b8ce] bg-white p-3 text-[#17263c] shadow-lg">
                {([1, 2, 3, 4, 5] as const).map((rating) => <label key={rating} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-primary"><input className="h-4 w-4 accent-primary" type="checkbox" aria-label={rating === 1 ? "1 estrella" : `${rating} estrellas`} checked={filters.ratings.includes(rating)} onChange={() => updateFilters({ ratings: filters.ratings.includes(rating) ? filters.ratings.filter((value) => value !== rating) : [...filters.ratings, rating] })} />{rating} ★</label>)}
              </div> : null}
            </div></fieldset>
            <label className="flex flex-col gap-1 text-sm font-semibold text-[#34445c]">Punto QR<select className="h-11 rounded-lg border border-[#a7b8ce] bg-white px-3 text-[#17263c]" value={filters.pointKey} onChange={(event) => updateFilters({ pointKey: event.target.value })}><option value="">Todos los puntos</option>{points.map((point) => <option key={point.pointKey} value={point.pointKey}>{point.displayName}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-[#34445c]">Idioma<select className="h-11 rounded-lg border border-[#a7b8ce] bg-white px-3 text-[#17263c]" value={filters.locale} onChange={(event) => updateFilters({ locale: event.target.value as CommentFilterState["locale"] })}><option value="">Todos los idiomas</option><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option></select></label>
          </div>
          <div>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-[#34445c]">Buscar en comentarios<input className="h-11 rounded-lg border border-[#a7b8ce] bg-white px-3 text-[#17263c]" placeholder="Buscar texto del comentario…" value={filters.text} onChange={(event) => updateFilters({ text: event.target.value })} /></label>
          </div>
          {filters.text || filters.aspectKey || filters.ratings.length > 0 || filters.pointKey || filters.locale ? <div className="flex justify-end"><Button type="button" variant="bordered" color="default" className="w-full border-[#a7b8ce] text-[#17263c] min-[641px]:w-auto" onClick={() => { setFilters(EMPTY_COMMENT_FILTERS); setPage(1); }}>Limpiar filtros</Button></div> : null}
      </section>
      <Panel title="Comentarios">
        {commentsState === "loading" ? <div role="status" aria-live="polite"><Spinner label="Cargando comentarios" /></div> : null}
        {commentsState === "error" ? <div role="alert" className="rounded-xl border border-dashed p-4"><p>Los comentarios no están disponibles temporalmente.</p><Button type="button" variant="bordered" color="primary" className="mt-3" onClick={() => setCommentsRetry((value) => value + 1)}>Reintentar comentarios</Button></div> : null}
        {commentsState === "ready" && comments ? <>
          <p role="status" className="text-sm text-foreground/70">{comments.total} comentarios encontrados. Se muestran 25 por página.</p>
          {comments.total > 0 && comments.total < 10 ? <p role="status" className="rounded-xl border p-3 text-sm">Hay pocos comentarios en este alcance; interpretá las tendencias con cautela.</p> : null}
          <div ref={resultsRef} className="max-h-[32rem] overflow-y-auto rounded-xl border" aria-label="Resultados de comentarios">
            {comments.items.length ? <>
               <div className="hidden md:block"><table className="w-full text-left text-sm"><caption className="sr-only">Comentarios filtrados</caption><thead className="sticky top-0 bg-background"><tr><th className="p-3">Fecha</th><th className="p-3">Punto QR</th><th className="p-3">Calificación</th><th className="p-3">Idioma</th><th className="p-3">Comentario</th></tr></thead><tbody>{comments.items.map((comment) => <tr key={comment.recordId} className="border-t"><td className="p-3">{dateTime(comment.acceptedAt)}</td><td className="p-3">{pointLabels.get(comment.pointKey) ?? comment.pointKey}</td><td className="p-3" aria-label={`${comment.overallRating} de 5 estrellas`}>{commentRating(comment)}</td><td className="p-3 uppercase">{comment.locale}</td><td className="p-3"><Button type="button" variant="light" className="h-auto min-h-0 whitespace-normal p-0 text-left underline decoration-primary underline-offset-2" onClick={(event) => { previousFocusRef.current = event.currentTarget as HTMLElement; setSelectedComment(comment); }}>{comment.text}</Button></td></tr>)}</tbody></table></div>
               <div className="space-y-3 p-3 md:hidden">{comments.items.map((comment) => <Button key={comment.recordId} type="button" variant="bordered" color="default" className="block h-auto w-full whitespace-normal p-4 text-left" onClick={(event) => { previousFocusRef.current = event.currentTarget as HTMLElement; setSelectedComment(comment); }}><p className="font-semibold">{comment.text}</p><p className="mt-2 text-sm text-foreground/70">{dateTime(comment.acceptedAt)} · {pointLabels.get(comment.pointKey) ?? comment.pointKey}</p><p className="text-sm" aria-label={`${comment.overallRating} de 5 estrellas`}>{commentRating(comment)} · {comment.locale.toUpperCase()}</p></Button>)}</div>
            </> : <EmptyState>No hay comentarios para estos filtros. Probá con otro aspecto, punto, idioma o rango.</EmptyState>}
          </div>
          <nav aria-label="Paginación de comentarios" className="flex items-center justify-between gap-3"><Button type="button" variant="bordered" isDisabled={page <= 1} className="px-4" onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-sm">Página {page} de {pageCount}</span><Button type="button" variant="bordered" isDisabled={page >= pageCount} className="px-4" onClick={() => setPage((value) => value + 1)}>Siguiente</Button></nav>
        </> : null}
      </Panel>

      <section aria-label="Análisis con IA" className="space-y-4 rounded-lg border border-[#e3e3e5] bg-white p-4 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold">Análisis con IA</h2>
          <p className="mt-1 max-w-[650px] text-[13px] text-foreground/70">El informe combina estadísticas calculadas por el sistema y comentarios de encuestas anónimas del período seleccionado con los del período anterior equivalente. La IA identifica patrones y elabora conclusiones a partir de los comentarios y las estadísticas proporcionadas. Las métricas oficiales las calcula el sistema.</p>
        </header>

        <section aria-labelledby="feedback-report-generation-heading" className="space-y-3">
          <div>
            <h3 id="feedback-report-generation-heading" className="font-semibold">Generación de informe</h3>
            <p className="mt-1 text-sm text-foreground/70">Al ingresar, estas fechas toman el período global. Después podés ajustarlas sin cambiar el análisis del tablero. El período anterior de igual duración se calcula automáticamente.</p>
          </div>
          <div className="rounded-lg border border-[#e3e3e5] bg-[#f4f4f5] p-3.5">
            <form aria-label="Generación de informe" className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={generate} noValidate>
              {(["from", "to"] as const).map((key) => <label key={key} className="flex flex-col gap-1 text-sm font-semibold">{key === "from" ? "Fecha inicial" : "Fecha final"}<input type="date" required className="h-11 rounded-lg border border-[#a7b8ce] bg-white px-3 text-[#17263c]" value={reportPeriod[key]} onChange={(event) => { setReportPeriod((current) => ({ ...current, [key]: event.target.value })); setOverlap(null); setOverrideAccepted(false); }} /></label>)}
              <Button type="submit" color="primary" variant="solid" isDisabled={commandBusy || Boolean(overlap && !overrideAccepted)} isLoading={commandBusy} aria-label={commandBusy ? "Solicitando…" : undefined}>{commandBusy ? "Solicitando…" : "Solicitar informe"}</Button>
            </form>
          </div>
          <p className="text-sm text-foreground/70">Los filtros exploratorios del tablero y la paginación de comentarios no modifican el alcance del informe.</p>
          {overlap ? <div className="rounded-xl border p-4" role="alert"><p>El rango se cruza con historial existente. Elegí otro rango o confirmá la generación.</p><ul className="mt-2 list-disc pl-5 text-sm">{overlap.overlaps.map((item) => <li key={item.reportRunId}>{item.intersection.from}–{item.intersection.to}</li>)}</ul><label className="mt-3 block text-sm"><input type="checkbox" className="mr-2" checked={overrideAccepted} onChange={(event) => setOverrideAccepted(event.target.checked)} />Confirmo generar una nueva instantánea para este rango</label></div> : null}
          {generationError ? <p role="alert" className="rounded-xl border p-3">{generationError}</p> : null}
          {generation ? <p role="status" className="rounded-xl border p-3">Solicitud {generation.reportRunId}: {generation.status === "queued" ? "en cola" : generation.status}.</p> : null}
        </section>
        <section aria-labelledby="feedback-report-history-heading" className="space-y-3 border-t border-[#e3e3e5] pt-4">
          <h3 id="feedback-report-history-heading" className="font-semibold">Historial de informes</h3>
          <p className="text-sm text-foreground/70">Cada informe conserva el período, la comparación y los datos utilizados al generarlo. Los filtros actuales y las respuestas posteriores no modifican esa instantánea.</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">Estado del informe<select className="rounded-xl border bg-background p-3" value={generationStatus} onChange={(event) => { setGenerationStatus(event.target.value as FeedbackAdminCommandStatus | "all"); setGenerationsPage(1); }}><option value="all">Todos los estados</option><option value="queued">En cola</option><option value="running">En curso</option><option value="succeeded">Completados</option><option value="failed">Fallidos</option></select></label>
            <Button type="button" variant="bordered" color="primary" isDisabled={generationsState === "loading"} isLoading={generationsState === "loading"} aria-label="Actualizar historial" onClick={() => setGenerationsRetry((current) => current + 1)}>Actualizar historial</Button>
          </div>
          {generationsState === "loading" ? <div role="status" aria-live="polite"><Spinner label="Cargando historial de informes" /></div> : null}
          {generationsState === "error" ? <div role="alert" className="rounded-xl border border-dashed p-4"><p>El historial de informes no está disponible temporalmente.</p><Button type="button" variant="bordered" color="primary" className="mt-3" onClick={() => setGenerationsRetry((current) => current + 1)}>Reintentar historial</Button></div> : null}
          {generationsState === "ready" && generations ? generations.items.length ? <>
            <div role="region" aria-label="Tabla de historial de informes" tabIndex={0} className="overflow-x-auto rounded-xl border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <table className="min-w-[980px] w-full text-left text-sm">
                <caption className="sr-only">Historial de informes</caption>
                <thead className="bg-background"><tr><th scope="col" className="p-3">Informe</th><th scope="col" className="p-3">Período</th><th scope="col" className="p-3">Período anterior equivalente</th><th scope="col" className="p-3">Fechas</th><th scope="col" className="p-3">Datos analizados</th><th scope="col" className="p-3">Estado y detalle</th><th scope="col" className="p-3">Acciones</th></tr></thead>
                <tbody>{generations.items.map((item) => {
                  const previousPeriod = previousEquivalentPeriod(item.period);
                  return <tr key={item.reportRunId} className="border-t align-top">
                  <td className="p-3"><p className="font-semibold">{item.status === "succeeded" ? `Feedback report ${item.period.from}–${item.period.to}` : "Informe de comentarios"}</p><p className="break-all text-xs text-foreground/70">Ejecución <span translate="no">{item.reportRunId}</span></p>{item.report ? <p className="break-all text-xs text-foreground/70">Informe <span translate="no">{item.report.reportId}</span></p> : null}</td>
                  <td className="p-3">{item.period.from}–{item.period.to}</td>
                  <td className="p-3">{previousPeriod ? `${previousPeriod.from}–${previousPeriod.to}` : "No disponible"}</td>
                  <td className="p-3"><p>Solicitado {dateTime(item.createdAt)}</p>{item.report ? <p className="mt-1 text-foreground/70">Generado {dateTime(item.report.createdAt)}</p> : item.completedAt ? <p className="mt-1 text-foreground/70">Finalizado {dateTime(item.completedAt)}</p> : null}</td>
                  <td className="p-3">{item.report ? <>{item.report.analyzedResponseCount} respuestas · {item.report.analyzedCommentCount} comentarios</> : <span className="text-foreground/60">No disponible para este estado</span>}</td>
                  <td className="p-3"><span data-generation-status={item.status} className="inline-flex rounded-full border px-2.5 py-1 font-semibold">{GENERATION_STATUS_LABELS[item.status]}</span>{item.retryOfReportRunId ? <p className="mt-2 text-foreground/70">Reintento de <span className="break-all font-medium" translate="no">{item.retryOfReportRunId}</span></p> : null}{item.status === "failed" ? <p role="status" className="mt-2">{item.safeFailureMessage ?? "No se pudo completar el informe."}</p> : null}</td>
                  <td className="p-3">{item.report?.canDownload ? <Button type="button" variant="bordered" color="primary" isDisabled={Boolean(downloadingReportId)} isLoading={downloadingReportId === item.report.reportId} aria-label={downloadingReportId === item.report.reportId ? "Descargando…" : undefined} onClick={() => void downloadReport(item.report!.reportId)}>{downloadingReportId === item.report.reportId ? "Descargando…" : "Descargar PDF"}</Button> : null}{item.status === "failed" ? <Button type="button" variant="bordered" color="primary" isDisabled={commandBusy} isLoading={commandBusy && retryingGenerationId === item.reportRunId} aria-label={commandBusy && retryingGenerationId === item.reportRunId ? "Reintentando…" : undefined} className={item.report?.canDownload ? "mt-2" : undefined} onClick={() => void retry(item.reportRunId)}>{commandBusy && retryingGenerationId === item.reportRunId ? "Reintentando…" : "Reintentar generación"}</Button> : null}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            {downloadError ? <p role="alert" className="rounded-xl border p-3">{downloadError}</p> : null}
            <nav aria-label="Paginación de informes" className="flex items-center justify-between gap-3"><Button type="button" variant="bordered" isDisabled={generationsPage <= 1} className="px-4" onClick={() => setGenerationsPage((value) => value - 1)}>Anterior</Button><span className="text-sm">Página {generationsPage} de {generationsPageCount}</span><Button type="button" variant="bordered" isDisabled={generationsPage >= generationsPageCount} className="px-4" onClick={() => setGenerationsPage((value) => value + 1)}>Siguiente</Button></nav>
          </> : <EmptyState>No hay informes para este período y estado.</EmptyState> : null}
        </section>
      </section>

      {selectedComment ? <div role="dialog" aria-modal="true" aria-labelledby="feedback-comment-detail" className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><h2 id="feedback-comment-detail" className="text-xl font-semibold">Detalle del comentario</h2><Button ref={closeDetailRef} type="button" variant="bordered" color="default" aria-label="Cerrar detalle" className="px-3 py-1" onClick={() => setSelectedComment(null)}>Cerrar</Button></div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Fecha</dt><dd>{dateTime(selectedComment.acceptedAt)}</dd></div><div><dt className="font-semibold">Punto QR</dt><dd>{pointLabels.get(selectedComment.pointKey) ?? selectedComment.pointKey}</dd></div><div><dt className="font-semibold">Idioma</dt><dd>{selectedComment.locale.toUpperCase()}</dd></div><div><dt className="font-semibold">Calificación general</dt><dd>{selectedComment.overallRating}/5</dd></div></dl><p className="mt-4 rounded-xl border p-4">{selectedComment.text}</p><h3 className="mt-5 font-semibold">Evaluaciones por aspecto</h3><div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Evaluaciones individuales del comentario</caption><thead><tr><th className="p-2">Aspecto</th><th className="p-2">Evaluación</th></tr></thead><tbody>{selectedComment.aspectRatings.map((item) => <tr key={item.aspectKey} className="border-t"><th className="p-2">{aspectLabels.get(item.aspectKey) ?? item.aspectKey}</th><td className="p-2">{item.rating === "positive" ? "Positivo" : item.rating === "negative" ? "Negativo" : "Neutral"}</td></tr>)}</tbody></table></div></div></div> : null}
    </div>
  );
}

export default function FeedbackDashboard() {
  const [module, setModule] = useState<Module>("summary");
  const [periodInput, setPeriodInput] = useState<Period>(initialPeriod);
  const [period, setPeriod] = useState(periodInput);
  const [summary, setSummary] = useState<FeedbackAdminSummaryData | null>(null);
  const [population, setPopulation] = useState<FeedbackAdminSnapshot["population"] | null>(null);
  const [aspects, setAspects] = useState<FeedbackAdminAspectsData | null>(null);
  const [qr, setQr] = useState<FeedbackAdminQrData | null>(null);
  const [aspectPoint, setAspectPoint] = useState("");
  const [aspectKey, setAspectKey] = useState("");
  const [qrMode, setQrMode] = useState<"comparison" | "detail">("comparison");
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [detailPoint, setDetailPoint] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [moduleRetry, setModuleRetry] = useState(0);
  const [summaryPeriodKey, setSummaryPeriodKey] = useState("");
  const summaryPeriodKeyRef = useRef("");
  const [periodError, setPeriodError] = useState("");
  const [periodEditorOpen, setPeriodEditorOpen] = useState(false);
  const periodErrorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (periodError) periodErrorRef.current?.focus(); }, [periodError]);

  useEffect(() => {
    const controller = new AbortController();
    const periodKey = `${period.from}:${period.to}`;
    const periodChanged = summaryPeriodKeyRef.current !== periodKey;
    let requestActive = true;
    if (periodChanged) {
      setSummary(null);
      setPopulation(null);
      setAspects(null);
      setQr(null);
      setSelectedPoints([]);
      setDetailPoint("");
    }
    setState("loading");
    read<FeedbackAdminSummaryData>(`/api/admin/feedback/summary?${query(period)}`, controller.signal)
      .then(({ data, meta }) => {
        if (!requestActive) return;
        setSummary(data);
        setPopulation(meta.population);
        summaryPeriodKeyRef.current = periodKey;
        setSummaryPeriodKey(periodKey);
        const keys = data.availablePoints.map((point) => point.pointKey);
        setSelectedPoints((current) => {
          const retained = current.filter((key) => keys.includes(key));
          return retained.length ? retained : keys;
        });
        setDetailPoint((current) => keys.includes(current) ? current : (keys[0] ?? ""));
        setState("ready");
      })
      .catch((error: unknown) => { if (requestActive && !(error instanceof DOMException && error.name === "AbortError")) setState("error"); });
    return () => { requestActive = false; controller.abort(); };
  }, [period, summaryRetry]);

  useEffect(() => {
    const periodKey = `${period.from}:${period.to}`;
    if (module !== "aspects" || summaryPeriodKey !== periodKey) return;
    const controller = new AbortController();
    let requestActive = true;
    setState("loading");
    read<FeedbackAdminAspectsData>(`/api/admin/feedback/aspects?${query(period, aspectPoint ? { pointKey: aspectPoint } : {})}`, controller.signal)
      .then(({ data }) => { if (!requestActive) return; setAspects(data); setAspectKey((current) => data.aspects.some((item) => item.aspectKey === current) ? current : (data.aspects[0]?.aspectKey ?? "")); setState("ready"); })
      .catch((error: unknown) => { if (requestActive && !(error instanceof DOMException && error.name === "AbortError")) setState("error"); });
    return () => { requestActive = false; controller.abort(); };
  }, [aspectPoint, module, period, summaryPeriodKey, moduleRetry]);

  const availablePoints = summary?.availablePoints ?? EMPTY_AVAILABLE_POINTS;
  const qrKeys = useMemo(() => selectedPoints.filter((key) => availablePoints.some((point) => point.pointKey === key)), [availablePoints, selectedPoints]);
  useEffect(() => {
    const periodKey = `${period.from}:${period.to}`;
    if (module !== "qr" || summaryPeriodKey !== periodKey || !detailPoint || (qrMode === "comparison" && qrKeys.length === 0)) return;
    const controller = new AbortController();
    let requestActive = true;
    setState("loading");
    const values = qrMode === "comparison" ? { view: "comparison", pointKeys: qrKeys.join(",") } : { view: "detail", pointKey: detailPoint };
    read<FeedbackAdminQrData>(`/api/admin/feedback/qr-points?${query(period, values)}`, controller.signal)
      .then(({ data }) => { if (!requestActive) return; setQr(data); setState("ready"); })
      .catch((error: unknown) => { if (requestActive && !(error instanceof DOMException && error.name === "AbortError")) setState("error"); });
    return () => { requestActive = false; controller.abort(); };
  }, [detailPoint, module, period, qrKeys, qrMode, summaryPeriodKey, moduleRetry]);

  const periodForm = <form className="flex flex-wrap items-end gap-3" noValidate onSubmit={(event) => {
    event.preventDefault();
    if (!periodInput.from || !periodInput.to || periodInput.from > periodInput.to) {
      setPeriodError("El período es inválido. La fecha desde debe ser anterior o igual a la fecha hasta.");
      return;
    }
    setPeriodError("");
    setPeriod(periodInput);
    setPeriodEditorOpen(false);
  }}>
    {(["from", "to"] as const).map((key) => <label key={key} className="flex flex-col gap-1 text-sm font-semibold">{key === "from" ? "Desde" : "Hasta"}<input type="date" required aria-invalid={Boolean(periodError)} aria-describedby={periodError ? "feedback-period-error" : undefined} value={periodInput[key]} onChange={(event) => setPeriodInput((current) => ({ ...current, [key]: event.target.value }))} className="rounded-lg border bg-background p-2" /></label>)}
    <Button type="submit" color="primary" variant="solid">Analizar período</Button>
  </form>;
  const selectedRange = population ? { from: population.current.from, to: population.current.to } : period;
  const comparisonRange = population
    ? { from: population.previous.from, to: population.previous.to }
    : normalizePeriod(period).previous;
  const periodErrorMessage = periodError ? <p ref={periodErrorRef} id="feedback-period-error" role="alert" tabIndex={-1} className="rounded-lg border border-primary p-3 text-sm">{periodError}</p> : null;

  return (
    <div className="mx-auto w-full max-w-[1536px] space-y-5 px-4 pb-10 md:px-8">
      <h1 className="sr-only">Feedback del público</h1>
      <a href="#feedback-dashboard-main" className="sr-only rounded-md bg-background p-3 focus:not-sr-only focus:absolute focus:z-50">Saltar al contenido de Feedback del público</a>
      <nav aria-label="Módulos de Feedback del público" className="flex h-[53px] w-full gap-0 overflow-x-auto border-b border-default-200 bg-transparent">
        {MODULES.map((item) => <Button key={item.key} type="button" variant="light" radius="none" color="default" aria-current={item.key === module ? "page" : undefined} className={`!relative !h-full !min-w-max !shrink-0 !rounded-none !border-0 !bg-transparent !px-4 !py-0 !shadow-none after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:content-[''] hover:!bg-transparent data-[hover=true]:!bg-transparent focus-visible:!ring-2 focus-visible:!ring-primary focus-visible:!ring-offset-2 ${item.key === module ? "!text-primary after:bg-primary" : "!text-foreground/60 after:bg-transparent"}`} onClick={() => setModule(item.key)}>{item.label}</Button>)}
      </nav>
      <section aria-label="Período analizado" className="space-y-3 rounded-lg border border-[#e3e3e5] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Período analizado</h2>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3"><strong>{displayPeriod(selectedRange)}</strong><span className="text-sm text-foreground/70">{inclusiveDays(selectedRange)} días</span></p>
          </div>
          <Button type="button" variant="bordered" color="default" aria-expanded={periodEditorOpen} aria-controls="feedback-summary-period-editor" onClick={() => {
            if (!periodEditorOpen) setPeriodInput(period);
            setPeriodEditorOpen((open) => !open);
          }}>Cambiar período</Button>
        </div>
        <div className="border-t border-[#e3e3e5] pt-3">
          <h3 className="text-sm font-semibold">Período anterior</h3>
          <p className="mt-1 text-sm"><strong>{displayPeriod(comparisonRange)}</strong><span className="ml-3 text-foreground/70">{inclusiveDays(comparisonRange)} días</span></p>
          <p className="mt-1 text-xs text-foreground/70">Los resultados se comparan con el período inmediatamente anterior de la misma cantidad de días.</p>
        </div>
        <div id="feedback-summary-period-editor" className="border-t border-[#e3e3e5] pt-3" hidden={!periodEditorOpen}>{periodForm}{periodErrorMessage}</div>
      </section>
      <section id="feedback-dashboard-main" aria-label="Contenido de Feedback del público" tabIndex={-1}>
      {state === "loading" ? <div role="status" aria-live="polite" className="flex min-h-64 items-center justify-center"><Spinner label="Cargando Feedback del público" /></div> : null}
      {state === "error" ? <div role="alert" className="rounded-xl border border-dashed p-6 text-center"><p>Feedback del público no está disponible temporalmente.</p><Button type="button" variant="bordered" color="primary" className="mt-3" onClick={() => { const periodKey = `${period.from}:${period.to}`; if (module === "summary" || summaryPeriodKey !== periodKey) setSummaryRetry((value) => value + 1); else setModuleRetry((value) => value + 1); }}>Reintentar</Button></div> : null}
      {state === "ready" && module === "summary" && summary ? <SummaryModule data={summary} period={period} onViewReports={() => setModule("comments")} /> : null}
      {state === "ready" && module === "aspects" && aspects ? <><Panel title="Filtro por punto"><label className="flex max-w-md flex-col gap-2 text-sm font-semibold">Punto QR<select className="rounded-xl border bg-background p-3" value={aspectPoint} onChange={(event) => setAspectPoint(event.target.value)}><option value="">Todos los puntos</option>{availablePoints.map((point) => <option key={point.pointKey} value={point.pointKey}>{point.displayName}</option>)}</select></label></Panel><AspectsModule data={aspects} selectedKey={aspectKey} onSelect={setAspectKey} /></> : null}
      {state === "ready" && module === "qr" && availablePoints.length === 0 ? <EmptyState>No hay puntos QR disponibles para el período analizado.</EmptyState> : null}
      {state === "ready" && module === "qr" && qr ? <QrModule data={qr} options={availablePoints} mode={qrMode} onMode={setQrMode} selectedKeys={selectedPoints} onToggle={(key) => setSelectedPoints((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} detailKey={detailPoint} onDetail={setDetailPoint} onOpenAspects={() => { setAspectPoint(detailPoint); setModule("aspects"); }} /> : null}
      {state === "ready" && module === "comments" && summary ? <CommentsReportsModule period={period} points={availablePoints} aspects={summary.aspects} /> : null}
      </section><p className="sr-only">Feedback route: <Link href={ADMIN_ROUTES.FEEDBACK}>{ADMIN_ROUTES.FEEDBACK}</Link></p>
    </div>
  );
}
