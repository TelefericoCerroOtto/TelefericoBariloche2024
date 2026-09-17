export type FeedbackLocale = "es" | "en" | "pt";
export type FeedbackSentiment = "negative" | "neutral" | "positive";
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export type FeedbackAspectDefinition = {
  readonly aspectKey: string;
  readonly sortOrder: number;
  readonly labels: Readonly<Record<FeedbackLocale, string>>;
};

export type FeedbackAnswerInput = {
  readonly locale: unknown;
  readonly overallRating: unknown;
  readonly aspects: unknown;
  readonly otherAspect?: unknown;
  readonly comment?: unknown;
};

export type FeedbackRatingSnapshot = {
  readonly aspectKey: string;
  readonly label: string;
  readonly sortOrder: number;
  readonly rating: FeedbackSentiment;
  readonly customText?: string;
};

export type ValidatedFeedbackAnswers = {
  readonly locale: FeedbackLocale;
  readonly overallRating: FeedbackRating;
  readonly ratings: readonly FeedbackRatingSnapshot[];
  readonly comment?: string;
};

export type FeedbackAnswerValidationResult =
  | { readonly ok: true; readonly value: ValidatedFeedbackAnswers }
  | {
      readonly ok: false;
      readonly error: {
        readonly status: 400;
        readonly code: "VALIDATION_FAILED";
        readonly fields: readonly string[];
      };
    };
