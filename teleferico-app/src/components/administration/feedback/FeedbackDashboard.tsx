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
  "Summary",
  "Aspects",
  "QR points",
  "Comments and reports",
] as const;
type Module = "summary" | "aspects" | "qr";
type Period = { from: string; to: string };
type ChartRow = { label: string; primary: number | null; secondary?: number | null };

const MODULES: readonly { key: Module | "later"; label: (typeof FEEDBACK_MODULE_ORDER)[number] }[] = [
  { key: "summary", label: "Summary" },
  { key: "aspects", label: "Aspects" },
  { key: "qr", label: "QR points" },
  { key: "later", label: "Comments and reports" },
];

const percent = (value: number | null) =>
  value === null ? "Unavailable" : `${(value / 100).toFixed(1)}%`;
const stars = (value: number | null) =>
  value === null ? "Unavailable" : `${(value / 1000).toFixed(1)} / 5`;
const signedPercent = (value: number | null) =>
  value === null ? "No previous-period baseline" : `${value >= 0 ? "+" : ""}${percent(value)}`;
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

function Kpis({ period, responseChange, absoluteDelta }: {
  period: FeedbackAdminPoint["current"];
  responseChange?: number | null;
  absoluteDelta?: number;
}) {
  const values = [
    ["Responses", String(period.submissionCount), responseChange === undefined ? null : signedPercent(responseChange)],
    ["Average rating", stars(period.averageMilliStars), null],
    ["Satisfaction", percent(period.satisfied.rateBps), null],
    ["Unfavorable", percent(period.unfavorable.rateBps), null],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {values.map(([label, value, comparison]) => (
        <article key={label} className="rounded-2xl border bg-background p-4 ring-1 ring-red-500/10">
          <p className="text-sm font-medium text-foreground/60">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {comparison ? <p className="text-sm text-foreground/70">{comparison}</p> : null}
          {label === "Responses" && absoluteDelta !== undefined ? (
            <p className="text-xs text-foreground/50" data-audit-absolute-delta={absoluteDelta}>
              Audit: absolute delta {absoluteDelta >= 0 ? "+" : ""}{absoluteDelta}
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
  if (!rows.length) return <Panel title={title}><EmptyState>No data is available for the analyzed period.</EmptyState></Panel>;
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
                <Line type="monotone" dataKey="primary" name="Current" stroke="#9F1212" strokeWidth={2} connectNulls={false} />
                {secondaryLabel ? <Line type="monotone" dataKey="secondary" name={secondaryLabel} stroke="#64748b" strokeWidth={2} connectNulls={false} /> : null}
              </>
            ) : (
              <>
                <Bar dataKey="primary" name="Current" fill="#9F1212" radius={[6, 6, 0, 0]} />
                {secondaryLabel ? <Bar dataKey="secondary" name={secondaryLabel} fill="#94a3b8" radius={[6, 6, 0, 0]} /> : null}
              </>
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{title}: exact data</caption>
          <thead><tr><th className="p-2">Category</th><th className="p-2">Current</th>{secondaryLabel ? <th className="p-2">{secondaryLabel}</th> : null}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.label} className="border-t"><th className="p-2 font-medium">{row.label}</th><td className="p-2">{unit === "percent" ? percent(row.primary) : row.primary ?? "Unavailable"}</td>{secondaryLabel ? <td className="p-2">{unit === "percent" ? percent(row.secondary ?? null) : row.secondary ?? "Unavailable"}</td> : null}</tr>)}</tbody>
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
      <Kpis period={data.current} responseChange={data.deltas.submissionPercentBps} absoluteDelta={data.deltas.submissionCount ?? 0} />
      <MetricChart title="Temporal response evolution" kind="line" rows={days.map((item) => ({ label: item.from, primary: item.submissionCount }))} />
      <MetricChart title="Temporal satisfaction evolution" kind="line" unit="percent" rows={days.map((item) => ({ label: item.from, primary: item.satisfactionRateBps }))} />
      <MetricChart title="Star distribution" rows={data.current.starDistribution.map((item) => ({ label: `${item.star} stars`, primary: item.count }))} />
      <Panel title="Strengths and opportunities">
        <div className="grid gap-5 md:grid-cols-2">
          {(["Strengths", "Opportunities"] as const).map((title) => {
            const keys = title === "Strengths" ? data.strengths : data.opportunities;
            return <div key={title}><h3 className="font-semibold">{title}</h3>{keys.length ? <ul className="mt-2 list-disc pl-5">{keys.map((key) => <li key={key}>{label.get(key) ?? key}</li>)}</ul> : <p className="mt-2 text-foreground/60">Insufficient evidence for this classification.</p>}</div>;
          })}
        </div>
      </Panel>
      <Panel title="Latest successful AI report">
        {data.latestSuccessfulReport ? <div><p className="font-semibold">{data.latestSuccessfulReport.name}</p><p className="text-sm text-foreground/60">Generated {new Date(data.latestSuccessfulReport.createdAt).toLocaleString("es-AR")}</p></div> : <EmptyState>No successful report is available for this period.</EmptyState>}
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
  if (!selected) return <EmptyState>No aspect evidence is available for this scope.</EmptyState>;
  const dayTrend = selected.trend.filter((item) => item.unit === "day");
  return (
    <div className="space-y-5">
      <Kpis period={data.current} />
      <Panel title="Selected aspect detail">
        <label className="flex max-w-md flex-col gap-2 text-sm font-semibold">Aspect<select className="rounded-xl border bg-background p-3" value={selected.aspectKey} onChange={(event) => onSelect(event.target.value)}>{data.aspects.map((item) => <option key={item.aspectKey} value={item.aspectKey}>{aspectLabel(item)}</option>)}</select></label>
        {!selected.hasSufficientEvidence ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-amber-900">Insufficient evidence: {selected.selectionCount} selections; threshold {selected.evidenceThreshold}.</p> : null}
        <MetricChart title="Sentiment distribution" rows={(["positive", "neutral", "negative"] as const).map((sentiment) => ({ label: sentiment, primary: selected.current[sentiment].count }))} />
        <div className="grid gap-3 sm:grid-cols-3">{selected.relatedOverallRating.map((item) => <div key={item.sentiment} className="rounded-xl border p-3"><p className="capitalize text-foreground/60">{item.sentiment}</p><p className="font-semibold">{stars(item.averageMilliStars)}</p><p className="text-sm">{item.submissionCount} responses</p></div>)}</div>
        <MetricChart title="Aspect temporal evolution" kind="line" rows={dayTrend.map((item) => ({ label: item.from, primary: item.selectionCount }))} />
      </Panel>
      <Panel title="Priority matrix">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.matrix.map((item) => <article key={item.aspectKey} className="rounded-xl border p-3"><p className="font-semibold">{item.aspectKey}</p><p>{item.xSelectionCount} selections · {percent(item.yNegativeRateBps)} unfavorable</p><p className="text-sm text-foreground/60">{item.state === "classified" ? item.quadrant : item.state === "excluded" ? "Excluded from matrix" : "Insufficient evidence"}</p></article>)}</div>
      </Panel>
      <Panel title="Positive aspects in five-star experiences">
        {data.fiveStarAssociation.length ? <ul className="space-y-2">{data.fiveStarAssociation.map((item) => <li key={item.aspectKey} className="flex justify-between border-b pb-2"><span>{item.aspectKey}</span><span>{item.differenceBps === null ? "Unavailable cohort comparison" : `${(item.differenceBps / 100).toFixed(1)} pp`}</span></li>)}</ul> : <EmptyState>No association evidence is available.</EmptyState>}
      </Panel>
      <Panel title="Structured other entries">
        {data.otherAspects.length ? <div className="space-y-3">{data.otherAspects.map((item) => <article key={item.receipt} className="rounded-xl border p-3"><p>{item.text}</p><p className="text-sm text-foreground/60">{item.sentiment} · {item.overallRating}/5 · {item.pointKey} · {item.acceptedAt.slice(0, 10)}</p></article>)}</div> : <EmptyState>No custom aspect entries are available.</EmptyState>}
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
      <div className="flex gap-2" role="tablist" aria-label="QR point views">
        {tabs.map((item, index) => <button key={item} ref={(node) => { tabRefs.current[index] = node; }} id={`qr-tab-${item}`} role="tab" aria-controls={`qr-panel-${item}`} aria-selected={mode === item} tabIndex={mode === item ? 0 : -1} className={`rounded-full px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-primary ${mode === item ? "bg-primary text-white" : "border bg-background"}`} onClick={() => onMode(item)} onKeyDown={(event) => selectAdjacentTab(event, index)}>{item === "comparison" ? "Comparison" : "Detail"}</button>)}
      </div>
      <div role="tabpanel" id={`qr-panel-${mode}`} aria-labelledby={`qr-tab-${mode}`} tabIndex={0}>{mode === "comparison" ? (
        <>
          <Panel title="Compared QR points"><div className="flex flex-wrap gap-2">{options.map((point) => <label key={point.pointKey} className="rounded-full border px-3 py-2"><input className="mr-2" type="checkbox" checked={selectedKeys.includes(point.pointKey)} disabled={selectedKeys.length === 1 && selectedKeys.includes(point.pointKey)} onChange={() => onToggle(point.pointKey)} />{point.displayName}</label>)}</div></Panel>
          <div className="grid gap-4 xl:grid-cols-2">{data.points.map((point) => <Panel key={point.pointKey} title={point.displayName}><Kpis period={point.current} /></Panel>)}</div>
          <MetricChart title="Response volume by point" rows={data.points.map((point) => ({ label: point.displayName, primary: point.current.submissionCount, secondary: point.previous.submissionCount }))} secondaryLabel="Previous" />
          <Panel title="Point comparison exact data"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">QR point comparison exact data</caption><thead><tr><th className="p-2">Point</th><th>Responses</th><th>Rating</th><th>Satisfaction</th><th>Unfavorable</th></tr></thead><tbody>{data.points.map((point) => <tr key={point.pointKey} className="border-t"><th className="p-2">{point.displayName}</th><td>{point.current.submissionCount}</td><td>{stars(point.current.averageMilliStars)}</td><td>{percent(point.current.satisfied.rateBps)}</td><td>{percent(point.current.unfavorable.rateBps)}</td></tr>)}</tbody></table></div></Panel>
        </>
      ) : detail ? (
        <>
          <Panel title="QR point detail"><label className="flex max-w-md flex-col gap-2 text-sm font-semibold">Point<select className="rounded-xl border bg-background p-3" value={detail.pointKey} onChange={(event) => onDetail(event.target.value)}>{options.map((point) => <option key={point.pointKey} value={point.pointKey}>{point.displayName}</option>)}</select></label></Panel>
          <Kpis period={detail.current} />
          <MetricChart title="Star distribution" rows={detail.current.starDistribution.map((item) => ({ label: `${item.star} stars`, primary: item.count }))} />
          <MetricChart title="QR point temporal evolution" kind="line" rows={data.calendar.filter((item) => item.period === "current" && item.unit === "day").map((item) => ({ label: item.from, primary: item.submissionCount }))} />
          <Panel title="Exact point data"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Exact data for {detail.displayName}</caption><thead><tr><th className="p-2">Metric</th><th>Current</th><th>Previous</th></tr></thead><tbody>{[["Responses", detail.current.submissionCount, detail.previous.submissionCount], ["Rating", stars(detail.current.averageMilliStars), stars(detail.previous.averageMilliStars)], ["Satisfaction", percent(detail.current.satisfied.rateBps), percent(detail.previous.satisfied.rateBps)], ["Unfavorable", percent(detail.current.unfavorable.rateBps), percent(detail.previous.unfavorable.rateBps)]].map(([label, current, previous]) => <tr key={label} className="border-t"><th className="p-2">{label}</th><td>{current}</td><td>{previous}</td></tr>)}</tbody></table></div></Panel>
          <Panel title="Aspect context"><p>{data.aspects.length ? `${data.aspects.length} aspects are available in this point-scoped population.` : "No aspect evidence is available for this point."}</p><button className="mt-3 rounded-full border border-primary px-4 py-2 font-semibold text-primary" onClick={onOpenAspects}>Open point-filtered aspects</button></Panel>
        </>
      ) : <EmptyState>No QR point is available for detail.</EmptyState>}</div>
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

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    read<FeedbackAdminSummaryData>(`/api/admin/feedback/summary?${query(period)}`, controller.signal)
      .then(({ data, meta }) => {
        setSummary(data);
        setPopulation(meta.population);
        const keys = data.availablePoints.map((point) => point.pointKey);
        setSelectedPoints((current) => {
          const retained = current.filter((key) => keys.includes(key));
          return retained.length ? retained : keys;
        });
        setDetailPoint((current) => keys.includes(current) ? current : (keys[0] ?? ""));
        setState("ready");
      })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setState("error"); });
    return () => controller.abort();
  }, [period]);

  useEffect(() => {
    if (module !== "aspects") return;
    const controller = new AbortController();
    setState("loading");
    read<FeedbackAdminAspectsData>(`/api/admin/feedback/aspects?${query(period, aspectPoint ? { pointKey: aspectPoint } : {})}`, controller.signal)
      .then(({ data }) => { setAspects(data); setAspectKey((current) => data.aspects.some((item) => item.aspectKey === current) ? current : (data.aspects[0]?.aspectKey ?? "")); setState("ready"); })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setState("error"); });
    return () => controller.abort();
  }, [aspectPoint, module, period]);

  const availablePoints = summary?.availablePoints ?? [];
  const qrKeys = useMemo(() => selectedPoints.filter((key) => availablePoints.some((point) => point.pointKey === key)), [availablePoints, selectedPoints]);
  useEffect(() => {
    if (module !== "qr" || !detailPoint || (qrMode === "comparison" && qrKeys.length === 0)) return;
    const controller = new AbortController();
    setState("loading");
    const values = qrMode === "comparison" ? { view: "comparison", pointKeys: qrKeys.join(",") } : { view: "detail", pointKey: detailPoint };
    read<FeedbackAdminQrData>(`/api/admin/feedback/qr-points?${query(period, values)}`, controller.signal)
      .then(({ data }) => { setQr(data); setState("ready"); })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setState("error"); });
    return () => controller.abort();
  }, [detailPoint, module, period, qrKeys, qrMode]);

  return (
    <div className="mx-auto w-full max-w-[1536px] space-y-5 px-4 pb-10 md:px-8">
      <header className="flex flex-col gap-4 rounded-3xl bg-background p-5 shadow-sm md:p-7">
        <div><p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Visitor feedback</p><h1 className="text-3xl font-bold">Analytics</h1><p className="text-base text-foreground/60">Accepted valid-QR responses only. Comparison always uses the immediately previous equal-duration period.</p>{population ? <p className="mt-2 text-sm text-foreground/60">Analyzed: {population.current.from}–{population.current.to} · Previous: {population.previous.from}–{population.previous.to}</p> : null}</div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); if (periodInput.from <= periodInput.to) setPeriod(periodInput); }}>
          {(["from", "to"] as const).map((key) => <label key={key} className="flex flex-col gap-1 text-sm font-semibold">{key === "from" ? "From" : "To"}<input type="date" required value={periodInput[key]} onChange={(event) => setPeriodInput((current) => ({ ...current, [key]: event.target.value }))} className="rounded-xl border bg-background p-2" /></label>)}
          <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white" type="submit">Analyze period</button>
        </form>
      </header>
      <nav aria-label="Feedback analytics modules" className="flex gap-2 overflow-x-auto rounded-2xl bg-background p-2">
        {MODULES.map((item) => <button key={item.key} disabled={item.key === "later"} aria-current={item.key === module ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${item.key === module ? "bg-primary text-white" : "text-foreground/70"} disabled:cursor-not-allowed disabled:opacity-45`} onClick={() => item.key !== "later" && setModule(item.key)}>{item.label}</button>)}
      </nav>
      {state === "loading" ? <div className="flex min-h-64 items-center justify-center"><Spinner label="Loading feedback analytics" /></div> : null}
      {state === "error" ? <EmptyState>Feedback analytics are temporarily unavailable. Retry the period or return later.</EmptyState> : null}
      {state === "ready" && module === "summary" && summary ? <SummaryModule data={summary} /> : null}
      {state === "ready" && module === "aspects" && aspects ? <><Panel title="Point filter"><label className="flex max-w-md flex-col gap-2 text-sm font-semibold">QR point<select className="rounded-xl border bg-background p-3" value={aspectPoint} onChange={(event) => setAspectPoint(event.target.value)}><option value="">All points</option>{availablePoints.map((point) => <option key={point.pointKey} value={point.pointKey}>{point.displayName}</option>)}</select></label></Panel><AspectsModule data={aspects} selectedKey={aspectKey} onSelect={setAspectKey} /></> : null}
      {state === "ready" && module === "qr" && availablePoints.length === 0 ? <EmptyState>No QR points are available for the analyzed period.</EmptyState> : null}
      {state === "ready" && module === "qr" && qr ? <QrModule data={qr} options={availablePoints} mode={qrMode} onMode={setQrMode} selectedKeys={selectedPoints} onToggle={(key) => setSelectedPoints((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} detailKey={detailPoint} onDetail={setDetailPoint} onOpenAspects={() => { setAspectPoint(detailPoint); setModule("aspects"); }} /> : null}
      <p className="sr-only">Feedback route: <Link href={ADMIN_ROUTES.FEEDBACK}>{ADMIN_ROUTES.FEEDBACK}</Link></p>
    </div>
  );
}
