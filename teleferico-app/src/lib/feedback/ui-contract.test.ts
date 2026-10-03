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
    receiptLabel: "Número de referencia:",
  },
  en: {
    headerTitle: "Survey",
    receiptLabel: "Reference number:",
  },
  pt: {
    headerTitle: "Pesquisa",
    receiptLabel: "Número de referência:",
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
    expect(
      validateFeedbackStage(
        "aspects",
        withOverall,
        [],
        ["cable-car", "views", "other"],
      ),
    ).toEqual({
      valid: false,
      focusId: "aspect-cable-car",
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

  it("enforces the normative 300-character custom-aspect bound", () => {
    const state = {
      ...createInitialFeedbackState(),
      overallRating: 5 as const,
      selectedAspectKeys: ["other"],
      otherText: "a".repeat(301),
    };

    expect(
      validateFeedbackStage("aspects", state, ["other"], ["other"]),
    ).toEqual({
      valid: false,
      focusId: "other-aspect-input",
      messageKey: "otherTooLong",
    });
  });

  it("falls back to Spanish copy and emits only bounded telemetry", () => {
    const onFallback = vi.fn();

    expect(resolveFeedbackCopy(copy, "pt", "overallQuestion", onFallback)).toBe(
      "¿Cómo fue tu experiencia general?",
    );
    expect(onFallback).toHaveBeenCalledWith("pt", "overallQuestion");
  });

  it("resolves the authoritative receipt label in each supported locale", () => {
    expect(resolveFeedbackCopy(copy, "es", "receiptLabel")).toBe(
      "Número de referencia:",
    );
    expect(resolveFeedbackCopy(copy, "en", "receiptLabel")).toBe(
      "Reference number:",
    );
    expect(resolveFeedbackCopy(copy, "pt", "receiptLabel")).toBe(
      "Número de referência:",
    );
  });

  it("keeps CMS copy authoritative and localizes UI-only copy by locale", () => {
    const translations: FeedbackSurveyCopy = {
      es: { commentLabel: "Comentario del CMS" },
      en: { commentLabel: "CMS comment" },
      pt: { commentLabel: "Comentário do CMS" },
    };

    expect(resolveFeedbackCopy(translations, "en", "commentLabel")).toBe(
      "CMS comment",
    );
    expect(resolveFeedbackCopy(translations, "en", "commentPlaceholder")).toBe(
      "Write your comment",
    );
    expect(resolveFeedbackCopy(translations, "pt", "commentPlaceholder")).toBe(
      "Escreva seu comentário",
    );
  });

  it("resolves the localized home link label without fallback telemetry", () => {
    const onFallback = vi.fn();

    const translations: FeedbackSurveyCopy = { es: {}, en: {}, pt: {} };

    expect(
      resolveFeedbackCopy(translations, "es", "homeLabel", onFallback),
    ).toBe("Volver al inicio");
    expect(
      resolveFeedbackCopy(translations, "en", "homeLabel", onFallback),
    ).toBe("Back to home");
    expect(
      resolveFeedbackCopy(translations, "pt", "homeLabel", onFallback),
    ).toBe("Voltar ao início");
    expect(onFallback).not.toHaveBeenCalled();
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
