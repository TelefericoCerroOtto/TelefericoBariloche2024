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
  createPlaywrightPdfRenderer,
  renderReportHtml,
  renderValidatedPdf,
} from "../../../services/survey-report-worker/src/pdf";
import {
  chartSemantics,
  renderCharts,
} from "../../../services/survey-report-worker/src/renderer";
import {
  executeReportWorker as executeReportWorkerWithDependencies,
} from "../../../services/survey-report-worker/src/worker-runtime";
import { EMPTY_EVIDENCE_PARAGRAPH } from "../../../services/survey-report-worker/src/direct-execution-plan";
import {
  CHECKPOINT_CONTRACT_VERSIONS,
  deriveChunkMembership,
  deriveEvidenceRef,
  deriveStageInputDigestV1,
  stageConfigDigest,
  stageInputDigestV1,
  validateWorkerStageCheckpointV1,
  verifyChunkMembership,
} from "../../../services/survey-report-worker/src/checkpoint-contract";
import { PUBLISHED_SECTION_KEYS, WorkerCmsConflictError } from "../../../services/survey-report-worker/src/contracts";
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
  WorkerClaimResult,
  ModelConfigV1,
  DirectAnalysisV1,
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
      paragraphsEs: [EMPTY_EVIDENCE_PARAGRAPH],
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
    route: entries.length === 0 ? "undecided" : "direct",
    chunkCount: null,
    entries,
  };
}

async function executeReportWorker(
  reportRunId: string,
  dependencies: Parameters<typeof executeReportWorkerWithDependencies>[1],
) {
  return executeReportWorkerWithDependencies(reportRunId, {
    countTokens: async () => ({ instructions: 100, schema: 100, metrics: 100, comments: 0 }),
    ...dependencies,
  });
}

function checkpointOutputDigest(payload: unknown): string {
  return createHash("sha256").update(canonicalizeJson(payload)).digest("hex");
}

const OMIT_PRICING_SNAPSHOT = Symbol("omit-pricing-snapshot");

function syntheticPricingSnapshot() {
  return {
    version: "survey-pricing.v1",
    currency: "USD",
    units: [
      {
        sku: "synthetic-model-input",
        inputMicrosPerMillion: 100,
        outputMicrosPerMillion: 200,
      },
    ],
  } as const;
}

