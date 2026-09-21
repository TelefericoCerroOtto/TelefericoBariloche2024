"use client";

import { authenticatedInternalApiFetch } from "@/lib/http/clients/auth-internal-fetch";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import type {
  FeedbackAdminAspectsData,
  FeedbackAdminPoint,
  FeedbackAdminQrData,
  FeedbackAdminReadEnvelope,
  FeedbackAdminSnapshot,
  FeedbackAdminSummaryData,
} from "@/types/api/admin/feedback";
import { Card, CardBody, Spinner } from "@heroui/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const Bar = dynamic(() => import("recharts").then((module) => module.Bar), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((module) => module.BarChart), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((module) => module.CartesianGrid), { ssr: false });
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
type Module = "summary" | "aspects" | "qr";
type Period = { from: string; to: string };
type ChartRow = { label: string; primary: number | null; secondary?: number | null };

const MODULES: readonly { key: Module | "later"; label: (typeof FEEDBACK_MODULE_ORDER)[number] }[] = [
  { key: "summary", label: "Resumen" },
  { key: "aspects", label: "Aspectos" },
  { key: "qr", label: "Puntos QR" },
  { key: "later", label: "Comentarios e informes" },
];

const percent = (value: number | null) =>
  value === null ? "No disponible" : `${(value / 100).toFixed(1)}%`;
const stars = (value: number | null) =>
  value === null ? "No disponible" : `${(value / 1000).toFixed(1)} / 5`;
const signedPercent = (value: number | null) =>
  value === null ? "Sin base del período anterior" : `${value >= 0 ? "+" : ""}${percent(value)}`;
const signed = (value: number | null, divisor: number, suffix: string) => value === null ? "No disponible" : `${value >= 0 ? "+" : ""}${(value / divisor).toFixed(1)}${suffix}`;
const meaning = (value: number | null, inverse = false) => value === null ? "No disponible" : value === 0 ? "Neutral" : (value > 0) !== inverse ? "Favorable" : "Desfavorable";
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

function query(period: Period, values: Record<string, string> = {}) {
  return new URLSearchParams({ ...period, ...values }).toString();
}

async function read<T>(path: string, signal: AbortSignal): Promise<FeedbackAdminReadEnvelope<T>> {
  const response = await authenticatedInternalApiFetch(path, { signal });
  if (!response.ok) throw new Error(`Feedback read failed: ${response.status}`);
  return (await response.json()) as FeedbackAdminReadEnvelope<T>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="border border-red-500/15 shadow-sm">
      <CardBody className="gap-4 p-5 md:p-6">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {children}
      </CardBody>
    </Card>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed p-6 text-center text-base text-foreground/60">{children}</p>;
}

