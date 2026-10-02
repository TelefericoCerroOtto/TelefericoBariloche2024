import type {
  FeedbackLocale,
  FeedbackRating,
  FeedbackSentiment,
} from "@/types/api/feedback";

export type FeedbackStage =
  | "overall"
  | "aspects"
  | "sentiments"
  | "comment"
  | "verification"
  | "success";

export type FeedbackSurveyCopy = Readonly<
  Record<FeedbackLocale, Readonly<Record<string, string>>>
>;

export type FeedbackFormState = {
  readonly stage: FeedbackStage;
  readonly overallRating: FeedbackRating | null;
  readonly selectedAspectKeys: readonly string[];
  readonly sentiments: Readonly<Record<string, FeedbackSentiment>>;
  readonly otherText: string;
  readonly comment: string;
};

export type FeedbackStageValidation =
  | { readonly valid: true }
  | {
      readonly valid: false;
      readonly focusId: string;
      readonly messageKey:
        | "ratingRequired"
        | "aspectsRequired"
        | "aspectsLimit"
        | "otherRequired"
        | "otherTooLong"
        | "sentimentsRequired"
        | "commentTooLong";
    };

const UI_ONLY_COPY: Readonly<
  Record<FeedbackLocale, Readonly<Record<string, string>>>
> = {
  es: {
    languageControlLabel: "Idioma de la encuesta",
    loadingFallback: "Cargando la encuesta…",
    loadingError:
      "No se pudo cargar la encuesta. Intente nuevamente más tarde.",
    sessionExpired: "La sesión de esta encuesta venció.",
    retry: "Reintentar",
    ratingSelection: "Seleccionaste {rating} de 5 estrellas.",
    skipToQuestion: "Saltar a la pregunta",
    otherAspectPlaceholder: "Describa el aspecto",
    sentimentNegative: "Negativo",
    sentimentNeutral: "Neutral",
    sentimentPositive: "Positivo",
    commentPlaceholder: "Escriba su comentario",
    commentLimit: "{count}/2000",
    aspectsLimit: "Seleccione hasta tres aspectos.",
    aspectSelectionCount: "Seleccionó {selected} de {maximum} aspectos.",
    otherTooLong: "El aspecto no puede superar los 300 caracteres.",
    commentTooLong: "El comentario no puede superar los 2000 caracteres.",
    homeLabel: "Volver al inicio",
  },
  en: {
    languageControlLabel: "Survey language",
    loadingFallback: "Loading the survey…",
    loadingError: "The survey could not be loaded. Please try again later.",
    sessionExpired: "This survey session has expired.",
    retry: "Try again",
    ratingSelection: "You selected {rating} of 5 stars.",
    skipToQuestion: "Skip to question",
    otherAspectPlaceholder: "Describe the aspect",
    sentimentNegative: "Negative",
    sentimentNeutral: "Neutral",
    sentimentPositive: "Positive",
    commentPlaceholder: "Write your comment",
    commentLimit: "{count}/2000",
    aspectsLimit: "Select up to three aspects.",
    aspectSelectionCount: "{selected} of {maximum} aspects selected.",
    otherTooLong: "The aspect cannot exceed 300 characters.",
    commentTooLong: "The comment cannot exceed 2,000 characters.",
    homeLabel: "Back to home",
  },
  pt: {
    languageControlLabel: "Idioma da pesquisa",
    loadingFallback: "Carregando a pesquisa…",
    loadingError:
      "Não foi possível carregar a pesquisa. Tente novamente mais tarde.",
    sessionExpired: "A sessão desta pesquisa expirou.",
    retry: "Tentar novamente",
    ratingSelection: "Você selecionou {rating} de 5 estrelas.",
    skipToQuestion: "Pular para a pergunta",
    otherAspectPlaceholder: "Descreva o aspecto",
    sentimentNegative: "Negativo",
    sentimentNeutral: "Neutro",
    sentimentPositive: "Positivo",
    commentPlaceholder: "Escreva seu comentário",
    commentLimit: "{count}/2000",
    aspectsLimit: "Selecione até três aspectos.",
    aspectSelectionCount: "Você selecionou {selected} de {maximum} aspectos.",
    otherTooLong: "O aspecto não pode ultrapassar 300 caracteres.",
    commentTooLong: "O comentário não pode ultrapassar 2.000 caracteres.",
    homeLabel: "Voltar ao início",
  },
};