function fakeCms(
  snapshotEnvelope: SnapshotEnvelopeV1,
  checkpoints: WorkerCheckpointSet = checkpointSet(snapshotEnvelope.digestHex),
  modelConfig: unknown = syntheticModelConfig("test-only-2026-01"),
  pricingSnapshot: unknown = syntheticPricingSnapshot(),
) {
  let stateVersion = 1;
  let terminal: "succeeded" | "failed" | null = null;
  let completedCommand: CompleteCommand | null = null;
  const calls = { snapshot: 0, checkpoint: 0, complete: 0, fail: 0 };
  const writtenCheckpoints: WorkerCheckpoint[] = [];
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
      const claimResult: Extract<WorkerClaimResult, { status: "running" }> = {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "running" as const,
        disposition: stateVersion === 1 ? "claimed" : "resumed",
        checkpoints,
        modelConfig,
        pricingSnapshot:
          pricingSnapshot === OMIT_PRICING_SNAPSHOT
            ? undefined
            : pricingSnapshot,
      };
      if (pricingSnapshot === OMIT_PRICING_SNAPSHOT)
        delete (claimResult as { pricingSnapshot?: unknown }).pricingSnapshot;
      return claimResult;
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
      writtenCheckpoints.push(command.checkpoint);
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
      command: CompleteCommand,
    ): Promise<CompleteResult> {
      calls.complete += 1;
      completedCommand = command;
      terminal = "succeeded";
      stateVersion += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "succeeded",
        reportId: "report-1",
        artifactSha256: command.artifact.sha256,
        artifactSize: command.artifact.size,
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
  return { cms, calls, writtenCheckpoints, get completedCommand() { return completedCommand; } };
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

function syntheticMembershipInput() {
  return {
    reportRunId: "00000000-0000-4000-8000-000000000113",
    snapshotDigest: "a".repeat(64),
    evidenceKeyId: "test-only-2026-01",
    evidenceKey: "tb113 synthetic-only evidence key v1",
    chunkCount: 2,
    comments: [
      { recordId: "r-3", receipt: "receipt-3", period: "current", acceptedAt: "2026-09-24T10:02:00.000Z", locale: "es", versionKey: "v1", pointKey: "p1", overallRating: 4, aspectRatings: [], text: "Buena vista" },
      { recordId: "r-1", receipt: "receipt-1", period: "previous", acceptedAt: "2026-09-23T10:00:00.000Z", locale: "es", versionKey: "v1", pointKey: "p1", overallRating: 5, aspectRatings: [], text: "Qué hermoso 🚡" },
      { recordId: "r-2", receipt: "receipt-2", period: "current", acceptedAt: "2026-09-24T10:01:00.000Z", locale: "en", versionKey: "v1", pointKey: "p2", overallRating: 3, aspectRatings: [], text: "Very nice" },
    ],
  };
}

function syntheticModelConfig(evidenceKeyId: string) {
  return {
    version: "survey-model-config.v1",
    evidenceKeyId,
    provider: "vertex-ai",
    vertexProjectId: "teleferico-bariloche-2024",
    vertexLocation: "us",
    vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
    model: "gemini-3.8-flash",
    temperature: 0,
    reasoning: "LOW",
    grounding: false,
    promptVersion: "prompt.v1",
    mapSchemaVersion: "survey-map.v1",
    analysisSchemaVersion: "survey-analysis.v1",
    redactionVersion: "redaction.v1",
    validatorVersion: "validator.v1",
    chunkVersion: "chunk.v1",
    verifiedInputTokenLimit: 8192,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision: "test-source",
  } as const;
}

describe("worker PDF boundary", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("validates closed render and store checkpoint metadata and payloads", () => {
    const renderPayload = {
      kind: "render",
      rendererVersion: "test-renderer.v1",
      pdfSha256: "a".repeat(64),
      size: 128,
    };
    const renderCheckpoint = {
      checkpointVersion: "survey-checkpoint.v1",
      stageKey: "render",
      stageIndex: 4,
      route: "direct",
      stageType: "render",
      status: "valid",
      inputDigest: "b".repeat(64),
      outputDigest: checkpointOutputDigest(renderPayload),
      attempts: 1,
      completedAt: "2026-09-24T10:00:00.000Z",
      payload: renderPayload,
    };
    expect(() =>
      validateWorkerStageCheckpointV1(renderCheckpoint, {
        reportRunId: "run-1",
        route: "direct",
      }),
    ).not.toThrow();
    for (const malformed of [
      { ...renderCheckpoint, payload: { ...renderPayload, rawComments: ["private"] } },
      { ...renderCheckpoint, payload: { ...renderPayload, signedUrl: "https://example.invalid" } },
      { ...renderCheckpoint, outputDigest: "c".repeat(64) },
      { ...renderCheckpoint, stageIndex: 0 },
      { ...renderCheckpoint, route: "common" },
      { ...renderCheckpoint, route: "map-reduce" },
      { ...renderCheckpoint, extra: true },
    ]) {
      expect(() =>
        validateWorkerStageCheckpointV1(malformed, {
          reportRunId: "run-1",
          route: "direct",
        }),
      ).toThrow();
    }

    const storePayload = {
      kind: "store",
      objectKey: "private/feedback-reports/staged/run-1/report.pdf",
      artifactSha256: "d".repeat(64),
      size: 128,
      mimeType: "application/pdf",
    };
    const storeCheckpoint = {
      ...renderCheckpoint,
      stageKey: "store",
      stageIndex: 5,
      stageType: "store",
      outputDigest: checkpointOutputDigest(storePayload),
      payload: storePayload,
    };
    expect(() =>
      validateWorkerStageCheckpointV1(storeCheckpoint, {
        reportRunId: "run-1",
        route: "direct",
      }),
    ).not.toThrow();
    expect(() =>
      validateWorkerStageCheckpointV1(
        { ...storeCheckpoint, payload: { ...storePayload, objectKey: "https://example.invalid/report.pdf" } },
        { reportRunId: "run-1", route: "direct" },
      ),
    ).toThrow();
  });

  it("fails closed when a prior render checkpoint has a different input digest", async () => {
    const envelope = snapshot();
    const renderer = createDeterministicTestPdfRenderer();
    const oldAnalysisDigest = createHash("sha256")
      .update(canonicalizeJson(analysis()))
      .digest("hex");
    const legacyInputDigest = createHash("sha256")
      .update(
        canonicalizeJson({
          stageKey: "render",
          snapshotDigest: envelope.digestHex,
          analysisDigest: oldAnalysisDigest,
          rendererVersion: renderer.rendererVersion,
        }),
      )
      .digest("hex");
    const payload = {
      kind: "render" as const,
      rendererVersion: renderer.rendererVersion,
      pdfSha256: "a".repeat(64),
      size: 1,
    };
    const previous: WorkerCheckpoint = {
      checkpointVersion: "survey-checkpoint.v1",
      stageKey: "render",
      stageIndex: 4,
      route: "direct",
      stageType: "render",
      status: "valid",
      inputDigest: legacyInputDigest,
      outputDigest: checkpointOutputDigest(payload),
      attempts: 1,
      completedAt: "2026-09-24T10:00:00.000Z",
      payload,
    };
    const fake = fakeCms(envelope, checkpointSet(envelope.digestHex, [previous]));
    const artifacts = artifactStore();
    const render = vi.spyOn(renderer, "render");
    const result = await executeReportWorker("run-digest-mismatch", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer,
      analysisProvider: async () => analysis(),
    });
    expect(result).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
    expect(render).not.toHaveBeenCalled();
    expect(fake.calls.checkpoint).toBe(0);
    expect(artifacts.calls.stage).toBe(0);
  });

  it("does not reuse a render checkpoint after immutable model config changes", async () => {
    const envelope = snapshot();
    const renderer = createDeterministicTestPdfRenderer();
    const originalConfig = syntheticModelConfig("test-only-2026-01");
    const changedConfig = {
      ...originalConfig,
      promptVersion: "prompt.changed.v1",
    };
    const validateOutputDigest = checkpointOutputDigest({
      kind: "validate",
      publishedAnalysis: analysis(),
      validatorVersion: originalConfig.validatorVersion,
    });
    const oldInputDigest = deriveStageInputDigestV1({
      stageKey: "render",
      snapshotDigest: envelope.digestHex,
      sourceRevision: envelope.payload.sourceRevision,
      modelConfig: originalConfig,
      rendererVersion: renderer.rendererVersion,
      orderedDependencies: [
        { stageKey: "validate", outputDigest: validateOutputDigest },
      ],
    });
    const payload = {
      kind: "render" as const,
      rendererVersion: renderer.rendererVersion,
      pdfSha256: "a".repeat(64),
      size: 1,
    };
    const prior: WorkerCheckpoint = {
      checkpointVersion: "survey-checkpoint.v1",
      stageKey: "render",
      stageIndex: 4,
      route: "direct",
      stageType: "render",
      status: "valid",
      inputDigest: oldInputDigest,
      outputDigest: checkpointOutputDigest(payload),
      attempts: 1,
      completedAt: "2026-09-24T10:00:00.000Z",
      payload,
    };
    const fake = fakeCms(
      envelope,
      checkpointSet(envelope.digestHex, [prior]),
      changedConfig,
    );
    const artifacts = artifactStore();
    const render = vi.spyOn(renderer, "render");
    const result = await executeReportWorker("run-config-mismatch", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer,
      analysisProvider: async () => analysis(),
    });
    expect(result).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
    expect(render).not.toHaveBeenCalled();
    expect(artifacts.calls.stage).toBe(0);
  });

  it("rejects a prior render checkpoint with private extra fields before calling the provider", async () => {
    const envelope = snapshot();
    const payload = {
      kind: "render" as const,
      rendererVersion: "test-renderer.v1",
      pdfSha256: "a".repeat(64),
      size: 128,
      rawComments: ["visitor-private-text"],
    };
    const checkpoint = {
      checkpointVersion: "survey-checkpoint.v1" as const,
      stageKey: "render" as const,
      stageIndex: 4,
      route: "direct" as const,
      stageType: "render" as const,
      status: "valid" as const,
      inputDigest: "b".repeat(64),
      outputDigest: checkpointOutputDigest(payload),
      attempts: 1,
      completedAt: "2026-09-24T10:00:00.000Z",
      payload,
    } as unknown as WorkerCheckpoint;
    const fake = fakeCms(envelope, checkpointSet(envelope.digestHex, [checkpoint]));
    const artifacts = artifactStore();
    const provider = vi.fn(async () => analysis());
    const result = await executeReportWorker("run-private-render", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: provider,
    });
    expect(result).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
    expect(provider).not.toHaveBeenCalled();
    expect(artifacts.calls.read).toBe(0);
    expect(artifacts.calls.stage).toBe(0);
  });

  it("rejects a prior store checkpoint with a signed URL before calling the provider", async () => {
    const envelope = snapshot();
    const renderPayload = {
      kind: "render" as const,
      rendererVersion: "test-renderer.v1",
      pdfSha256: "a".repeat(64),
      size: 128,
    };
    const renderCheckpoint: WorkerCheckpoint = {
      checkpointVersion: "survey-checkpoint.v1",
      stageKey: "render",
      stageIndex: 4,
      route: "direct",
      stageType: "render",
      status: "valid",
      inputDigest: "b".repeat(64),
      outputDigest: checkpointOutputDigest(renderPayload),
      attempts: 1,
      completedAt: "2026-09-24T10:00:00.000Z",
      payload: renderPayload,
    };
    const storePayload = {
      kind: "store" as const,
      objectKey: "private/feedback-reports/staged/run-private-store/report.pdf",
      artifactSha256: "c".repeat(64),
      size: 128,
      mimeType: "application/pdf" as const,
      signedUrl: "https://storage.example.invalid/private/report.pdf?token=synthetic",
    };
    const storeCheckpoint = {
      checkpointVersion: "survey-checkpoint.v1" as const,
      stageKey: "store" as const,
      stageIndex: 5,
      route: "direct" as const,
      stageType: "store" as const,
      status: "valid" as const,
      inputDigest: "d".repeat(64),
      outputDigest: checkpointOutputDigest(storePayload),
      attempts: 1,
      completedAt: "2026-09-24T10:00:00.000Z",
      payload: storePayload,
    } as unknown as WorkerCheckpoint;
    const fake = fakeCms(
      envelope,
      checkpointSet(envelope.digestHex, [renderCheckpoint, storeCheckpoint]),
    );
    const artifacts = artifactStore();
    const provider = vi.fn(async () => analysis());
    const result = await executeReportWorker("run-private-store", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: provider,
    });
    expect(result).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
    expect(provider).not.toHaveBeenCalled();
    expect(artifacts.calls.read).toBe(0);
    expect(artifacts.calls.stage).toBe(0);
  });

  it("does not treat the incomplete map-reduce graph as a supported worker route", async () => {
    const envelope = snapshot();
    const checkpoints = {
      ...checkpointSet(envelope.digestHex),
      route: "map-reduce" as const,
      chunkCount: 1,
    };
    const fake = fakeCms(envelope, checkpoints);
    const renderer = vi.fn(async () => new Uint8Array([1]));
    const provider = vi.fn(async () => analysis());
    const result = await executeReportWorker("run-map-reduce", {
      cms: fake.cms,
      artifacts: artifactStore().store,
      renderer: { rendererVersion: "test", render: renderer },
      analysisProvider: provider,
    });
    expect(result).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
    expect(fake.calls.snapshot).toBe(0);
    expect(provider).not.toHaveBeenCalled();
    expect(renderer).not.toHaveBeenCalled();
  });

  it("selects and checkpoints the direct route only after injected CountTokens fits", async () => {
    const envelope = snapshot();
    const checkpoints = {
      ...checkpointSet(envelope.digestHex),
      route: "undecided" as const,
    };
    const fake = fakeCms(envelope, checkpoints);
    const artifacts = artifactStore();
    const provider = vi.fn(async () => analysis());
    const renderer = vi.fn(async () => new Uint8Array([1]));
    const countTokens = vi.fn(async (request) => {
      expect(request.contractVersion).toBe("survey-count-request.v1");
      expect(request.segments.comments).toBe("[]");
      expect(request.modelConfig.model).toBe("gemini-3.8-flash");
      if (countTokens.mock.calls.length < 3) throw new Error("synthetic transient CountTokens error");
      return { instructions: 100, schema: 100, metrics: 100, comments: 0 };
    });

    const result = await executeReportWorker("run-undecided", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: { rendererVersion: "test", render: renderer },
      analysisProvider: provider,
      countTokens,
    });

    expect(result).toMatchObject({ status: "succeeded", reportId: "report-1" });
    expect(countTokens).toHaveBeenCalledTimes(3);
    expect(fake.calls.snapshot).toBe(1);
    expect(fake.calls.checkpoint).toBe(6);
    expect(fake.calls.complete).toBe(1);
    expect(provider).not.toHaveBeenCalled();
    expect(renderer).toHaveBeenCalledTimes(1);
    expect(artifacts.calls.stage).toBe(1);
    expect(fake.writtenCheckpoints.map(({ stageKey, stageIndex, route }) => ({ stageKey, stageIndex, route }))).toEqual([
      { stageKey: "redact", stageIndex: 0, route: "common" },
      { stageKey: "count", stageIndex: 1, route: "common" },
      { stageKey: "direct", stageIndex: 2, route: "direct" },
      { stageKey: "validate", stageIndex: 3, route: "direct" },
      { stageKey: "render", stageIndex: 4, route: "direct" },
      { stageKey: "store", stageIndex: 5, route: "direct" },
    ]);
    const countCheckpoint = fake.writtenCheckpoints.find(({ stageKey }) => stageKey === "count");
    expect(countCheckpoint?.payload.kind).toBe("count");
    expect(countCheckpoint?.payload.kind === "count" ? countCheckpoint.payload.requestDigest : null).toBe(
      createHash("sha256").update(canonicalizeJson(countTokens.mock.calls[2]![0])).digest("hex"),
    );
  });

  it("passes only the minimal redacted model projection to CountTokens and analysis providers", async () => {
    const runId = "00000000-0000-4000-8000-000000000123";
    const evidenceKeyId = "synthetic-evidence-v1";
    const evidenceKey = "tb113 synthetic per-run evidence key";
    const privateText = "Visitor note visitor@example.invalid +1 212 555 0100 https://example.invalid";
    const envelope = createSnapshot({
      sourceRevision: "test-source",
      createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z",
      range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [{
        recordId: "synthetic-private-record",
        receipt: "00000000-0000-4000-8000-000000000124",
        acceptedAt: "2026-09-01T12:00:00.000Z",
        source: "valid_qr",
        versionKey: "private-version-id",
        pointKey: "private-point-id",
        overallRating: 4,
        locale: "es",
        commentText: privateText,
        payloadDigest: "a".repeat(64),
        aspects: [],
      }],
      definitions: [{ aspectKey: "other", sortOrder: 99 }],
      points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
    });
    const reference = deriveEvidenceRef({
      reportRunId: runId,
      recordId: "synthetic-private-record",
      evidenceKey,
    });
    const analysisOutput: DirectAnalysisV1 = {
      schemaVersion: "survey-analysis.v1",
      route: "direct",
      sections: [
        { key: "executive_summary", status: "supported", claims: [{
          claimId: "claim-a", textEs: "La visita se describe de forma positiva.",
          evidenceRefs: [reference], signal: "descriptive",
        }] },
        ...PUBLISHED_SECTION_KEYS.slice(1).map((key) => ({
          key, status: "insufficient_evidence" as const, claims: [],
        })),
      ],
    } as DirectAnalysisV1;
    const fake = fakeCms(envelope, checkpointSet(envelope.digestHex), syntheticModelConfig(evidenceKeyId));
    const artifacts = artifactStore();
    const renderer = createPlaywrightPdfRenderer();
    const tokens = vi.fn(async (request) => {
      const commentSegment = JSON.parse(request.segments.comments);
      expect(commentSegment.contractVersion).toBe("survey-model-input.v1");
      expect(Object.keys(commentSegment.comments[0]).sort()).toEqual(["evidenceRef", "period", "text"]);
      expect(commentSegment.comments[0].evidenceRef).toBe(reference);
      expect(commentSegment.comments[0].text).toContain("[EMAIL]");
      expect(commentSegment.comments[0].text).toContain("[PHONE]");
      expect(commentSegment.comments[0].text).toContain("[URL]");
      expect(JSON.stringify(request).includes("synthetic-private-record")).toBe(false);
      expect(JSON.stringify(request).includes("private-version-id")).toBe(false);
      expect(JSON.stringify(request).includes("private-point-id")).toBe(false);
      expect(JSON.stringify(request).includes("visitor@example.invalid")).toBe(false);
      return { instructions: 100, schema: 100, metrics: 100, comments: 100 };
    });
    const provider = vi.fn(async (modelRequest) => {
      expect(modelRequest.contractVersion).toBe("survey-model-input.v1");
      expect(Object.keys(modelRequest).sort()).toEqual(["comments", "contractVersion", "metrics"]);
      expect(Object.keys(modelRequest.comments[0]).sort()).toEqual(["evidenceRef", "period", "text"]);
      expect(JSON.stringify(modelRequest).includes("synthetic-private-record")).toBe(false);
      expect(JSON.stringify(modelRequest).includes("private-version-id")).toBe(false);
      expect(JSON.stringify(modelRequest).includes("private-point-id")).toBe(false);
      expect(JSON.stringify(modelRequest).includes("visitor@example.invalid")).toBe(false);
      return analysisOutput;
    });

    const result = await executeReportWorker(runId, {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer,
      countTokens: tokens,
      analysisProvider: provider,
      evidenceKeyProvider: async (keyId) => {
        expect(keyId).toBe(evidenceKeyId);
        return evidenceKey;
      },
    });

    expect(result.status).toBe("succeeded");
    expect(tokens).toHaveBeenCalledTimes(1);
    expect(provider).toHaveBeenCalledTimes(1);
    const staged = artifacts.staged.get(runId);
    expect(staged?.mimeType).toBe("application/pdf");
    expect(staged?.size).toBe(staged?.bytes.byteLength);
    expect(staged?.sha256).toBe(createHash("sha256").update(staged!.bytes).digest("hex"));
    expect(Buffer.from(staged!.bytes).subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(Buffer.from(staged!.bytes).includes(Buffer.from("synthetic-private-record"))).toBe(false);
    expect(result).toMatchObject({ artifact: { sha256: staged?.sha256, size: staged?.size } });
    const repeated = await renderValidatedPdf(
      envelope,
      fake.completedCommand!.validatedAnalysis,
      renderer,
    );
    expect(repeated.sha256).toBe(staged?.sha256);

    const leakedAnalysis: PublishedAnalysisV1 = {
      ...fake.completedCommand!.validatedAnalysis,
      sections: fake.completedCommand!.validatedAnalysis.sections.map((section) =>
        section.key === "executive_summary"
          ? { ...section, paragraphsEs: [privateText] }
          : section,
      ) as unknown as PublishedAnalysisV1["sections"],
    };
    const render = vi.spyOn(renderer, "render");
    await expect(renderValidatedPdf(envelope, leakedAnalysis, renderer)).rejects.toThrow(
      "verbatim visitor comment text",
    );
    expect(render).not.toHaveBeenCalled();
  });

  it("keeps nonempty analysis fail-closed without an injected per-run evidence key and rejects over-budget plans", async () => {
    const populated = createSnapshot({
      sourceRevision: "test-source",
      createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z",
      range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [{
        recordId: "synthetic-record",
        receipt: "00000000-0000-4000-8000-000000000113",
        acceptedAt: "2026-09-01T12:00:00.000Z",
        source: "valid_qr",
        versionKey: "v1",
        pointKey: "point-a",
        overallRating: 4,
        locale: "es",
        commentText: "Synthetic comment",
        payloadDigest: "a".repeat(64),
        aspects: [],
      }],
      definitions: [{ aspectKey: "other", sortOrder: 99 }],
      points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
    });
    const populatedFake = fakeCms(populated);
    const populatedCount = vi.fn(async () => ({ instructions: 1, schema: 1, metrics: 1, comments: 1 }));
    const populatedProvider = vi.fn(async () => analysis());
    const populatedRenderer = vi.fn(async () => new Uint8Array([1]));
    const populatedResult = await executeReportWorker("run-populated-local", {
      cms: populatedFake.cms,
      artifacts: artifactStore().store,
      renderer: { rendererVersion: "test", render: populatedRenderer },
      countTokens: populatedCount,
      analysisProvider: populatedProvider,
    });
    expect(populatedResult).toMatchObject({ status: "failed", failureCode: "CONFIGURATION" });
    expect(populatedCount).not.toHaveBeenCalled();
    expect(populatedProvider).not.toHaveBeenCalled();
    expect(populatedRenderer).not.toHaveBeenCalled();

    const empty = snapshot();
    const overBudgetFake = fakeCms(empty);
    const overBudgetCount = vi.fn(async () => ({ instructions: 6_000, schema: 100, metrics: 100, comments: 0 }));
    const overBudgetProvider = vi.fn(async () => analysis());
    const overBudgetRenderer = vi.fn(async () => new Uint8Array([1]));
    const overBudgetResult = await executeReportWorker("run-over-budget-local", {
      cms: overBudgetFake.cms,
      artifacts: artifactStore().store,
      renderer: { rendererVersion: "test", render: overBudgetRenderer },
      countTokens: overBudgetCount,
      analysisProvider: overBudgetProvider,
    });
    expect(overBudgetResult).toMatchObject({ status: "failed", failureCode: "UNKNOWN_VERSION" });
    expect(overBudgetCount).toHaveBeenCalledTimes(1);
    expect(overBudgetProvider).not.toHaveBeenCalled();
    expect(overBudgetRenderer).not.toHaveBeenCalled();
    expect(overBudgetFake.writtenCheckpoints.map(({ stageKey }) => stageKey)).toEqual(["redact"]);
  });

  it("fails closed before snapshot/provider work when claim model config is absent", async () => {
    const envelope = snapshot();
    const fake = fakeCms(
      envelope,
      checkpointSet(envelope.digestHex),
      {} as ModelConfigV1,
    );
    const provider = vi.fn(async () => analysis());
    const renderer = vi.fn(async () => new Uint8Array([1]));
    const result = await executeReportWorker("run-missing-config", {
      cms: fake.cms,
      artifacts: artifactStore().store,
      renderer: { rendererVersion: "test", render: renderer },
      analysisProvider: provider,
    });
    expect(result).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
    expect(fake.calls.snapshot).toBe(0);
    expect(provider).not.toHaveBeenCalled();
    expect(renderer).not.toHaveBeenCalled();
  });

  it("rejects a model other than the normative model before snapshot/provider work", async () => {
    const envelope = snapshot();
    const modelConfig = {
      ...syntheticModelConfig("test-only-2026-01"),
      model: "gemini-3.8-pro",
    };
    const fake = fakeCms(envelope, checkpointSet(envelope.digestHex), modelConfig);
    const provider = vi.fn(async () => analysis());
    const renderer = vi.fn(async () => new Uint8Array([1]));
    const result = await executeReportWorker("run-wrong-model", {
      cms: fake.cms,
      artifacts: artifactStore().store,
      renderer: { rendererVersion: "test", render: renderer },
      analysisProvider: provider,
    });
    expect(result).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
    expect(fake.calls.snapshot).toBe(0);
    expect(provider).not.toHaveBeenCalled();
    expect(renderer).not.toHaveBeenCalled();
  });

  it("rejects missing, malformed, extra, duplicate, and invalid pricing claim data before work", async () => {
    const envelope = snapshot();
    const valid = syntheticPricingSnapshot();
    const invalidPricingSnapshots: readonly [string, unknown][] = [
      ["missing", OMIT_PRICING_SNAPSHOT],
      ["null", null],
      ["missing required fields", { currency: "USD", units: [] }],
      ["empty version", { ...valid, version: "" }],
      ["extra snapshot field", { ...valid, unexpected: true }],
      ["extra unit field", { ...valid, units: [{ ...valid.units[0], extra: true }] }],
      ["duplicate SKU", { ...valid, units: [valid.units[0], { ...valid.units[0] }] }],
      ["fractional price", { ...valid, units: [{ ...valid.units[0], inputMicrosPerMillion: 0.5 }] }],
      ["negative price", { ...valid, units: [{ ...valid.units[0], outputMicrosPerMillion: -1 }] }],
      ["unsafe price", { ...valid, units: [{ ...valid.units[0], inputMicrosPerMillion: Number.MAX_SAFE_INTEGER + 1 }] }],
      ["non-finite price", { ...valid, units: [{ ...valid.units[0], outputMicrosPerMillion: Number.POSITIVE_INFINITY }] }],
    ];

    for (const [caseName, pricingSnapshot] of invalidPricingSnapshots) {
      const fake = fakeCms(
        envelope,
        checkpointSet(envelope.digestHex),
        syntheticModelConfig("test-only-2026-01"),
        pricingSnapshot,
      );
      const provider = vi.fn(async () => analysis());
      const renderer = vi.fn(async () => new Uint8Array([1]));
      const result = await executeReportWorker(`run-pricing-${caseName}`, {
        cms: fake.cms,
        artifacts: artifactStore().store,
        renderer: { rendererVersion: "test", render: renderer },
        analysisProvider: provider,
      });
      expect(result, caseName).toMatchObject({
        status: "failed",
        failureCode: "INVARIANT",
      });
      expect(fake.calls.snapshot, caseName).toBe(0);
      expect(provider, caseName).not.toHaveBeenCalled();
      expect(renderer, caseName).not.toHaveBeenCalled();
    }
  });

  it("matches the synthetic CMS evidence-membership and stage-digest vectors", () => {
    const input = syntheticMembershipInput();
    const memberships = deriveChunkMembership(input);
    expect(deriveEvidenceRef({ reportRunId: input.reportRunId, recordId: "r-1", evidenceKey: input.evidenceKey })).toBe("e_3uu4ks66il7pihr5iwyc");
    expect(memberships).toEqual([
      { evidenceKeyId: "test-only-2026-01", chunkIndex: 1, chunkCount: 2, coveredRefs: ["e_rahjw52nxuyppbb45gh3", "e_3uu4ks66il7pihr5iwyc"], membershipDigest: "c5935102850b59e161216f0748b25ac61c2d72d2569ff7db7456ff9003a28b03" },
      { evidenceKeyId: "test-only-2026-01", chunkIndex: 2, chunkCount: 2, coveredRefs: ["e_k6lijsqcwjyjvs6ztpgs"], membershipDigest: "2c9a2139ad235c11e34a867e5781e0ef27eba9919aa592edae2d5121209351df" },
    ]);
    const refs = memberships.flatMap(({ coveredRefs }) => coveredRefs);
    expect(refs).toHaveLength(input.comments.length);
    expect(new Set(refs).size).toBe(input.comments.length);
    expect(refs.every((reference) => /^e_[a-z2-7]{20}$/.test(reference))).toBe(true);
    expect(memberships.every(({ membershipDigest }) => /^[a-f0-9]{64}$/.test(membershipDigest))).toBe(true);
    expect(deriveChunkMembership({ ...input, comments: [...input.comments].reverse() })).toEqual(memberships);
    expect(JSON.stringify(memberships)).not.toContain("Qué hermoso");
    expect(JSON.stringify(memberships)).not.toContain("r-1");
    expect(JSON.stringify(memberships)).not.toContain(input.evidenceKey);
    const projection = { version: "survey-stage-config.v1" as const, stageKey: "map.1-of-2", evidenceKeyId: input.evidenceKeyId, rendererVersion: null, modelConfig: syntheticModelConfig(input.evidenceKeyId) };
    const configDigest = stageConfigDigest(projection);
    expect(configDigest).toBe("79ee5e80eb4d3d2546b25885a22b7018342b47326cbc3030419a6ce5cddd0613");
    expect(stageInputDigestV1({ stageKey: "map.1-of-2", stageIndex: 2, route: "map-reduce", snapshotDigest: input.snapshotDigest, sourceRevision: "test-source", contractVersions: CHECKPOINT_CONTRACT_VERSIONS, stageConfigDigest: configDigest, orderedDependencyOutputDigests: ["b".repeat(64), "c".repeat(64)], chunkMembershipDigest: memberships[0]!.membershipDigest })).toBe("ae8cc9b362b0983c70bd3ae386542a0973e74633feba1a034b0048a0f584cea4");
  });

  it("derives direct render/store bindings from immutable config and exact dependencies", () => {
    const modelConfig = syntheticModelConfig("test-only-2026-01");
    const input = {
      stageKey: "render" as const,
      snapshotDigest: "a".repeat(64),
      sourceRevision: "test-source",
      modelConfig,
      rendererVersion: "renderer.v1",
      orderedDependencies: [
        { stageKey: "validate" as const, outputDigest: "b".repeat(64) },
      ],
    };
    const digest = deriveStageInputDigestV1(input);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(
      deriveStageInputDigestV1({
        ...input,
        modelConfig: { ...modelConfig, promptVersion: "prompt.v2" },
      }),
    ).not.toBe(digest);
    expect(() =>
      deriveStageInputDigestV1({ ...input, orderedDependencies: [] }),
    ).toThrow();
    expect(() =>
      deriveStageInputDigestV1({
        ...input,
        orderedDependencies: [
          { stageKey: "direct", outputDigest: "b".repeat(64) },
        ],
      }),
    ).toThrow();
    expect(
      deriveStageInputDigestV1({
        ...input,
        orderedDependencies: [
          { stageKey: "validate", outputDigest: "c".repeat(64) },
        ],
      }),
    ).not.toBe(digest);
  });

  it("rejects changed IDs, refs, key IDs, chunk counts, config, and invalid Unicode", () => {
    const input = syntheticMembershipInput();
    const membership = deriveChunkMembership(input)[0]!;
    const changedId = { ...input, comments: input.comments.map((record) => record.recordId === "r-2" ? { ...record, recordId: "r-4" } : record) };
    expect(verifyChunkMembership(changedId, membership)).toBe(false);
    for (const coveredRefs of [[...membership.coveredRefs].reverse(), membership.coveredRefs.slice(1), [...membership.coveredRefs, membership.coveredRefs[0]], [...membership.coveredRefs, "e_foreignreference123456"]]) {
      expect(verifyChunkMembership(input, { ...membership, coveredRefs })).toBe(false);
    }
    expect(verifyChunkMembership({ ...input, evidenceKeyId: "test-only-2026-02" }, membership)).toBe(false);
    expect(verifyChunkMembership({ ...input, evidenceKey: "different synthetic key" }, membership)).toBe(false);
    expect(verifyChunkMembership({ ...input, evidenceKey: "short" }, membership)).toBe(false);
    expect(verifyChunkMembership({ ...input, chunkCount: 3 }, membership)).toBe(false);
    expect(verifyChunkMembership({ ...input, snapshotDigest: "b".repeat(64) }, membership)).toBe(false);
    expect(() => deriveChunkMembership({ ...input, comments: [...input.comments, { ...input.comments[0], recordId: "r-1" }], chunkCount: 2 })).toThrow();
    const projection = { version: "survey-stage-config.v1" as const, stageKey: "map.1-of-2", evidenceKeyId: input.evidenceKeyId, rendererVersion: null, modelConfig: syntheticModelConfig(input.evidenceKeyId) };
    expect(() => stageConfigDigest({ ...projection, modelConfig: { ...projection.modelConfig, model: "other-model" } })).toThrow();
    expect(stageConfigDigest({ ...projection, evidenceKeyId: "test-only-2026-02", modelConfig: { ...projection.modelConfig, evidenceKeyId: "test-only-2026-02" } })).not.toBe(stageConfigDigest(projection));
    const stageInput = { stageKey: "map.1-of-2", stageIndex: 2, route: "map-reduce" as const, snapshotDigest: input.snapshotDigest, sourceRevision: "test-source", contractVersions: CHECKPOINT_CONTRACT_VERSIONS, stageConfigDigest: stageConfigDigest(projection), orderedDependencyOutputDigests: ["b".repeat(64), "c".repeat(64)], chunkMembershipDigest: membership.membershipDigest };
    expect(stageInputDigestV1({ ...stageInput, orderedDependencyOutputDigests: [...stageInput.orderedDependencyOutputDigests].reverse() })).not.toBe(stageInputDigestV1(stageInput));
    expect(stageInputDigestV1({ ...stageInput, stageConfigDigest: "d".repeat(64) })).not.toBe(stageInputDigestV1(stageInput));
    expect(() => deriveChunkMembership({ ...input, comments: [{ ...input.comments[0], text: "\uD800" }] })).toThrow();
    expect(verifyChunkMembership({ ...input, comments: input.comments.map((record) => record.recordId === "r-1" ? { ...record, text: "Que\u0301 hermoso 🚡" } : record) }, membership)).toBe(false);
  });

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

  it("builds the fixed eight-section report with the five charts in their assigned sections", () => {
    const html = renderReportHtml(snapshot().payload, analysis()).html;
    const sectionTitles = [...html.matchAll(/data-section-title="([^"]+)"/g)].map(
      ([, title]) => title,
    );
    const chartIds = [...html.matchAll(/data-chart-id="([^"]+)"/g)].map(
      ([, id]) => id,
    );

    expect(sectionTitles).toEqual([
      "Portada",
      "Resumen ejecutivo",
      "Panorama oficial",
      "Distribución y evolución",
      "Aspectos",
      "Puntos QR",
      "Voz del visitante",
      "Cobertura y limitaciones",
    ]);
    expect(chartIds).toEqual([
      "star-distribution",
      "satisfaction-evolution",
      "response-volume-evolution",
      "aspect-comparison",
      "qr-point-comparison",
    ]);
    expect((html.match(/<table>/g) ?? []).length).toBe(5);
    expect((html.match(/<caption>/g) ?? []).length).toBe(5);
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

  it("skips model analysis for empty evidence and keeps CMS snapshot failures retryable", async () => {
    const envelope = snapshot();
    const providerCms = fakeCms(envelope);
    const provider = vi.fn(async () => {
      throw new Error("synthetic provider must not be called for empty evidence");
    });
    const providerResult = await executeReportWorker("run-provider-transient", {
      cms: providerCms.cms,
      artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: provider,
    });
    expect(providerResult.status).toBe("succeeded");
    expect(provider).not.toHaveBeenCalled();
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
    expect(fake.writtenCheckpoints.map(({ stageKey, stageIndex, route }) => ({ stageKey, stageIndex, route }))).toEqual([
      { stageKey: "redact", stageIndex: 0, route: "common" },
      { stageKey: "count", stageIndex: 1, route: "common" },
      { stageKey: "direct", stageIndex: 2, route: "direct" },
      { stageKey: "validate", stageIndex: 3, route: "direct" },
      { stageKey: "render", stageIndex: 4, route: "direct" },
      { stageKey: "store", stageIndex: 5, route: "direct" },
    ]);
    for (const value of fake.writtenCheckpoints) {
      validateWorkerStageCheckpointV1(value, {
        reportRunId: "run-1",
        route: "direct",
      });
    }
  });

  it("refuses a stale checkpoint CAS without publishing an artifact", async () => {
    const envelope = snapshot();
    const fake = fakeCms(envelope);
    const artifacts = artifactStore();
    const checkpoint = fake.cms.checkpoint.bind(fake.cms);
    vi.spyOn(fake.cms, "checkpoint").mockImplementation((reportRunId, command) =>
      command.checkpoint.stageKey === "render"
        ? Promise.reject(new WorkerCmsConflictError())
        : checkpoint(reportRunId, command),
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

  it("rejects an orphan render checkpoint without the preceding verified stage graph", async () => {
    const envelope = snapshot();
    const renderer = createDeterministicTestPdfRenderer();
    const pdf = await renderValidatedPdf(envelope, analysis(), renderer);
    const modelConfig = syntheticModelConfig("test-only-2026-01");
    const validateOutputDigest = checkpointOutputDigest({
      kind: "validate",
      publishedAnalysis: analysis(),
      validatorVersion: modelConfig.validatorVersion,
    });
    const renderDigest = deriveStageInputDigestV1({
      stageKey: "render",
      snapshotDigest: envelope.digestHex,
      sourceRevision: envelope.payload.sourceRevision,
      modelConfig,
      rendererVersion: renderer.rendererVersion,
      orderedDependencies: [
        { stageKey: "validate", outputDigest: validateOutputDigest },
      ],
    });
    const existing = {
      checkpointVersion: "survey-checkpoint.v1" as const,
      stageKey: "render" as const,
      stageIndex: 4,
      route: "direct" as const,
      stageType: "render" as const,
      status: "valid" as const,
      inputDigest: renderDigest,
      outputDigest: checkpointOutputDigest({
        kind: "render",
        rendererVersion: renderer.rendererVersion,
        pdfSha256: pdf.sha256,
        size: pdf.size,
      }),
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
      modelConfig,
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
    expect(result).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
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
