import type {
  ChartViewModelV1,
  ModelConfigV1,
  PricingSnapshotV1,
  SnapshotEnvelopeV1,
  SnapshotV1,
} from "@teleferico/survey-reporting-core";
import type { PersistedStageUsageV1, ProviderUsageV1 } from "./worker-cost";
import type { WorkerDiagnosticStore } from "./worker-diagnostics";

export type { ModelConfigV1, PricingSnapshotV1 } from "@teleferico/survey-reporting-core";
export type { WorkerCmsAction } from "@teleferico/tb113-runtime-contracts";

export const WORKER_CMS_CONTRACT_VERSION = "survey-worker-cms.v1" as const;
export const WORKER_COMMAND_VERSION = "survey-report-command.v1" as const;
export const CHECKPOINT_VERSION = "survey-checkpoint.v1" as const;

export const PUBLISHED_SECTION_KEYS = [
  "executive_summary",
  "observed_changes",
  "strengths",
  "unfavorable_areas",
  "recurrent_themes",
  "minority_signals",
  "coverage_limitations",
] as const;

export type RuntimeFailureCode =
  | "PROVIDER_TRANSIENT"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_TIMEOUT"
  | "CMS_TRANSIENT"
  | "STORAGE_TRANSIENT"
  | "INVALID_OUTPUT"
  | "AUTHENTICATION"
  | "CONFIGURATION"
  | "UNKNOWN_VERSION"
  | "INVARIANT"
  | "PROHIBITED_CONTENT"
  | "QUEUE_ENQUEUE_EXHAUSTED";

export type PublishedAnalysisSection = {
  readonly key: (typeof PUBLISHED_SECTION_KEYS)[number];
  readonly status: "supported" | "insufficient_evidence";
  readonly paragraphsEs: readonly string[];
};

export type PublishedAnalysisV1 = {
  readonly schemaVersion: "survey-published-analysis.v1";
  readonly sections: readonly [
    PublishedAnalysisSection,
    PublishedAnalysisSection,
    PublishedAnalysisSection,
    PublishedAnalysisSection,
    PublishedAnalysisSection,
    PublishedAnalysisSection,
    PublishedAnalysisSection,
  ];
};

export type DirectAnalysisClaimV1 = {
  readonly claimId: string;
  readonly textEs: string;
  readonly evidenceRefs: readonly string[];
  readonly signal: "recurrent" | "minority" | "descriptive";
};

export type DirectAnalysisV1 = {
  readonly schemaVersion: "survey-analysis.v1";
  readonly route: "direct";
  readonly sections: readonly {
    readonly key: (typeof PUBLISHED_SECTION_KEYS)[number];
    readonly status: "supported" | "insufficient_evidence";
    readonly claims: readonly DirectAnalysisClaimV1[];
  }[];
};

export type WorkerMapCheckpointStage = `map.${number}-of-${number}`;
export type WorkerCheckpointStage = "redact" | "count" | "direct" | "map" | WorkerMapCheckpointStage | "reduce" | "validate" | "render" | "store";

export type MapAnalysisV1 = {
  readonly schemaVersion: "survey-map.v1";
  readonly chunkId: string;
  readonly coveredRefs: readonly string[];
  readonly themes: readonly {
    readonly themeKey: string;
    readonly labelEs: string;
    readonly claims: readonly DirectAnalysisClaimV1[];
  }[];
  readonly limitations: readonly string[];
};

export type ReduceAnalysisV1 = {
  readonly schemaVersion: "survey-analysis.v1";
  readonly route: "reduce";
  readonly sections: DirectAnalysisV1["sections"];
  readonly mapOutputDigests: readonly string[];
};

