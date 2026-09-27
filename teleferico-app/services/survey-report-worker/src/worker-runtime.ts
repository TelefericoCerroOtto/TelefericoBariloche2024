import { createHash } from "node:crypto";

import {
  deriveStageInputDigestV1,
  deriveWorkerStageInputDigestV1,
  validateDirectStageConfigV1,
  validateWorkerStageCheckpointV1,
} from "./checkpoint-contract";
import {
  buildReportCharts,
  canonicalizeJson,
  validateSnapshotEnvelope,
  type SnapshotV1,
} from "../../../packages/survey-reporting-core/src";

import {
  renderValidatedPdf,
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
  type WorkerCheckpointStage,
  type DirectAnalysisV1,
  type CountTokensProvider,
  type EvidenceKeyProvider,
  WorkerCmsConflictError,
} from "./contracts";
import {
  createEmptyEvidenceDirectAnalysisV1,
  createDirectModelRequestV1,
  planDirectExecutionV1,
  publishEmptyEvidenceAnalysisV1,
} from "./direct-execution-plan";
import { preflightDirectAnalysis } from "./analysis-output-preflight";

type WorkerRuntimeDependencies = {
  readonly cms: WorkerCmsClient;
  readonly artifacts: WorkerArtifactStore;
  readonly renderer: PdfRenderer;
  readonly analysisProvider?: ValidatedAnalysisProvider;
  readonly countTokens?: CountTokensProvider;
  readonly evidenceKeyProvider?: EvidenceKeyProvider;
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (knownFailureCode(error)) throw error;
      if (attempt === 2) throw new ClassifiedFailure(failureCode);
    }
  }
  throw new ClassifiedFailure(failureCode);
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
  stageKey: WorkerCheckpointStage,
  inputDigest: string,
  payload: WorkerCheckpoint["payload"],
  route: "common" | "direct",
  snapshot: SnapshotV1,
  now: Date,
): WorkerCheckpoint {
  const stageIndex: Record<WorkerCheckpointStage, number> = {
    redact: 0,
    count: 1,
    direct: 2,
    validate: 3,
    render: 4,
    store: 5,
  };
  const value: WorkerCheckpoint = {
    checkpointVersion: "survey-checkpoint.v1",
    stageKey,
    stageIndex: stageIndex[stageKey],
    route,
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

function deterministicReportId(reportRunId: string, artifactSha256: string): string {
  const bytes = createHash("sha256")
    .update(`tb113-report-id.v1:${reportRunId}:${artifactSha256}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function stageInputDigest(input: {
  readonly stageKey: WorkerCheckpointStage;
  readonly snapshotDigest: string;
  readonly sourceRevision: string;
  readonly modelConfig: ModelConfigV1;
  readonly rendererVersion: string;
  readonly dependencies: readonly { readonly stageKey: WorkerCheckpointStage; readonly outputDigest: string }[];
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
  const index: Record<Exclude<WorkerCheckpointStage, "render" | "store">, number> = {
    redact: 0,
    count: 1,
    direct: 2,
    validate: 3,
  };
  return deriveWorkerStageInputDigestV1({
    stageKey: input.stageKey,
    stageIndex: index[input.stageKey],
    route: input.stageKey === "redact" || input.stageKey === "count" ? "common" : "direct",
    snapshotDigest: input.snapshotDigest,
    sourceRevision: input.sourceRevision,
    modelConfig: input.modelConfig,
    orderedDependencyOutputDigests: input.dependencies.map(({ outputDigest }) => outputDigest),
  });
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
      (claim.checkpoints.route !== "direct" && claim.checkpoints.route !== "undecided") ||
      claim.checkpoints.chunkCount !== null
    )
      throw new TypeError("Unsupported worker checkpoint graph");
    const expectedStages: readonly WorkerCheckpointStage[] = [
      "redact", "count", "direct", "validate", "render", "store",
    ];
    if (
      claim.checkpoints.entries.some(({ stageKey }, index) => stageKey !== expectedStages[index]) ||
      new Set(claim.checkpoints.entries.map(({ stageKey }) => stageKey)).size !==
        claim.checkpoints.entries.length ||
      (claim.checkpoints.entries.some(({ stageKey }) => stageKey === "store") &&
        !claim.checkpoints.entries.some(({ stageKey }) => stageKey === "render")) ||
      (claim.checkpoints.route === "undecided" &&
        claim.checkpoints.entries.some(({ stageKey }) => stageKey !== "redact"))
    )
      throw new TypeError("Invalid worker checkpoint graph");
    const snapshotResult = await classifyDependencyFailure(
      "CMS_TRANSIENT",
      () => dependencies.cms.snapshot(reportRunId),
    );
    if (snapshotResult.stateVersion !== stateVersion)
      throw new WorkerCmsConflictError("Snapshot state version is stale");
    const snapshot = validateSnapshotEnvelope(snapshotResult.snapshot);
    if (claim.checkpoints.snapshotDigest !== snapshotResult.snapshot.digestHex)
      throw new TypeError("Worker checkpoint snapshot digest mismatch");
    let checkpointSet: WorkerCheckpointSet = {
      ...claim.checkpoints,
      entries: [...claim.checkpoints.entries],
    };
    for (const priorCheckpoint of checkpointSet.entries) {
      validateWorkerStageCheckpointV1(priorCheckpoint, {
        reportRunId,
        route: "direct",
        snapshot,
      });
    }
    const checkpointDependencies: Record<WorkerCheckpointStage, readonly WorkerCheckpointStage[]> = {
      redact: [],
      count: ["redact"],
      direct: ["count"],
      validate: ["direct"],
      render: ["validate"],
      store: ["render"],
    };
    const boundCheckpoints = new Map<WorkerCheckpointStage, WorkerCheckpoint>();
    for (const priorCheckpoint of checkpointSet.entries) {
      const expectedInputDigest = stageInputDigest({
        stageKey: priorCheckpoint.stageKey,
        snapshotDigest: snapshotResult.snapshot.digestHex,
        sourceRevision: snapshot.sourceRevision,
        modelConfig,
        rendererVersion: dependencies.renderer.rendererVersion,
        dependencies: checkpointDependencies[priorCheckpoint.stageKey].map((stageKey) => {
          const dependency = boundCheckpoints.get(stageKey);
          if (!dependency) throw new TypeError("Stored worker checkpoint dependency is missing");
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
      const entries = new Map(checkpointSet.entries.map((entry) => [entry.stageKey, entry]));
      const inputDigest = stageInputDigest({
        stageKey,
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
      validateWorkerStageCheckpointV1(value, { reportRunId, route: "direct", snapshot });
      stateVersion = await writeCheckpoint(dependencies, reportRunId, stateVersion, value);
      checkpointSet = { ...checkpointSet, entries: [...checkpointSet.entries, value] };
    };

    const needsNarrative = snapshot.comments.length > 0;
    let evidenceKey: string | Uint8Array | undefined;
    if (needsNarrative) {
      if (typeof dependencies.analysisProvider !== "function" ||
          typeof dependencies.evidenceKeyProvider !== "function")
        throw Object.assign(new TypeError("Injected narrative and evidence-key providers are required"), { code: "CONFIGURATION" as const });
      evidenceKey = await dependencies.evidenceKeyProvider(modelConfig.evidenceKeyId);
    }
    const modelRequest = createDirectModelRequestV1({
      snapshot,
      reportRunId,
      evidenceKey: evidenceKey ?? null,
    });

    if (!checkpointSet.entries.some(({ stageKey }) => stageKey === "redact")) {
      await addCheckpoint("redact", {
        kind: "redact",
        recordCount: snapshot.comments.length,
        redactionVersion: modelConfig.redactionVersion,
      }, "common", []);
    }

    if (!checkpointSet.entries.some(({ stageKey }) => stageKey === "count")) {
      if (typeof dependencies.countTokens !== "function")
        throw new TypeError("An injected CountTokens provider is required");
      const plan = await classifyDependencyFailure("PROVIDER_TRANSIENT", () =>
        planDirectExecutionV1({
          snapshot,
          modelInput: modelRequest,
          modelConfig,
          countTokens: dependencies.countTokens!,
        }),
      );
      await addCheckpoint("count", plan.checkpoint, "common", ["redact"]);
      checkpointSet = { ...checkpointSet, route: "direct" };
    }
    if (checkpointSet.route !== "direct")
      throw new TypeError("CountTokens did not select the direct worker route");
    if (!checkpointSet.entries.some(({ stageKey }) => stageKey === "count"))
      throw new TypeError("The direct route has no CMS-authoritative CountTokens checkpoint");
    let directAnalysis: DirectAnalysisV1;
    const existingDirect = checkpointSet.entries.find(({ stageKey }) => stageKey === "direct");
    if (existingDirect?.payload.kind === "direct") {
      directAnalysis = existingDirect.payload.validatedOutput as DirectAnalysisV1;
    } else if (needsNarrative) {
      const candidate = await classifyDependencyFailure("PROVIDER_TRANSIENT", () =>
        dependencies.analysisProvider!(modelRequest),
      );
      if (!candidate || typeof candidate !== "object" ||
          (candidate as { schemaVersion?: unknown }).schemaVersion !== "survey-analysis.v1")
        throw Object.assign(new TypeError("The injected provider returned an invalid direct analysis"), { code: "INVALID_OUTPUT" as const });
      directAnalysis = candidate as DirectAnalysisV1;
      const preflight = preflightDirectAnalysis(directAnalysis, {
        snapshot: snapshotResult.snapshot,
        reportRunId,
        evidenceKeyId: modelConfig.evidenceKeyId,
        evidenceKey: evidenceKey!,
      });
      if (preflight.status !== "accepted")
        throw Object.assign(new TypeError("The direct analysis did not pass structural and privacy validation"), { code: "INVALID_OUTPUT" as const });
      await addCheckpoint("direct", {
        kind: "direct",
        validatedOutput: directAnalysis,
      }, "direct", ["count"]);
    } else {
      directAnalysis = createEmptyEvidenceDirectAnalysisV1();
      await addCheckpoint("direct", {
        kind: "direct",
        validatedOutput: directAnalysis,
      }, "direct", ["count"]);
    }
    if (needsNarrative && existingDirect?.payload.kind === "direct") {
      const preflight = preflightDirectAnalysis(directAnalysis, {
        snapshot: snapshotResult.snapshot,
        reportRunId,
        evidenceKeyId: modelConfig.evidenceKeyId,
        evidenceKey: evidenceKey!,
      });
      if (preflight.status !== "accepted")
        throw Object.assign(new TypeError("The stored direct analysis failed structural and privacy validation"), { code: "INVALID_OUTPUT" as const });
    }
    const analysis = publishEmptyEvidenceAnalysisV1(snapshot, directAnalysis);
    const existingValidate = checkpointSet.entries.find(({ stageKey }) => stageKey === "validate");
    if (existingValidate?.payload.kind === "validate") {
      if (canonicalizeJson(existingValidate.payload.publishedAnalysis) !== canonicalizeJson(analysis))
        throw new TypeError("Stored validated analysis differs from the direct output");
    } else {
      await addCheckpoint("validate", {
        kind: "validate",
        publishedAnalysis: analysis,
        validatorVersion: modelConfig.validatorVersion,
      }, "direct", ["direct"]);
    }

    const validateCheckpoint = checkpointSet.entries.find(({ stageKey }) => stageKey === "validate");
    if (!validateCheckpoint) throw new TypeError("Validated output checkpoint is missing");
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
    const priorRender = checkpointSet.entries.find(({ stageKey }) => stageKey === "render");
    const priorStore = checkpointSet.entries.find(({ stageKey }) => stageKey === "store");
    const existingRender = checkpointFor(checkpointSet, "render", renderInputDigest);
    if (priorRender && priorRender.inputDigest !== renderInputDigest)
      throw new TypeError("Worker checkpoint input digest mismatch");
    let artifact: WorkerArtifact | null = null;
    if (existingRender && existingRender.payload.kind === "render") {
      const { pdfSha256, size } = existingRender.payload;
      artifact = await classifyDependencyFailure("STORAGE_TRANSIENT", () =>
        dependencies.artifacts.readStaged(reportRunId, pdfSha256),
      );
      if (artifact && artifact.size !== size) artifact = null;
      if (artifact && artifact.objectKey !== `private/feedback-reports/${deterministicReportId(reportRunId, pdfSha256)}/report.pdf`)
        artifact = null;
      if (artifact) staged = artifact;
    }

    if (!artifact) {
      const rendered = await renderValidatedPdf(
        snapshotResult.snapshot,
        analysis,
        dependencies.renderer,
      );
      artifact = stagedArtifact(
        reportRunId,
        rendered,
        deterministicReportId(reportRunId, rendered.sha256),
      );
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
        "direct",
        snapshot,
        (dependencies.now ?? (() => new Date()))(),
      );
      validateWorkerStageCheckpointV1(renderCheckpoint, { reportRunId, route: "direct", snapshot });
      stateVersion = await writeCheckpoint(
        dependencies,
        reportRunId,
        stateVersion,
        renderCheckpoint,
      );
      checkpointSet = { ...checkpointSet, entries: [...checkpointSet.entries, renderCheckpoint] };
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
    const existingStore = checkpointFor(checkpointSet, "store", storeInputDigest);
    if (priorStore && priorStore.inputDigest !== storeInputDigest)
      throw new TypeError("Worker checkpoint input digest mismatch");
    if (!existingStore) {
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
      validateWorkerStageCheckpointV1(storeCheckpoint, { reportRunId, route: "direct", snapshot });
      stateVersion = await writeCheckpoint(dependencies, reportRunId, stateVersion, storeCheckpoint);
      checkpointSet = { ...checkpointSet, entries: [...checkpointSet.entries, storeCheckpoint] };
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
