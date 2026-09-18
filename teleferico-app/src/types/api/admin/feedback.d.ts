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

export type FeedbackAdminPeriod = {
  readonly submissionCount: number;
  readonly [key: string]: unknown;
};

export type FeedbackAdminSnapshot = {
  readonly population: {
    readonly currentSubmissionCount: number;
    readonly previousSubmissionCount: number;
    readonly [key: string]: unknown;
  };
  readonly metrics: {
    readonly current: FeedbackAdminPeriod;
    readonly previous: FeedbackAdminPeriod;
    readonly deltas: {
      readonly submissionCount: number;
      readonly submissionPercentBps: number | null;
      readonly [key: string]: unknown;
    };
    readonly calendar: readonly unknown[];
    readonly aspects: readonly unknown[];
    readonly classifications: {
      readonly strengths: readonly string[];
      readonly opportunities: readonly string[];
    };
    readonly matrix: readonly unknown[];
    readonly fiveStarAssociation: readonly unknown[];
    readonly otherAspects: readonly unknown[];
    readonly qrPoints: readonly unknown[];
  };
  readonly comments: readonly unknown[];
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