export type CountCheckpointPayload = {
  readonly kind: "count";
  readonly requestDigest: string;
  readonly segmentTokens: {
    readonly instructions: number;
    readonly schema: number;
    readonly metrics: number;
    readonly comments: number;
    readonly reservedOutput: number;
    readonly headroom: number;
  };
  readonly totalTokens: number;
  readonly route?: "map-reduce";
  readonly directRequestDigest?: string;
  readonly directSegmentTokens?: {
    readonly instructions: number;
    readonly schema: number;
    readonly metrics: number;
    readonly comments: number;
    readonly reservedOutput: number;
    readonly headroom: number;
  };
  readonly directTotalTokens?: number;
  readonly attempts?: readonly {
    readonly chunkCount: number;
    readonly chunks: readonly {
      readonly requestDigest: string;
      readonly segmentTokens: {
        readonly instructions: number;
        readonly schema: number;
        readonly metrics: number;
        readonly comments: number;
        readonly reservedOutput: number;
        readonly headroom: number;
      };
      readonly totalTokens: number;
    }[];
  }[];
  readonly chunkCount?: number;
};

export type CheckpointPayload =
  | { readonly kind: "redact"; readonly recordCount: number; readonly redactionVersion: string }
  | CountCheckpointPayload
  | { readonly kind: "direct"; readonly validatedOutput: DirectAnalysisV1; readonly usage?: PersistedStageUsageV1; readonly outputTokenCount?: number; readonly outputRequestDigest?: string }
  | {
      readonly kind: "map";
      readonly chunkId: string;
      readonly chunkIndex: number;
      readonly chunkCount: number;
      readonly evidenceKeyId: string;
      readonly coveredRefs: readonly string[];
      readonly chunkMembershipDigest: string;
      readonly outputTokenCount: number;
      readonly outputRequestDigest: string;
      readonly validatedOutput: MapAnalysisV1;
      readonly usage: PersistedStageUsageV1;
    }
  | { readonly kind: "reduce"; readonly outputTokenCount: number; readonly outputRequestDigest: string; readonly validatedOutput: ReduceAnalysisV1; readonly usage: PersistedStageUsageV1 }
  | { readonly kind: "validate"; readonly publishedAnalysis: PublishedAnalysisV1; readonly validatorVersion: string }
  | {
      readonly kind: "render";
      readonly rendererVersion: string;
      readonly pdfSha256: string;
      readonly size: number;
    }
  | {
      readonly kind: "store";
      readonly objectKey: string;
      readonly artifactSha256: string;
      readonly size: number;
      readonly mimeType: "application/pdf";
    };

export type WorkerCheckpoint = {
  readonly checkpointVersion: typeof CHECKPOINT_VERSION;
  readonly stageKey: WorkerCheckpointStage;
  readonly stageIndex: number;
  readonly route: "common" | "direct" | "map-reduce";
  readonly stageType: WorkerCheckpointStage;
  readonly status: "valid";
  readonly inputDigest: string;
  readonly outputDigest: string;
  readonly attempts: number;
  readonly completedAt: string;
  readonly payload: CheckpointPayload;
};

export type WorkerCheckpointSet = {
  readonly version: "survey-checkpoints.v1";
  readonly snapshotDigest: string;
  readonly route: "undecided" | "direct" | "map-reduce";
  readonly chunkCount: number | null;
  readonly entries: readonly WorkerCheckpoint[];
};

export type WorkerAlertIntentV1 = {
  readonly deduplicationKey: string;
  readonly kind: "cost-threshold" | "terminal-failure";
  readonly reportRunId: string;
  readonly cumulativeCostMicros?: string;
  readonly failureCode?: RuntimeFailureCode;
};

export type WorkerAlertAcknowledgeCommandV1 = {
  readonly contractVersion: "survey-worker-alert-ack.v1";
  readonly deduplicationKey: string;
};

export type WorkerAlertAcknowledgeResultV1 = {
  readonly contractVersion: "survey-worker-alert-ack.v1";
  readonly reportRunId: string;
  readonly deduplicationKey: string;
  readonly status: "delivered";
  readonly replayed: boolean;
};

export type WorkerAlertNotifierV1 = (
  intent: WorkerAlertIntentV1,
) => Promise<{
  readonly accepted: true;
  readonly idempotencyKey: string;
}>;

