// @vitest-environment node

import {
  buildReportCharts,
  canonicalizeJson,
  createSnapshot,
  type SnapshotEnvelopeV1,
} from "../../../packages/survey-reporting-core/src";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDeterministicTestPdfRenderer,
  renderValidatedPdf,
} from "../../../services/survey-report-worker/src/pdf";
import {
  chartSemantics,
  renderCharts,
} from "../../../services/survey-report-worker/src/renderer";
import {
  executeReportWorker,
  stageInputDigest,
} from "../../../services/survey-report-worker/src/worker-runtime";
import { WorkerCmsConflictError } from "../../../services/survey-report-worker/src/contracts";
import type {
  CompleteCommand,
  CompleteResult,
  FailCommand,
  FailResult,
  WorkerArtifact,
  WorkerArtifactStore,
  WorkerCheckpoint,
  WorkerCheckpointSet,
  WorkerCmsClient,
  WorkerSnapshotResult,
  PublishedAnalysisV1,
} from "../../../services/survey-report-worker/src/contracts";

function snapshot(): SnapshotEnvelopeV1 {
  return createSnapshot({
    sourceRevision: "test-source",
    createdAt: "2026-09-21T12:00:00.000Z",
    dataCutoffAt: "2026-09-21T11:59:59.000Z",
    range: { from: "2026-09-01", to: "2026-09-01" },
    filters: { pointKey: null, versionKey: null },
    submissions: [],
    definitions: [{ aspectKey: "other", sortOrder: 99 }],
    points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
  });
}

function analysis(): PublishedAnalysisV1 {
  return {
    schemaVersion: "survey-published-analysis.v1" as const,
    sections: [
      "executive_summary",
      "observed_changes",
      "strengths",
      "unfavorable_areas",
      "recurrent_themes",
      "minority_signals",
      "coverage_limitations",
    ].map((key) => ({
      key,
      status: "insufficient_evidence" as const,
      paragraphsEs: ["No hay evidencia suficiente para esta sección."],
    })) as unknown as PublishedAnalysisV1["sections"],
  };
}

function checkpointSet(
  snapshotDigest: string,
  entries: readonly WorkerCheckpoint[] = [],
): WorkerCheckpointSet {
  return {
    version: "survey-checkpoints.v1",
    snapshotDigest,
    route: "direct",
    chunkCount: null,
    entries,
  };
}

function fakeCms(
  snapshotEnvelope: SnapshotEnvelopeV1,
  checkpoints: WorkerCheckpointSet = checkpointSet(snapshotEnvelope.digestHex),
) {
  let stateVersion = 1;
  let terminal: "succeeded" | "failed" | null = null;
  const calls = { snapshot: 0, checkpoint: 0, complete: 0, fail: 0 };
  const cms: WorkerCmsClient = {
    async claim(reportRunId) {
      if (terminal)
        return {
          contractVersion: "survey-worker-cms.v1",
          reportRunId,
          stateVersion,
          status: terminal,
          disposition: "terminal-replay" as const,
        };
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "running" as const,
        disposition: stateVersion === 1 ? "claimed" : "resumed",
        checkpoints,
      };
    },
    async snapshot(reportRunId): Promise<WorkerSnapshotResult> {
      calls.snapshot += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        snapshot: snapshotEnvelope,
      };
    },
    async checkpoint(reportRunId, command) {
      calls.checkpoint += 1;
      if (command.expectedStateVersion !== stateVersion)
        throw new Error("unexpected state version");
      stateVersion += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        stageKey: command.checkpoint.stageKey,
        status: "valid" as const,
        replayed: false,
      };
    },
    async complete(
      reportRunId,
      _command: CompleteCommand,
    ): Promise<CompleteResult> {
      calls.complete += 1;
      terminal = "succeeded";
      stateVersion += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "succeeded",
        reportId: "report-1",
        artifactSha256: "a".repeat(64),
        artifactSize: 1,
        replayed: false,
      };
    },
    async fail(reportRunId, _command: FailCommand): Promise<FailResult> {
      calls.fail += 1;
      terminal = "failed";
      stateVersion += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "failed",
        failureCode: "INVALID_OUTPUT",
        replayed: false,
      };
    },
  };
  return { cms, calls };
}

