import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSnapshot } from "../../../../packages/survey-reporting-core/src";
import { projectQrPoints, projectSummary, type FeedbackAdminSource } from "@/lib/feedback/admin-read";
import {
  FEEDBACK_MODULE_ORDER,
  QrModule,
  SummaryModule,
} from "./FeedbackDashboard";

vi.mock("next/dynamic", () => ({
  default: () => ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(cleanup);

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
      "Summary",
      "Aspects",
      "QR points",
      "Comments and reports",
    ]);
  });

  it("shows relative response change and retains the absolute audit delta", () => {
    render(<SummaryModule data={projectSummary(source)} />);

    expect(screen.getByText("+0.0%")).toBeInTheDocument();
    expect(screen.getByText("Audit: absolute delta +0")).toHaveAttribute(
      "data-audit-absolute-delta",
      "0",
    );
    expect(screen.getByRole("heading", { name: "Temporal response evolution" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Latest successful AI report" })).toBeInTheDocument();
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
    expect(screen.queryByRole("heading", { name: "QR point temporal evolution" })).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "QR point comparison exact data" })).toBeInTheDocument();
    const comparisonTab = screen.getByRole("tab", { name: "Comparison" });
    const detailTab = screen.getByRole("tab", { name: "Detail" });
    expect(comparisonTab).toHaveAttribute("aria-controls", "qr-panel-comparison");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "qr-tab-comparison");
    fireEvent.keyDown(comparisonTab, { key: "ArrowRight" });
    expect(onMode).toHaveBeenCalledWith("detail");
    expect(detailTab).toHaveFocus();

    view.rerender(
      <QrModule data={projectQrPoints({ ...source, snapshot: snapshotFor("base") }, { route: "qr-detail", from: "2026-09-11", to: "2026-09-20", pointKey: "base" })} options={snapshot.metrics.qrPoints} mode="detail" onMode={noop} selectedKeys={["base", "summit"]} onToggle={noop} detailKey="base" onDetail={noop} onOpenAspects={noop} />,
    );
    expect(screen.getByRole("heading", { name: "QR point temporal evolution" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Exact data for Base" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open point-filtered aspects" })).toBeInTheDocument();
  });
});
