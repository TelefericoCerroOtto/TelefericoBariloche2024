import { createHash } from "node:crypto";

import {
  deriveStageInputDigestV1,
  validateDirectStageConfigV1,
  validateWorkerStageCheckpointV1,
} from "./checkpoint-contract";
import {
  buildReportCharts,
  canonicalizeJson,
  validateSnapshotEnvelope,
} from "../../../packages/survey-reporting-core/src";

import {
  renderValidatedPdf,
  validatePublishedAnalysis,
  type PdfArtifact,
} from "./pdf";
import {
  type CompleteCommand,
  type FailCommand,
  type PdfRenderer,
  type RuntimeFailureCode,
  type ValidatedAnalysisProvider,
  type WorkerArtifact,
  type WorkerArtifactStore,
  type WorkerCheckpoint,
  type WorkerCheckpointSet,
  type WorkerCmsClient,
  type WorkerExecutionResult,
  type WorkerClaimResult,
  type ModelConfigV1,
  WorkerCmsConflictError,
} from "./contracts";

type WorkerRuntimeDependencies = {
  readonly cms: WorkerCmsClient;
  readonly artifacts: WorkerArtifactStore;
  readonly renderer: PdfRenderer;
  readonly analysisProvider: ValidatedAnalysisProvider;
  readonly now?: () => Date;
};

type RetryableFailureCode = Extract<
  RuntimeFailureCode,
  "PROVIDER_TRANSIENT" | "CMS_TRANSIENT" | "STORAGE_TRANSIENT"
>;

class ClassifiedFailure extends Error {
  readonly code: RetryableFailureCode;

  constructor(code: RetryableFailureCode) {
    super("Worker dependency failed");
    this.name = "ClassifiedFailure";
    this.code = code;
  }
}

const safeFailureMessages: Record<RuntimeFailureCode, string> = {
  PROVIDER_TRANSIENT: "The report provider is temporarily unavailable.",
  PROVIDER_RATE_LIMIT: "The report provider is temporarily busy.",
  PROVIDER_TIMEOUT: "The report provider timed out.",
  CMS_TRANSIENT: "Report state could not be persisted.",
  STORAGE_TRANSIENT: "The report artifact could not be staged.",
  INVALID_OUTPUT: "The report output did not satisfy its contract.",
  AUTHENTICATION: "The report worker authentication failed.",
  CONFIGURATION: "Report generation is not configured.",
  UNKNOWN_VERSION: "The report contract version is not supported.",
  INVARIANT: "The report state failed an integrity check.",
  PROHIBITED_CONTENT: "The report output contained prohibited content.",
  QUEUE_ENQUEUE_EXHAUSTED: "The report could not be queued.",
};

function outputDigest(payload: unknown): string {
  return createHash("sha256").update(canonicalizeJson(payload)).digest("hex");
}

function checkpointFor(
  checkpoints: WorkerCheckpointSet,
  stageKey: WorkerCheckpoint["stageKey"],
  inputDigest: string,
): WorkerCheckpoint | undefined {
  return checkpoints.entries.find(
    (checkpoint) =>
      checkpoint.stageKey === stageKey &&
      checkpoint.status === "valid" &&
      checkpoint.inputDigest === inputDigest,
  );
}

function isTerminal(
  claim: WorkerClaimResult,
): claim is Extract<WorkerClaimResult, { status: "succeeded" | "failed" }> {
  return claim.status === "succeeded" || claim.status === "failed";
}

function knownFailureCode(error: unknown): RuntimeFailureCode | null {
  if (error instanceof WorkerCmsConflictError) return "INVARIANT";
  if (error instanceof TypeError)
    return error.message === "Unknown snapshot contract"
      ? "UNKNOWN_VERSION"
      : "INVARIANT";
  if (!(error instanceof Error)) return null;
  const code = (error as { code?: unknown }).code;
  const candidate = typeof code === "string" ? code : error.name;
  if (candidate in safeFailureMessages) return candidate as RuntimeFailureCode;
  if (
    error.name === "PdfValidationError" ||
    error.name === "RendererValidationError"
  )
    return "INVALID_OUTPUT";
  if (error.name === "PdfRendererError") return "STORAGE_TRANSIENT";
  return null;
}

function classifyFailure(error: unknown): RuntimeFailureCode {
  return knownFailureCode(error) ?? "INVARIANT";
}

async function classifyDependencyFailure<T>(
  failureCode: RetryableFailureCode,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (knownFailureCode(error)) throw error;
    throw new ClassifiedFailure(failureCode);
  }
}

function isRetryableFailure(
  failureCode: RuntimeFailureCode,
): failureCode is RetryableFailureCode {
  return (
    failureCode === "PROVIDER_TRANSIENT" ||
    failureCode === "CMS_TRANSIENT" ||
    failureCode === "STORAGE_TRANSIENT"
  );
}

