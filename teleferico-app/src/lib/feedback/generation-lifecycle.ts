import { createHash, randomUUID } from "node:crypto";
import type {
  FeedbackAdminDateRange,
  FeedbackAdminGenerateCommand,
  FeedbackAdminOverlapDetails,
} from "@/types/api/admin/feedback";
import {
  validateMaterializedGenerationInputsV1,
  type MaterializedGenerationInputsV1,
} from "../../../services/survey-report-worker/src/generation-inputs";
type Status = "queued" | "running" | "succeeded" | "failed";
type RecordValue = Record<string, unknown>;
export type GenerationLifecycleRow = {
  readonly documentId?: string;
  readonly reportRunId: string;
  readonly period: FeedbackAdminDateRange;
  readonly status: Status;
  readonly stateVersion?: number;
  readonly taskName?: string | null;
  readonly dataCutoffAt?: string;
  readonly snapshotDigest?: string;
  readonly sourceRevision?: string;
};
export class GenerationLifecycleError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "GenerationLifecycleError";
  }
}
export function captureDataCutoff(now: Date): string {
  if (Number.isNaN(now.getTime()))
    throw new GenerationLifecycleError("INVALID_CUTOFF");
  return now.toISOString();
}
export function buildOverlapDetails(
  rows: readonly GenerationLifecycleRow[],
  requestedPeriod: FeedbackAdminDateRange,
): FeedbackAdminOverlapDetails {
  const overlaps = rows
    .filter(
      ({ period }) =>
        period.from <= requestedPeriod.to && period.to >= requestedPeriod.from,
    )
    .map((row) => ({
      reportRunId: row.reportRunId,
      period: row.period,
      intersection: {
        from:
          row.period.from > requestedPeriod.from
            ? row.period.from
            : requestedPeriod.from,
        to:
          row.period.to < requestedPeriod.to
            ? row.period.to
            : requestedPeriod.to,
      },
    }))
    .sort(
      (left, right) =>
        left.intersection.from.localeCompare(right.intersection.from) ||
        left.reportRunId.localeCompare(right.reportRunId),
    );
  const overlapDigest = createHash("sha256")
    .update(
      JSON.stringify(
        rows
          .filter(
            ({ period }) =>
              period.from <= requestedPeriod.to &&
              period.to >= requestedPeriod.from,
          )
          .map(({ reportRunId, period, status }) => ({
            reportRunId,
            period,
            status,
          }))
          .sort((left, right) =>
            left.reportRunId.localeCompare(right.reportRunId),
          ),
      ),
    )
    .digest("hex");
  return {
    overlaps,
    overlapDigest,
    adjustment: "Choose a range that excludes every listed intersection.",
  };
}
export function buildGenerationData(
  command: FeedbackAdminGenerateCommand,
  now: Date,
  materializedInputs: MaterializedGenerationInputsV1,
  createReportRunId: () => string = randomUUID,
  source?: GenerationLifecycleRow,
): RecordValue {
  if (!materializedInputs)
    throw new GenerationLifecycleError("GENERATION_INPUTS_REQUIRED");
  const inputs = validateMaterializedGenerationInputsV1(materializedInputs);
  const period = source?.period ?? command.period;
  const dataCutoffAt = captureDataCutoff(now);
  const snapshotPopulation = inputs.snapshotJson.population;
  if (
    snapshotPopulation.current.from !== period.from ||
    snapshotPopulation.current.to !== period.to ||
    snapshotPopulation.dataCutoffAt !== dataCutoffAt
  )
    throw new GenerationLifecycleError("GENERATION_INPUTS_CONTEXT_MISMATCH");
  return {
    reportRunId: createReportRunId(),
    periodStart: period.from,
    periodEnd: period.to,
    dataCutoffAt,
    overlapOverrideAccepted: source ? false : command.override.accepted,
    ...(source ? {} : { overlapDigest: command.override.overlapDigest }),
    snapshotDigest: inputs.snapshotDigest,
    sourceRevision: inputs.sourceRevision,
    snapshotJson: inputs.snapshotJson,
    checkpointsJson: inputs.checkpointsJson,
    modelConfigJson: inputs.modelConfigJson,
    usageJson: {},
    pricingSnapshotJson: inputs.pricingSnapshotJson,
    status: "queued",
    requestedBy: null,
    ...(source ? { retryOfGeneration: { connect: [source.documentId] } } : {}),
  };
}
export function prepareRetryGeneration(
  source: GenerationLifecycleRow,
  now: Date,
  materializedInputs: MaterializedGenerationInputsV1,
  createReportRunId: () => string = randomUUID,
) {
  if (source.status !== "failed" || !source.documentId)
    throw new GenerationLifecycleError("INVALID_STATE");
  return buildGenerationData(
    {
      contractVersion: "feedback-admin.v1",
      period: source.period,
      override: { accepted: false, overlapDigest: null },
    },
    now,
    materializedInputs,
    createReportRunId,
    source,
  );
}
export function prepareDispatchCompensation(
  generation: Pick<
    GenerationLifecycleRow,
    "status" | "stateVersion" | "taskName"
  >,
  expectedStateVersion: number,
  completedAt: string,
) {
  if (generation.stateVersion !== expectedStateVersion)
    throw new GenerationLifecycleError("STATE_VERSION_CONFLICT");
  if (generation.status !== "queued")
    throw new GenerationLifecycleError("TERMINAL_CONFLICT");
  if (generation.taskName)
    throw new GenerationLifecycleError("TASK_ALREADY_CREATED");
  return {
    status: "failed" as const,
    stateVersion: expectedStateVersion + 1,
    completedAt,
    failureCode: "QUEUE_ENQUEUE_EXHAUSTED" as const,
  };
}
export function prepareAtomicCompletion(input: {
  readonly generation: GenerationLifecycleRow;
  readonly expectedStateVersion: number;
  readonly reportId: string;
  readonly checkpoints: readonly string[];
  readonly artifact: {
    readonly objectKey: string;
    readonly sha256: string;
    readonly size: number;
    readonly mimeType: "application/pdf";
  };
  readonly validatedAnalysis: {
    readonly schemaVersion: "survey-published-analysis.v1";
    readonly sections: readonly unknown[];
  };
  readonly analysisDigest: string;
  readonly rendererVersion: string;
  readonly now: string;
}) {
  if (input.generation.stateVersion !== input.expectedStateVersion)
    throw new GenerationLifecycleError("STATE_VERSION_CONFLICT");
  if (input.generation.status !== "running")
    throw new GenerationLifecycleError("TERMINAL_CONFLICT");
  const required = ["redact", "count", "direct", "validate", "render", "store"];
  if (
    new Set(input.checkpoints).size !== required.length ||
    required.some((key) => !input.checkpoints.includes(key))
  )
    throw new GenerationLifecycleError("CHECKPOINT_SET_INCOMPLETE");
  if (
    !input.artifact.objectKey ||
    input.artifact.objectKey.length > 500 ||
    !/^[a-f0-9]{64}$/.test(input.artifact.sha256) ||
    !Number.isSafeInteger(input.artifact.size) ||
    input.artifact.size < 1 ||
    !input.generation.documentId ||
    input.validatedAnalysis.schemaVersion !== "survey-published-analysis.v1" ||
    !Array.isArray(input.validatedAnalysis.sections) ||
    !/^[a-f0-9]{64}$/.test(input.analysisDigest) ||
    !input.rendererVersion ||
    input.rendererVersion.length > 128
  )
    throw new GenerationLifecycleError("VALIDATION_FAILED");
  return {
    generation: {
      status: "succeeded" as const,
      stateVersion: input.expectedStateVersion + 1,
      completedAt: input.now,
    },
    report: {
      reportId: input.reportId,
      generationRunId: input.generation.reportRunId,
      periodStart: input.generation.period.from,
      periodEnd: input.generation.period.to,
      dataCutoffAt: input.generation.dataCutoffAt,
      snapshotDigest: input.generation.snapshotDigest,
      sourceRevision: input.generation.sourceRevision,
      validatedAnalysisJson: input.validatedAnalysis,
      analysisContractVersion: input.validatedAnalysis.schemaVersion,
      analysisDigest: input.analysisDigest,
      rendererVersion: input.rendererVersion,
      objectKey: input.artifact.objectKey,
      artifactSha256: input.artifact.sha256,
      artifactSize: input.artifact.size,
      mimeType: input.artifact.mimeType,
      sourceGeneration: { connect: [input.generation.documentId] },
    },
  };
}