function Kpis({ period, previous, deltas }: {
  period: FeedbackAdminPoint["current"];
  previous?: FeedbackAdminPoint["previous"];
  deltas?: FeedbackAdminSummaryData["deltas"];
}) {
  const values = [
    ["Respuestas", String(period.submissionCount), previous && String(previous.submissionCount), deltas && signedPercent(deltas.submissionPercentBps), deltas && meaning(deltas.submissionPercentBps)],
    ["Calificación promedio", stars(period.averageMilliStars), previous && stars(previous.averageMilliStars), deltas && signed(deltas.averageMilliStars, 1000, " estrellas"), deltas && meaning(deltas.averageMilliStars)],
    ["Satisfacción", percent(period.satisfied.rateBps), previous && percent(previous.satisfied.rateBps), deltas && signed(deltas.satisfiedRateBps, 100, " pp"), deltas && meaning(deltas.satisfiedRateBps)],
    ["Desfavorable", percent(period.unfavorable.rateBps), previous && percent(previous.unfavorable.rateBps), deltas && signed(deltas.unfavorableRateBps, 100, " pp"), deltas && meaning(deltas.unfavorableRateBps, true)],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {values.map(([label, value, prior, delta, result]) => (
        <article key={label} className="rounded-xl border bg-background p-4">
          <p className="text-sm font-medium text-foreground/60">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {prior ? <p className="text-sm text-foreground/60">Anterior: {prior}</p> : null}
          {delta ? <p className="text-sm font-medium">{delta} · {result}</p> : null}
          {label === "Respuestas" && deltas && deltas.submissionCount !== null ? (
            <p className="text-xs text-foreground/50" data-audit-absolute-delta={deltas.submissionCount}>
              Auditoría: diferencia absoluta {deltas.submissionCount >= 0 ? "+" : ""}{deltas.submissionCount}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function MetricChart({ title, rows, kind = "bar", unit = "count", secondaryLabel }: {
  title: string;
  rows: readonly ChartRow[];
  kind?: "bar" | "line";
  unit?: "count" | "percent";
  secondaryLabel?: string;
}) {
  if (!rows.length) return <Panel title={title}><EmptyState>No hay datos disponibles para el período analizado.</EmptyState></Panel>;
  const Chart = kind === "line" ? LineChart : BarChart;
  return (
    <Panel title={title}>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={rows} margin={{ left: 4, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" minTickGap={24} />
            <YAxis tickFormatter={(value) => unit === "percent" ? `${value / 100}%` : String(value)} />
            <Tooltip formatter={(value) => unit === "percent" ? percent(Number(value)) : String(value)} />
            {kind === "line" ? (
              <>
                <Line isAnimationActive={false} type="monotone" dataKey="primary" name="Actual" stroke="#9F1212" strokeWidth={2} connectNulls={false} />
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
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{title}: datos exactos</caption>
          <thead><tr><th className="p-2">Categoría</th><th className="p-2">Actual</th>{secondaryLabel ? <th className="p-2">{secondaryLabel}</th> : null}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.label} className="border-t"><th className="p-2 font-medium">{row.label}</th><td className="p-2">{unit === "percent" ? percent(row.primary) : row.primary ?? "No disponible"}</td>{secondaryLabel ? <td className="p-2">{unit === "percent" ? percent(row.secondary ?? null) : row.secondary ?? "No disponible"}</td> : null}</tr>)}</tbody>
        </table>
      </div>
    </Panel>
  );
}

export function SummaryModule({ data }: { data: FeedbackAdminSummaryData }) {
  const days = data.calendar.filter((item) => item.period === "current" && item.unit === "day");
  const label = new Map(data.aspects.map((item) => [item.aspectKey, aspectLabel(item)]));
  return (
    <div className="space-y-5">
      <Kpis period={data.current} previous={data.previous} deltas={data.deltas} />
      <MetricChart title="Evolución temporal de respuestas" kind="line" rows={days.map((item) => ({ label: item.from, primary: item.submissionCount }))} />
      <MetricChart title="Evolución temporal de satisfacción" kind="line" unit="percent" rows={days.map((item) => ({ label: item.from, primary: item.satisfactionRateBps }))} />
      <MetricChart title="Distribución de estrellas" rows={data.current.starDistribution.map((item) => ({ label: `${item.star} estrellas`, primary: item.count }))} />
      <Panel title="Fortalezas y oportunidades">
        <div className="grid gap-5 md:grid-cols-2">
          {(["Fortalezas", "Oportunidades"] as const).map((title) => {
            const keys = title === "Fortalezas" ? data.strengths : data.opportunities;
            return <div key={title}><h3 className="font-semibold">{title}</h3>{keys.length ? <ul className="mt-2 list-disc pl-5">{keys.map((key) => <li key={key}>{label.get(key) ?? key}</li>)}</ul> : <p className="mt-2 text-foreground/60">Evidencia insuficiente para esta clasificación.</p>}</div>;
          })}
        </div>
      </Panel>
      <Panel title="Último informe de IA exitoso">
        {data.latestSuccessfulReport ? <div><p className="font-semibold">{data.latestSuccessfulReport.name}</p><p className="text-sm text-foreground/60">Generado {new Date(data.latestSuccessfulReport.createdAt).toLocaleString("es-AR")}</p></div> : <EmptyState>No hay un informe exitoso disponible para este período.</EmptyState>}
      </Panel>
    </div>
  );
}

export function AspectsModule({ data, selectedKey, onSelect }: {
  data: FeedbackAdminAspectsData;
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const selected = data.aspects.find((item) => item.aspectKey === selectedKey) ?? data.aspects[0];
  if (!selected) return <EmptyState>No hay evidencia de aspectos disponible para este alcance.</EmptyState>;
  const dayTrend = selected.trend.filter((item) => item.unit === "day");
  const labels = new Map(data.aspects.map((item) => [item.aspectKey, aspectLabel(item)]));
  const reference = data.matrix.find((item) => item.medianSelectionCountTimesTwo !== null);
  const quadrants = [["priority", "Prioridad"], ["specific", "Específico"], ["strength", "Fortaleza"], ["secondary", "Secundario"]] as const;
  const maxSelectionCount = Math.max(1, ...data.matrix.map((item) => item.xSelectionCount));
  const xMedian = reference?.medianSelectionCountTimesTwo === null || reference?.medianSelectionCountTimesTwo === undefined ? null : reference.medianSelectionCountTimesTwo / (2 * maxSelectionCount) * 100;
  const yMedian = reference?.medianNegativeRateBpsTimesTwo === null || reference?.medianNegativeRateBpsTimesTwo === undefined ? null : reference.medianNegativeRateBpsTimesTwo / 200;
  return (
    <div className="space-y-5">
      <Kpis period={data.current} previous={data.previous} deltas={data.deltas} />
      <Panel title="Detalle del aspecto seleccionado">
        <label className="flex max-w-md flex-col gap-2 text-sm font-semibold">Aspecto<select className="rounded-xl border bg-background p-3" value={selected.aspectKey} onChange={(event) => onSelect(event.target.value)}>{data.aspects.map((item) => <option key={item.aspectKey} value={item.aspectKey}>{aspectLabel(item)}</option>)}</select></label>
        {!selected.hasSufficientEvidence ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-amber-900">Evidencia insuficiente: {selected.selectionCount} selecciones; umbral {selected.evidenceThreshold}.</p> : null}
        <MetricChart title="Distribución de sentimiento" rows={(["positive", "neutral", "negative"] as const).map((sentiment) => ({ label: sentimentLabel(sentiment), primary: selected.current[sentiment].count }))} />
        <div className="grid gap-3 sm:grid-cols-3">{selected.relatedOverallRating.map((item) => <div key={item.sentiment} className="rounded-xl border p-3"><p className="text-foreground/60">{sentimentLabel(item.sentiment)}</p><p className="font-semibold">{stars(item.averageMilliStars)}</p><p className="text-sm">{item.submissionCount} respuestas</p></div>)}</div>
        <MetricChart title="Evolución temporal del aspecto" kind="line" rows={dayTrend.map((item) => ({ label: item.from, primary: item.selectionCount }))} />
      </Panel>
      <Panel title="Matriz de prioridades">
        <p className="text-sm text-foreground/60">Eje X: selecciones; la igualdad con la mediana es relevancia alta. Eje Y: negatividad; la igualdad con la mediana es negatividad baja.</p><p className="text-sm font-medium">Referencias: X = {half(reference?.medianSelectionCountTimesTwo ?? null)} · Y = {half(reference?.medianNegativeRateBpsTimesTwo ?? null)} puntos básicos</p>
        <div role="img" aria-label="Matriz de prioridades con ejes de relevancia y negatividad" className="relative min-h-72 rounded-xl border bg-background p-8"><span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-foreground/60">Relevancia: selecciones →</span><span className="absolute left-1 top-1/2 -rotate-90 text-xs text-foreground/60">Negatividad →</span>{xMedian !== null ? <span aria-hidden="true" data-testid="matrix-x-median" className="absolute bottom-8 top-8 border-l border-dashed border-primary" style={{ left: `${xMedian}%` }} /> : null}{yMedian !== null ? <span aria-hidden="true" data-testid="matrix-y-median" className="absolute bottom-8 left-8 right-8 border-t border-dashed border-primary" style={{ bottom: `${yMedian}%` }} /> : null}{quadrants.map(([key, label]) => <span key={key} className={`absolute text-xs font-semibold text-foreground/60 ${key === "priority" ? "right-3 top-3" : key === "specific" ? "left-3 top-3" : key === "strength" ? "right-3 bottom-3" : "left-3 bottom-3"}`}>{label}</span>)}{data.matrix.map((item) => <span key={item.aspectKey} data-testid={`matrix-point-${item.aspectKey}`} data-matrix-state={item.state} className={`absolute h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary ${item.aspectKey === selectedKey ? "ring-4 ring-primary/25" : ""}`} style={{ left: `${item.xSelectionCount / maxSelectionCount * 100}%`, bottom: `${(item.yNegativeRateBps ?? 0) / 100}%` }} />)}</div>
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

export function QrModule({ data, options, mode, onMode, selectedKeys, onToggle, detailKey, onDetail, onOpenAspects }: {
  data: FeedbackAdminQrData;
  options: readonly FeedbackAdminPoint[];
  mode: "comparison" | "detail";
  onMode: (mode: "comparison" | "detail") => void;
  selectedKeys: readonly string[];
  onToggle: (key: string) => void;
  detailKey: string;
  onDetail: (key: string) => void;
  onOpenAspects: () => void;
}) {
  const detail = data.points.find((point) => point.pointKey === detailKey) ?? data.points[0];
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
      <div className="flex gap-2" role="tablist" aria-label="Vistas de puntos QR">
        {tabs.map((item, index) => <button key={item} ref={(node) => { tabRefs.current[index] = node; }} id={`qr-tab-${item}`} role="tab" aria-controls={`qr-panel-${item}`} aria-selected={mode === item} tabIndex={mode === item ? 0 : -1} className={`rounded-full px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-primary ${mode === item ? "bg-primary text-white" : "border bg-background"}`} onClick={() => onMode(item)} onKeyDown={(event) => selectAdjacentTab(event, index)}>{item === "comparison" ? "Comparación" : "Detalle"}</button>)}
      </div>
      <div role="tabpanel" id={`qr-panel-${mode}`} aria-labelledby={`qr-tab-${mode}`} tabIndex={0}>{mode === "comparison" ? (
        <>
          <Panel title="Puntos QR comparados"><div className="flex flex-wrap gap-2">{options.map((point) => <label key={point.pointKey} className="rounded-full border px-3 py-2"><input className="mr-2" type="checkbox" checked={selectedKeys.includes(point.pointKey)} disabled={selectedKeys.length === 1 && selectedKeys.includes(point.pointKey)} onChange={() => onToggle(point.pointKey)} />{point.displayName}</label>)}</div></Panel>
          <div className="grid gap-4 xl:grid-cols-2">{data.points.map((point) => <Panel key={point.pointKey} title={point.displayName}><Kpis period={point.current} /></Panel>)}</div>
          <MetricChart title="Volumen de respuestas por punto" rows={data.points.map((point) => ({ label: point.displayName, primary: point.current.submissionCount, secondary: point.previous.submissionCount }))} secondaryLabel="Anterior" />
          <Panel title="Datos exactos de comparación por punto"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Datos exactos de comparación por punto QR</caption><thead><tr><th className="p-2">Punto</th><th>Respuestas</th><th>Calificación</th><th>Satisfacción</th><th>Desfavorable</th></tr></thead><tbody>{data.points.map((point) => <tr key={point.pointKey} className="border-t"><th className="p-2">{point.displayName}</th><td>{point.current.submissionCount}</td><td>{stars(point.current.averageMilliStars)}</td><td>{percent(point.current.satisfied.rateBps)}</td><td>{percent(point.current.unfavorable.rateBps)}</td></tr>)}</tbody></table></div></Panel>
        </>
      ) : detail ? (
        <>
          <Panel title="Detalle del punto QR"><label className="flex max-w-md flex-col gap-2 text-sm font-semibold">Punto<select className="rounded-xl border bg-background p-3" value={detail.pointKey} onChange={(event) => onDetail(event.target.value)}>{options.map((point) => <option key={point.pointKey} value={point.pointKey}>{point.displayName}</option>)}</select></label></Panel>
          <Kpis period={detail.current} />
          <MetricChart title="Distribución de estrellas" rows={detail.current.starDistribution.map((item) => ({ label: `${item.star} estrellas`, primary: item.count }))} />
          <MetricChart title="Evolución temporal del punto QR" kind="line" rows={data.calendar.filter((item) => item.period === "current" && item.unit === "day").map((item) => ({ label: item.from, primary: item.submissionCount }))} />
          <Panel title="Datos exactos del punto"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Datos exactos de {detail.displayName}</caption><thead><tr><th className="p-2">Métrica</th><th>Actual</th><th>Anterior</th></tr></thead><tbody>{[["Respuestas", detail.current.submissionCount, detail.previous.submissionCount], ["Calificación", stars(detail.current.averageMilliStars), stars(detail.previous.averageMilliStars)], ["Satisfacción", percent(detail.current.satisfied.rateBps), percent(detail.previous.satisfied.rateBps)], ["Desfavorable", percent(detail.current.unfavorable.rateBps), percent(detail.previous.unfavorable.rateBps)]].map(([label, current, previous]) => <tr key={label} className="border-t"><th className="p-2">{label}</th><td>{current}</td><td>{previous}</td></tr>)}</tbody></table></div></Panel>
          <Panel title="Contexto de aspectos"><p>{data.aspects.length ? `${data.aspects.length} aspectos disponibles en esta población filtrada por punto.` : "No hay evidencia de aspectos para este punto."}</p><button className="mt-3 rounded-full border border-primary px-4 py-2 font-semibold text-primary" onClick={onOpenAspects}>Abrir aspectos filtrados por punto</button></Panel>
        </>
      ) : <EmptyState>No hay puntos QR disponibles para el detalle.</EmptyState>}</div>
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

  const availablePoints = summary?.availablePoints ?? [];
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

  return (
    <div className="mx-auto w-full max-w-[1536px] space-y-5 px-4 pb-10 md:px-8">
      <a href="#feedback-dashboard-main" className="sr-only rounded-md bg-background p-3 focus:not-sr-only focus:absolute focus:z-50">Saltar al contenido de Feedback del público</a>
      <header className="flex flex-col gap-3 rounded-xl border bg-background p-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Analítica administrativa</p><h1 className="text-2xl font-bold">Feedback del público</h1><p className="text-sm text-foreground/60">Solo respuestas aceptadas con QR válido. La comparación usa el período anterior de igual duración.</p>{population ? <p role="status" className="mt-1 text-sm text-foreground/60">Analizado: {population.current.from}–{population.current.to} · Anterior: {population.previous.from}–{population.previous.to}</p> : null}</div>
        <form className="flex flex-wrap items-end gap-3" noValidate onSubmit={(event) => { event.preventDefault(); if (!periodInput.from || !periodInput.to || periodInput.from > periodInput.to) { setPeriodError("El período es inválido. La fecha desde debe ser anterior o igual a la fecha hasta."); return; } setPeriodError(""); setPeriod(periodInput); }}>
          {(["from", "to"] as const).map((key) => <label key={key} className="flex flex-col gap-1 text-sm font-semibold">{key === "from" ? "Desde" : "Hasta"}<input type="date" required aria-invalid={Boolean(periodError)} aria-describedby={periodError ? "feedback-period-error" : undefined} value={periodInput[key]} onChange={(event) => setPeriodInput((current) => ({ ...current, [key]: event.target.value }))} className="rounded-lg border bg-background p-2" /></label>)}
          <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white" type="submit">Analizar período</button>
        </form>{periodError ? <p ref={periodErrorRef} id="feedback-period-error" role="alert" tabIndex={-1} className="rounded-lg border border-primary p-3 text-sm">{periodError}</p> : null}
      </header>
      <nav aria-label="Módulos de Feedback del público" className="flex gap-2 overflow-x-auto rounded-xl border bg-background p-2">
        {MODULES.map((item) => <button key={item.key} disabled={item.key === "later"} aria-current={item.key === module ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${item.key === module ? "bg-primary text-white" : "text-foreground/70"} disabled:cursor-not-allowed disabled:opacity-45`} onClick={() => item.key !== "later" && setModule(item.key)}>{item.label}</button>)}
      </nav>
      <section id="feedback-dashboard-main" aria-label="Contenido de Feedback del público" tabIndex={-1}>
      {state === "loading" ? <div role="status" aria-live="polite" className="flex min-h-64 items-center justify-center"><Spinner label="Cargando Feedback del público" /></div> : null}
      {state === "error" ? <div role="alert" className="rounded-xl border border-dashed p-6 text-center"><p>Feedback del público no está disponible temporalmente.</p><button className="mt-3 rounded-full border border-primary px-4 py-2 font-semibold text-primary" onClick={() => { const periodKey = `${period.from}:${period.to}`; if (module === "summary" || summaryPeriodKey !== periodKey) setSummaryRetry((value) => value + 1); else setModuleRetry((value) => value + 1); }}>Reintentar</button></div> : null}
      {state === "ready" && module === "summary" && summary ? <SummaryModule data={summary} /> : null}
      {state === "ready" && module === "aspects" && aspects ? <><Panel title="Filtro por punto"><label className="flex max-w-md flex-col gap-2 text-sm font-semibold">Punto QR<select className="rounded-xl border bg-background p-3" value={aspectPoint} onChange={(event) => setAspectPoint(event.target.value)}><option value="">Todos los puntos</option>{availablePoints.map((point) => <option key={point.pointKey} value={point.pointKey}>{point.displayName}</option>)}</select></label></Panel><AspectsModule data={aspects} selectedKey={aspectKey} onSelect={setAspectKey} /></> : null}
      {state === "ready" && module === "qr" && availablePoints.length === 0 ? <EmptyState>No hay puntos QR disponibles para el período analizado.</EmptyState> : null}
      {state === "ready" && module === "qr" && qr ? <QrModule data={qr} options={availablePoints} mode={qrMode} onMode={setQrMode} selectedKeys={selectedPoints} onToggle={(key) => setSelectedPoints((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} detailKey={detailPoint} onDetail={setDetailPoint} onOpenAspects={() => { setAspectPoint(detailPoint); setModule("aspects"); }} /> : null}
      </section><p className="sr-only">Feedback route: <Link href={ADMIN_ROUTES.FEEDBACK}>{ADMIN_ROUTES.FEEDBACK}</Link></p>
    </div>
  );
}