async function failSafely(
  dependencies: WorkerRuntimeDependencies,
  reportRunId: string,
  stateVersion: number,
  failureCode: RuntimeFailureCode,
  artifact: WorkerArtifact | null,
): Promise<WorkerExecutionResult> {
  if (artifact) {
    try {
      await dependencies.artifacts.discardStaged(reportRunId, artifact.sha256);
    } catch {
      // The terminal CMS failure remains the authoritative safe outcome.
    }
  }
  const command: FailCommand = {
    contractVersion: "survey-worker-cms.v1",
    expectedStateVersion: stateVersion,
    failureCode,
    safeFailureMessage: safeFailureMessages[failureCode],
  };
  try {
    const result = await dependencies.cms.fail(reportRunId, command);
    return {
      status: "failed",
      disposition: result.replayed ? "terminal-replay" : "failed",
      reportRunId,
      failureCode,
    };
  } catch {
    return {
      status: "failed",
      disposition: "failed",
      reportRunId,
      failureCode,
    };
  }
}

function checkpoint(
  reportRunId: string,
  stageKey: WorkerCheckpoint["stageKey"],
  inputDigest: string,
  payload: WorkerCheckpoint["payload"],
  now: Date,
): WorkerCheckpoint {
  const value: WorkerCheckpoint = {
    checkpointVersion: "survey-checkpoint.v1",
    stageKey,
    stageIndex: stageKey === "render" ? 4 : 5,
    route: "direct",
    stageType: stageKey,
    status: "valid",
    inputDigest,
    outputDigest: outputDigest(payload),
    attempts: 1,
    completedAt: now.toISOString(),
    payload,
  };
  validateWorkerStageCheckpointV1(value, {
    reportRunId,
    route: "direct",
  });
  return value;
}

async function writeCheckpoint(
  dependencies: WorkerRuntimeDependencies,
  reportRunId: string,
  stateVersion: number,
  value: WorkerCheckpoint,
): Promise<number> {
  const result = await classifyDependencyFailure("CMS_TRANSIENT", () =>
    dependencies.cms.checkpoint(reportRunId, {
      contractVersion: "survey-worker-cms.v1",
      expectedStateVersion: stateVersion,
      checkpoint: value,
    }),
  );
  return result.stateVersion;
}

function stagedArtifact(
  reportRunId: string,
  artifact: PdfArtifact,
): WorkerArtifact {
  return {
    objectKey: `private/feedback-reports/staged/${reportRunId}/report.pdf`,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    size: artifact.size,
    mimeType: artifact.mimeType,
  };
}