export type ProviderResultV1<T> = {
  readonly output: T;
  readonly usage: ProviderUsageV1;
};

export type WorkerClaimResult =
  | {
      readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
      readonly reportRunId: string;
      readonly stateVersion: number;
      readonly status: "running";
      readonly disposition: "claimed" | "resumed";
      readonly checkpoints: WorkerCheckpointSet;
      readonly modelConfig: unknown;
      readonly pricingSnapshot: unknown;
      readonly pendingAlerts?: readonly WorkerAlertIntentV1[];
    }
  | {
      readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
      readonly reportRunId: string;
      readonly stateVersion: number;
      readonly status: "succeeded" | "failed";
      readonly disposition: "terminal-replay";
      readonly pendingAlerts?: readonly WorkerAlertIntentV1[];
    };

export type WorkerSnapshotResult = {
  readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
  readonly reportRunId: string;
  readonly stateVersion: number;
  readonly snapshot: SnapshotEnvelopeV1;
};

export type CheckpointWrite = {
  readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
  readonly expectedStateVersion: number;
  readonly checkpoint: WorkerCheckpoint;
};

export type CheckpointWriteResult = {
  readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
  readonly reportRunId: string;
  readonly stateVersion: number;
  readonly stageKey: WorkerCheckpoint["stageKey"];
  readonly status: "valid";
  readonly replayed: boolean;
  readonly crossedCostThreshold: boolean;
  readonly pendingAlerts?: readonly WorkerAlertIntentV1[];
};

export type WorkerArtifact = {
  readonly objectKey: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly size: number;
  readonly mimeType: "application/pdf";
};

export type CompleteCommand = {
  readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
  readonly expectedStateVersion: number;
  readonly validatedAnalysis: PublishedAnalysisV1;
  readonly analysisDigest: string;
  readonly rendererVersion: string;
  readonly artifact: Omit<WorkerArtifact, "bytes">;
};

export type CompleteResult = {
  readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
  readonly reportRunId: string;
  readonly stateVersion: number;
  readonly status: "succeeded";
  readonly reportId: string;
  readonly artifactSha256: string;
  readonly artifactSize: number;
  readonly replayed: boolean;
  readonly pendingAlerts?: readonly WorkerAlertIntentV1[];
};

export type FailCommand = {
  readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
  readonly expectedStateVersion: number;
  readonly failureCode: RuntimeFailureCode;
  readonly safeFailureMessage: string;
};

export type FailResult = {
  readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
  readonly reportRunId: string;
  readonly stateVersion: number;
  readonly status: "failed";
  readonly failureCode: RuntimeFailureCode;
  readonly replayed: boolean;
  readonly alertRequired: boolean;
  readonly pendingAlerts?: readonly WorkerAlertIntentV1[];
};

export interface WorkerCmsClient {
  claim(reportRunId: string): Promise<WorkerClaimResult>;
  snapshot(reportRunId: string): Promise<WorkerSnapshotResult>;
  checkpoint(
    reportRunId: string,
    command: CheckpointWrite,
  ): Promise<CheckpointWriteResult>;
  complete(
    reportRunId: string,
    command: CompleteCommand,
  ): Promise<CompleteResult>;
  fail(reportRunId: string, command: FailCommand): Promise<FailResult>;
  acknowledgeAlert(
    reportRunId: string,
    command: WorkerAlertAcknowledgeCommandV1,
  ): Promise<WorkerAlertAcknowledgeResultV1>;
}

export interface WorkerArtifactStore {
  stage(reportRunId: string, artifact: WorkerArtifact): Promise<void>;
  readStaged(
    reportRunId: string,
    sha256: string,
  ): Promise<WorkerArtifact | null>;
  discardStaged(reportRunId: string, sha256: string): Promise<void>;
}

export interface PdfRenderer {
  readonly rendererVersion: string;
  render(input: {
    readonly html: string;
    readonly snapshot: SnapshotV1;
    readonly charts: readonly ChartViewModelV1[];
  }): Promise<Uint8Array>;
}

