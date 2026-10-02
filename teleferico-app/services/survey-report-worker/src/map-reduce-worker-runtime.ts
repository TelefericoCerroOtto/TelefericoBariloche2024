import { createHash } from "node:crypto";

import {
  buildReportCharts,
  canonicalizeJson,
  type SnapshotEnvelopeV1,
  type SnapshotV1,
} from "../../../packages/survey-reporting-core/src";
import {
  CHECKPOINT_CONTRACT_VERSIONS,
  deriveStageInputDigestV1,
  stageConfigDigest,
  stageInputDigestV1,
  validateWorkerStageCheckpointV1,
} from "./checkpoint-contract";
import { EMPTY_EVIDENCE_PARAGRAPH } from "./direct-execution-plan";
import { preflightMapAnalysis, preflightReduceAnalysis } from "./analysis-output-preflight";
import {
  buildMapChunksV1,
  countGeneratedOutputV1,
  countRequestTokens,
  createReduceCountRequestV1,
  isValidCountTokensResult,
  validateGeneratedOutputBudgetV1,
} from "./map-reduce-execution-plan";
import { renderValidatedPdf, type PdfArtifact } from "./pdf";
import type {
  CompleteCommand,
  MapAnalysisV1,
  ModelConfigV1,
  PdfRenderer,
  ReduceAnalysisV1,
  RuntimeFailureCode,
  WorkerArtifact,
  WorkerArtifactStore,
  WorkerCheckpoint,
  WorkerCheckpointSet,
  WorkerCmsClient,
  WorkerExecutionResult,
  WorkerRuntimeDependencies,
  PricingSnapshotV1,
} from "./contracts";
import { priceProviderUsageV1, validateProviderUsageV1 } from "./worker-cost";
import { deliverPendingWorkerAlerts } from "./worker-alerts";
import { retryTransient } from "./retry-policy";

export type MapReduceWorkerState = {
  stateVersion: number;
  checkpointSet: WorkerCheckpointSet;
  staged: WorkerArtifact | null;
};

const SAFE_FAILURE_MESSAGES: Record<RuntimeFailureCode, string> = {
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

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalizeJson(value), "utf8").digest("hex");
}

function stageIndex(stageKey: string, chunkCount: number): number {
  const mapMatch = /^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(stageKey);
  if (mapMatch) return Number(mapMatch[1]) + 1;
  if (stageKey === "redact") return 0;
  if (stageKey === "count") return 1;
  if (stageKey === "reduce") return chunkCount + 2;
  if (stageKey === "validate") return chunkCount + 3;
  if (stageKey === "render") return chunkCount + 4;
  if (stageKey === "store") return chunkCount + 5;
  return -1;
}

function routeInputDigest(input: {
  stageKey: string;
  chunkCount: number;
  snapshotDigest: string;
  sourceRevision: string;
  modelConfig: ModelConfigV1;
  rendererVersion: string;
  dependencyOutputDigests: readonly string[];
  chunkMembershipDigest?: string;
}): string {
  const index = stageIndex(input.stageKey, input.chunkCount);
  if (index < 0) throw new TypeError("Unknown map-reduce checkpoint stage");
  const route = input.stageKey === "redact" || input.stageKey === "count" ? "common" : "map-reduce";
  const rendererVersion = input.stageKey === "render" || input.stageKey === "store"
    ? input.rendererVersion : null;
  return stageInputDigestV1({
    stageKey: input.stageKey,
    stageIndex: index,
    route,
    snapshotDigest: input.snapshotDigest,
    sourceRevision: input.sourceRevision,
    contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
    stageConfigDigest: stageConfigDigest({
      version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig,
      stageKey: input.stageKey,
      modelConfig: input.modelConfig,
      evidenceKeyId: input.modelConfig.evidenceKeyId,
      rendererVersion,
    }),
    orderedDependencyOutputDigests: input.dependencyOutputDigests,
    chunkMembershipDigest: input.chunkMembershipDigest ?? null,
  });
}