export async function executeReportWorker(
  reportRunId: string,
  dependencies: WorkerRuntimeDependencies,
): Promise<WorkerExecutionResult> {
  const claim = await dependencies.cms.claim(reportRunId);
  if (isTerminal(claim)) {
    if (claim.status === "succeeded")
      return {
        status: "succeeded",
        disposition: "terminal-replay",
        reportRunId,
      };
    return {
      status: "failed",
      disposition: "terminal-replay",
      reportRunId,
      failureCode: "INVARIANT",
    };
  }

  let stateVersion = claim.stateVersion;
  let staged: WorkerArtifact | null = null;
  try {
    validateDirectStageConfigV1({
      modelConfig: claim.modelConfig,
      pricingSnapshot: claim.pricingSnapshot,
      rendererVersion: dependencies.renderer.rendererVersion,
    });
    const modelConfig = claim.modelConfig as ModelConfigV1;
    if (
      claim.checkpoints.version !== "survey-checkpoints.v1" ||
      claim.checkpoints.route !== "direct" ||
      claim.checkpoints.chunkCount !== null
    )
      throw new TypeError("Unsupported worker checkpoint graph");
    if (
      claim.checkpoints.entries.some(
        (value) => value.stageKey !== "render" && value.stageKey !== "store",
      ) ||
      new Set(claim.checkpoints.entries.map(({ stageKey }) => stageKey)).size !==
        claim.checkpoints.entries.length ||
      (claim.checkpoints.entries.some(({ stageKey }) => stageKey === "store") &&
        !claim.checkpoints.entries.some(({ stageKey }) => stageKey === "render"))
    )
      throw new TypeError("Invalid worker checkpoint graph");
    const priorRender = claim.checkpoints.entries.find(
      (value) => value.stageKey === "render",
    );
    const priorStore = claim.checkpoints.entries.find(
      (value) => value.stageKey === "store",
    );
    for (const priorCheckpoint of claim.checkpoints.entries) {
      validateWorkerStageCheckpointV1(priorCheckpoint, {
        reportRunId,
        route: "direct",
      });
    }
    const snapshotResult = await classifyDependencyFailure(
      "CMS_TRANSIENT",
      () => dependencies.cms.snapshot(reportRunId),
    );
    if (snapshotResult.stateVersion !== stateVersion)
      throw new WorkerCmsConflictError("Snapshot state version is stale");
    const snapshot = validateSnapshotEnvelope(snapshotResult.snapshot);
    if (claim.checkpoints.snapshotDigest !== snapshotResult.snapshot.digestHex)
      throw new TypeError("Worker checkpoint snapshot digest mismatch");
    const analysis = validatePublishedAnalysis(
      await classifyDependencyFailure("PROVIDER_TRANSIENT", () =>
        dependencies.analysisProvider(snapshot, claim.checkpoints),
      ),
    );
    const validatePayload = {
      kind: "validate" as const,
      publishedAnalysis: analysis,
      validatorVersion: modelConfig.validatorVersion,
    };
    const validateOutputDigest = outputDigest(validatePayload);
    const charts = buildReportCharts(snapshot);
    const renderInputDigest = deriveStageInputDigestV1({
      stageKey: "render",
      snapshotDigest: snapshotResult.snapshot.digestHex,
      sourceRevision: snapshotResult.snapshot.payload.sourceRevision,
      modelConfig,
      rendererVersion: dependencies.renderer.rendererVersion,
      orderedDependencies: [
        { stageKey: "validate", outputDigest: validateOutputDigest },
      ],
    });
    const existingRender = checkpointFor(
      claim.checkpoints,
      "render",
      renderInputDigest,
    );
    if (priorRender && priorRender.inputDigest !== renderInputDigest)
      throw new TypeError("Worker checkpoint input digest mismatch");
    let artifact: WorkerArtifact | null = null;
    if (existingRender && existingRender.payload.kind === "render") {
      const { pdfSha256, size } = existingRender.payload;
      artifact = await classifyDependencyFailure("STORAGE_TRANSIENT", () =>
        dependencies.artifacts.readStaged(reportRunId, pdfSha256),
      );
      if (artifact && artifact.size !== size) artifact = null;
      if (artifact) staged = artifact;
    }

    if (!artifact) {
      const rendered = await renderValidatedPdf(
        snapshotResult.snapshot,
        analysis,
        dependencies.renderer,
      );
      artifact = stagedArtifact(reportRunId, rendered);
      staged = artifact;
      const artifactToStage = artifact;
      await classifyDependencyFailure("STORAGE_TRANSIENT", () =>
        dependencies.artifacts.stage(reportRunId, artifactToStage),
      );
      const renderCheckpoint = checkpoint(
        reportRunId,
        "render",
        renderInputDigest,
        {
          kind: "render",
          rendererVersion: dependencies.renderer.rendererVersion,
          pdfSha256: rendered.sha256,
          size: rendered.size,
        },
        (dependencies.now ?? (() => new Date()))(),
      );
      stateVersion = await writeCheckpoint(
        dependencies,
        reportRunId,
        stateVersion,
        renderCheckpoint,
      );
    }

    const renderPayload = {
      kind: "render" as const,
      rendererVersion: dependencies.renderer.rendererVersion,
      pdfSha256: artifact.sha256,
      size: artifact.size,
    };
    const storeInputDigest = deriveStageInputDigestV1({
      stageKey: "store",
      snapshotDigest: snapshotResult.snapshot.digestHex,
      sourceRevision: snapshotResult.snapshot.payload.sourceRevision,
      modelConfig,
      rendererVersion: dependencies.renderer.rendererVersion,
      orderedDependencies: [
        { stageKey: "render", outputDigest: outputDigest(renderPayload) },
      ],
    });
    const existingStore = checkpointFor(
      claim.checkpoints,
      "store",
      storeInputDigest,
    );
    if (priorStore && priorStore.inputDigest !== storeInputDigest)
      throw new TypeError("Worker checkpoint input digest mismatch");
    if (!existingStore) {
      stateVersion = await writeCheckpoint(
        dependencies,
        reportRunId,
        stateVersion,
        checkpoint(
          reportRunId,
          "store",
          storeInputDigest,
          {
            kind: "store",
            objectKey: artifact.objectKey,
            artifactSha256: artifact.sha256,
            size: artifact.size,
            mimeType: "application/pdf",
          },
          (dependencies.now ?? (() => new Date()))(),
        ),
      );
    }

    const complete: CompleteCommand = {
      contractVersion: "survey-worker-cms.v1",
      expectedStateVersion: stateVersion,
      validatedAnalysis: analysis,
      analysisDigest: createHash("sha256")
        .update(canonicalizeJson(analysis))
        .digest("hex"),
      rendererVersion: dependencies.renderer.rendererVersion,
      artifact: {
        objectKey: artifact.objectKey,
        sha256: artifact.sha256,
        size: artifact.size,
        mimeType: artifact.mimeType,
      },
    };
    const result = await classifyDependencyFailure("CMS_TRANSIENT", () =>
      dependencies.cms.complete(reportRunId, complete),
    );
    return {
      status: "succeeded",
      disposition: result.replayed ? "terminal-replay" : "completed",
      reportRunId,
      reportId: result.reportId,
      artifact: complete.artifact,
    };
  } catch (error) {
    const failureCode = classifyFailure(error);
    if (isRetryableFailure(failureCode))
      return {
        status: "failed",
        disposition: "failed",
        reportRunId,
        failureCode,
      };
    if (error instanceof WorkerCmsConflictError) {
      if (staged) {
        try {
          await dependencies.artifacts.discardStaged(
            reportRunId,
            staged.sha256,
          );
        } catch {
          // A concurrent owner still prevents this worker from publishing.
        }
      }
      return {
        status: "failed",
        disposition: "failed",
        reportRunId,
        failureCode,
      };
    }
    return failSafely(
      dependencies,
      reportRunId,
      stateVersion,
      failureCode,
      staged,
    );
  }
}