export function createInitialFeedbackState(): FeedbackFormState {
  return {
    stage: "overall",
    overallRating: null,
    selectedAspectKeys: [],
    sentiments: {},
    otherText: "",
    comment: "",
  };
}

export function resolveFeedbackCopy(
  translations: FeedbackSurveyCopy,
  locale: FeedbackLocale,
  key: string,
  onFallback?: (_locale: FeedbackLocale, _key: string) => void,
): string {
  const localized = translations[locale]?.[key];
  if (localized) return localized;

  const uiOnly = UI_ONLY_COPY[locale][key];
  if (uiOnly) return uiOnly;

  onFallback?.(locale, key);
  return translations.es?.[key] ?? UI_ONLY_COPY.es[key] ?? key;
}

export function validateFeedbackStage(
  stage: FeedbackStage,
  state: FeedbackFormState,
  selectedAspectKeys: readonly string[],
  availableAspectKeys: readonly string[] = [],
): FeedbackStageValidation {
  if (stage === "overall" && state.overallRating === null) {
    return {
      valid: false,
      focusId: "overall-rating-1",
      messageKey: "ratingRequired",
    };
  }

  if (stage === "aspects") {
    if (selectedAspectKeys.length === 0) {
      return {
        valid: false,
        focusId: `aspect-${availableAspectKeys[0] ?? "other"}`,
        messageKey: "aspectsRequired",
      };
    }
    if (selectedAspectKeys.length > 3) {
      return {
        valid: false,
        focusId: `aspect-${
          selectedAspectKeys.find(
            (key) => key === "other" || availableAspectKeys.includes(key),
          ) ??
          availableAspectKeys[0] ??
          "other"
        }`,
        messageKey: "aspectsLimit",
      };
    }
    if (
      selectedAspectKeys.includes("other") &&
      state.otherText.trim().length === 0
    ) {
      return {
        valid: false,
        focusId: "other-aspect-input",
        messageKey: "otherRequired",
      };
    }
    if (selectedAspectKeys.includes("other") && state.otherText.length > 300) {
      return {
        valid: false,
        focusId: "other-aspect-input",
        messageKey: "otherTooLong",
      };
    }
  }

  if (stage === "sentiments") {
    const missingAspect = selectedAspectKeys.find(
      (aspectKey) => !state.sentiments[aspectKey],
    );
    if (missingAspect) {
      return {
        valid: false,
        focusId: `sentiment-${missingAspect}-negative`,
        messageKey: "sentimentsRequired",
      };
    }
  }

  if (stage === "comment" && state.comment.length > 2000) {
    return {
      valid: false,
      focusId: "feedback-comment",
      messageKey: "commentTooLong",
    };
  }

  return { valid: true };
}

export function isAuthoritativeReceipt(value: unknown): value is {
  readonly submissionReceipt: string;
  readonly acceptedAt: string;
  readonly guardUntil: string;
} {
  if (!value || typeof value !== "object") return false;

  const receipt = value as Record<string, unknown>;
  const submissionReceipt = receipt.submissionReceipt;
  const acceptedAt = receipt.acceptedAt;
  const guardUntil = receipt.guardUntil;

  if (
    typeof submissionReceipt !== "string" ||
    submissionReceipt.trim().length === 0 ||
    typeof acceptedAt !== "string" ||
    typeof guardUntil !== "string"
  ) {
    return false;
  }

  const acceptedAtMs = Date.parse(acceptedAt);
  const guardUntilMs = Date.parse(guardUntil);
  return (
    Number.isFinite(acceptedAtMs) &&
    Number.isFinite(guardUntilMs) &&
    guardUntilMs > acceptedAtMs
  );
}

export function formatFeedbackCopy(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? `{${key}}`),
  );
}
