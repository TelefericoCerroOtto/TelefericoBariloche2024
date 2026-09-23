export type FeedbackAdminCapability =
  | "feedback.read"
  | "feedback.comments.read"
  | "feedback.reports.read"
  | "feedback.reports.generate"
  | "feedback.reports.download";

export type FeedbackAdminReadRoute =
  | "summary"
  | "aspects"
  | "qr-comparison"
  | "qr-detail"
  | "comments"
  | "reports";

export type FeedbackAdminCommandStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export type FeedbackAdminGenerateCommand = {
  readonly contractVersion: "feedback-admin.v1";
  readonly period: FeedbackAdminDateRange;
  readonly override: {
    readonly accepted: boolean;
    readonly overlapDigest: string | null;
  };
};

export type FeedbackAdminRetryCommand = {
  readonly contractVersion: "feedback-admin.v1";
};

export type FeedbackAdminCommandResult = {
  readonly reportRunId: string;
  readonly status: FeedbackAdminCommandStatus;
  readonly stateVersion?: number;
  readonly dispatch:
    | {
        readonly contractVersion: "survey-dispatch-command.v1";
        readonly status: "dispatched";
        readonly taskName: string;
        readonly dispatchAttemptCount: number;
      }
    | {
        readonly contractVersion: "survey-dispatch-command.v1";
        readonly status: "queued";
        readonly disposition: "dispatcher-unavailable";
        readonly taskName: string;
        readonly dispatchAttemptCount: number;
        readonly failureCode: "DISPATCH_UNAVAILABLE";
      }
    | {
        readonly contractVersion: "survey-dispatch-command.v1";
        readonly status: "failed";
        readonly failureCode: "QUEUE_ENQUEUE_EXHAUSTED";
        readonly replayed: boolean;
      };
};

export type FeedbackAdminOverlapDetails = {
  readonly overlaps: readonly {
    readonly reportRunId: string;
    readonly period: FeedbackAdminDateRange;
    readonly intersection: FeedbackAdminDateRange;
  }[];
  readonly overlapDigest: string;
  readonly adjustment: string;
};

export type FeedbackAdminDateRange = {
  readonly from: string;
  readonly to: string;
};

export type FeedbackAdminFilters =
  | ({ readonly route: "summary" } & FeedbackAdminDateRange)
  | ({
      readonly route: "aspects";
      readonly pointKey: string | null;
    } & FeedbackAdminDateRange)
  | ({
      readonly route: "qr-comparison";
      readonly pointKeys: readonly string[];
    } & FeedbackAdminDateRange)
  | ({
      readonly route: "qr-detail";
      readonly pointKey: string;
    } & FeedbackAdminDateRange)
  | ({
      readonly route: "comments";
      readonly aspectKey: string | null;
      readonly ratings: readonly (1 | 2 | 3 | 4 | 5)[];
      readonly pointKey: string | null;
      readonly locale: "es" | "en" | "pt" | null;
      readonly text: string | null;
      readonly page: number;
      readonly pageSize: number;
    } & FeedbackAdminDateRange)
  | ({
      readonly route: "reports";
      readonly page: number;
      readonly pageSize: number;
    } & FeedbackAdminDateRange);

export type FeedbackAdminSnapshot = SnapshotV1;
export type FeedbackAdminPeriod = SnapshotV1["metrics"]["current"];
export type FeedbackAdminAspect = SnapshotV1["metrics"]["aspects"][number];
export type FeedbackAdminPoint = SnapshotV1["metrics"]["qrPoints"][number];
export type FeedbackAdminCalendarBucket =
  SnapshotV1["metrics"]["calendar"][number];

export type FeedbackAdminSummaryData = {
  readonly current: FeedbackAdminPeriod;
  readonly previous: FeedbackAdminPeriod;
  readonly deltas: SnapshotV1["metrics"]["deltas"];
  readonly calendar: SnapshotV1["metrics"]["calendar"];
  readonly strengths: readonly string[];
  readonly opportunities: readonly string[];
  readonly aspects: SnapshotV1["metrics"]["aspects"];
  readonly availablePoints: SnapshotV1["metrics"]["qrPoints"];
  readonly latestSuccessfulReport: FeedbackAdminReport | null;
};

export type FeedbackAdminAspectsData = Pick<
  SnapshotV1["metrics"],
  | "current"
  | "previous"
  | "deltas"
  | "aspects"
  | "matrix"
  | "fiveStarAssociation"
  | "otherAspects"
>;

export type FeedbackAdminQrData = {
  readonly view: "comparison" | "detail";
  readonly points: SnapshotV1["metrics"]["qrPoints"];
  readonly calendar: SnapshotV1["metrics"]["calendar"];
  readonly aspects: SnapshotV1["metrics"]["aspects"];
};

export type FeedbackAdminComment = {
  readonly recordId: string;
  readonly receipt: string;
  readonly acceptedAt: string;
  readonly locale: "es" | "en" | "pt";
  readonly pointKey: string;
  readonly overallRating: 1 | 2 | 3 | 4 | 5;
  readonly aspectRatings: readonly {
    readonly aspectKey: string;
    readonly rating: "positive" | "neutral" | "negative";
  }[];
  readonly text: string;
};

export type FeedbackAdminCommentsData = {
  readonly items: readonly FeedbackAdminComment[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

export type FeedbackAdminReport = {
  readonly reportId: string;
  readonly reportRunId: string;
  readonly name: string;
  readonly period: FeedbackAdminDateRange;
  readonly status: "succeeded";
  readonly analyzedResponseCount: number;
  readonly analyzedCommentCount: number;
  readonly dataCutoffAt: string;
  readonly createdAt: string;
  readonly requestedBy: string | null;
  readonly generatedBy: string | null;
  readonly canDownload: boolean;
  readonly artifactSize: number;
  readonly artifactSha256: string;
};

export type FeedbackAdminReportsData = {
  readonly items: readonly FeedbackAdminReport[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

export type FeedbackAdminSource = {
  readonly snapshot: FeedbackAdminSnapshot;
  readonly comments: readonly FeedbackAdminComment[];
  readonly reports: readonly FeedbackAdminReport[];
};

export type FeedbackAdminReadEnvelope<T> = {
  readonly contractVersion: "feedback-admin.v1";
  readonly data: T;
  readonly meta: {
    readonly filters: FeedbackAdminFilters;
    readonly population: FeedbackAdminSnapshot["population"];
    readonly page?: number;
    readonly pageSize?: number;
    readonly total?: number;
  };
};
import type { SnapshotV1 } from "../../../../packages/survey-reporting-core/src";