function publishedAnalysis(output: ReduceAnalysisV1) {
  return {
    schemaVersion: "survey-published-analysis.v1" as const,
    sections: output.sections.map((section) => ({
      key: section.key,
      status: section.status,
      paragraphsEs: section.status === "insufficient_evidence"
        ? [EMPTY_EVIDENCE_PARAGRAPH]
        : section.claims.map(({ textEs }) => textEs),
    })) as unknown as CompleteCommand["validatedAnalysis"]["sections"],
  };
}

function reportId(reportRunId: string, artifactSha256: string): string {
  const bytes = createHash("sha256")
    .update(`tb113-report-id.v1:${reportRunId}:${artifactSha256}`)
    .digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function makeCheckpoint(input: {
  reportRunId: string;
  stageKey: string;
  chunkCount: number;
  routeInputDigest: string;
  payload: WorkerCheckpoint["payload"];
  snapshot: SnapshotV1;
  now: Date;
}): WorkerCheckpoint {
  const index = stageIndex(input.stageKey, input.chunkCount);
  const mapMatch = /^map\./.test(input.stageKey);
  const value: WorkerCheckpoint = {
    checkpointVersion: "survey-checkpoint.v1",
    stageKey: input.stageKey as WorkerCheckpoint["stageKey"],
    stageIndex: index,
    route: index <= 1 ? "common" : "map-reduce",
    stageType: (mapMatch ? "map" : input.stageKey) as WorkerCheckpoint["stageType"],
    status: "valid",
    inputDigest: input.routeInputDigest,
    outputDigest: digest(input.payload),
    attempts: 1,
    completedAt: input.now.toISOString(),
    payload: input.payload,
  };
  validateWorkerStageCheckpointV1(value, {
    reportRunId: input.reportRunId,
    route: "map-reduce",
    chunkCount: input.chunkCount,
    snapshot: input.snapshot,
  });
  return value;
}

export async function executeMapReduceStages(input: {
  readonly reportRunId: string;
  readonly snapshotEnvelope: SnapshotEnvelopeV1;
  readonly modelConfig: ModelConfigV1;
  readonly pricingSnapshot: PricingSnapshotV1;
  readonly evidenceKey: string | Uint8Array;
  readonly dependencies: WorkerRuntimeDependencies;
  readonly state: MapReduceWorkerState;
  readonly updateState: (state: MapReduceWorkerState) => void;
}): Promise<WorkerExecutionResult> {
  const snapshot = input.snapshotEnvelope.payload;
  const config = input.modelConfig;
  const { countTokens, mapProvider, reduceProvider, renderer, cms, artifacts } = input.dependencies;
  if (typeof countTokens !== "function" || typeof mapProvider !== "function" || typeof reduceProvider !== "function")
    throw Object.assign(new TypeError("Injected CountTokens, Map, and Reduce providers are required"), { code: "CONFIGURATION" as const });

  const checkpointSet = input.state.checkpointSet;
  const countCheckpoint = checkpointSet.entries.find(({ stageKey }) => stageKey === "count");
  if (!countCheckpoint || countCheckpoint.payload.kind !== "count" || countCheckpoint.payload.route !== "map-reduce" ||
      !Number.isSafeInteger(checkpointSet.chunkCount) || checkpointSet.chunkCount === null || checkpointSet.chunkCount < 1 ||
      checkpointSet.chunkCount !== countCheckpoint.payload.chunkCount)
    throw Object.assign(new TypeError("Map-reduce route selection checkpoint is missing"), { code: "INVARIANT" as const });
  const chunkCount = checkpointSet.chunkCount;
  const chunks = buildMapChunksV1({
    snapshot,
    snapshotDigest: input.snapshotEnvelope.digestHex,
    reportRunId: input.reportRunId,
    evidenceKey: input.evidenceKey,
    modelConfig: config,
    chunkCount,
  });
  const selectedAttempt = countCheckpoint.payload.attempts?.find((attempt) => attempt.chunkCount === chunkCount);
  if (!selectedAttempt || selectedAttempt.chunks.length !== chunks.length)
    throw Object.assign(new TypeError("Selected map request evidence is missing"), { code: "INVARIANT" as const });
  for (const [index, chunk] of chunks.entries()) {
    const counted = selectedAttempt.chunks[index];
    const digest = createHash("sha256").update(canonicalizeJson(chunk.countRequest), "utf8").digest("hex");
    if (!counted || counted.requestDigest !== digest || counted.totalTokens > config.verifiedInputTokenLimit)
      throw Object.assign(new TypeError("Map provider input does not match selected CountTokens evidence"), { code: "INVARIANT" as const });
  }
  const expectedKeys = [
    "redact", "count", ...chunks.map(({ request }) => request.chunkId),
    "reduce", "validate", "render", "store",
  ];
  const entries = input.state.checkpointSet.entries;
  if (entries.some(({ stageKey }, index) => stageKey !== expectedKeys[index]))
    throw Object.assign(new TypeError("Map-reduce checkpoint order is invalid"), { code: "INVARIANT" as const });

  const dependencyDigests = (stageKey: string): string[] => {
    const get = (key: string) => {
      const value = input.state.checkpointSet.entries.find((entry) => entry.stageKey === key);
      if (!value) throw Object.assign(new TypeError("Map-reduce checkpoint dependency is missing"), { code: "INVARIANT" as const });
      return value.outputDigest;
    };
    if (stageKey === "redact") return [];
    if (stageKey === "count") return [get("redact")];
    if (stageKey.startsWith("map.")) return [get("count")];
    if (stageKey === "reduce") return [get("count"), ...chunks.map(({ request }) => get(request.chunkId))];
    if (stageKey === "validate") return [get("reduce")];
    if (stageKey === "render") return [get("validate")];
    if (stageKey === "store") return [get("render")];
    throw new TypeError("Unknown map-reduce dependency stage");
  };

  for (const prior of input.state.checkpointSet.entries) {
    const expectedDigest = routeInputDigest({
      stageKey: prior.stageKey,
      chunkCount,
      snapshotDigest: input.snapshotEnvelope.digestHex,
      sourceRevision: snapshot.sourceRevision,
      modelConfig: config,
      rendererVersion: renderer.rendererVersion,
      dependencyOutputDigests: dependencyDigests(prior.stageKey),
      ...(prior.payload.kind === "map" ? { chunkMembershipDigest: prior.payload.chunkMembershipDigest } : {}),
    });
    if (prior.inputDigest !== expectedDigest || prior.outputDigest !== digest(prior.payload))
      throw Object.assign(new TypeError("Stored map-reduce checkpoint binding mismatch"), { code: "INVARIANT" as const });
  }

  const addCheckpoint = async (stageKey: string, payload: WorkerCheckpoint["payload"], membershipDigest?: string) => {
    const value = makeCheckpoint({
      reportRunId: input.reportRunId,
      stageKey,
      chunkCount,
      routeInputDigest: routeInputDigest({
        stageKey,
        chunkCount,
        snapshotDigest: input.snapshotEnvelope.digestHex,
        sourceRevision: snapshot.sourceRevision,
        modelConfig: config,
        rendererVersion: renderer.rendererVersion,
        dependencyOutputDigests: dependencyDigests(stageKey),
        ...(membershipDigest ? { chunkMembershipDigest: membershipDigest } : {}),
      }),
      payload,
      snapshot,
      now: (input.dependencies.now ?? (() => new Date()))(),
    });
    const checkpointResult = await retryTransient(async () => cms.checkpoint(input.reportRunId, {
      contractVersion: "survey-worker-cms.v1",
      expectedStateVersion: input.state.stateVersion,
      checkpoint: value,
    }));
    input.state.stateVersion = checkpointResult.stateVersion;
    if (checkpointResult.pendingAlerts?.length) {
      void deliverPendingWorkerAlerts({
        reportRunId: input.reportRunId,
        alerts: checkpointResult.pendingAlerts,
        dependencies: input.dependencies,
      }).catch(() => undefined);
    }
    input.state.checkpointSet = {
      ...input.state.checkpointSet,
      route: "map-reduce",
      chunkCount,
      entries: [...input.state.checkpointSet.entries, value],
    };
    input.updateState(input.state);
  };

  for (const { membership, request } of chunks) {
    const stageKey = request.chunkId;
    if (input.state.checkpointSet.entries.some((entry) => entry.stageKey === stageKey)) continue;
    let candidate: MapAnalysisV1 | null = null;
    let usage: ReturnType<typeof priceProviderUsageV1> | null = null;
    let outputCount: Awaited<ReturnType<typeof countGeneratedOutputV1>> | null = null;
    for (let generation = 0; generation < 2; generation += 1) {
      const countRequest = chunks[membership.chunkIndex - 1]?.countRequest;
      if (!countRequest)
        throw Object.assign(new TypeError("Selected map CountTokens request is missing"), { code: "INVARIANT" as const });
      const response = await retryTransient(() => mapProvider(request, countRequest));
      const providerUsage = validateProviderUsageV1(response?.usage, config.model, config.verifiedInputTokenLimit);
      const nextCandidate = response?.output;
      const nextOutputCount = await retryTransient(() => countGeneratedOutputV1({ output: nextCandidate, modelConfig: config, countTokens, stage: "map" }));
      let withinBudget = true;
      try {
        validateGeneratedOutputBudgetV1({ tokenCount: nextOutputCount.tokenCount, providerTokenCount: providerUsage.usageMetadata.candidatesTokenCount, modelConfig: config, stage: "map" });
      } catch {
        withinBudget = false;
      }
      const preflight = withinBudget ? preflightMapAnalysis(nextCandidate, {
            snapshot: input.snapshotEnvelope,
            reportRunId: input.reportRunId,
            evidenceKeyId: config.evidenceKeyId,
            evidenceKey: input.evidenceKey,
            chunkCount,
          })
        : null;
      if (preflight?.status === "accepted") {
        candidate = nextCandidate;
        outputCount = nextOutputCount;
        usage = priceProviderUsageV1(providerUsage, input.pricingSnapshot, config.model, stageKey);
        break;
      }
      if (generation === 1)
        throw Object.assign(new TypeError("Map output failed structural or output-token validation"), { code: "INVALID_OUTPUT" as const });
    }
    if (!candidate || !outputCount || !usage)
      throw Object.assign(new TypeError("Map output failed validation"), { code: "INVALID_OUTPUT" as const });
    const payload = {
      kind: "map" as const,
      chunkId: request.chunkId,
      chunkIndex: membership.chunkIndex,
      chunkCount,
      evidenceKeyId: membership.evidenceKeyId,
      coveredRefs: membership.coveredRefs,
      chunkMembershipDigest: membership.membershipDigest,
      outputTokenCount: outputCount.tokenCount,
      outputRequestDigest: outputCount.requestDigest,
      validatedOutput: candidate,
      usage,
    };
    await addCheckpoint(stageKey, payload, membership.membershipDigest);
  }

  const maps = chunks.map(({ membership, request }) => {
    const checkpointValue = input.state.checkpointSet.entries.find((entry) => entry.stageKey === request.chunkId);
    if (!checkpointValue || checkpointValue.payload.kind !== "map" ||
        checkpointValue.payload.chunkMembershipDigest !== membership.membershipDigest)
      throw Object.assign(new TypeError("CMS-verified map checkpoint is missing"), { code: "INVARIANT" as const });
    const preflight = preflightMapAnalysis(checkpointValue.payload.validatedOutput, {
      snapshot: input.snapshotEnvelope,
      reportRunId: input.reportRunId,
      evidenceKeyId: config.evidenceKeyId,
      evidenceKey: input.evidenceKey,
      chunkCount,
    });
    if (preflight.status !== "accepted" || checkpointValue.payload.outputTokenCount > config.map.hardMax)
      throw Object.assign(new TypeError("Persisted map checkpoint failed structural validation"), { code: "INVALID_OUTPUT" as const });
    return {
      chunkId: request.chunkId,
      outputDigest: checkpointValue.outputDigest,
      validatedOutput: checkpointValue.payload.validatedOutput as MapAnalysisV1,
    };
  });
  const reduceStage = input.state.checkpointSet.entries.find(({ stageKey }) => stageKey === "reduce");
  let reduceOutput: ReduceAnalysisV1;
  if (reduceStage?.payload.kind === "reduce") {
    reduceOutput = reduceStage.payload.validatedOutput as ReduceAnalysisV1;
    const replayPreflight = preflightReduceAnalysis(reduceOutput, {
      snapshot: input.snapshotEnvelope,
      reportRunId: input.reportRunId,
      evidenceKeyId: config.evidenceKeyId,
      evidenceKey: input.evidenceKey,
      verifiedMapOutputDigests: maps.map(({ outputDigest }) => outputDigest),
    });
    if (replayPreflight.status !== "accepted" || reduceStage.payload.outputTokenCount > config.directReduce.hardMax)
      throw Object.assign(new TypeError("Persisted reduce checkpoint failed structural validation"), { code: "INVALID_OUTPUT" as const });
  } else {
    const verifiedDigests = maps.map(({ outputDigest }) => outputDigest);
    const reduceRequest = {
      contractVersion: "survey-reduce-input.v1" as const,
      metrics: snapshot.metrics,
      maps,
    };
    const reduceCountRequest = createReduceCountRequestV1({ request: reduceRequest, modelConfig: config });
    const reduceInputCounts = await retryTransient(() => countTokens(reduceCountRequest));
    if (!isValidCountTokensResult(reduceInputCounts))
      throw Object.assign(new TypeError("Reduce input CountTokens response is invalid"), { code: "CONFIGURATION" as const });
    const reduceInputEvidence = countRequestTokens({
      request: reduceCountRequest,
      result: reduceInputCounts,
      modelConfig: config,
      reservedOutput: config.directReduce.targetMax,
    });
    if (reduceInputEvidence.totalTokens > config.verifiedInputTokenLimit)
      throw Object.assign(new TypeError("Reduce request exceeds the verified token limit"), { code: "UNKNOWN_VERSION" as const });
    let candidate: ReduceAnalysisV1 | null = null;
    let usage: ReturnType<typeof priceProviderUsageV1> | null = null;
    let outputCount: Awaited<ReturnType<typeof countGeneratedOutputV1>> | null = null;
    for (let generation = 0; generation < 2; generation += 1) {
      const response = await retryTransient(() => reduceProvider(reduceRequest, reduceCountRequest));
      const providerUsage = validateProviderUsageV1(response?.usage, config.model, config.verifiedInputTokenLimit);
      const nextCandidate = response?.output;
      const nextOutputCount = await retryTransient(() => countGeneratedOutputV1({ output: nextCandidate, modelConfig: config, countTokens, stage: "reduce" }));
      let withinBudget = true;
      try {
        validateGeneratedOutputBudgetV1({ tokenCount: nextOutputCount.tokenCount, providerTokenCount: providerUsage.usageMetadata.candidatesTokenCount, modelConfig: config, stage: "reduce" });
      } catch {
        withinBudget = false;
      }
      const preflight = withinBudget ? preflightReduceAnalysis(nextCandidate, {
            snapshot: input.snapshotEnvelope,
            reportRunId: input.reportRunId,
            evidenceKeyId: config.evidenceKeyId,
            evidenceKey: input.evidenceKey,
            verifiedMapOutputDigests: verifiedDigests,
          })
        : null;
      if (preflight?.status === "accepted") {
        candidate = nextCandidate;
        outputCount = nextOutputCount;
        usage = priceProviderUsageV1(providerUsage, input.pricingSnapshot, config.model, "reduce");
        break;
      }
      if (generation === 1)
        throw Object.assign(new TypeError("Reduce output failed structural or output-token validation"), { code: "INVALID_OUTPUT" as const });
    }
    if (!candidate || !usage || !outputCount)
      throw Object.assign(new TypeError("Reduce output failed validation"), { code: "INVALID_OUTPUT" as const });
    await addCheckpoint("reduce", {
      kind: "reduce",
      outputTokenCount: outputCount.tokenCount,
      outputRequestDigest: outputCount.requestDigest,
      validatedOutput: candidate,
      usage,
    });
    reduceOutput = candidate;
  }

  const analysis = publishedAnalysis(reduceOutput);
  const validateStage = input.state.checkpointSet.entries.find(({ stageKey }) => stageKey === "validate");
  if (validateStage?.payload.kind !== "validate") {
    await addCheckpoint("validate", {
      kind: "validate",
      publishedAnalysis: analysis,
      validatorVersion: config.validatorVersion,
    });
  }
  const validated = input.state.checkpointSet.entries.find(({ stageKey }) => stageKey === "validate");
  if (!validated || validated.payload.kind !== "validate" || canonicalizeJson(validated.payload.publishedAnalysis) !== canonicalizeJson(analysis))
    throw Object.assign(new TypeError("Stored validated reduce output mismatch"), { code: "INVARIANT" as const });

  const renderPayloadDigest = routeInputDigest({
    stageKey: "render", chunkCount, snapshotDigest: input.snapshotEnvelope.digestHex,
    sourceRevision: snapshot.sourceRevision, modelConfig: config, rendererVersion: renderer.rendererVersion,
    dependencyOutputDigests: dependencyDigests("render"),
  });
  const existingRender = input.state.checkpointSet.entries.find(({ stageKey }) => stageKey === "render");
  if (!existingRender) {
    const rendered: PdfArtifact = await retryTransient(() => renderValidatedPdf(input.snapshotEnvelope, analysis, renderer));
    const artifact: WorkerArtifact = {
      objectKey: `private/feedback-reports/${reportId(input.reportRunId, rendered.sha256)}/report.pdf`,
      bytes: rendered.bytes,
      sha256: rendered.sha256,
      size: rendered.size,
      mimeType: rendered.mimeType,
    };
    await retryTransient(() => artifacts.stage(input.reportRunId, artifact));
    input.state.staged = artifact;
    input.updateState(input.state);
    await addCheckpoint("render", {
      kind: "render", rendererVersion: renderer.rendererVersion,
      pdfSha256: rendered.sha256, size: rendered.size,
    });
  }
  const renderCheckpoint = input.state.checkpointSet.entries.find(({ stageKey }) => stageKey === "render");
  if (!renderCheckpoint || renderCheckpoint.payload.kind !== "render" || renderCheckpoint.inputDigest !== renderPayloadDigest)
    throw Object.assign(new TypeError("Stored render checkpoint binding mismatch"), { code: "INVARIANT" as const });
  let artifact = input.state.staged;
  if (!artifact) {
    artifact = await retryTransient(() => artifacts.readStaged(input.reportRunId, renderCheckpoint.payload.kind === "render" ? renderCheckpoint.payload.pdfSha256 : ""));
    if (!artifact || artifact.sha256 !== renderCheckpoint.payload.pdfSha256 || artifact.size !== renderCheckpoint.payload.size)
      throw Object.assign(new TypeError("Staged map-reduce PDF is unavailable"), { code: "STORAGE_TRANSIENT" as const });
    input.state.staged = artifact;
    input.updateState(input.state);
  }
  const storePayload = {
    kind: "store" as const,
    objectKey: artifact.objectKey,
    artifactSha256: artifact.sha256,
    size: artifact.size,
    mimeType: "application/pdf" as const,
  };
  const storeCheckpoint = input.state.checkpointSet.entries.find(({ stageKey }) => stageKey === "store");
  if (!storeCheckpoint) await addCheckpoint("store", storePayload);
  const persistedStore = input.state.checkpointSet.entries.find(({ stageKey }) => stageKey === "store");
  if (!persistedStore || persistedStore.payload.kind !== "store" || canonicalizeJson(persistedStore.payload) !== canonicalizeJson(storePayload))
    throw Object.assign(new TypeError("Stored artifact checkpoint mismatch"), { code: "INVARIANT" as const });

  const command: CompleteCommand = {
    contractVersion: "survey-worker-cms.v1",
    expectedStateVersion: input.state.stateVersion,
    validatedAnalysis: analysis,
    analysisDigest: digest(analysis),
    rendererVersion: renderer.rendererVersion,
    artifact: {
      objectKey: artifact.objectKey,
      sha256: artifact.sha256,
      size: artifact.size,
      mimeType: "application/pdf",
    },
  };
  const complete = await retryTransient(() => cms.complete(input.reportRunId, command));
  if (complete.pendingAlerts?.length) {
    void deliverPendingWorkerAlerts({
      reportRunId: input.reportRunId,
      alerts: complete.pendingAlerts,
      dependencies: input.dependencies,
    }).catch(() => undefined);
  }
  return {
    status: "succeeded",
    disposition: complete.replayed ? "terminal-replay" : "completed",
    reportRunId: input.reportRunId,
    reportId: complete.reportId,
    artifact: command.artifact,
  };
}
