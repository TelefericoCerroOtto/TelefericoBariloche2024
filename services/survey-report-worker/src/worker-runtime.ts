import { createHash } from "node:crypto";

import {
  deriveStageInputDigestV1,
  deriveWorkerStageInputDigestV1,
  CHECKPOINT_CONTRACT_VERSIONS,
  stageConfigDigest,
  stageInputDigestV1,
  validateDirectStageConfigV1,
  validateWorkerStageCheckpointV1,
} from "./checkpoint-contract";
import {
  buildReportCharts,
  canonicalizeJson,
  validateSnapshotEnvelope,
  type SnapshotV1,
} from "@teleferico/survey-reporting-core";

import { renderValidatedPdf, type PdfArtifact } from "./pdf";
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
  type WorkerCheckpointStage,
  type DirectAnalysisV1,
  type PricingSnapshotV1,
  type CountTokensProvider,
  type CountTokensRequestV1,
  type EvidenceKeyProvider,
  type WorkerRuntimeDependencies,
  type MapAnalysisProvider,
  type ReduceAnalysisProvider,
  type MapAnalysisV1,
  type ReduceAnalysisV1,
  WorkerCmsConflictError,
} from "./contracts";
import {
  createEmptyEvidenceDirectAnalysisV1,
  createDirectCountRequestV1,
  createDirectModelRequestV1,
  planDirectExecutionV1,
  publishEmptyEvidenceAnalysisV1,
} from "./direct-execution-plan";
import { preflightDirectAnalysis } from "./analysis-output-preflight";
import {
  preflightMapAnalysis,
  preflightReduceAnalysis,
} from "./analysis-output-preflight";
import {
  buildMapChunksV1,
  planWorkerRouteV1,
} from "./map-reduce-execution-plan";
import { executeMapReduceStages } from "./map-reduce-worker-runtime";
import { priceProviderUsageV1, validateProviderUsageV1 } from "./worker-cost";
import { deliverPendingWorkerAlerts } from "./worker-alerts";
import { retryTransient, retryableFailureCode } from "./retry-policy";
import {
  countGeneratedOutputV1,
  validateGeneratedOutputBudgetV1,
} from "./map-reduce-execution-plan";
import { deterministicReportId } from "@teleferico/tb113-private-report-storage";
import { createWorkerDiagnosticBundleV1 } from "./worker-diagnostics";
import {
  createOutputRejectionError,
  outputRejectionFor,
  type OutputRejection,
} from "./output-rejection";

type RetryableFailureCode = Extract<
  RuntimeFailureCode,
  | "PROVIDER_TRANSIENT"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_TIMEOUT"
  | "CMS_TRANSIENT"
  | "STORAGE_TRANSIENT"
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
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code in safeFailureMessages)
      return code as RuntimeFailureCode;
  }
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
    return await retryTransient(operation);
  } catch (error) {
    if (!retryableFailureCode(error)) throw error;
    const knownCode = knownFailureCode(error);
    throw new ClassifiedFailure(
      knownCode && isRetryableFailure(knownCode) ? knownCode : failureCode,
    );
  }
}

