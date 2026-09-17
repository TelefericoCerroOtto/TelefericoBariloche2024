import { describe, expect, it } from "vitest";
import { validateFeedbackAnswers } from "./answer-validation";

const definitions = [
  {
    aspectKey: "views",
    sortOrder: 1,
    labels: { es: "Paisajes", en: "Views", pt: "Paisagens" },
  },
  {
    aspectKey: "staff",
    sortOrder: 2,
    labels: { es: "Personal", en: "Staff", pt: "Equipe" },
  },
  {
    aspectKey: "other",
    sortOrder: 3,
    labels: { es: "Otro", en: "Other", pt: "Outro" },
  },
] as const;

function validAnswers(overrides: Record<string, unknown> = {}) {
  return {
    locale: "es",
    overallRating: 5,
    aspects: [{ aspectKey: "views", rating: "positive" }],
    ...overrides,
  };
}

function expectFields(input: Record<string, unknown>, fields: string[]) {
  expect(validateFeedbackAnswers(input as ReturnType<typeof validAnswers>, definitions)).toEqual({
    ok: false,
    error: { status: 400, code: "VALIDATION_FAILED", fields },
  });
}

describe("active-version feedback answer validation", () => {
  it("normalizes bounded answers into ordered immutable snapshots", () => {
    const result = validateFeedbackAnswers(
      {
        locale: "en",
        overallRating: 4,
        aspects: [
          { aspectKey: "staff", rating: "neutral" },
          { aspectKey: "views", rating: "positive" },
        ],
        otherAspect: { customText: "Accessibility", rating: "negative" },
        comment: "Clear and useful feedback.",
      },
      definitions,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        locale: "en",
        overallRating: 4,
        ratings: [
          { aspectKey: "views", label: "Views", sortOrder: 1, rating: "positive" },
          { aspectKey: "staff", label: "Staff", sortOrder: 2, rating: "neutral" },
          {
            aspectKey: "other",
            label: "Other",
            sortOrder: 3,
            rating: "negative",
            customText: "Accessibility",
          },
        ],
        comment: "Clear and useful feedback.",
      },
    });
  });

  it.each([0, 6, 1.5, "5"])("rejects invalid overall rating %s", (overallRating) => {
    expectFields(validAnswers({ overallRating }), ["overallRating"]);
  });

  it.each([
    [[], undefined],
    [
      [
        { aspectKey: "views", rating: "positive" },
        { aspectKey: "staff", rating: "neutral" },
        { aspectKey: "views", rating: "negative" },
      ],
      { customText: "Access", rating: "positive" },
    ],
  ])("rejects zero or four combined selections", (aspects, otherAspect) => {
    const fields = aspects.length === 0 ? ["aspects"] : ["aspects", "aspects.2.aspectKey"];
    expectFields(validAnswers({ aspects, otherAspect }), fields);
  });

  it("rejects duplicate, unknown, reserved-other, and malformed standard answers", () => {
    expectFields(
      validAnswers({
        aspects: [
          { aspectKey: "views", rating: "positive" },
          { aspectKey: "views", rating: "neutral" },
          { aspectKey: "missing", rating: "negative" },
          { aspectKey: "other", rating: "positive" },
          { aspectKey: "staff", rating: "happy", debug: true },
        ],
      }),
      [
        "aspects",
        "aspects.1.aspectKey",
        "aspects.2.aspectKey",
        "aspects.3.aspectKey",
        "aspects.4.debug",
        "aspects.4.rating",
      ],
    );
  });

  it("rejects incomplete other answers and deterministically aggregates field errors", () => {
    expectFields(
      validAnswers({
        locale: "fr",
        overallRating: null,
        otherAspect: { customText: "   ", rating: "happy", debug: true },
        comment: "x".repeat(2001),
      }),
      [
        "comment",
        "locale",
        "otherAspect.customText",
        "otherAspect.debug",
        "otherAspect.rating",
        "overallRating",
      ],
    );
  });

  it("accepts exact text boundaries and preserves submitted text", () => {
    const customText = "á".repeat(300);
    const comment = "🙂".repeat(2000);

    expect(
      validateFeedbackAnswers(
        validAnswers({ aspects: [], otherAspect: { customText, rating: "neutral" }, comment }),
        definitions,
      ),
    ).toMatchObject({
      ok: true,
      value: {
        ratings: [{ aspectKey: "other", customText, rating: "neutral" }],
        comment,
      },
    });
  });
});