function artifactStore() {
  const staged = new Map<string, WorkerArtifact>();
  const calls = { stage: 0, read: 0, discard: 0 };
  const store: WorkerArtifactStore = {
    async stage(reportRunId, artifact) {
      calls.stage += 1;
      staged.set(reportRunId, artifact);
    },
    async readStaged(reportRunId, sha256) {
      calls.read += 1;
      const artifact = staged.get(reportRunId);
      return artifact?.sha256 === sha256 ? artifact : null;
    },
    async discardStaged(reportRunId, sha256) {
      calls.discard += 1;
      const artifact = staged.get(reportRunId);
      if (artifact?.sha256 === sha256) staged.delete(reportRunId);
    },
  };
  return { store, staged, calls };
}

describe("worker PDF boundary", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("keeps PDF metadata deterministic and preserves chart semantics", async () => {
    const envelope = snapshot();
    const charts = buildReportCharts(envelope.payload);
    const rendered = renderCharts(charts);
    expect(rendered.semantics).toEqual(charts.map(chartSemantics));

    const renderer = createDeterministicTestPdfRenderer();
    const first = await renderValidatedPdf(envelope, analysis(), renderer);
    const second = await renderValidatedPdf(envelope, analysis(), renderer);
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.size).toBe(first.bytes.byteLength);
    expect(first).toEqual(second);
  });

  it("rejects a tampered snapshot before the renderer is called", async () => {
    const render = vi.fn(async () => new Uint8Array([1]));
    const renderer = {
      rendererVersion: "test",
      render,
    };
    await expect(
      renderValidatedPdf(
        { ...snapshot(), digestHex: "0".repeat(64) },
        analysis(),
        renderer,
      ),
    ).rejects.toThrow("Snapshot digest mismatch");
    expect(render).not.toHaveBeenCalled();
  });

  it("fails closed on an invalid CMS snapshot without recalculating metrics", async () => {
    const envelope = snapshot();
    const fake = fakeCms({ ...envelope, digestHex: "0".repeat(64) });
    const artifacts = artifactStore();
    const render = vi.fn(async () => new Uint8Array([1]));
    const result = await executeReportWorker("run-invalid-snapshot", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: { rendererVersion: "test", render },
      analysisProvider: async () => analysis(),
    });
    expect(result).toMatchObject({
      status: "failed",
      failureCode: "INVARIANT",
    });
    expect(fake.calls.fail).toBe(1);
    expect(render).not.toHaveBeenCalled();
    expect(artifacts.calls.stage).toBe(0);
  });

  it("keeps unrecognized provider and CMS failures retryable", async () => {
    const envelope = snapshot();
    const providerCms = fakeCms(envelope);
    const providerResult = await executeReportWorker("run-provider-transient", {
      cms: providerCms.cms,
      artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: async () => {
        throw new Error("provider unavailable");
      },
    });
    expect(providerResult).toMatchObject({
      status: "failed",
      failureCode: "PROVIDER_TRANSIENT",
    });
    expect(providerCms.calls.fail).toBe(0);

    const cms = fakeCms(envelope);
    vi.spyOn(cms.cms, "snapshot").mockRejectedValue(
      new Error("CMS unavailable"),
    );
    const cmsResult = await executeReportWorker("run-cms-transient", {
      cms: cms.cms,
      artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: async () => analysis(),
    });
    expect(cmsResult).toMatchObject({
      status: "failed",
      failureCode: "CMS_TRANSIENT",
    });
    expect(cms.calls.fail).toBe(0);
  });

  it("handles bounded long labels and a large series without truncation", () => {
    const envelope = snapshot();
    const base = [...buildReportCharts(envelope.payload)];
    const categories = Array.from({ length: 200 }, (_, index) =>
      `${"Etiqueta ".repeat(20)}${index}`.slice(0, 512),
    );
    const large = {
      ...base[0]!,
      categories,
      series: [
        { ...base[0]!.series[0]!, values: categories.map((_, index) => index) },
      ],
      table: {
        ...base[0]!.table,
        rows: categories.map((category, index) => [category, index]),
      },
    };
    base[0] = large;
    expect(renderCharts(base).markup).toContain(categories[199]!);

    const oneRecord = {
      ...base[1]!,
      categories: ["2026-09-01"],
      series: [{ ...base[1]!.series[0]!, values: [1] }],
      table: {
        ...base[1]!.table,
        rows: [["2026-09-01", 1]],
      },
    };
    base[1] = oneRecord;
    expect(renderCharts(base).markup).toContain("2026-09-01");
  });

  it("replays terminal success without loading a snapshot or staging again", async () => {
    const envelope = snapshot();
    const fake = fakeCms(envelope);
    const artifacts = artifactStore();
    const result = await executeReportWorker("run-1", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: async () => analysis(),
    });
    const replay = await executeReportWorker("run-1", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: async () => analysis(),
    });
    expect(result.status).toBe("succeeded");
    expect(replay).toMatchObject({
      status: "succeeded",
      disposition: "terminal-replay",
    });
    expect(fake.calls.snapshot).toBe(1);
    expect(artifacts.calls.stage).toBe(1);
  });

  it("refuses a stale checkpoint CAS without publishing an artifact", async () => {
    const envelope = snapshot();
    const fake = fakeCms(envelope);
    const artifacts = artifactStore();
    vi.spyOn(fake.cms, "checkpoint").mockRejectedValue(
      new WorkerCmsConflictError(),
    );
    const result = await executeReportWorker("run-2", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: async () => analysis(),
    });
    expect(result).toMatchObject({
      status: "failed",
      failureCode: "INVARIANT",
    });
    expect(fake.calls.complete).toBe(0);
    expect(fake.calls.fail).toBe(0);
    expect(artifacts.staged.size).toBe(0);
    expect(artifacts.calls.discard).toBe(1);
  });

  it("reuses a valid render checkpoint and stages no second render", async () => {
    const envelope = snapshot();
    const renderer = createDeterministicTestPdfRenderer();
    const pdf = await renderValidatedPdf(envelope, analysis(), renderer);
    const digest = createHash("sha256")
      .update(canonicalizeJson(analysis()))
      .digest("hex");
    const renderDigest = stageInputDigest({
      stageKey: "render",
      snapshotDigest: envelope.digestHex,
      analysisDigest: digest,
      rendererVersion: renderer.rendererVersion,
    });
    const existing = {
      checkpointVersion: "survey-checkpoint.v1" as const,
      stageKey: "render" as const,
      stageIndex: 0,
      route: "common" as const,
      stageType: "render" as const,
      status: "valid" as const,
      inputDigest: renderDigest,
      outputDigest: "b".repeat(64),
      attempts: 1,
      completedAt: "2026-09-21T12:00:00.000Z",
      payload: {
        kind: "render" as const,
        rendererVersion: renderer.rendererVersion,
        pdfSha256: pdf.sha256,
        size: pdf.size,
      },
    };
    const fake = fakeCms(
      envelope,
      checkpointSet(envelope.digestHex, [existing]),
    );
    const artifacts = artifactStore();
    artifacts.staged.set("run-3", {
      objectKey: "private/feedback-reports/staged/run-3/report.pdf",
      bytes: pdf.bytes,
      sha256: pdf.sha256,
      size: pdf.size,
      mimeType: "application/pdf",
    });
    const renderSpy = vi.spyOn(renderer, "render");
    const result = await executeReportWorker("run-3", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer,
      analysisProvider: async () => analysis(),
    });
    expect(result.status).toBe("succeeded");
    expect(renderSpy).not.toHaveBeenCalled();
    expect(artifacts.calls.stage).toBe(0);
  });

  it("keeps a transient renderer failure retryable before staging", async () => {
    const envelope = snapshot();
    const fake = fakeCms(envelope);
    const artifacts = artifactStore();
    const result = await executeReportWorker("run-4", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: {
        rendererVersion: "unavailable",
        async render() {
          throw new Error("browser unavailable");
        },
      },
      analysisProvider: async () => analysis(),
    });
    expect(result).toMatchObject({
      status: "failed",
      failureCode: "STORAGE_TRANSIENT",
    });
    expect(fake.calls.fail).toBe(0);
    expect(artifacts.calls.stage).toBe(0);
  });
});
