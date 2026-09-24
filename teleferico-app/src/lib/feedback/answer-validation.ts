import type {
  FeedbackAnswerInput,
  FeedbackAnswerValidationResult,
  FeedbackAspectDefinition,
  FeedbackLocale,
  FeedbackRating,
  FeedbackSentiment,
} from "@/types/api/feedback";

type AspectAnswer = { aspectKey: string; rating: FeedbackSentiment };
type OtherAnswer = { customText: string; rating: FeedbackSentiment };

const LOCALES = new Set<unknown>(["es", "en", "pt"]);
const SENTIMENTS = new Set<unknown>(["negative", "neutral", "positive"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addUnknownFields(
  errors: Set<string>,
  value: Record<string, unknown>,
  allowed: readonly string[],
  prefix: string,
) {
  const allowedFields = new Set(allowed);
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) errors.add(`${prefix}.${field}`);
  }
}

function characterCount(value: string): number {
  return Array.from(value).length;
}

function failure(fields: Set<string>): FeedbackAnswerValidationResult {
  return {
    ok: false,
    error: {
      status: 400,
      code: "VALIDATION_FAILED",
      fields: [...fields].sort(),
    },
  };
}

export function validateFeedbackAnswers(
  input: FeedbackAnswerInput,
  definitions: readonly FeedbackAspectDefinition[],
): FeedbackAnswerValidationResult {
  const errors = new Set<string>();
  const available = new Map(definitions.map((definition) => [definition.aspectKey, definition]));

  if (!LOCALES.has(input.locale)) errors.add("locale");
  if (
    !Number.isInteger(input.overallRating) ||
    (input.overallRating as number) < 1 ||
    (input.overallRating as number) > 5
  ) {
    errors.add("overallRating");
  }

  const answers: AspectAnswer[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(input.aspects)) {
    errors.add("aspects");
  } else {
    input.aspects.forEach((candidate, index) => {
      const prefix = `aspects.${index}`;
      if (!isRecord(candidate)) {
        errors.add(prefix);
        return;
      }
      addUnknownFields(errors, candidate, ["aspectKey", "rating"], prefix);

      const key = candidate.aspectKey;
      if (
        typeof key !== "string" ||
        key === "other" ||
        !available.has(key) ||
        seen.has(key)
      ) {
        errors.add(`${prefix}.aspectKey`);
      } else {
        seen.add(key);
      }
      if (!SENTIMENTS.has(candidate.rating)) errors.add(`${prefix}.rating`);
      if (typeof key === "string" && SENTIMENTS.has(candidate.rating)) {
        answers.push({ aspectKey: key, rating: candidate.rating as FeedbackSentiment });
      }
    });
  }

  let other: OtherAnswer | undefined;
  if (input.otherAspect !== undefined) {
    if (!isRecord(input.otherAspect)) {
      errors.add("otherAspect");
    } else {
      addUnknownFields(errors, input.otherAspect, ["customText", "rating"], "otherAspect");
      const text = input.otherAspect.customText;
      if (
        typeof text !== "string" ||
        text.trim().length === 0 ||
        characterCount(text) > 300 ||
        !available.has("other")
      ) {
        errors.add("otherAspect.customText");
      }
      if (!SENTIMENTS.has(input.otherAspect.rating)) errors.add("otherAspect.rating");
      if (typeof text === "string" && SENTIMENTS.has(input.otherAspect.rating)) {
        other = { customText: text, rating: input.otherAspect.rating as FeedbackSentiment };
      }
    }
  }

  const selectionCount = (Array.isArray(input.aspects) ? input.aspects.length : 0) +
    (input.otherAspect === undefined ? 0 : 1);
  if (selectionCount < 1 || selectionCount > 3) errors.add("aspects");

  if (
    input.comment !== undefined &&
    (typeof input.comment !== "string" ||
      characterCount(input.comment) < 1 ||
      characterCount(input.comment) > 2000)
  ) {
    errors.add("comment");
  }
  if (errors.size > 0) return failure(errors);

  const locale = input.locale as FeedbackLocale;
  const submitted = new Map(answers.map((answer) => [answer.aspectKey, answer]));

  const ratings = definitions
    .filter(({ aspectKey }) => submitted.has(aspectKey) || (aspectKey === "other" && other))
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.aspectKey.localeCompare(right.aspectKey),
    )
    .map((definition) => {
      const answer = definition.aspectKey === "other" ? other! : submitted.get(definition.aspectKey)!;
      return {
        aspectKey: definition.aspectKey,
        label: definition.labels[locale],
        sortOrder: definition.sortOrder,
        rating: answer.rating,
        ...(definition.aspectKey === "other" ? { customText: other!.customText } : {}),
      };
    });

  return {
    ok: true,
    value: {
      locale,
      overallRating: input.overallRating as FeedbackRating,
      ratings,
      ...(input.comment === undefined ? {} : { comment: input.comment as string }),
    },
  };
}

export function validateFeedbackAnswerShape(
  input: FeedbackAnswerInput,
): FeedbackAnswerValidationResult {
  const definitions: FeedbackAspectDefinition[] = [];
  if (Array.isArray(input.aspects)) {
    for (const [sortOrder, candidate] of input.aspects.entries()) {
      if (isRecord(candidate) && typeof candidate.aspectKey === "string" && candidate.aspectKey !== "other" &&
          !definitions.some(({ aspectKey }) => aspectKey === candidate.aspectKey)) {
        definitions.push({ aspectKey: candidate.aspectKey, sortOrder, labels: { es: "", en: "", pt: "" } });
      }
    }
  }
  if (input.otherAspect !== undefined) {
    definitions.push({ aspectKey: "other", sortOrder: definitions.length, labels: { es: "", en: "", pt: "" } });
  }
  return validateFeedbackAnswers(input, definitions);
}
