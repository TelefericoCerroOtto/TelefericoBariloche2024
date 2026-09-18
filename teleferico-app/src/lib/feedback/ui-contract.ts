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
        | "otherAspectRequired"
        | "sentimentsRequired"
        | "commentTooLong";
    };

const DEFAULT_SPANISH_COPY: Readonly<Record<string, string>> = {
  headerTitle: "Contanos cómo fue tu experiencia",
  loadingStatus: "Cargando la encuesta…",
  loadingError: "No pudimos cargar la encuesta. Intentá nuevamente más tarde.",
  localeLabel: "Idioma",
  localeEs: "ES",
  localeEn: "EN",
  localePt: "PT",
  progressLabel: "Pregunta {current} de {total}",
  overallQuestion: "¿Cómo fue tu experiencia general?",
  aspectsQuestion: "¿Qué aspectos querés destacar?",
  aspectsHint: "Podés elegir hasta tres opciones.",
  otherAspectLabel: "Otro",
  otherAspectPlaceholder: "Contanos cuál",
  sentimentsQuestion: "¿Cómo calificarías cada aspecto?",
  sentimentNegative: "Negativo",
  sentimentNeutral: "Neutral",
  sentimentPositive: "Positivo",
  commentQuestion: "¿Querés agregar un comentario?",
  commentHint: "No compartas datos personales.",
  commentPlaceholder: "Escribí tu comentario",
  commentLimit: "{count}/2000",
  verificationTitle: "Antes de enviar",
  verificationHint: "Completá la verificación para proteger este canal.",
  privacyNotice:
    "Usamos tu respuesta para mejorar la experiencia. No guardamos datos personales en esta encuesta.",
  back: "Atrás",
  next: "Continuar",
  submit: "Enviar respuesta",
  ratingRequired: "Elegí una calificación para continuar.",
  aspectsRequired: "Elegí al menos un aspecto para continuar.",
  aspectsLimit: "Elegí hasta tres aspectos.",
  otherAspectRequired: "Describí el aspecto que elegiste.",
  sentimentsRequired: "Elegí una valoración para cada aspecto.",
  commentTooLong: "El comentario no puede superar los 2000 caracteres.",
  submissionError:
    "No pudimos enviar tu respuesta. Revisá los datos e intentá nuevamente.",
  successTitle: "¡Gracias por compartir tu experiencia!",
  successBody: "Tu respuesta fue recibida correctamente.",
  reset: "Enviar otra respuesta",
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

  onFallback?.(locale, key);
  return translations.es?.[key] ?? DEFAULT_SPANISH_COPY[key] ?? key;
}

export function validateFeedbackStage(
  stage: FeedbackStage,
  state: FeedbackFormState,
  selectedAspectKeys: readonly string[],
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
        focusId: "aspect-views",
        messageKey: "aspectsRequired",
      };
    }
    if (selectedAspectKeys.length > 3) {
      return {
        valid: false,
        focusId: "aspect-views",
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
        messageKey: "otherAspectRequired",
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