export type DirectModelCommentV1 = {
  readonly period: "current" | "previous";
  readonly text: string;
  readonly evidenceRef: string;
};

export type DirectModelRequestV1 = {
  readonly contractVersion: "survey-model-input.v1";
  readonly metrics: SnapshotV1["metrics"];
  readonly comments: readonly DirectModelCommentV1[];
};

export type ValidatedAnalysisProvider = (
  request: DirectModelRequestV1,
  countRequest: CountTokensRequestV1,
) => Promise<ProviderResultV1<DirectAnalysisV1 | PublishedAnalysisV1>>;

export type MapModelRequestV1 = {
  readonly contractVersion: "survey-map-input.v1";
  readonly chunkId: string;
  readonly chunkIndex: number;
  readonly chunkCount: number;
  readonly metrics: SnapshotV1["metrics"];
  readonly comments: readonly DirectModelCommentV1[];
};

export type ReduceModelRequestV1 = {
  readonly contractVersion: "survey-reduce-input.v1";
  readonly metrics: SnapshotV1["metrics"];
  readonly maps: readonly {
    readonly chunkId: string;
    readonly outputDigest: string;
    readonly validatedOutput: MapAnalysisV1;
  }[];
};

export type MapAnalysisProvider = (
  request: MapModelRequestV1,
  countRequest: CountTokensRequestV1,
) => Promise<ProviderResultV1<MapAnalysisV1>>;

export type ReduceAnalysisProvider = (
  request: ReduceModelRequestV1,
  countRequest: CountTokensRequestV1,
) => Promise<ProviderResultV1<ReduceAnalysisV1>>;

export type EvidenceKeyProvider = (
  evidenceKeyId: string,
) => Promise<string | Uint8Array>;

export type CountTokensRequestV1 = {
  readonly contractVersion: "survey-count-request.v1";
  readonly modelConfig: ModelConfigV1;
  readonly segments: {
    readonly instructions: string;
    readonly schema: string;
    readonly metrics: string;
    readonly comments: string;
  };
};

export type CountTokensResultV1 = {
  readonly instructions: number;
  readonly schema: number;
  readonly metrics: number;
  readonly comments: number;
};

export type CountTokensProvider = (
  request: CountTokensRequestV1,
) => Promise<CountTokensResultV1>;

export type WorkerExecutionResult =
  | {
      readonly status: "succeeded";
      readonly disposition: "completed" | "terminal-replay";
      readonly reportRunId: string;
      readonly reportId?: string;
      readonly artifact?: Omit<WorkerArtifact, "bytes">;
    }
  | {
      readonly status: "failed";
      readonly disposition: "failed" | "terminal-replay";
      readonly reportRunId: string;
      readonly failureCode: RuntimeFailureCode;
      readonly cleanupPending?: true;
    };

export class WorkerCmsConflictError extends Error {
  readonly code = "STATE_VERSION_CONFLICT" as const;

  constructor(message = "Worker state version conflict") {
    super(message);
    this.name = "WorkerCmsConflictError";
  }
}

export type WorkerRuntimeDependencies = {
  readonly cms: WorkerCmsClient;
  readonly artifacts: WorkerArtifactStore;
  readonly renderer: PdfRenderer;
  readonly analysisProvider?: ValidatedAnalysisProvider;
  readonly countTokens?: CountTokensProvider;
  readonly evidenceKeyProvider?: EvidenceKeyProvider;
  readonly mapProvider?: MapAnalysisProvider;
  readonly reduceProvider?: ReduceAnalysisProvider;
  readonly now?: () => Date;
  readonly approvedModelConfig?: ModelConfigV1;
  readonly approvedPricingSnapshot?: PricingSnapshotV1;
  readonly pricingSnapshot?: PricingSnapshotV1;
  readonly usageNotifier?: WorkerAlertNotifierV1;
  readonly diagnostics?: WorkerDiagnosticStore;
};