function isRetryableFailure(
  failureCode: RuntimeFailureCode,
): failureCode is RetryableFailureCode {
  return (
    failureCode === "PROVIDER_TRANSIENT" ||
    failureCode === "PROVIDER_RATE_LIMIT" ||
    failureCode === "PROVIDER_TIMEOUT" ||
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
  diagnostic: {
    readonly stage: string;
    readonly model: unknown;
    readonly sourceRevision: string | null;
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly chunks: number;
    readonly durationMs: number;
  } | null,
  outputRejection: OutputRejection | null,
): Promise<WorkerExecutionResult> {
  const command: FailCommand = {
    contractVersion: "survey-worker-cms.v1",
    expectedStateVersion: stateVersion,
    failureCode,
    safeFailureMessage: safeFailureMessages[failureCode],
  };
  try {
    const result = await dependencies.cms.fail(reportRunId, command);
    const confirmedFailure =
      result.reportRunId === reportRunId &&
      result.status === "failed" &&
      result.failureCode === failureCode &&
      Number.isSafeInteger(result.stateVersion) &&
      result.stateVersion === stateVersion + 1;
    if (!confirmedFailure) {
      return {
        status: "failed",
        disposition: "failed",
        reportRunId,
        failureCode,
      };
    }

    if (
      !result.replayed &&
      failureCode === "INVALID_OUTPUT" &&
      outputRejection &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        reportRunId,
      )
    ) {
      try {
        console.log(
          JSON.stringify({
            event: "tb113_output_rejection",
            reportRunId,
            stage: outputRejection.stage,
            reasonCategory: outputRejection.reasonCategory,
          }),
        );
      } catch {
        // The bounded diagnostic must not change the committed terminal result.
      }
    }

    let cleanupPending = false;
    if (artifact) {
      try {
        await dependencies.artifacts.discardStaged(
          reportRunId,
          artifact.sha256,
        );
      } catch {
        cleanupPending = true;
      }
    }
    if (!result.replayed && dependencies.diagnostics && diagnostic) {
      try {
        const bundle = createWorkerDiagnosticBundleV1(
          {
            reportRunId,
            stage: diagnostic.stage,
            status: "failed",
            attempt: 1,
            model: diagnostic.model,
            inputTokens: diagnostic.inputTokens,
            outputTokens: diagnostic.outputTokens,
            chunks: diagnostic.chunks,
            durationMs: diagnostic.durationMs,
            errorCode: failureCode,
            sourceRevision: diagnostic.sourceRevision,
          },
          (dependencies.now ?? (() => new Date()))(),
        );
        await dependencies.diagnostics.writeIfAbsent({
          objectKey: bundle.objectKey,
          bytes: bundle.bytes,
          expiresAt: bundle.bundle.expiresAt,
        });
      } catch {
        // Diagnostics are best-effort and cannot change the committed terminal outcome.
      }
    }
    if (result.pendingAlerts?.length) {
      void deliverPendingWorkerAlerts({
        reportRunId,
        alerts: result.pendingAlerts,
        dependencies,
      }).catch(() => undefined);
    }
    return {
      status: "failed",
      disposition: result.replayed ? "terminal-replay" : "failed",
      reportRunId,
      failureCode,
      ...(cleanupPending ? { cleanupPending: true } : {}),
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
  stageKey: WorkerCheckpointStage,
  inputDigest: string,
  payload: WorkerCheckpoint["payload"],
  route: "common" | "direct" | "map-reduce",
  snapshot: SnapshotV1,
  now: Date,
  chunkCount: number | null = null,
): WorkerCheckpoint {
  const mapMatch = /^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(stageKey);
  const indexes: Record<string, number> =
    route === "map-reduce"
      ? {
          redact: 0,
          count: 1,
          reduce: Number(chunkCount) + 2,
          validate: Number(chunkCount) + 3,
          render: Number(chunkCount) + 4,
          store: Number(chunkCount) + 5,
        }
      : { redact: 0, count: 1, direct: 2, validate: 3, render: 4, store: 5 };
  const stageIndex = mapMatch ? Number(mapMatch[1]) + 1 : indexes[stageKey];
  if (!Number.isSafeInteger(stageIndex))
    throw new TypeError("Unknown worker checkpoint stage");
  const value: WorkerCheckpoint = {
    checkpointVersion: "survey-checkpoint.v1",
    stageKey,
    stageIndex,
    route: stageIndex <= 1 ? "common" : route,
    stageType: (mapMatch ? "map" : stageKey) as WorkerCheckpoint["stageType"],
    status: "valid",
    inputDigest,
    outputDigest: outputDigest(payload),
    attempts: 1,
    completedAt: now.toISOString(),
    payload,
  };
  validateWorkerStageCheckpointV1(value, {
    reportRunId,
    route: route === "common" ? "direct" : route,
    ...(route === "map-reduce" && chunkCount !== null ? { chunkCount } : {}),
    snapshot,
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
  if (result.pendingAlerts?.length) {
    void deliverPendingWorkerAlerts({
      reportRunId,
      alerts: result.pendingAlerts,
      dependencies,
    }).catch(() => undefined);
  }
  return result.stateVersion;
}

function stagedArtifact(
  reportRunId: string,
  artifact: PdfArtifact,
  reportId: string,
): WorkerArtifact {
  return {
    objectKey: `private/feedback-reports/${reportId}/report.pdf`,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    size: artifact.size,
    mimeType: artifact.mimeType,
  };
}

function stageInputDigest(input: {
  readonly stageKey:
    | "redact"
    | "count"
    | "direct"
    | "validate"
    | "render"
    | "store";
  readonly snapshotDigest: string;
  readonly sourceRevision: string;
  readonly modelConfig: ModelConfigV1;
  readonly rendererVersion: string;
  readonly dependencies: readonly {
    readonly stageKey: WorkerCheckpointStage;
    readonly outputDigest: string;
  }[];
}): string {
  if (input.stageKey === "render" || input.stageKey === "store") {
    return deriveStageInputDigestV1({
      stageKey: input.stageKey,
      snapshotDigest: input.snapshotDigest,
      sourceRevision: input.sourceRevision,
      modelConfig: input.modelConfig,
      rendererVersion: input.rendererVersion,
      orderedDependencies: input.dependencies,
    });
  }
  const index: Record<"redact" | "count" | "direct" | "validate", number> = {
    redact: 0,
    count: 1,
    direct: 2,
    validate: 3,
  };
  const stageIndex = index[input.stageKey];
  return deriveWorkerStageInputDigestV1({
    stageKey: input.stageKey,
    stageIndex,
    route:
      input.stageKey === "redact" || input.stageKey === "count"
        ? "common"
        : "direct",
    snapshotDigest: input.snapshotDigest,
    sourceRevision: input.sourceRevision,
    modelConfig: input.modelConfig,
    orderedDependencyOutputDigests: input.dependencies.map(
      ({ outputDigest }) => outputDigest,
    ),
  });
}

function mapReduceStageInputDigest(input: {
  readonly stageKey: string;
  readonly chunkCount: number;
  readonly snapshotDigest: string;
  readonly sourceRevision: string;
  readonly modelConfig: ModelConfigV1;
  readonly rendererVersion: string;
  readonly dependencies: readonly {
    readonly stageKey: string;
    readonly outputDigest: string;
  }[];
  readonly chunkMembershipDigest?: string;
}): string {
  const mapMatch = /^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(input.stageKey);
  const stageIndex = mapMatch
    ? Number(mapMatch[1]) + 1
    : input.stageKey === "redact"
      ? 0
      : input.stageKey === "count"
        ? 1
        : input.stageKey === "reduce"
          ? input.chunkCount + 2
          : input.stageKey === "validate"
            ? input.chunkCount + 3
            : input.stageKey === "render"
              ? input.chunkCount + 4
              : input.stageKey === "store"
                ? input.chunkCount + 5
                : -1;
  const route =
    input.stageKey === "redact" || input.stageKey === "count"
      ? "common"
      : "map-reduce";
  if (stageIndex < 0)
    throw new TypeError("Unknown map-reduce checkpoint stage");
  const rendererVersion =
    input.stageKey === "render" || input.stageKey === "store"
      ? input.rendererVersion
      : null;
  const projection = {
    version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig,
    stageKey: input.stageKey,
    modelConfig: input.modelConfig,
    evidenceKeyId: input.modelConfig.evidenceKeyId,
    rendererVersion,
  };
  return stageInputDigestV1({
    stageKey: input.stageKey,
    stageIndex,
    route,
    snapshotDigest: input.snapshotDigest,
    sourceRevision: input.sourceRevision,
    contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
    stageConfigDigest: stageConfigDigest(projection),
    orderedDependencyOutputDigests: input.dependencies.map(
      ({ outputDigest }) => outputDigest,
    ),
    chunkMembershipDigest: input.chunkMembershipDigest ?? null,
  });
}

export async function executeReportWorker(
  reportRunId: string,
  dependencies: WorkerRuntimeDependencies,
): Promise<WorkerExecutionResult> {
  const startedAt = Date.now();
  let diagnosticModel: unknown;
  let diagnosticSourceRevision: string | null = null;
  let diagnosticChunks = 0;
  let diagnosticInputTokens = 0;
  let diagnosticOutputTokens = 0;
  let diagnosticStage = "worker";
  const claim = await dependencies.cms.claim(reportRunId);
  if (claim.pendingAlerts?.length) {
    void deliverPendingWorkerAlerts({
      reportRunId,
      alerts: claim.pendingAlerts,
      dependencies,
    }).catch(() => undefined);
  }
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
      dependencies.approvedModelConfig &&
      canonicalizeJson(modelConfig) !==
        canonicalizeJson(dependencies.approvedModelConfig)
    )
      throw Object.assign(
        new TypeError(
          "CMS model configuration differs from the approved worker configuration",
        ),
        { code: "CONFIGURATION" as const },
      );
    if (
      dependencies.approvedPricingSnapshot &&
      canonicalizeJson(claim.pricingSnapshot) !==
        canonicalizeJson(dependencies.approvedPricingSnapshot)
    )
      throw Object.assign(
        new TypeError(
          "CMS pricing snapshot differs from the approved worker configuration",
        ),
        { code: "CONFIGURATION" as const },
      );
    diagnosticModel = modelConfig.model;
    if (
      claim.checkpoints.version !== "survey-checkpoints.v1" ||
      !["direct", "undecided", "map-reduce"].includes(
        claim.checkpoints.route,
      ) ||
      (claim.checkpoints.route !== "map-reduce" &&
        claim.checkpoints.chunkCount !== null) ||
      (claim.checkpoints.route === "map-reduce" &&
        (!Number.isSafeInteger(claim.checkpoints.chunkCount) ||
          Number(claim.checkpoints.chunkCount) < 1))
    )
      throw new TypeError("Unsupported worker checkpoint graph");
    const expectedStages: readonly WorkerCheckpointStage[] = [
      "redact",
      "count",
      "direct",
      "validate",
      "render",
      "store",
    ];
    if (
      claim.checkpoints.route !== "map-reduce" &&
      (claim.checkpoints.entries.some(
        ({ stageKey }, index) => stageKey !== expectedStages[index],
      ) ||
        new Set(claim.checkpoints.entries.map(({ stageKey }) => stageKey))
          .size !== claim.checkpoints.entries.length ||
        (claim.checkpoints.entries.some(
          ({ stageKey }) => stageKey === "store",
        ) &&
          !claim.checkpoints.entries.some(
            ({ stageKey }) => stageKey === "render",
          )) ||
        (claim.checkpoints.route === "undecided" &&
          claim.checkpoints.entries.some(
            ({ stageKey }) => stageKey !== "redact",
          )))
    )
      throw new TypeError("Invalid worker checkpoint graph");
    if (claim.checkpoints.route === "map-reduce") {
      const chunkCount = Number(claim.checkpoints.chunkCount);
      const expectedMapPrefix = [
        "redact",
        "count",
        ...Array.from(
          { length: chunkCount },
          (_, index) => `map.${index + 1}-of-${chunkCount}`,
        ),
      ];
      if (
        claim.checkpoints.entries.length < 2 ||
        claim.checkpoints.entries.some(
          ({ stageKey }, index) => stageKey !== expectedMapPrefix[index],
        )
      )
        throw new TypeError("Invalid map-reduce worker checkpoint graph");
      const count = claim.checkpoints.entries[1];
      if (
        !count ||
        count.payload.kind !== "count" ||
        count.payload.route !== "map-reduce" ||
        count.payload.chunkCount !== chunkCount
      )
        throw new TypeError("Map-reduce route checkpoint is incomplete");
    }
    const snapshotResult = await classifyDependencyFailure(
      "CMS_TRANSIENT",
      () => dependencies.cms.snapshot(reportRunId),
    );
    if (snapshotResult.stateVersion !== stateVersion)
      throw new WorkerCmsConflictError("Snapshot state version is stale");
    const snapshot = validateSnapshotEnvelope(snapshotResult.snapshot);
    diagnosticSourceRevision = snapshot.sourceRevision;
    if (claim.checkpoints.snapshotDigest !== snapshotResult.snapshot.digestHex)
      throw new TypeError("Worker checkpoint snapshot digest mismatch");
    let checkpointSet: WorkerCheckpointSet = {
      ...claim.checkpoints,
      entries: [...claim.checkpoints.entries],
    };
    if (checkpointSet.route === "map-reduce") {
      const key =
        snapshot.comments.length === 0
          ? null
          : typeof dependencies.evidenceKeyProvider === "function"
            ? await dependencies.evidenceKeyProvider(modelConfig.evidenceKeyId)
            : null;
      if (snapshot.comments.length > 0 && !key)
        throw Object.assign(
          new TypeError("Injected per-run evidence key is required"),
          { code: "CONFIGURATION" as const },
        );
      const state = { stateVersion, checkpointSet, staged };
      const result = await executeMapReduceStages({
        reportRunId,
        snapshotEnvelope: snapshotResult.snapshot,
        modelConfig,
        pricingSnapshot: claim.pricingSnapshot as PricingSnapshotV1,
        evidenceKey: key ?? "",
        dependencies,
        state,
        updateState: (next) => {
          stateVersion = next.stateVersion;
          checkpointSet = next.checkpointSet;
          staged = next.staged;
        },
      });
      return result;
    }
    for (const priorCheckpoint of checkpointSet.entries) {
      validateWorkerStageCheckpointV1(priorCheckpoint, {
        reportRunId,
        route: "direct",
        snapshot,
      });
    }
    const checkpointDependencies: Partial<
      Record<WorkerCheckpointStage, readonly WorkerCheckpointStage[]>
    > = {
      redact: [],
      count: ["redact"],
      direct: ["count"],
      reduce: ["count"],
      validate: ["direct"],
      render: ["validate"],
      store: ["render"],
    };
    const boundCheckpoints = new Map<WorkerCheckpointStage, WorkerCheckpoint>();
    for (const priorCheckpoint of checkpointSet.entries) {
      const expectedInputDigest = stageInputDigest({
        stageKey: priorCheckpoint.stageKey as
          | "redact"
          | "count"
          | "direct"
          | "validate"
          | "render"
          | "store",
        snapshotDigest: snapshotResult.snapshot.digestHex,
        sourceRevision: snapshot.sourceRevision,
        modelConfig,
        rendererVersion: dependencies.renderer.rendererVersion,
        dependencies: (
          checkpointDependencies[priorCheckpoint.stageKey] ?? []
        ).map((stageKey) => {
          const dependency = boundCheckpoints.get(stageKey);
          if (!dependency)
            throw new TypeError(
              "Stored worker checkpoint dependency is missing",
            );
          return { stageKey, outputDigest: dependency.outputDigest };
        }),
      });
      if (priorCheckpoint.inputDigest !== expectedInputDigest)
        throw new TypeError("Stored worker checkpoint input digest mismatch");
      boundCheckpoints.set(priorCheckpoint.stageKey, priorCheckpoint);
    }

    const addCheckpoint = async (
      stageKey: WorkerCheckpointStage,
      payload: WorkerCheckpoint["payload"],
      route: "common" | "direct",
      orderedDependencies: readonly WorkerCheckpointStage[],
    ) => {
      const entries = new Map(
        checkpointSet.entries.map((entry) => [entry.stageKey, entry]),
      );
      const inputDigest = stageInputDigest({
        stageKey: stageKey as
          | "redact"
          | "count"
          | "direct"
          | "validate"
          | "render"
          | "store",
        snapshotDigest: snapshotResult.snapshot.digestHex,
        sourceRevision: snapshot.sourceRevision,
        modelConfig,
        rendererVersion: dependencies.renderer.rendererVersion,
        dependencies: orderedDependencies.map((dependency) => {
          const entry = entries.get(dependency);
          if (!entry) throw new TypeError("Worker stage dependency is missing");
          return { stageKey: dependency, outputDigest: entry.outputDigest };
        }),
      });
      const value = checkpoint(
        reportRunId,
        stageKey,
        inputDigest,
        payload,
        route,
        snapshot,
        (dependencies.now ?? (() => new Date()))(),
      );
      validateWorkerStageCheckpointV1(value, {
        reportRunId,
        route: "direct",
        snapshot,
      });
      stateVersion = await writeCheckpoint(
        dependencies,
        reportRunId,
        stateVersion,
        value,
      );
      checkpointSet = {
        ...checkpointSet,
        entries: [...checkpointSet.entries, value],
      };
    };

    const needsNarrative = snapshot.comments.length > 0;
    let evidenceKey: string | Uint8Array | undefined;
    if (needsNarrative) {
      if (typeof dependencies.evidenceKeyProvider !== "function")
        throw Object.assign(
          new TypeError("Injected evidence-key provider is required"),
          { code: "CONFIGURATION" as const },
        );
      evidenceKey = await dependencies.evidenceKeyProvider(
        modelConfig.evidenceKeyId,
      );
    }
    const modelRequest = createDirectModelRequestV1({
      snapshot,
      reportRunId,
      evidenceKey: evidenceKey ?? null,
    });
    let directCountRequest: CountTokensRequestV1 | null = null;

    if (!checkpointSet.entries.some(({ stageKey }) => stageKey === "redact")) {
      await addCheckpoint(
        "redact",
        {
          kind: "redact",
          recordCount: snapshot.comments.length,
          redactionVersion: modelConfig.redactionVersion,
        },
        "common",
        [],
      );
    }

    if (!checkpointSet.entries.some(({ stageKey }) => stageKey === "count")) {
      diagnosticStage = "count";
      if (typeof dependencies.countTokens !== "function")
        throw new TypeError("An injected CountTokens provider is required");
      const plan = await classifyDependencyFailure("PROVIDER_TRANSIENT", () =>
        planWorkerRouteV1({
          snapshot,
          snapshotDigest: snapshotResult.snapshot.digestHex,
          reportRunId,
          evidenceKey: evidenceKey ?? "",
          modelConfig,
          modelInput: modelRequest,
          countTokens: dependencies.countTokens!,
        }),
      );
      diagnosticInputTokens = plan.checkpoint.totalTokens;
      diagnosticChunks = plan.route === "map-reduce" ? plan.chunkCount : 0;
      await addCheckpoint("count", plan.checkpoint, "common", ["redact"]);
      if (plan.route === "map-reduce") {
        checkpointSet = {
          ...checkpointSet,
          route: "map-reduce",
          chunkCount: plan.chunkCount,
        };
        const state = { stateVersion, checkpointSet, staged };
        const result = await executeMapReduceStages({
          reportRunId,
          snapshotEnvelope: snapshotResult.snapshot,
          modelConfig,
          pricingSnapshot: claim.pricingSnapshot as PricingSnapshotV1,
          evidenceKey: evidenceKey ?? "",
          dependencies,
          state,
          updateState: (next) => {
            stateVersion = next.stateVersion;
            checkpointSet = next.checkpointSet;
            staged = next.staged;
          },
        });
        return result;
      }
      directCountRequest = plan.countRequest;
      checkpointSet = { ...checkpointSet, route: "direct", chunkCount: null };
    } else {
      directCountRequest = createDirectCountRequestV1({
        snapshot,
        modelInput: modelRequest,
        modelConfig,
      });
    }
    if (checkpointSet.route !== "direct")
      throw new TypeError("CountTokens did not select the direct worker route");
    if (!checkpointSet.entries.some(({ stageKey }) => stageKey === "count"))
      throw new TypeError(
        "The direct route has no CMS-authoritative CountTokens checkpoint",
      );
    const directCountCheckpoint = checkpointSet.entries.find(
      ({ stageKey }) => stageKey === "count",
    );
    if (
      !directCountRequest ||
      directCountCheckpoint?.payload.kind !== "count" ||
      directCountCheckpoint.payload.route === "map-reduce" ||
      directCountCheckpoint.payload.totalTokens >
        modelConfig.verifiedInputTokenLimit ||
      directCountCheckpoint.payload.requestDigest !==
        createHash("sha256")
          .update(canonicalizeJson(directCountRequest), "utf8")
          .digest("hex")
    )
      throw Object.assign(
        new TypeError(
          "Direct provider input does not match its CountTokens checkpoint",
        ),
        { code: "INVARIANT" as const },
      );
    let directAnalysis: DirectAnalysisV1;
    let directOutputTokenCount: number | undefined;
    let directOutputRequestDigest: string | undefined;
    const existingDirect = checkpointSet.entries.find(
      ({ stageKey }) => stageKey === "direct",
    );
    if (existingDirect?.payload.kind === "direct") {
      directAnalysis = existingDirect.payload
        .validatedOutput as DirectAnalysisV1;
    } else if (needsNarrative) {
      if (typeof dependencies.analysisProvider !== "function")
        throw Object.assign(
          new TypeError("Injected direct-analysis provider is required"),
          { code: "CONFIGURATION" as const },
        );
      if (typeof dependencies.countTokens !== "function")
        throw Object.assign(
          new TypeError(
            "Injected CountTokens provider is required for output validation",
          ),
          { code: "CONFIGURATION" as const },
        );
      diagnosticStage = "direct";
      let acceptedDirect: DirectAnalysisV1 | null = null;
      let acceptedUsage: ReturnType<typeof priceProviderUsageV1> | null = null;
      for (let generation = 0; generation < 2; generation += 1) {
        const response = await classifyDependencyFailure(
          "PROVIDER_TRANSIENT",
          () =>
            dependencies.analysisProvider!(modelRequest, directCountRequest),
        );
        let providerUsage: ReturnType<typeof validateProviderUsageV1>;
        try {
          providerUsage = validateProviderUsageV1(
            response?.usage,
            modelConfig.model,
            modelConfig.verifiedInputTokenLimit,
          );
        } catch (error) {
          if ((error as { code?: unknown })?.code === "INVALID_OUTPUT")
            throw createOutputRejectionError(
              "direct",
              "provider_usage",
              "Direct provider usage is invalid",
            );
          throw error;
        }
        const candidate = response?.output;
        let reasonCategory:
          | "output_contract_preflight"
          | "output_token_budget" = "output_contract_preflight";
        let valid = Boolean(
          candidate &&
          typeof candidate === "object" &&
          (candidate as { schemaVersion?: unknown }).schemaVersion ===
            "survey-analysis.v1",
        );
        let outputCount: Awaited<
          ReturnType<typeof countGeneratedOutputV1>
        > | null = null;
        if (valid) {
          try {
            outputCount = await retryTransient(() =>
              countGeneratedOutputV1({
                output: candidate,
                modelConfig,
                countTokens: dependencies.countTokens!,
                stage: "direct",
              }),
            );
          } catch (error) {
            if ((error as { code?: unknown })?.code === "INVALID_OUTPUT")
              throw createOutputRejectionError(
                "direct",
                "output_token_budget",
                "Direct output token evidence is invalid",
              );
            throw error;
          }
          try {
            validateGeneratedOutputBudgetV1({
              tokenCount: outputCount.tokenCount,
              providerTokenCount:
                providerUsage.usageMetadata.candidatesTokenCount,
              modelConfig,
              stage: "direct",
            });
          } catch {
            valid = false;
            reasonCategory = "output_token_budget";
          }
        }
        const preflight = valid
          ? preflightDirectAnalysis(candidate, {
              snapshot: snapshotResult.snapshot,
              reportRunId,
              evidenceKeyId: modelConfig.evidenceKeyId,
              evidenceKey: evidenceKey!,
            })
          : null;
        if (preflight?.status === "accepted" && outputCount) {
          acceptedDirect = candidate as DirectAnalysisV1;
          acceptedUsage = priceProviderUsageV1(
            providerUsage,
            claim.pricingSnapshot as PricingSnapshotV1,
            modelConfig.model,
            "direct",
          );
          diagnosticInputTokens = providerUsage.usageMetadata.promptTokenCount;
          diagnosticOutputTokens =
            providerUsage.usageMetadata.candidatesTokenCount;
          directOutputTokenCount = outputCount.tokenCount;
          directOutputRequestDigest = outputCount.requestDigest;
          break;
        }
        if (generation === 1)
          throw createOutputRejectionError(
            "direct",
            reasonCategory,
            "The direct analysis did not satisfy its structural or output-token contract",
          );
      }
      if (!acceptedDirect || !acceptedUsage)
        throw createOutputRejectionError(
          "direct",
          "output_contract_preflight",
          "The direct analysis did not satisfy its output contract",
        );
      directAnalysis = acceptedDirect;
      await addCheckpoint(
        "direct",
        {
          kind: "direct",
          validatedOutput: directAnalysis,
          usage: acceptedUsage,
          outputTokenCount: directOutputTokenCount,
          outputRequestDigest: directOutputRequestDigest,
        },
        "direct",
        ["count"],
      );
    } else {
      directAnalysis = createEmptyEvidenceDirectAnalysisV1();
      await addCheckpoint(
        "direct",
        {
          kind: "direct",
          validatedOutput: directAnalysis,
        },
        "direct",
        ["count"],
      );
    }
    if (needsNarrative && existingDirect?.payload.kind === "direct") {
      const preflight = preflightDirectAnalysis(directAnalysis, {
        snapshot: snapshotResult.snapshot,
        reportRunId,
        evidenceKeyId: modelConfig.evidenceKeyId,
        evidenceKey: evidenceKey!,
      });
      if (preflight.status !== "accepted")
        throw createOutputRejectionError(
          "direct",
          "output_contract_preflight",
          "The stored direct analysis failed structural and privacy validation",
        );
    }
    diagnosticStage = "validate";
    const analysis = publishEmptyEvidenceAnalysisV1(snapshot, directAnalysis);
    const existingValidate = checkpointSet.entries.find(
      ({ stageKey }) => stageKey === "validate",
    );
    if (existingValidate?.payload.kind === "validate") {
      if (
        canonicalizeJson(existingValidate.payload.publishedAnalysis) !==
        canonicalizeJson(analysis)
      )
        throw new TypeError(
          "Stored validated analysis differs from the direct output",
        );
    } else {
      await addCheckpoint(
        "validate",
        {
          kind: "validate",
          publishedAnalysis: analysis,
          validatorVersion: modelConfig.validatorVersion,
        },
        "direct",
        ["direct"],
      );
    }

    const validateCheckpoint = checkpointSet.entries.find(
      ({ stageKey }) => stageKey === "validate",
    );
    if (!validateCheckpoint)
      throw new TypeError("Validated output checkpoint is missing");
    const charts = buildReportCharts(snapshot);
    const renderInputDigest = deriveStageInputDigestV1({
      stageKey: "render",
      snapshotDigest: snapshotResult.snapshot.digestHex,
      sourceRevision: snapshotResult.snapshot.payload.sourceRevision,
      modelConfig,
      rendererVersion: dependencies.renderer.rendererVersion,
      orderedDependencies: [
        { stageKey: "validate", outputDigest: validateCheckpoint.outputDigest },
      ],
    });
    const priorRender = checkpointSet.entries.find(
      ({ stageKey }) => stageKey === "render",
    );
    const priorStore = checkpointSet.entries.find(
      ({ stageKey }) => stageKey === "store",
    );
    const existingRender = checkpointFor(
      checkpointSet,
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
      if (
        artifact &&
        artifact.objectKey !==
          `private/feedback-reports/${deterministicReportId(reportRunId, pdfSha256)}/report.pdf`
      )
        artifact = null;
      if (artifact) staged = artifact;
    }

    if (!artifact) {
      diagnosticStage = "render";
      const rendered = await classifyDependencyFailure(
        "STORAGE_TRANSIENT",
        () =>
          renderValidatedPdf(
            snapshotResult.snapshot,
            analysis,
            dependencies.renderer,
          ),
      );
      artifact = stagedArtifact(
        reportRunId,
        rendered,
        deterministicReportId(reportRunId, rendered.sha256),
      );
      staged = artifact;
      const artifactToStage = artifact;
      diagnosticStage = "store";
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
        "direct",
        snapshot,
        (dependencies.now ?? (() => new Date()))(),
      );
      validateWorkerStageCheckpointV1(renderCheckpoint, {
        reportRunId,
        route: "direct",
        snapshot,
      });
      stateVersion = await writeCheckpoint(
        dependencies,
        reportRunId,
        stateVersion,
        renderCheckpoint,
      );
      checkpointSet = {
        ...checkpointSet,
        entries: [...checkpointSet.entries, renderCheckpoint],
      };
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
      checkpointSet,
      "store",
      storeInputDigest,
    );
    if (priorStore && priorStore.inputDigest !== storeInputDigest)
      throw new TypeError("Worker checkpoint input digest mismatch");
    if (!existingStore) {
      diagnosticStage = "store";
      const storeCheckpoint = checkpoint(
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
        "direct",
        snapshot,
        (dependencies.now ?? (() => new Date()))(),
      );
      validateWorkerStageCheckpointV1(storeCheckpoint, {
        reportRunId,
        route: "direct",
        snapshot,
      });
      stateVersion = await writeCheckpoint(
        dependencies,
        reportRunId,
        stateVersion,
        storeCheckpoint,
      );
      checkpointSet = {
        ...checkpointSet,
        entries: [...checkpointSet.entries, storeCheckpoint],
      };
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
    if (result.pendingAlerts?.length) {
      void deliverPendingWorkerAlerts({
        reportRunId,
        alerts: result.pendingAlerts,
        dependencies,
      }).catch(() => undefined);
    }
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
      diagnosticSourceRevision === null
        ? null
        : {
            stage: diagnosticStage,
            model: diagnosticModel,
            sourceRevision: diagnosticSourceRevision,
            inputTokens: diagnosticInputTokens,
            outputTokens: diagnosticOutputTokens,
            chunks: diagnosticChunks,
            durationMs: Math.max(
              0,
              Math.min(1_800_000, Date.now() - startedAt),
            ),
          },
      outputRejectionFor(
        error,
        diagnosticStage === "direct" ? "direct" : undefined,
      ),
    );
  }
}
