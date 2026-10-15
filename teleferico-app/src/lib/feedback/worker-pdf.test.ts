// @vitest-environment node

import {
  buildReportCharts,
  canonicalizeJson,
  createSnapshot,
  type SnapshotEnvelopeV1,
} from "@teleferico/survey-reporting-core";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDeterministicTestPdfRenderer,
  createPlaywrightPdfRenderer,
  PdfValidationError,
  renderReportHtml,
  renderValidatedPdf,
  validatePublishedAnalysis,
} from "../../../../services/survey-report-worker/src/pdf";
import {
  chartSemantics,
  renderCharts,
  RendererValidationError,
  validateChartViewModels,
} from "../../../../services/survey-report-worker/src/renderer";
import { outputRejectionFor } from "../../../../services/survey-report-worker/src/output-rejection";
import {
  executeReportWorker as executeReportWorkerWithDependencies,
} from "../../../../services/survey-report-worker/src/worker-runtime";
import { DIRECT_INSTRUCTIONS, DIRECT_SCHEMA, EMPTY_EVIDENCE_PARAGRAPH } from "../../../../services/survey-report-worker/src/direct-execution-plan";
import {
  CHECKPOINT_CONTRACT_VERSIONS,
  deriveChunkMembership,
  deriveEvidenceRef,
  deriveStageInputDigestV1,
  stageConfigDigest,
  stageInputDigestV1,
  validateWorkerStageCheckpointV1,
  verifyChunkMembership,
} from "../../../../services/survey-report-worker/src/checkpoint-contract";
import { PUBLISHED_SECTION_KEYS, WorkerCmsConflictError } from "../../../../services/survey-report-worker/src/contracts";
import { deterministicReportId } from "@teleferico/tb113-private-report-storage";
import {
  createPrivateReportObjectStorage,
  toPrivateReportDownloadMetadata,
} from "@teleferico/tb113-private-report-storage";
import { createFeedbackReportDownload } from "./report-download";
import { createFakePrivateReportBucket } from "./private-storage.test-fixtures";
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
} from "../../../../services/survey-report-worker/src/contracts";

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

function minimalPdfFixture(): Uint8Array {
  const encoder = new TextEncoder();
  const text = "BT /F1 12 Tf 72 720 Td (Synthetic report) Tj ET";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${encoder.encode(text).byteLength} >>\nstream\n${text}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let document = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(encoder.encode(document).byteLength);
    document += object;
  }
  const crossReferenceOffset = encoder.encode(document).byteLength;
  document += `xref\n0 6\n0000000000 65535 f \n${offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${crossReferenceOffset}\n%%EOF\n`;
  return encoder.encode(document);
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

