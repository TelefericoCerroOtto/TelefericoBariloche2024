import { describe, expect, it, vi } from "vitest";
import {
  createInitialFeedbackState,
  isAuthoritativeReceipt,
  resolveFeedbackCopy,
  validateFeedbackStage,
  type FeedbackSurveyCopy,
} from "./ui-contract";

const copy: FeedbackSurveyCopy = {
  es: {
    headerTitle: "Encuesta",
    overallQuestion: "¿Cómo fue tu experiencia general?",
  },
  en: {
    headerTitle: "Survey",
  },
  pt: {
    headerTitle: "Pesquisa",
  },
};

describe("feedback UI contract", () => {
  it("keeps the ordered stages invalid until the required answer exists", () => {
    const state = createInitialFeedbackState();

    expect(validateFeedbackStage("overall", state, [])).toEqual({
      valid: false,
      focusId: "overall-rating-1",
      messageKey: "ratingRequired",
    });

    const withOverall = { ...state, overallRating: 4 as const };
    expect(validateFeedbackStage("overall", withOverall, [])).toEqual({
      valid: true,
    });
    expect(validateFeedbackStage("aspects", withOverall, [])).toEqual({
      valid: false,
      focusId: "aspect-views",
      messageKey: "aspectsRequired",
    });
  });

  it("requires every selected aspect to have an explicit sentiment", () => {
    const state = {
      ...createInitialFeedbackState(),
      overallRating: 5 as const,
      selectedAspectKeys: ["views", "other"],
      otherText: "The sunset viewpoint",
      sentiments: { views: "positive" as const },
    };

    expect(
      validateFeedbackStage("sentiments", state, ["views", "other"]),
    ).toEqual({
      valid: false,
      focusId: "sentiment-other-negative",
      messageKey: "sentimentsRequired",
    });
  });

  it("falls back to Spanish copy and emits only bounded telemetry", () => {
    const onFallback = vi.fn();

    expect(resolveFeedbackCopy(copy, "pt", "overallQuestion", onFallback)).toBe(
      "¿Cómo fue tu experiencia general?",
    );
    expect(onFallback).toHaveBeenCalledWith("pt", "overallQuestion");
  });

  it("accepts success only when receipt, timestamps, and guard state are authoritative", () => {
    expect(
      isAuthoritativeReceipt({
        submissionReceipt: "receipt-1",
        acceptedAt: "2026-09-18T12:00:00.000Z",
        guardUntil: "2026-09-19T12:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isAuthoritativeReceipt({
        submissionReceipt: "receipt-1",
        acceptedAt: "2026-09-18T12:00:00.000Z",
        guardUntil: "2026-09-18T11:00:00.000Z",
      }),
    ).toBe(false);
  });
});
