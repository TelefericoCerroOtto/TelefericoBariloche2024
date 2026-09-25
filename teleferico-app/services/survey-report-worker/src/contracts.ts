import type {
  ChartViewModelV1,
  SnapshotEnvelopeV1,
  SnapshotV1,
} from "../../../packages/survey-reporting-core/src";

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

export type CheckpointPayload =
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
  readonly stageKey: "render" | "store";
  readonly stageIndex: number;
  readonly route: "common" | "direct" | "map-reduce";
  readonly stageType: "render" | "store";
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

export type ModelConfigV1 = {
  readonly version: "survey-model-config.v1";
  readonly evidenceKeyId: string;
  readonly provider: "vertex-ai";
  readonly vertexProjectId: "teleferico-bariloche-2024";
  readonly vertexLocation: "us";
  readonly vertexApiEndpoint: "aiplatform.us.rep.googleapis.com";
  readonly model: "gemini-3.8-flash";
  readonly temperature: 0;
  readonly reasoning: "LOW";
  readonly grounding: false;
  readonly promptVersion: string;
  readonly mapSchemaVersion: "survey-map.v1";
  readonly analysisSchemaVersion: "survey-analysis.v1";
  readonly redactionVersion: string;
  readonly validatorVersion: string;
  readonly chunkVersion: string;
  readonly verifiedInputTokenLimit: number;
  readonly map: {
    readonly targetMin: 600;
    readonly targetMax: 1200;
    readonly hardMax: 4000;
  };
  readonly directReduce: {
    readonly targetMin: 1800;
    readonly targetMax: 3000;
    readonly hardMax: 8000;
  };
  readonly safetyHeadroomTokens: number;
  readonly sourceRevision: string;
};

export type PricingSnapshotV1 = {
  readonly version: string;
  readonly currency: "USD";
  readonly units: readonly {
    readonly sku: string;
    readonly inputMicrosPerMillion: number;
    readonly outputMicrosPerMillion: number;
  }[];
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
    }
  | {
      readonly contractVersion: typeof WORKER_CMS_CONTRACT_VERSION;
      readonly reportRunId: string;
      readonly stateVersion: number;
      readonly status: "succeeded" | "failed";
      readonly disposition: "terminal-replay";
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

export type ValidatedAnalysisProvider = (
  snapshot: SnapshotV1,
  checkpoints: WorkerCheckpointSet,
) => Promise<PublishedAnalysisV1>;

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
    };

export class WorkerCmsConflictError extends Error {
  readonly code = "STATE_VERSION_CONFLICT" as const;

  constructor(message = "Worker state version conflict") {
    super(message);
    this.name = "WorkerCmsConflictError";
  }
}
