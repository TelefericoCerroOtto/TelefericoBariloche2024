import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSnapshot } from "../../../../packages/survey-reporting-core/src";
import { authenticatedInternalApiFetch } from "@/lib/http/clients/auth-internal-fetch";
import { projectAspects, projectQrPoints, projectSummary, type FeedbackAdminSource } from "@/lib/feedback/admin-read";
import {
  AspectsModule,
  CommentsReportsModule,
  FEEDBACK_MODULE_ORDER,
  QrModule,
  SummaryModule,
  default as FeedbackDashboard,
} from "./FeedbackDashboard";

vi.mock("next/dynamic", () => ({
  default: () => ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/http/clients/auth-internal-fetch", () => ({ authenticatedInternalApiFetch: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

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

    expect(screen.getByText("+100.0% · Favorable")).toBeInTheDocument();
    expect(screen.getByText("Auditoría: diferencia absoluta +1")).toHaveAttribute(
      "data-audit-absolute-delta",
      "1",
    );
    expect(screen.getByText("+1.5 estrellas · Favorable")).toBeInTheDocument();
    expect(screen.getByText("+100.0 pp · Favorable")).toBeInTheDocument();
    expect(screen.getByText("+0.0 pp · Neutral")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evolución temporal de respuestas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Último informe de IA exitoso" })).toBeInTheDocument();
  });

  it("renders authoritative matrix and five-star exact tables", () => {
    const aspectData = projectAspects(source);
    const matrixData = { ...aspectData, matrix: [{ aspectKey: "views", xSelectionCount: 8, yNegativeRateBps: 4000, medianSelectionCountTimesTwo: 16, medianNegativeRateBpsTimesTwo: 8000, state: "classified", quadrant: "strength" }, { aspectKey: "other", xSelectionCount: 16, yNegativeRateBps: 8000, medianSelectionCountTimesTwo: 16, medianNegativeRateBpsTimesTwo: 8000, state: "excluded", quadrant: null }] as const };
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

  it("focuses an announced invalid period and exposes a skip target", () => {
    vi.mocked(authenticatedInternalApiFetch).mockImplementation(() => new Promise<Response>(() => undefined));
    render(<FeedbackDashboard />);
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar período" }));
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByRole("heading", { level: 1, name: "Feedback del público" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Saltar al contenido de Feedback del público" })).toHaveAttribute("href", "#feedback-dashboard-main");
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
    expect(screen.getByRole("option", { name: "New views" })).toBeInTheDocument();
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
    const comparison = projectQrPoints(source, {
      route: "qr-comparison",
      from: "2026-09-11",
      to: "2026-09-20",
      pointKeys: ["base", "summit"],
    });
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

    view.rerender(
      <QrModule data={projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" })} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base", "summit"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );
    expect(screen.getByRole("heading", { name: "Evolución temporal del punto QR" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Datos exactos de Base" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir aspectos filtrados por punto" })).toBeInTheDocument();
  });

  it("filters comments, preserves per-aspect detail, and exposes immutable report history", async () => {
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [{ aspectKey: "views", rating: "positive" as const }], text: "Excelente vista" }], total: 1, page: 1, pageSize: 25 };
    const reports = { items: [{ reportId: "report-1", reportRunId: "run-1", name: "September report", period: { from: "2026-09-01", to: "2026-09-20" }, status: "succeeded" as const, analyzedResponseCount: 4, analyzedCommentCount: 1, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", requestedBy: null, generatedBy: null, canDownload: true, artifactSize: 100, artifactSha256: "a".repeat(64) }], total: 1, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockResolvedValueOnce(envelope(comments)).mockResolvedValueOnce(envelope(reports));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);

    const commentButton = (await screen.findAllByRole("button", { name: /Excelente vista/ }))[0]!;
    expect(commentButton).toBeInTheDocument();
    expect(screen.getByText(/Los comentarios son anónimos por diseño/)).toBeInTheDocument();
    expect(screen.getByText(/Hay pocos comentarios en este alcance/)).toBeInTheDocument();
    expect(screen.getByText("September report")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Descargar PDF" })).not.toBeInTheDocument();
    expect(screen.getByText(/Descarga no disponible hasta que U12-A/)).toBeInTheDocument();
    vi.mocked(authenticatedInternalApiFetch).mockResolvedValueOnce(Response.json({ reportRunId: "run-2", status: "queued" }, { status: 202 }));
    fireEvent.click(screen.getByRole("button", { name: "Solicitar informe" }));
    expect(await screen.findByText(/Solicitud run-2/)).toBeInTheDocument();
    const [, commandInit] = vi.mocked(authenticatedInternalApiFetch).mock.calls.at(-1)!;
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

  it("rejects an invalid independent report range before issuing a command", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const reports = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch)
      .mockResolvedValueOnce(envelope(comments))
      .mockResolvedValueOnce(envelope(reports));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay comentarios para estos filtros. Probá con otro aspecto, punto, idioma o rango.");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar informe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("la fecha inicial debe ser anterior o igual");
    expect(screen.getByText("No hay informes exitosos para este período.")).toBeInTheDocument();
    expect(authenticatedInternalApiFetch).toHaveBeenCalledTimes(2);
  });

  it("sends every comment filter with OR ratings without refetching reports", async () => {
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "en" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [{ aspectKey: "views", rating: "positive" as const }], text: "View" }], total: 51, page: 1, pageSize: 25 };
    const reports = { items: [{ reportId: "report-1", reportRunId: "run-1", name: "Report", period: { from: "2026-09-01", to: "2026-09-20" }, status: "succeeded" as const, analyzedResponseCount: 4, analyzedCommentCount: 1, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", requestedBy: null, generatedBy: null, canDownload: false, artifactSize: 100, artifactSha256: "a".repeat(64) }], total: 1, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(envelope(String(path).includes("/comments?") ? comments : reports)));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findAllByText("View");
    fireEvent.change(screen.getByLabelText("Buscar en el texto del comentario"), { target: { value: "view" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Aspecto" }), { target: { value: "views" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "5 estrellas" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "2 estrellas" }));
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
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/reports?")).length).toBe(1);
  });

  it("paginates comments and reports independently", async () => {
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [], text: "Comment" }], total: 51, page: 1, pageSize: 25 };
    const reports = { items: [{ reportId: "report-1", reportRunId: "run-1", name: "Report", period: { from: "2026-09-01", to: "2026-09-20" }, status: "succeeded" as const, analyzedResponseCount: 4, analyzedCommentCount: 1, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", requestedBy: null, generatedBy: null, canDownload: false, artifactSize: 100, artifactSha256: "a".repeat(64) }], total: 51, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => Promise.resolve(envelope(String(path).includes("/comments?") ? comments : reports)));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findAllByText("Comment");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Paginación de comentarios" })).getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).at(-1)?.[0]).toContain("page=2"));
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/reports?")).length).toBe(1);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Paginación de informes" })).getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/reports?")).at(-1)?.[0]).toContain("page=2"));
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).length).toBe(2);
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

  it("keeps reports visible when comments fail and retries only comments", async () => {
    let failComments = false;
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [], text: "Current comment" }], total: 1, page: 1, pageSize: 25 };
    const reports = { items: [{ reportId: "report-1", reportRunId: "run-1", name: "Current report", period: { from: "2026-09-01", to: "2026-09-20" }, status: "succeeded" as const, analyzedResponseCount: 4, analyzedCommentCount: 1, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", requestedBy: null, generatedBy: null, canDownload: false, artifactSize: 100, artifactSha256: "a".repeat(64) }], total: 1, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => String(path).includes("/comments?") && failComments ? Promise.reject(new Error("comments unavailable")) : Promise.resolve(envelope(String(path).includes("/comments?") ? comments : reports)));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findAllByText("Current comment");
    failComments = true;
    fireEvent.change(screen.getByLabelText("Buscar en el texto del comentario"), { target: { value: "failed" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Los comentarios no están disponibles");
    expect(screen.queryByText("Current comment")).not.toBeInTheDocument();
    expect(screen.getByText("Current report")).toBeInTheDocument();
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/reports?")).length).toBe(1);
    failComments = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar comentarios" }));
    await screen.findAllByText("Current comment");
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/reports?")).length).toBe(1);
  });

  it("keeps comments visible when report history fails and retries only reports", async () => {
    let failReports = false;
    const comments = { items: [{ recordId: "comment-1", receipt: "receipt-a", acceptedAt: "2026-09-20T12:00:00.000Z", locale: "es" as const, pointKey: "base", overallRating: 5 as const, aspectRatings: [], text: "Current comment" }], total: 1, page: 1, pageSize: 25 };
    const reports = { items: [{ reportId: "report-1", reportRunId: "run-1", name: "Current report", period: { from: "2026-09-01", to: "2026-09-20" }, status: "succeeded" as const, analyzedResponseCount: 4, analyzedCommentCount: 1, dataCutoffAt: "2026-09-21T00:00:00.000Z", createdAt: "2026-09-21T01:00:00.000Z", requestedBy: null, generatedBy: null, canDownload: false, artifactSize: 100, artifactSha256: "a".repeat(64) }], total: 51, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => String(path).includes("/reports?") && failReports ? Promise.reject(new Error("reports unavailable")) : Promise.resolve(envelope(String(path).includes("/comments?") ? comments : reports)));

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findAllByText("Current report");
    failReports = true;
    fireEvent.click(within(screen.getByRole("navigation", { name: "Paginación de informes" })).getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El historial de informes no está disponible");
    expect(screen.getAllByText("Current comment").length).toBeGreaterThan(0);
    expect(screen.queryByText("Current report")).not.toBeInTheDocument();
    failReports = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar historial" }));
    await screen.findAllByText("Current report");
    expect(vi.mocked(authenticatedInternalApiFetch).mock.calls.filter(([path]) => String(path).includes("/comments?")).length).toBe(1);
  });

  it("prevents duplicate commands while busy and requires overlap confirmation", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const reports = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    const overlap = { overlaps: [{ reportRunId: "run-existing", period: { from: "2026-09-01", to: "2026-09-20" }, intersection: { from: "2026-09-10", to: "2026-09-20" } }], overlapDigest: "d".repeat(64), adjustment: "Choose another range" };
    let generationCalls = 0;
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      if (String(path).includes("/comments?")) return Promise.resolve(envelope(comments));
      if (String(path).includes("/reports?")) return Promise.resolve(envelope(reports));
      generationCalls += 1;
      return Promise.resolve(generationCalls === 1 ? new Response(JSON.stringify({ error: { message: "Overlap", details: overlap } }), { status: 409 }) : Response.json({ reportRunId: "run-2", status: "queued" }, { status: 202 }));
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay informes exitosos para este período.");
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
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });
    expect(screen.queryByText("El rango se cruza con historial existente")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Confirmo generar/ })).not.toBeInTheDocument();
  });

  it("does not issue a second command when generation is still pending", async () => {
    const comments = { items: [], total: 0, page: 1, pageSize: 25 };
    const reports = { items: [], total: 0, page: 1, pageSize: 25 };
    const envelope = (data: unknown) => new Response(JSON.stringify({ contractVersion: "feedback-admin.v1", data, meta: {} }), { status: 200 });
    let resolveCommand!: (response: Response) => void;
    const pendingCommand = new Promise<Response>((resolve) => { resolveCommand = resolve; });
    let generationCalls = 0;
    vi.mocked(authenticatedInternalApiFetch).mockImplementation((path) => {
      if (String(path).includes("/comments?")) return Promise.resolve(envelope(comments));
      if (String(path).includes("/reports?")) return Promise.resolve(envelope(reports));
      generationCalls += 1;
      return pendingCommand;
    });

    render(<CommentsReportsModule period={{ from: "2026-09-01", to: "2026-09-20" }} points={snapshot.metrics.qrPoints} aspects={snapshot.metrics.aspects} />);
    await screen.findByText("No hay informes exitosos para este período.");
    const submit = screen.getByRole("button", { name: "Solicitar informe" });
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByRole("button", { name: "Solicitando…" })).toBeDisabled());
    fireEvent.click(submit);
    expect(generationCalls).toBe(1);
    resolveCommand(Response.json({ reportRunId: "run-3", status: "queued" }, { status: 202 }));
    expect(await screen.findByText(/Solicitud run-3/)).toBeInTheDocument();
  });
});