function syntheticProviderResult(output: PublishedAnalysisV1 = analysis()) {
  return {
    output,
    usage: {
      model: "gemini-3.8-flash",
      modelRevision: "synthetic-revision-1",
      sku: "synthetic-model-input",
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
    },
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
  reportIdForArtifact: (_reportRunId: string, _sha256: string) => string = () => "report-1",
) {
  let stateVersion = 1;
  let terminal: "succeeded" | "failed" | null = null;
  let terminalFailureCode: FailCommand["failureCode"] | null = null;
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
        crossedCostThreshold: false,
      };
    },
    async complete(
      reportRunId,
      command: CompleteCommand,
    ): Promise<CompleteResult> {
      if (terminal === "failed") throw new WorkerCmsConflictError();
      calls.complete += 1;
      completedCommand = command;
      terminal = "succeeded";
      stateVersion += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "succeeded",
        reportId: reportIdForArtifact(reportRunId, command.artifact.sha256),
        artifactSha256: command.artifact.sha256,
        artifactSize: command.artifact.size,
        replayed: false,
      };
    },
    async fail(reportRunId, command: FailCommand): Promise<FailResult> {
      calls.fail += 1;
      if (terminal === "succeeded") throw new WorkerCmsConflictError();
      if (terminal === "failed") {
        if (
          terminalFailureCode !== command.failureCode ||
          stateVersion !== command.expectedStateVersion + 1
        )
          throw new WorkerCmsConflictError();
        return {
          contractVersion: "survey-worker-cms.v1",
          reportRunId,
          stateVersion,
          status: "failed",
          failureCode: command.failureCode,
          replayed: true,
          alertRequired: false,
        };
      }
      if (command.expectedStateVersion !== stateVersion)
        throw new WorkerCmsConflictError();
      terminal = "failed";
      terminalFailureCode = command.failureCode;
      stateVersion += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "failed",
        failureCode: command.failureCode,
        replayed: false,
        alertRequired: false,
      };
    },
    async acknowledgeAlert(reportRunId, command) {
      return {
        contractVersion: "survey-worker-alert-ack.v1",
        reportRunId,
        deduplicationKey: command.deduplicationKey,
        status: "delivered",
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

  it("maps typed PDF validation boundaries to closed render rejection categories", () => {
    const invalidAnalysis = { ...analysis(), sections: [] };
    const analysisFailure = (() => {
      try {
        validatePublishedAnalysis(invalidAnalysis);
      } catch (error) {
        return error;
      }
    })();
    const evidenceFailure = (() => {
      try {
        validatePublishedAnalysis({
          ...analysis(),
          sections: analysis().sections.map((section, index) =>
            index === 0
              ? { ...section, paragraphsEs: ["SYNTHETIC e_abcdefghijklmnopqrst"] }
              : section,
          ),
        });
      } catch (error) {
        return error;
      }
    })();
    const chartFailure = (() => {
      try {
        validateChartViewModels([]);
      } catch (error) {
        return error;
      }
    })();
    const unclassifiedFailure = new PdfValidationError("SYNTHETIC_UNKNOWN_BOUNDARY");

    expect(analysisFailure).toBeInstanceOf(PdfValidationError);
    expect(outputRejectionFor(analysisFailure, "render")).toEqual({
      stage: "render",
      reasonCategory: "published_analysis_contract",
    });
    expect(evidenceFailure).toBeInstanceOf(PdfValidationError);
    expect(outputRejectionFor(evidenceFailure, "render")).toEqual({
      stage: "render",
      reasonCategory: "evidence_reference",
    });
    expect(chartFailure).toBeInstanceOf(RendererValidationError);
    expect(outputRejectionFor(chartFailure, "render")).toEqual({
      stage: "render",
      reasonCategory: "chart_contract",
    });
    expect(outputRejectionFor(unclassifiedFailure, "render")).toEqual({
      stage: "render",
      reasonCategory: "unclassified",
    });
    expect(
      outputRejectionFor(
        Object.assign(new TypeError("SYNTHETIC_UNTRUSTED"), {
          code: "INVALID_OUTPUT",
          reasonCategory: "chart_contract",
        }),
        "render",
      ),
    ).toEqual({ stage: "render", reasonCategory: "unclassified" });
    expect(
      outputRejectionFor(
        Object.assign(new TypeError("SYNTHETIC_UNTRUSTED"), {
          code: "INVALID_OUTPUT",
          outputRejection: { stage: "private-stage", reasonCategory: "private-category" },
        }),
        "render",
      ),
    ).toEqual({ stage: "render", reasonCategory: "unclassified" });
  });

  it("classifies a verbatim-comment boundary without exposing the marker", async () => {
    const text = "SYNTHETIC_VERBATIM_COMMENT_MARKER";
    const envelope = createSnapshot({
      sourceRevision: "synthetic-verbatim-source",
      createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z",
      range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [{
        recordId: "synthetic-verbatim-record",
        receipt: "00000000-0000-4000-8000-000000000114",
        acceptedAt: "2026-09-01T12:00:00.000Z",
        source: "valid_qr",
        versionKey: "v1",
        pointKey: "point-a",
        overallRating: 4,
        locale: "es",
        commentText: text,
        payloadDigest: "a".repeat(64),
        aspects: [],
      }],
      definitions: [{ aspectKey: "other", sortOrder: 99 }],
      points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
    });
    let failure: unknown;
    try {
      const output = analysis();
      await renderValidatedPdf(
        envelope,
        {
          ...output,
          sections: output.sections.map((section, index) =>
            index === 0 ? { ...section, paragraphsEs: [text] } : section,
          ),
        },
        createDeterministicTestPdfRenderer(),
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(PdfValidationError);
    expect(outputRejectionFor(failure)).toEqual({
      stage: "render",
      reasonCategory: "verbatim_comment_rule",
    });
    expect(JSON.stringify(outputRejectionFor(failure))).not.toContain(text);
  });

  it("emits a closed render rejection only after a terminal chart-contract failure", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000113";
    const privateMarker = "SYNTHETIC_CHART_PRIVATE_MARKER";
    const envelope = createSnapshot({
      sourceRevision: "synthetic-render-rejection-source",
      createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z",
      range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [{
        recordId: "synthetic-render-rejection-record",
        receipt: "00000000-0000-4000-8000-000000000114",
        acceptedAt: "2026-09-01T12:00:00.000Z",
        source: "valid_qr",
        versionKey: "v1",
        pointKey: "point-a",
        overallRating: 4,
        locale: "es",
        commentText: "",
        payloadDigest: "a".repeat(64),
        aspects: [],
      }],
      definitions: [{ aspectKey: "other", sortOrder: 99 }],
      points: [{
        pointKey: "point-a",
        displayName: privateMarker + "x".repeat(513),
        sortOrder: 1,
      }],
    });
    const fake = fakeCms(envelope);
    const order: string[] = [];
    const originalFail = fake.cms.fail.bind(fake.cms);
    fake.cms.fail = async (...args) => {
      const result = await originalFail(...args);
      order.push("cms-failure-committed");
      return result;
    };
    const logLines: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
      logLines.push(String(line));
      order.push("stdout-event");
    });
    const directOutput: DirectAnalysisV1 = {
      schemaVersion: "survey-analysis.v1",
      route: "direct",
      sections: PUBLISHED_SECTION_KEYS.map((key) => ({
        key,
        status: "insufficient_evidence" as const,
        claims: [],
      })),
    };
    const dependencies = {
      cms: fake.cms,
      artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: async () => ({
        ...syntheticProviderResult(),
        output: directOutput,
      }),
      evidenceKeyProvider: async () => "synthetic render-boundary evidence key",
    };

    try {
      const result = await executeReportWorker(reportRunId, dependencies);
      expect(result).toMatchObject({ status: "failed", failureCode: "INVALID_OUTPUT" });
      expect(fake.calls.fail).toBe(1);
      expect(logLines.map((line) => JSON.parse(line))).toEqual([{
        event: "tb113_output_rejection",
        reportRunId,
        stage: "render",
        reasonCategory: "chart_contract",
      }]);
      expect(order).toEqual(["cms-failure-committed", "stdout-event"]);
      expect(logLines.join("\n")).not.toContain(privateMarker);

      logLines.length = 0;
      await expect(executeReportWorker(reportRunId, dependencies)).resolves.toMatchObject({
        status: "failed",
        disposition: "terminal-replay",
      });
      expect(logLines).toEqual([]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("rejects direct output above the provider token budget before checkpointing", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000113";
    const evidenceKey = "tb113 synthetic per-run evidence key";
    const envelope = createSnapshot({
      sourceRevision: "test-source",
      createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z",
      range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [{
        recordId: "synthetic-record",
        receipt: "00000000-0000-4000-8000-000000000114",
        acceptedAt: "2026-09-01T12:00:00.000Z",
        source: "valid_qr",
        versionKey: "v1",
        pointKey: "point-a",
        overallRating: 4,
        locale: "es",
        commentText: "Una observación sintética breve",
        payloadDigest: "a".repeat(64),
        aspects: [],
      }],
      definitions: [{ aspectKey: "other", sortOrder: 99 }],
      points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
    });
    const evidenceRef = deriveEvidenceRef({ reportRunId, recordId: "synthetic-record", evidenceKey });
    const output: DirectAnalysisV1 = {
      schemaVersion: "survey-analysis.v1",
      route: "direct",
      sections: [
        { key: "executive_summary", status: "supported", claims: [{
          claimId: "claim-a", textEs: "La visita se describe de forma positiva.",
          evidenceRefs: [evidenceRef], signal: "descriptive",
        }] },
        ...PUBLISHED_SECTION_KEYS.slice(1).map((key) => ({ key, status: "insufficient_evidence" as const, claims: [] })),
      ],
    } as DirectAnalysisV1;
    const fake = fakeCms(envelope);
    const renderer = vi.fn(async () => new Uint8Array([1]));
    const provider = vi.fn(async () => ({
      ...syntheticProviderResult(),
      output,
      usage: { ...syntheticProviderResult().usage, usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 8_001 } },
    }));
    const result = await executeReportWorker(reportRunId, {
      cms: fake.cms,
      artifacts: artifactStore().store,
      renderer: { rendererVersion: "test", render: renderer },
      analysisProvider: provider,
      evidenceKeyProvider: async () => evidenceKey,
    });

    expect(result).toMatchObject({ status: "failed", failureCode: "INVALID_OUTPUT" });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(fake.writtenCheckpoints.some(({ stageKey }) => stageKey === "direct")).toBe(false);
    expect(renderer).not.toHaveBeenCalled();
  });

  it("passes the exact immutable direct CountTokens request to generation and binds it to the count checkpoint", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000113";
    const evidenceKey = "tb113 synthetic per-run evidence key with enough bytes";
    const envelope = createSnapshot({
      sourceRevision: "test-source",
      createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z",
      range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [{
        recordId: "generation-record",
        receipt: "00000000-0000-4000-8000-000000000114",
        acceptedAt: "2026-09-01T12:00:00.000Z",
        source: "valid_qr",
        versionKey: "v1",
        pointKey: "point-a",
        overallRating: 4,
        locale: "es",
        commentText: "Una nota sintética sobre la experiencia del recorrido.",
        payloadDigest: "a".repeat(64),
        aspects: [],
      }],
      definitions: [{ aspectKey: "other", sortOrder: 99 }],
      points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
    });
    const evidenceRef = deriveEvidenceRef({ reportRunId, recordId: "generation-record", evidenceKey });
    const output: DirectAnalysisV1 = {
      schemaVersion: "survey-analysis.v1",
      route: "direct",
      sections: [
        { key: "executive_summary", status: "supported", claims: [{
          claimId: "claim-a",
          textEs: "La experiencia general se describe de manera positiva.",
          evidenceRefs: [evidenceRef],
          signal: "descriptive",
        }] },
        ...PUBLISHED_SECTION_KEYS.slice(1).map((key) => ({ key, status: "insufficient_evidence" as const, claims: [] })),
      ],
    } as DirectAnalysisV1;
    const countRequests: unknown[] = [];
    const countTokens = vi.fn(async (request: { segments: { metrics: string } }) => {
      countRequests.push(request);
      return request.segments.metrics === "{}"
        ? { instructions: 1, schema: 1, metrics: 1, comments: 1 }
        : { instructions: 100, schema: 100, metrics: 100, comments: 100 };
    });
    let generationCountRequest: unknown;
    const analysisProvider = vi.fn(async (_request: unknown, countRequest: unknown) => {
      generationCountRequest = countRequest;
      return {
        output,
        usage: {
          model: "gemini-3.8-flash",
          modelRevision: "synthetic-revision-1",
          sku: "synthetic-model-input",
          usageMetadata: { promptTokenCount: 400, candidatesTokenCount: 1 },
        },
      };
    });
    const fake = fakeCms(envelope);
    const result = await executeReportWorker(reportRunId, {
      cms: fake.cms,
      artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(),
      countTokens,
      analysisProvider,
      evidenceKeyProvider: async () => evidenceKey,
    });

    expect(result.status).toBe("succeeded");
    expect(analysisProvider).toHaveBeenCalledTimes(1);
    expect(generationCountRequest).toBe(countRequests[0]);
    expect(generationCountRequest).toMatchObject({
      contractVersion: "survey-count-request.v1",
      segments: { instructions: DIRECT_INSTRUCTIONS, schema: DIRECT_SCHEMA },
    });
    expect(Object.isFrozen(generationCountRequest)).toBe(true);
    const countCheckpoint = fake.writtenCheckpoints.find(({ stageKey }) => stageKey === "count");
    expect(countCheckpoint?.payload.kind).toBe("count");
    if (countCheckpoint?.payload.kind === "count")
      expect(countCheckpoint.payload.requestDigest).toBe(createHash("sha256").update(canonicalizeJson(generationCountRequest)).digest("hex"));
  });

  it("binds selected map and reduce generation calls to their exact CountTokens inputs", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000113";
    const evidenceKey = "tb113 synthetic per-run evidence key with enough bytes";
    const envelope = createSnapshot({
      sourceRevision: "test-source",
      createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z",
      range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: ["first", "second"].map((recordId, index) => ({
        recordId,
        receipt: `00000000-0000-4000-8000-00000000011${5 + index}`,
        acceptedAt: `2026-09-01T12:0${index}:00.000Z`,
        source: "valid_qr" as const,
        versionKey: "v1",
        pointKey: "point-a",
        overallRating: 4 as const,
        locale: "es" as const,
        commentText: `Synthetic visitor comment ${index}.`,
        payloadDigest: String.fromCharCode(98 + index).repeat(64),
        aspects: [],
      })),
      definitions: [{ aspectKey: "other", sortOrder: 99 }],
      points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
    });
    const config = { ...syntheticModelConfig("test-only-2026-01"), verifiedInputTokenLimit: 8_192, safetyHeadroomTokens: 2_048 };
    const fake = fakeCms(envelope, checkpointSet(envelope.digestHex), config);
    const countedRequests: Array<{ segments: { comments: string; metrics: string } }> = [];
    const countTokens = vi.fn(async (request: { segments: { comments: string; metrics: string } }) => {
      countedRequests.push(request);
      if (request.segments.metrics === "{}") return { instructions: 1, schema: 1, metrics: 1, comments: 1 };
      let comments: unknown;
      try { comments = JSON.parse(request.segments.comments); } catch { comments = null; }
      if (request.segments.metrics !== "{}" && comments && typeof comments === "object" &&
          "contractVersion" in comments && comments.contractVersion === "survey-model-input.v1")
        return { instructions: 10, schema: 10, metrics: 10, comments: 10_000 };
      if (comments && typeof comments === "object" && "contractVersion" in comments && comments.contractVersion === "survey-map-input.v1") {
        const chunkCount = (comments as unknown as { chunkCount: number }).chunkCount;
        return { instructions: 10, schema: 10, metrics: 10, comments: chunkCount === 1 ? 10_000 : 1_000 };
      }
      return { instructions: 10, schema: 10, metrics: 10, comments: 1_000 };
    });
    const mapInputs: Array<{ request: unknown; countRequest: unknown }> = [];
    const mapProvider = vi.fn(async (request: { chunkId: string; comments: readonly { evidenceRef: string }[] }, countRequest: unknown) => {
      mapInputs.push({ request, countRequest });
      return {
        output: {
          schemaVersion: "survey-map.v1" as const,
          chunkId: request.chunkId,
          coveredRefs: request.comments.map(({ evidenceRef }) => evidenceRef),
          themes: [],
          limitations: [],
        },
        usage: {
          model: "gemini-3.8-flash",
          modelRevision: "synthetic-revision-1",
          sku: "synthetic-model-input",
          usageMetadata: { promptTokenCount: 1_000, candidatesTokenCount: 1 },
        },
      };
    });
    let reduceCountRequest: unknown;
    let reduceInputRequest: unknown;
    const reduceProvider = vi.fn(async (request: { maps: readonly { outputDigest: string }[] }, countRequest: unknown) => {
      reduceInputRequest = request;
      reduceCountRequest = countRequest;
      return {
        output: {
          schemaVersion: "survey-analysis.v1" as const,
          route: "reduce" as const,
          sections: PUBLISHED_SECTION_KEYS.map((key) => ({ key, status: "insufficient_evidence" as const, claims: [] })),
          mapOutputDigests: request.maps.map(({ outputDigest }) => outputDigest),
        },
        usage: {
          model: "gemini-3.8-flash",
          modelRevision: "synthetic-revision-1",
          sku: "synthetic-model-input",
          usageMetadata: { promptTokenCount: 1_000, candidatesTokenCount: 1 },
        },
      };
    });

    const result = await executeReportWorker(reportRunId, {
      cms: fake.cms,
      artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(),
      countTokens,
      evidenceKeyProvider: async () => evidenceKey,
      mapProvider,
      reduceProvider,
    });

    expect(result.status).toBe("succeeded");
    expect(mapProvider).toHaveBeenCalledTimes(2);
    expect(reduceProvider).toHaveBeenCalledTimes(1);
    const countCheckpoint = fake.writtenCheckpoints.find(({ stageKey }) => stageKey === "count");
    expect(countCheckpoint?.payload.kind).toBe("count");
    if (countCheckpoint?.payload.kind === "count" && countCheckpoint.payload.route === "map-reduce") {
      const selectedChunkCount = countCheckpoint.payload.chunkCount;
      const chosen = countCheckpoint.payload.attempts?.find(({ chunkCount }) => chunkCount === selectedChunkCount);
      expect(chosen?.chunkCount).toBe(selectedChunkCount);
      for (const [index, generated] of mapInputs.entries()) {
        const digest = createHash("sha256").update(canonicalizeJson(generated.countRequest)).digest("hex");
        expect(digest).toBe(chosen?.chunks[index]?.requestDigest);
      }
    } else {
      throw new Error("Expected a map-reduce CountTokens checkpoint");
    }
    expect(countedRequests).toContain(reduceCountRequest);
    expect((reduceInputRequest as { maps: readonly { outputDigest: string }[] }).maps).toHaveLength(2);
    expect(reduceCountRequest).toMatchObject({
      contractVersion: "survey-count-request.v1",
      segments: { instructions: expect.any(String), schema: expect.any(String), metrics: canonicalizeJson(envelope.payload.metrics) },
    });
  });

  it.each(["map", "reduce", "render"] as const)(
    "emits a closed terminal %s output-rejection event after both generation attempts",
    async (rejectedStage) => {
      const reportRunId = "00000000-0000-4000-8000-000000000135";
      const evidenceKey = "synthetic map-reduce rejection evidence key";
      const privateMarkers = [
        "SYNTHETIC_REJECTED_MODEL_OUTPUT_MARKER",
        "SYNTHETIC_REJECTED_COMMENT_MARKER",
        "SYNTHETIC_REJECTED_SECRET_MARKER",
        "SYNTHETIC_CHART_PRIVATE_MARKER",
      ];
      const envelope = createSnapshot({
        sourceRevision: "synthetic-map-reduce-rejection-source",
        createdAt: "2026-09-21T12:00:00.000Z",
        dataCutoffAt: "2026-09-21T11:59:59.000Z",
        range: { from: "2026-09-01", to: "2026-09-01" },
        filters: { pointKey: null, versionKey: null },
        submissions: ["first", "second"].map((recordId, index) => ({
          recordId,
          receipt: `00000000-0000-4000-8000-00000000013${6 + index}`,
          acceptedAt: `2026-09-01T12:0${index}:00.000Z`,
          source: "valid_qr" as const,
          versionKey: "synthetic-version",
          pointKey: "synthetic-point",
          overallRating: 4 as const,
          locale: "es" as const,
          commentText: `${privateMarkers[1]} ${index}`,
          payloadDigest: String.fromCharCode(97 + index).repeat(64),
          aspects: [],
        })),
        definitions: [{ aspectKey: "other", sortOrder: 99 }],
        points: [
          {
            pointKey: "synthetic-point",
            displayName: rejectedStage === "render"
              ? `${privateMarkers[3]}${"x".repeat(513)}`
              : "Synthetic point",
            sortOrder: 1,
          },
        ],
      });
      const config = {
        ...syntheticModelConfig("synthetic-map-reduce-key-v1"),
        verifiedInputTokenLimit: 8_192,
        safetyHeadroomTokens: 2_048,
      };
      const fake = fakeCms(envelope, checkpointSet(envelope.digestHex), config);
      const countTokens = vi.fn(
        async (request: { segments: { comments: string; metrics: string } }) => {
          if (request.segments.metrics === "{}")
            return { instructions: 1, schema: 1, metrics: 1, comments: 1 };
          let value: unknown;
          try {
            value = JSON.parse(request.segments.comments);
          } catch {
            value = null;
          }
          if (
            value &&
            typeof value === "object" &&
            "contractVersion" in value &&
            value.contractVersion === "survey-model-input.v1"
          )
            return { instructions: 10, schema: 10, metrics: 10, comments: 10_000 };
          if (
            value &&
            typeof value === "object" &&
            "contractVersion" in value &&
            value.contractVersion === "survey-map-input.v1"
          )
            return {
              instructions: 10,
              schema: 10,
              metrics: 10,
              comments:
                (value as unknown as { chunkCount: number }).chunkCount === 1
                  ? 10_000
                  : 1_000,
            };
          return { instructions: 10, schema: 10, metrics: 10, comments: 1_000 };
        },
      );
      const rejectedOutput = {
        schemaVersion: privateMarkers[0],
        rejectedComment: privateMarkers[1],
        syntheticSecret: privateMarkers[2],
      };
      const order: string[] = [];
      const logLines: string[] = [];
      const mapProvider = vi.fn(
        async (request: {
          chunkId: string;
          comments: readonly { evidenceRef: string }[];
        }) => {
          expect(logLines).toEqual([]);
          return {
            output: (rejectedStage === "map"
              ? rejectedOutput
              : {
                  schemaVersion: "survey-map.v1" as const,
                  chunkId: request.chunkId,
                  coveredRefs: request.comments.map(({ evidenceRef }) => evidenceRef),
                  themes: [],
                  limitations: [],
                }) as never,
            usage: {
              model: "gemini-3.8-flash",
              modelRevision: "synthetic-revision",
              sku: "synthetic-model-input",
              usageMetadata: { promptTokenCount: 1_000, candidatesTokenCount: 1 },
            },
          };
        },
      );
      const reduceProvider = vi.fn(
        async (request: { maps: readonly { outputDigest: string }[] }) => {
          expect(logLines).toEqual([]);
          return {
            output: (rejectedStage === "reduce"
              ? rejectedOutput
              : {
                  schemaVersion: "survey-analysis.v1" as const,
                  route: "reduce" as const,
                  sections: PUBLISHED_SECTION_KEYS.map((key) => ({
                    key,
                    status: "insufficient_evidence" as const,
                    claims: [],
                  })),
                  mapOutputDigests: request.maps.map(({ outputDigest }) => outputDigest),
                }) as never,
            usage: {
              model: "gemini-3.8-flash",
              modelRevision: "synthetic-revision",
              sku: "synthetic-model-input",
              usageMetadata: { promptTokenCount: 1_000, candidatesTokenCount: 1 },
            },
          };
        },
      );
      const originalFail = fake.cms.fail.bind(fake.cms);
      fake.cms.fail = async (...args) => {
        const result = await originalFail(...args);
        order.push("cms-failure-committed");
        return result;
      };
      const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
        logLines.push(String(line));
        order.push("stdout-event");
      });

      try {
        const dependencies = {
          cms: fake.cms,
          artifacts: artifactStore().store,
          renderer: createDeterministicTestPdfRenderer(),
          countTokens,
          evidenceKeyProvider: async () => evidenceKey,
          mapProvider,
          reduceProvider,
        };
        const result = await executeReportWorker(reportRunId, dependencies);

        expect(result).toMatchObject({ status: "failed", failureCode: "INVALID_OUTPUT" });
        expect(mapProvider).toHaveBeenCalledTimes(2);
        expect(reduceProvider).toHaveBeenCalledTimes(
          rejectedStage === "map" ? 0 : rejectedStage === "reduce" ? 2 : 1,
        );
        expect(logLines.map((line) => JSON.parse(line))).toEqual([
          {
            event: "tb113_output_rejection",
            reportRunId,
            stage: rejectedStage,
            reasonCategory: rejectedStage === "render"
              ? "chart_contract"
              : "output_contract_preflight",
          },
        ]);
        expect(order).toEqual(["cms-failure-committed", "stdout-event"]);
        expect(logLines.join("\n")).not.toContain(privateMarkers[0]);
        expect(logLines.join("\n")).not.toContain(privateMarkers[1]);
        expect(logLines.join("\n")).not.toContain(privateMarkers[2]);
        expect(fake.calls.fail).toBe(1);

        logLines.length = 0;
        await expect(
          executeReportWorker(reportRunId, dependencies),
        ).resolves.toMatchObject({ status: "failed", disposition: "terminal-replay" });
        expect(logLines).toEqual([]);
      } finally {
        logSpy.mockRestore();
      }
    },
  );

  it("emits only a closed terminal output-rejection event after the CMS failure commit", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000113";
    const privateMarker = "SYNTHETIC_RAW_PROVIDER_ERROR_SENTINEL";
    const envelope = createSnapshot({
      sourceRevision: "test-source",
      createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z",
      range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [
        {
          recordId: "synthetic-rejection-record",
          receipt: "00000000-0000-4000-8000-000000000114",
          acceptedAt: "2026-09-01T12:00:00.000Z",
          source: "valid_qr",
          versionKey: "v1",
          pointKey: "point-a",
          overallRating: 4,
          locale: "es",
          commentText: "Synthetic rejection-test comment.",
          payloadDigest: "a".repeat(64),
          aspects: [],
        },
      ],
      definitions: [{ aspectKey: "other", sortOrder: 99 }],
      points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
    });
    const fake = fakeCms(envelope);
    const order: string[] = [];
    const originalFail = fake.cms.fail.bind(fake.cms);
    fake.cms.fail = async (...args) => {
      const result = await originalFail(...args);
      order.push("cms-failure-committed");
      return result;
    };
    const logLines: string[] = [];
    const provider = vi.fn(async () => ({
      output: { schemaVersion: privateMarker } as never,
      usage: {
        model: "gemini-3.8-flash",
        modelRevision: "synthetic-revision",
        sku: "synthetic-model-input",
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      },
    }));
    const dependencies = {
      cms: fake.cms,
      artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(),
      evidenceKeyProvider: async () =>
        "synthetic per-run evidence key for rejection test",
      analysisProvider: provider,
    };
    const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
      logLines.push(String(line));
      order.push("stdout-event");
    });
    try {
      const result = await executeReportWorker(reportRunId, dependencies);
      expect(result).toMatchObject({ status: "failed", failureCode: "INVALID_OUTPUT" });
      expect(provider).toHaveBeenCalledTimes(2);
      expect(logLines.map((line) => JSON.parse(line))).toEqual([
        {
          event: "tb113_output_rejection",
          reportRunId,
          stage: "direct",
          reasonCategory: "output_contract_preflight",
        },
      ]);
      expect(logLines.join("\n")).not.toContain(privateMarker);
      expect(fake.calls.fail).toBe(1);
      expect(order).toEqual(["cms-failure-committed", "stdout-event"]);

      logLines.length = 0;
      await expect(
        executeReportWorker(reportRunId, dependencies),
      ).resolves.toMatchObject({ status: "failed", disposition: "terminal-replay" });
      expect(logLines).toEqual([]);

      logSpy.mockImplementation(() => {
        throw new Error("SYNTHETIC_LOGGER_FAILURE_SENTINEL");
      });
      const loggerFailureFake = fakeCms(envelope);
      await expect(
        executeReportWorker(reportRunId, { ...dependencies, cms: loggerFailureFake.cms }),
      ).resolves.toMatchObject({ status: "failed", failureCode: "INVALID_OUTPUT" });
      expect(loggerFailureFake.calls.fail).toBe(1);

      const otherFailureFake = fakeCms(envelope);
      const logCallsBeforeOtherFailure = logSpy.mock.calls.length;
      await executeReportWorker(reportRunId, {
        ...dependencies,
        cms: otherFailureFake.cms,
        approvedModelConfig: {
          ...syntheticModelConfig("test-only-2026-01"),
          promptVersion: "different-approved-prompt",
        },
      });
      expect(logSpy).toHaveBeenCalledTimes(logCallsBeforeOtherFailure);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("regenerates invalid direct output once, never retries configuration failures, and bounds transient retries", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000113";
    const evidenceKey = "tb113 synthetic per-run evidence key";
    const envelope = createSnapshot({
      sourceRevision: "test-source", createdAt: "2026-09-21T12:00:00.000Z",
      dataCutoffAt: "2026-09-21T11:59:59.000Z", range: { from: "2026-09-01", to: "2026-09-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [{ recordId: "synthetic-record", receipt: "00000000-0000-4000-8000-000000000114",
        acceptedAt: "2026-09-01T12:00:00.000Z", source: "valid_qr", versionKey: "v1", pointKey: "point-a",
        overallRating: 4, locale: "es", commentText: "Una observación sintética breve", payloadDigest: "a".repeat(64), aspects: [] }],
      definitions: [{ aspectKey: "other", sortOrder: 99 }], points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
    });
    const evidenceRef = deriveEvidenceRef({ reportRunId, recordId: "synthetic-record", evidenceKey });
    const invalid = { ...syntheticProviderResult(), output: { schemaVersion: "survey-analysis.v2" } as unknown as DirectAnalysisV1 };
    const configFailure = Object.assign(new Error("configuration"), { code: "CONFIGURATION" });
    const authFailure = Object.assign(new Error("authentication"), { code: "AUTHENTICATION" });
    const transientFailure = Object.assign(new Error("temporary"), { code: "PROVIDER_TRANSIENT" });

    for (const failure of [configFailure, authFailure]) {
      const fake = fakeCms(envelope);
      const provider = vi.fn(async () => { throw failure; });
      const result = await executeReportWorker(reportRunId, {
        cms: fake.cms, artifacts: artifactStore().store,
        renderer: createDeterministicTestPdfRenderer(), analysisProvider: provider,
        evidenceKeyProvider: async () => evidenceKey,
      });
      expect(result).toMatchObject({ status: "failed", failureCode: failure.code });
      expect(provider).toHaveBeenCalledTimes(1);
    }

    const invalidFake = fakeCms(envelope);
    const invalidProvider = vi.fn(async () => invalid);
    const invalidResult = await executeReportWorker(reportRunId, {
      cms: invalidFake.cms, artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(), analysisProvider: invalidProvider,
      evidenceKeyProvider: async () => evidenceKey,
    });
    expect(invalidResult).toMatchObject({ status: "failed", failureCode: "INVALID_OUTPUT" });
    expect(invalidProvider).toHaveBeenCalledTimes(2);

    const transientFake = fakeCms(envelope);
    const goodOutput: DirectAnalysisV1 = {
      schemaVersion: "survey-analysis.v1", route: "direct",
      sections: [
        { key: "executive_summary", status: "supported", claims: [{ claimId: "claim-a", textEs: "La visita se describe de forma positiva.", evidenceRefs: [evidenceRef], signal: "descriptive" }] },
        ...PUBLISHED_SECTION_KEYS.slice(1).map((key) => ({ key, status: "insufficient_evidence" as const, claims: [] })),
      ],
    } as DirectAnalysisV1;
    const transientProvider = vi.fn()
      .mockRejectedValueOnce(transientFailure)
      .mockRejectedValueOnce(transientFailure)
      .mockResolvedValueOnce({ ...syntheticProviderResult(), output: goodOutput });
    const transientResult = await executeReportWorker(reportRunId, {
      cms: transientFake.cms, artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(), analysisProvider: transientProvider,
      evidenceKeyProvider: async () => evidenceKey,
      countTokens: async () => ({ instructions: 1, schema: 1, metrics: 1, comments: 1 }),
    });
    expect(transientResult).toMatchObject({ status: "succeeded" });
    expect(transientProvider).toHaveBeenCalledTimes(3);
  });

  it("writes an injected diagnostic only after CMS commits a terminal failure", async () => {
    const envelope = snapshot();
    const fake = fakeCms(envelope);
    const order: string[] = [];
    const originalFail = fake.cms.fail.bind(fake.cms);
    fake.cms.fail = async (...args) => {
      const result = await originalFail(...args);
      order.push("cms-terminal-commit");
      return result;
    };
    const diagnostics = {
      async writeIfAbsent(input: { objectKey: string; bytes: Uint8Array; expiresAt: string }) {
        order.push("diagnostic-write");
        expect(input.objectKey).toBe("private/report-diagnostics/123e4567-e89b-42d3-a456-426614174000/bundle.json");
        expect(JSON.parse(new TextDecoder().decode(input.bytes))).toMatchObject({
          contractVersion: "survey-worker-diagnostic-bundle.v1",
          events: [{ reportRunId: "123e4567-e89b-42d3-a456-426614174000", error: { code: "INVALID_OUTPUT" } }],
        });
      },
    };
    const artifacts = artifactStore();
    const failingArtifacts: WorkerArtifactStore = {
      ...artifacts.store,
      async stage() {
        throw Object.assign(new Error("untrusted storage text"), { code: "INVALID_OUTPUT" });
      },
    };
    const result = await executeReportWorker("123e4567-e89b-42d3-a456-426614174000", {
      cms: fake.cms,
      artifacts: failingArtifacts,
      renderer: createDeterministicTestPdfRenderer(),
      diagnostics,
    });

    expect(result).toMatchObject({ status: "failed", failureCode: "INVALID_OUTPUT" });
    expect(order).toEqual(["cms-terminal-commit", "diagnostic-write"]);

    const noCommitFake = fakeCms(envelope);
    noCommitFake.cms.fail = async () => {
      throw new Error("CMS did not commit");
    };
    const writeIfAbsent = vi.fn(async () => undefined);
    await executeReportWorker("123e4567-e89b-42d3-a456-426614174000", {
      cms: noCommitFake.cms,
      artifacts: failingArtifacts,
      renderer: createDeterministicTestPdfRenderer(),
      diagnostics: { writeIfAbsent },
    });
    expect(writeIfAbsent).not.toHaveBeenCalled();
  });

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
      analysisProvider: async () => syntheticProviderResult(),
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
      analysisProvider: async () => syntheticProviderResult(),
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
    const provider = vi.fn(async () => syntheticProviderResult());
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
    const provider = vi.fn(async () => syntheticProviderResult());
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
    const provider = vi.fn(async () => syntheticProviderResult());
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
    const provider = vi.fn(async () => syntheticProviderResult());
    const renderer = vi.fn(async () => new Uint8Array([1]));
    const countTokens = vi.fn(async (request) => {
      expect(request.contractVersion).toBe("survey-count-request.v1");
      expect(request.segments.comments).toBe("[]");
      expect(request.modelConfig.model).toBe("gemini-3.8-flash");
      if (countTokens.mock.calls.length < 3)
        throw Object.assign(new Error("synthetic transient CountTokens error"), { code: "PROVIDER_TRANSIENT" });
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
      const countedValue = JSON.parse(request.segments.comments);
      if (countedValue.contractVersion !== "survey-model-input.v1")
        return { instructions: 100, schema: 100, metrics: 100, comments: 1 };
      const commentSegment = countedValue;
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
      return {
        output: analysisOutput,
        usage: {
          model: "gemini-3.8-flash",
          modelRevision: "synthetic-revision-1",
          sku: "synthetic-model-input",
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
        },
      };
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

    expect(result).toMatchObject({ status: "succeeded" });
    expect(tokens).toHaveBeenCalledTimes(2);
    expect(provider).toHaveBeenCalledTimes(1);
    const directCheckpoint = fake.writtenCheckpoints.find(({ stageKey }) => stageKey === "direct");
    expect(directCheckpoint?.payload).toMatchObject({
      kind: "direct",
      usage: {
        model: "gemini-3.8-flash",
        modelRevision: "synthetic-revision-1",
        sku: "synthetic-model-input",
        stageKey: "direct",
        pricingSnapshotVersion: "survey-pricing.v1",
        costMicros: "2",
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      },
    });
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
  }, 15_000);

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
    const populatedProvider = vi.fn(async () => syntheticProviderResult());
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
    const overBudgetProvider = vi.fn(async () => syntheticProviderResult());
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
    const provider = vi.fn(async () => syntheticProviderResult());
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
    const provider = vi.fn(async () => syntheticProviderResult());
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
      const provider = vi.fn(async () => syntheticProviderResult());
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
      analysisProvider: async () => syntheticProviderResult(),
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
      Object.assign(new Error("CMS unavailable"), { code: "CMS_TRANSIENT" }),
    );
    const cmsResult = await executeReportWorker("run-cms-transient", {
      cms: cms.cms,
      artifacts: artifactStore().store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: async () => syntheticProviderResult(),
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
      analysisProvider: async () => syntheticProviderResult(),
    });
    const replay = await executeReportWorker("run-1", {
      cms: fake.cms,
      artifacts: artifacts.store,
      renderer: createDeterministicTestPdfRenderer(),
      analysisProvider: async () => syntheticProviderResult(),
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
      analysisProvider: async () => syntheticProviderResult(),
    });
    expect(result).toMatchObject({
      status: "failed",
      failureCode: "INVARIANT",
    });
    expect(fake.calls.complete).toBe(0);
    expect(fake.calls.fail).toBe(0);
    expect(artifacts.staged.size).toBe(1);
    expect(artifacts.calls.discard).toBe(0);
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
      analysisProvider: async () => syntheticProviderResult(),
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
      analysisProvider: async () => syntheticProviderResult(),
    });
    expect(result).toMatchObject({
      status: "failed",
      failureCode: "STORAGE_TRANSIENT",
    });
    expect(fake.calls.fail).toBe(0);
    expect(artifacts.calls.stage).toBe(0);
  });

  it("completes and downloads a worker PDF through the injected private object adapter", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000113";
    const envelope = snapshot();
    const bucket = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: bucket.bucket });
    const fake = fakeCms(
      envelope,
      undefined,
      undefined,
      undefined,
      (runId, sha256) => deterministicReportId(runId, sha256),
    );
    const pdfBytes = minimalPdfFixture();
    const pdfSha256 = createHash("sha256").update(pdfBytes).digest("hex");
    const reportId = deterministicReportId(reportRunId, pdfSha256);
    const objectKey = `private/feedback-reports/${reportId}/report.pdf`;

    const testRenderer = createDeterministicTestPdfRenderer();
    const placeholderBytes = await testRenderer.render({
      html: "synthetic",
      snapshot: envelope.payload,
      charts: [],
    });
    expect(new TextDecoder().decode(placeholderBytes.subarray(0, 5))).not.toBe("%PDF-");
    await expect(
      storage.artifacts.stage(reportRunId, {
        objectKey,
        bytes: placeholderBytes,
        sha256: createHash("sha256").update(placeholderBytes).digest("hex"),
        size: placeholderBytes.byteLength,
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow("Private report storage operation failed");
    expect(bucket.objects.size).toBe(0);

    const result = await executeReportWorker(reportRunId, {
      cms: fake.cms,
      artifacts: storage.artifacts,
      renderer: {
        rendererVersion: "synthetic-valid-pdf.v1",
        async render() {
          return new Uint8Array(pdfBytes);
        },
      },
    });
    expect(result).toMatchObject({
      status: "succeeded",
      reportRunId,
      reportId,
      artifact: {
        objectKey,
        sha256: pdfSha256,
        size: pdfBytes.byteLength,
        mimeType: "application/pdf",
      },
    });
    expect(fake.calls.complete).toBe(1);
    expect(fake.completedCommand?.artifact).toEqual({
      objectKey,
      sha256: pdfSha256,
      size: pdfBytes.byteLength,
      mimeType: "application/pdf",
    });

    const staged = await storage.artifacts.readStaged(reportRunId, pdfSha256);
    expect(staged?.bytes).toEqual(pdfBytes);
    await storage.artifacts.stage(reportRunId, staged!);
    expect(bucket.calls.create).toBe(2);

    const metadata = toPrivateReportDownloadMetadata({
      reportId,
      reportRunId,
      sha256: pdfSha256,
      size: pdfBytes.byteLength,
    });
    const download = createFeedbackReportDownload({
      metadataReader: { read: async () => metadata },
      objectReader: storage.objectReader,
    });
    await expect(download.read(reportId)).resolves.toEqual({
      metadata,
      bytes: pdfBytes,
    });

    const conflictingBytes = new TextEncoder().encode("%PDF-1.7\nconflict\n%%EOF\n");
    await expect(
      storage.artifacts.stage(reportRunId, {
        ...staged!,
        bytes: conflictingBytes,
        sha256: createHash("sha256").update(conflictingBytes).digest("hex"),
        size: conflictingBytes.byteLength,
      }),
    ).rejects.toThrow("Private report storage operation failed");
    expect(bucket.objects.get(objectKey)?.bytes).toEqual(pdfBytes);

    await storage.artifacts.discardStaged(reportRunId, pdfSha256);
    await expect(storage.artifacts.readStaged(reportRunId, pdfSha256)).resolves.toBeNull();
    expect(bucket.objects.has(objectKey)).toBe(false);
  });

  it("does not delete a report object when completion wins before the failure CAS", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000114";
    const envelope = snapshot();
    const bucket = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: bucket.bucket });
    const fake = fakeCms(
      envelope,
      undefined,
      undefined,
      undefined,
      (runId, sha256) => deterministicReportId(runId, sha256),
    );
    const pdfBytes = minimalPdfFixture();
    const pdfSha256 = createHash("sha256").update(pdfBytes).digest("hex");
    const reportId = deterministicReportId(reportRunId, pdfSha256);
    const objectKey = `private/feedback-reports/${reportId}/report.pdf`;
    let storeCheckpointFailed = false;
    const checkpoint = fake.cms.checkpoint.bind(fake.cms);
    vi.spyOn(fake.cms, "checkpoint").mockImplementation((runId, command) => {
      if (command.checkpoint.stageKey === "store" && !storeCheckpointFailed) {
        storeCheckpointFailed = true;
        return Promise.reject(new TypeError("Synthetic store checkpoint failure"));
      }
      return checkpoint(runId, command);
    });

    const originalFail = fake.cms.fail.bind(fake.cms);
    vi.spyOn(fake.cms, "fail").mockImplementation(async (runId, command) => {
      const competingCompletion = await executeReportWorker(reportRunId, {
        cms: fake.cms,
        artifacts: storage.artifacts,
        renderer: {
          rendererVersion: "synthetic-valid-pdf.v1",
          async render() {
            return new Uint8Array(pdfBytes);
          },
        },
      });
      expect(competingCompletion.status).toBe("succeeded");
      return originalFail(runId, command);
    });

    const failedWorker = await executeReportWorker(reportRunId, {
      cms: fake.cms,
      artifacts: storage.artifacts,
      renderer: {
        rendererVersion: "synthetic-valid-pdf.v1",
        async render() {
          return new Uint8Array(pdfBytes);
        },
      },
    });

    expect(failedWorker).toMatchObject({ status: "failed", failureCode: "INVARIANT" });
    expect(fake.calls.complete).toBe(1);
    expect(bucket.calls.delete).toBe(0);
    expect(bucket.objects.get(objectKey)?.bytes).toEqual(pdfBytes);

    const metadata = toPrivateReportDownloadMetadata({
      reportId,
      reportRunId,
      sha256: pdfSha256,
      size: pdfBytes.byteLength,
    });
    const download = createFeedbackReportDownload({
      metadataReader: { read: async () => metadata },
      objectReader: storage.objectReader,
    });
    await expect(download.read(reportId)).resolves.toEqual({ metadata, bytes: pdfBytes });
  });

  it("cleans staged bytes only after a confirmed failed transition or identical replay", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000115";
    const envelope = snapshot();
    const bucket = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: bucket.bucket });
    const fake = fakeCms(envelope);
    const checkpoint = fake.cms.checkpoint.bind(fake.cms);
    vi.spyOn(fake.cms, "checkpoint").mockImplementation((runId, command) =>
      command.checkpoint.stageKey === "store"
        ? Promise.reject(new TypeError("Synthetic store checkpoint failure"))
        : checkpoint(runId, command),
    );
    bucket.refuseDelete();

    const result = await executeReportWorker(reportRunId, {
      cms: fake.cms,
      artifacts: storage.artifacts,
      renderer: {
        rendererVersion: "synthetic-valid-pdf.v1",
        async render() {
          return minimalPdfFixture();
        },
      },
    });

    expect(result).toMatchObject({
      status: "failed",
      failureCode: "INVARIANT",
      cleanupPending: true,
    });
    expect(fake.calls.fail).toBe(1);
    expect(bucket.calls.delete).toBe(1);
    expect(bucket.objects.size).toBe(1);
  });

  it("cleans staged bytes after the CMS replays the identical failed generation", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000116";
    const envelope = snapshot();
    const bucket = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: bucket.bucket });
    const fake = fakeCms(envelope);
    const checkpoint = fake.cms.checkpoint.bind(fake.cms);
    vi.spyOn(fake.cms, "checkpoint").mockImplementation((runId, command) =>
      command.checkpoint.stageKey === "store"
        ? Promise.reject(new TypeError("Synthetic store checkpoint failure"))
        : checkpoint(runId, command),
    );
    const originalFail = fake.cms.fail.bind(fake.cms);
    vi.spyOn(fake.cms, "fail").mockImplementation(async (runId, command) => {
      await originalFail(runId, command);
      return originalFail(runId, command);
    });

    const result = await executeReportWorker(reportRunId, {
      cms: fake.cms,
      artifacts: storage.artifacts,
      renderer: {
        rendererVersion: "synthetic-valid-pdf.v1",
        async render() {
          return minimalPdfFixture();
        },
      },
    });

    expect(result).toMatchObject({
      status: "failed",
      disposition: "terminal-replay",
      failureCode: "INVARIANT",
    });
    expect(fake.calls.fail).toBe(2);
    expect(bucket.calls.delete).toBe(1);
    expect(bucket.objects.size).toBe(0);
  });

  it("does not clean staged bytes when a failed replay returns a later state version", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000117";
    const envelope = snapshot();
    const bucket = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: bucket.bucket });
    const fake = fakeCms(envelope);
    const checkpoint = fake.cms.checkpoint.bind(fake.cms);
    vi.spyOn(fake.cms, "checkpoint").mockImplementation((runId, command) =>
      command.checkpoint.stageKey === "store"
        ? Promise.reject(new TypeError("Synthetic store checkpoint failure"))
        : checkpoint(runId, command),
    );
    vi.spyOn(fake.cms, "fail").mockImplementation(async (runId, command) => ({
      contractVersion: "survey-worker-cms.v1",
      reportRunId: runId,
      stateVersion: command.expectedStateVersion + 2,
      status: "failed",
      failureCode: command.failureCode,
      replayed: true,
      alertRequired: false,
    }));

    const result = await executeReportWorker(reportRunId, {
      cms: fake.cms,
      artifacts: storage.artifacts,
      renderer: {
        rendererVersion: "synthetic-valid-pdf.v1",
        async render() {
          return minimalPdfFixture();
        },
      },
    });

    expect(bucket.calls.delete).toBe(0);
    expect(bucket.objects.size).toBe(1);
    expect(result).toMatchObject({
      status: "failed",
      disposition: "failed",
      failureCode: "INVARIANT",
    });
    expect(result).not.toHaveProperty("cleanupPending");
  });
});
