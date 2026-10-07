export const ADMIN_CONTRACT_VERSION = "feedback-admin.v1" as const;
export const SNAPSHOT_CONTRACT_VERSION = "survey-snapshot.v1" as const;
export const CANONICALIZATION_VERSION = "tb-json.v1" as const;
export const REPORTING_TIME_ZONE = "America/Argentina/Buenos_Aires" as const;

export const ADMIN_ROUTE_FILTER_KEYS = {
  summary: ["from", "to"],
  aspects: ["from", "to", "pointKey"],
  "qr-comparison": ["from", "to", "pointKeys"],
  "qr-detail": ["from", "to", "pointKey"],
  comments: [
    "from",
    "to",
    "aspectKey",
    "ratings",
    "pointKey",
    "locale",
    "text",
  ],
  reports: ["from", "to"],
  generations: ["from", "to", "status"],
} as const;

export const ADMIN_ROUTE_SCOPES = Object.freeze(
  Object.keys(ADMIN_ROUTE_FILTER_KEYS),
) as ReadonlyArray<keyof typeof ADMIN_ROUTE_FILTER_KEYS>;

export type Locale = "es" | "en" | "pt";
export type Rating = 1 | 2 | 3 | 4 | 5;
export type Sentiment = "positive" | "neutral" | "negative";
export type CalendarUnit = "day" | "week" | "month";

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

export interface DateRange {
  readonly from: string;
  readonly to: string;
}

export interface NormalizedDateRange extends DateRange {
  readonly utcStart: string;
  readonly utcEnd: string;
}

export type RouteFiltersV1 =
  | ({ readonly route: "summary" } & DateRange)
  | ({
      readonly route: "aspects";
      readonly pointKey: string | null;
    } & DateRange)
  | ({
      readonly route: "qr-comparison";
      readonly pointKeys: readonly string[];
    } & DateRange)
  | ({ readonly route: "qr-detail"; readonly pointKey: string } & DateRange)
  | ({
      readonly route: "comments";
      readonly aspectKey: string | null;
      readonly ratings: readonly Rating[];
      readonly pointKey: string | null;
      readonly locale: Locale | null;
      readonly text: string | null;
    } & DateRange)
  | ({ readonly route: "reports" } & DateRange)
  | ({
      readonly route: "generations";
      readonly status: string | null;
    } & DateRange);
