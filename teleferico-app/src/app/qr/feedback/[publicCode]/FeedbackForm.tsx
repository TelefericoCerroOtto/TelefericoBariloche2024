"use client";

import ReCAPTCHA from "react-google-recaptcha";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FeedbackAspectDefinition,
  FeedbackLocale,
} from "@/types/api/feedback";
import {
  createInitialFeedbackState,
  formatFeedbackCopy,
  isAuthoritativeReceipt,
  resolveFeedbackCopy,
  validateFeedbackStage,
  type FeedbackFormState,
  type FeedbackStage,
  type FeedbackSurveyCopy,
} from "@/lib/feedback/ui-contract";
import {
  createFeedbackDraftKey,
  createFeedbackDraftStore,
  type FeedbackDraft,
} from "@/lib/feedback/draft";

type PublicSurveyPayload = {
  readonly contractVersion: "feedback-public.v1";
  readonly point: { readonly pointKey: string; readonly displayName: string };
  readonly survey: {
    readonly versionKey: string;
    readonly translations: Readonly<Record<FeedbackLocale, unknown>>;
    readonly aspects: readonly FeedbackAspectDefinition[];
  };
  readonly sessionToken: string;
  readonly expiresAt: string;
};

type Props = { readonly publicCode: string };

const STAGE_PROGRESS: Readonly<Record<FeedbackStage, number>> = {
  overall: 1,
  aspects: 2,
  sentiments: 3,
  comment: 4,
  verification: 4,
  success: 4,
};

const FEEDBACK_TOTAL = 4;
const BROWSER_CONTEXT_KEY = "tb113-feedback-browser-context";

export default function FeedbackForm({ publicCode }: Props) {
  const [survey, setSurvey] = useState<PublicSurveyPayload | null>(null);
  const [translations, setTranslations] = useState<FeedbackSurveyCopy>({
    es: {},
    en: {},
    pt: {},
  });
  const [locale, setLocale] = useState<FeedbackLocale>("es");
  const [state, setState] = useState<FeedbackFormState>(
    createInitialFeedbackState,
  );
  const [submissionReceipt, setSubmissionReceipt] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [status, setStatus] = useState<
    "loading" | "ready" | "submitting" | "error" | "success"
  >("loading");
  const [statusKey, setStatusKey] = useState<string>("loadingStatus");
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const fallbackKeys = useRef(new Set<string>());
  const formLoadedAt = useRef(Date.now());
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const t = (
    key: string,
    values?: Readonly<Record<string, string | number>>,
  ) => {
    const value = resolveFeedbackCopy(
      translations,
      locale,
      key,
      (missingLocale, missingKey) => {
        const fallbackKey = `${missingLocale}:${missingKey}`;
        if (fallbackKeys.current.has(fallbackKey)) return;
        fallbackKeys.current.add(fallbackKey);
        console.info("feedback_copy_fallback", {
          locale: missingLocale,
          key: missingKey,
        });
      },
    );
    return values ? formatFeedbackCopy(value, values) : value;
  };

  function recordAspectFallback(
    aspectKey: string,
    missingLocale: FeedbackLocale,
  ) {
    const fallbackKey = `${missingLocale}:aspect:${aspectKey}`;
    if (fallbackKeys.current.has(fallbackKey)) return;
    fallbackKeys.current.add(fallbackKey);
    console.info("feedback_copy_fallback", {
      locale: missingLocale,
      key: `aspect:${aspectKey}`,
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSurvey() {
      setStatus("loading");
      try {
        const response = await fetch(
          `/api/feedback/surveys/${encodeURIComponent(publicCode)}`,
          {
            cache: "no-store",
          },
        );
        const payload: unknown = await response.json();
        if (!response.ok || !isPublicSurveyPayload(payload)) {
          throw new Error("survey-unavailable");
        }
        if (cancelled) return;

        const normalizedTranslations = normalizeTranslations(
          payload.survey.translations,
        );
        const browserContext = getBrowserContext();
        const nextDraftKey = createFeedbackDraftKey(
          payload.survey.versionKey,
          payload.point.pointKey,
          browserContext,
        );
        const expiresAt = Date.parse(payload.expiresAt);
        const store = createFeedbackDraftStore(window.localStorage);
        const draft = store.read(nextDraftKey);
        const nextState = draft
          ? draftToState(draft)
          : createInitialFeedbackState();

        setSurvey(payload);
        setTranslations(normalizedTranslations);
        setDraftKey(nextDraftKey);
        setState(nextState);
        setLocale(draft?.locale ?? "es");
        setHydratedDraft(true);
        setStatus("ready");
        formLoadedAt.current = Date.now();

        if (expiryTimer.current) clearTimeout(expiryTimer.current);
        if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
          expiryTimer.current = setTimeout(() => {
            store.remove(nextDraftKey);
            setStatus("error");
            setStatusKey("loadingError");
          }, expiresAt - Date.now());
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setStatusKey("loadingError");
        }
      }
    }

    void loadSurvey();
    return () => {
      cancelled = true;
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
    };
  }, [publicCode]);

  useEffect(() => {
    if (!draftKey || !survey || !hydratedDraft || status === "success") return;
    const draft: FeedbackDraft = {
      locale,
      stage: state.stage,
      overallRating: state.overallRating,
      selectedAspectKeys: state.selectedAspectKeys,
      sentiments: state.sentiments,
      otherText: state.otherText,
      comment: state.comment,
      savedAt: Date.now(),
      expiresAt: Date.parse(survey.expiresAt),
    };
    createFeedbackDraftStore(window.localStorage).save(draftKey, draft);
  }, [draftKey, hydratedDraft, locale, state, status, survey]);

  const aspects = useMemo(
    () =>
      [...(survey?.survey.aspects ?? [])]
        .filter((aspect) => aspect.aspectKey !== "other")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [survey],
  );
  const selectedAspects = state.selectedAspectKeys
    .map((key) => aspects.find((aspect) => aspect.aspectKey === key))
    .filter((aspect): aspect is FeedbackAspectDefinition => Boolean(aspect));

  if (status === "loading") {
    return (
      <FeedbackShell>
        <p role="status">{t("loadingStatus")}</p>
      </FeedbackShell>
    );
  }

  if (status === "error" || !survey) {
    return (
      <FeedbackShell>
        <p role="alert">{t(statusKey)}</p>
      </FeedbackShell>
    );
  }

  if (status === "success") {
    return (
      <FeedbackShell>
        <section
          aria-labelledby="feedback-success-title"
          className="space-y-4 text-center"
        >
          <h1
            id="feedback-success-title"
            className="text-3xl font-semibold text-slate-950"
          >
            {t("successTitle")}
          </h1>
          <p className="text-base text-slate-700">{t("successBody")}</p>
          {submissionReceipt && (
            <p className="text-sm text-slate-700">
              <span>{t("receiptLabel")} </span>
              <span>{submissionReceipt}</span>
            </p>
          )}
          <button
            type="button"
            className="feedback-button feedback-button-secondary"
            onClick={() => {
              setState(createInitialFeedbackState());
              setSubmissionReceipt(null);
              setCaptchaToken(null);
              setIdempotencyKey(createIdempotencyKey());
              setStatus("ready");
              setStatusKey("");
            }}
          >
            {t("reset")}
          </button>
        </section>
      </FeedbackShell>
    );
  }

  const currentProgress = STAGE_PROGRESS[state.stage];

  function updateState(patch: Partial<FeedbackFormState>) {
    setState((previous) => ({ ...previous, ...patch }));
    setStatusKey("");
  }

  function validateCurrentStage(): boolean {
    const result = validateFeedbackStage(
      state.stage,
      state,
      state.selectedAspectKeys,
      [...aspects.map(({ aspectKey }) => aspectKey), "other"],
    );
    if (result.valid) return true;
    setStatusKey(result.messageKey);
    requestAnimationFrame(() =>
      document.getElementById(result.focusId)?.focus(),
    );
    return false;
  }

  function goNext() {
    if (!validateCurrentStage()) return;
    const nextStage: Readonly<Record<FeedbackStage, FeedbackStage>> = {
      overall: "aspects",
      aspects: "sentiments",
      sentiments: "comment",
      comment: "verification",
      verification: "verification",
      success: "success",
    };
    updateState({ stage: nextStage[state.stage] });
  }

  function goBack() {
    const previousStage: Readonly<Record<FeedbackStage, FeedbackStage>> = {
      overall: "overall",
      aspects: "overall",
      sentiments: "aspects",
      comment: "sentiments",
      verification: "comment",
      success: "success",
    };
    updateState({ stage: previousStage[state.stage] });
  }

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !survey ||
      status === "submitting" ||
      !captchaToken ||
      !validateCurrentStage()
    )
      return;

    setStatus("submitting");
    try {
      const response = await fetch("/api/feedback/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractVersion: survey.contractVersion,
          sessionToken: survey.sessionToken,
          idempotencyKey,
          locale,
          overallRating: state.overallRating,
          aspects: state.selectedAspectKeys
            .filter((aspectKey) => aspectKey !== "other")
            .map((aspectKey) => ({
              aspectKey,
              rating: state.sentiments[aspectKey],
            })),
          ...(state.selectedAspectKeys.includes("other")
            ? {
                otherAspect: {
                  customText: state.otherText.trim(),
                  rating: state.sentiments.other,
                },
              }
            : {}),
          ...(state.comment.trim() ? { comment: state.comment.trim() } : {}),
          formLoadedAt: formLoadedAt.current,
          website: honeypotRef.current?.value ?? "",
          captchaToken,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isAuthoritativeReceipt(payload))
        throw new Error("submission-failed");

      if (draftKey)
        createFeedbackDraftStore(window.localStorage).remove(draftKey);
      setSubmissionReceipt(payload.submissionReceipt);
      setStatus("success");
      setState((previous) => ({ ...previous, stage: "success" }));
    } catch {
      setStatus("ready");
      setStatusKey("submissionError");
    }
  }

  return (
    <FeedbackShell>
      <header className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-800">
              {survey.point.displayName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {t("headerTitle")}
            </h1>
          </div>
          <div
            className="flex items-center gap-1"
            aria-label={t("localeLabel")}
          >
            {(["es", "en", "pt"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={locale === option}
                className="rounded-full px-2 py-1 text-xs font-semibold text-slate-700 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-800 aria-pressed:bg-slate-950 aria-pressed:text-white"
                onClick={() => setLocale(option)}
              >
                {t(
                  `locale${option === "es" ? "Es" : option === "en" ? "En" : "Pt"}`,
                )}
              </button>
            ))}
          </div>
        </div>
        <div
          aria-label={t("progressLabel", {
            current: currentProgress,
            total: FEEDBACK_TOTAL,
          })}
        >
          <div className="flex justify-between text-sm text-slate-600">
            <span>
              {t("progressLabel", {
                current: currentProgress,
                total: FEEDBACK_TOTAL,
              })}
            </span>
            <span aria-hidden="true">
              {currentProgress}/{FEEDBACK_TOTAL}
            </span>
          </div>
          <div
            className="mt-2 h-2 rounded-full bg-slate-200"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={FEEDBACK_TOTAL}
            aria-valuenow={currentProgress}
          >
            <div
              className="h-full rounded-full bg-red-800 transition-[width]"
              style={{ width: `${(currentProgress / FEEDBACK_TOTAL) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <form className="mt-8 space-y-7" onSubmit={submitFeedback} noValidate>
        <p
          className="min-h-6 text-sm text-red-800"
          role="status"
          aria-live="polite"
        >
          {statusKey ? t(statusKey) : ""}
        </p>
        {state.stage === "overall" && (
          <section aria-labelledby="overall-question">
            <h2 id="overall-question" className="feedback-question">
              {t("overallQuestion")}
            </h2>
            <div
              className="mt-4 flex flex-wrap gap-3"
              role="radiogroup"
              aria-label={t("overallQuestion")}
            >
              {([1, 2, 3, 4, 5] as const).map((rating) => (
                <label key={rating} className="feedback-choice feedback-rating">
                  <input
                    id={`overall-rating-${rating}`}
                    type="radio"
                    name="overall-rating"
                    value={rating}
                    checked={state.overallRating === rating}
                    onChange={() => updateState({ overallRating: rating })}
                  />
                  <span>{rating}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {state.stage === "aspects" && (
          <section aria-labelledby="aspects-question">
            <h2 id="aspects-question" className="feedback-question">
              {t("aspectsQuestion")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{t("aspectsHint")}</p>
            <div className="mt-4 grid gap-3">
              {aspects.map((aspect) => {
                const selected = state.selectedAspectKeys.includes(
                  aspect.aspectKey,
                );
                const label = resolveAspectLabel(
                  aspect,
                  locale,
                  (missingLocale) =>
                    recordAspectFallback(aspect.aspectKey, missingLocale),
                );
                return (
                  <label
                    key={aspect.aspectKey}
                    className="feedback-check-choice"
                  >
                    <input
                      id={`aspect-${aspect.aspectKey}`}
                      type="checkbox"
                      name="aspects"
                      checked={selected}
                      disabled={
                        !selected && state.selectedAspectKeys.length >= 3
                      }
                      onChange={() => {
                        const next = selected
                          ? state.selectedAspectKeys.filter(
                              (key) => key !== aspect.aspectKey,
                            )
                          : [...state.selectedAspectKeys, aspect.aspectKey];
                        updateState({ selectedAspectKeys: next });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
              <label className="feedback-check-choice">
                <input
                  id="aspect-other"
                  type="checkbox"
                  name="aspects"
                  checked={state.selectedAspectKeys.includes("other")}
                  disabled={
                    !state.selectedAspectKeys.includes("other") &&
                    state.selectedAspectKeys.length >= 3
                  }
                  onChange={() => {
                    const selected = state.selectedAspectKeys.includes("other");
                    updateState({
                      selectedAspectKeys: selected
                        ? state.selectedAspectKeys.filter(
                            (key) => key !== "other",
                          )
                        : [...state.selectedAspectKeys, "other"],
                    });
                  }}
                />
                <span>{t("otherAspectLabel")}</span>
              </label>
            </div>
            {state.selectedAspectKeys.includes("other") && (
              <label
                className="mt-4 block text-sm font-medium text-slate-800"
                htmlFor="other-aspect-input"
              >
                {t("otherAspectLabel")}
                <input
                  id="other-aspect-input"
                  value={state.otherText}
                  onChange={(event) =>
                    updateState({ otherText: event.target.value })
                  }
                  placeholder={t("otherAspectPlaceholder")}
                  className="feedback-input mt-2"
                />
              </label>
            )}
          </section>
        )}

        {state.stage === "sentiments" && (
          <section aria-labelledby="sentiments-question">
            <h2 id="sentiments-question" className="feedback-question">
              {t("sentimentsQuestion")}
            </h2>
            <div className="mt-5 space-y-5">
              {selectedAspects.map((aspect) => (
                <fieldset key={aspect.aspectKey} className="space-y-2">
                  <legend className="font-medium text-slate-900">
                    {resolveAspectLabel(aspect, locale, (missingLocale) =>
                      recordAspectFallback(aspect.aspectKey, missingLocale),
                    )}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(["negative", "neutral", "positive"] as const).map(
                      (sentiment) => (
                        <label
                          key={sentiment}
                          className="feedback-choice feedback-sentiment"
                        >
                          <input
                            id={`sentiment-${aspect.aspectKey}-${sentiment}`}
                            type="radio"
                            name={`sentiment-${aspect.aspectKey}`}
                            checked={
                              state.sentiments[aspect.aspectKey] === sentiment
                            }
                            onChange={() =>
                              updateState({
                                sentiments: {
                                  ...state.sentiments,
                                  [aspect.aspectKey]: sentiment,
                                },
                              })
                            }
                          />
                          <span>
                            {t(
                              `sentiment${sentiment === "negative" ? "Negative" : sentiment === "neutral" ? "Neutral" : "Positive"}`,
                            )}
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
              ))}
              {state.selectedAspectKeys.includes("other") && (
                <fieldset className="space-y-2">
                  <legend className="font-medium text-slate-900">
                    {t("otherAspectLabel")}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(["negative", "neutral", "positive"] as const).map(
                      (sentiment) => (
                        <label
                          key={sentiment}
                          className="feedback-choice feedback-sentiment"
                        >
                          <input
                            id={`sentiment-other-${sentiment}`}
                            type="radio"
                            name="sentiment-other"
                            checked={state.sentiments.other === sentiment}
                            onChange={() =>
                              updateState({
                                sentiments: {
                                  ...state.sentiments,
                                  other: sentiment,
                                },
                              })
                            }
                          />
                          <span>
                            {t(
                              `sentiment${sentiment === "negative" ? "Negative" : sentiment === "neutral" ? "Neutral" : "Positive"}`,
                            )}
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
              )}
            </div>
          </section>
        )}

        {state.stage === "comment" && (
          <section aria-labelledby="comment-question">
            <h2 id="comment-question" className="feedback-question">
              {t("commentQuestion")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{t("commentHint")}</p>
            <textarea
              id="feedback-comment"
              value={state.comment}
              maxLength={2000}
              onChange={(event) => updateState({ comment: event.target.value })}
              placeholder={t("commentPlaceholder")}
              className="feedback-input mt-4 min-h-36 resize-y"
            />
            <p className="mt-2 text-right text-xs text-slate-600">
              {t("commentLimit", { count: state.comment.length })}
            </p>
          </section>
        )}

        {state.stage === "verification" && (
          <section aria-labelledby="verification-title" className="space-y-5">
            <div>
              <h2 id="verification-title" className="feedback-question">
                {t("verificationTitle")}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {t("verificationHint")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ""}
                onChange={setCaptchaToken}
              />
            </div>
            <p className="text-sm leading-6 text-slate-600">
              {t("privacyNotice")}
            </p>
            <input
              ref={honeypotRef}
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-px w-px overflow-hidden"
            />
          </section>
        )}

        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-6">
          {state.stage !== "overall" && (
            <button
              type="button"
              className="feedback-button feedback-button-secondary"
              onClick={goBack}
            >
              {t("back")}
            </button>
          )}
          {state.stage !== "verification" ? (
            <button
              type="button"
              className="feedback-button feedback-button-primary ml-auto"
              onClick={goNext}
            >
              {t("next")}
            </button>
          ) : (
            <button
              type="submit"
              className="feedback-button feedback-button-primary ml-auto"
              disabled={status === "submitting" || !captchaToken}
            >
              {status === "submitting" ? t("loadingStatus") : t("submit")}
            </button>
          )}
        </div>
      </form>
    </FeedbackShell>
  );
}

function FeedbackShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-white px-5 py-8 sm:px-8 sm:py-12">
      {children}
    </main>
  );
}

function isPublicSurveyPayload(value: unknown): value is PublicSurveyPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  const survey = payload.survey;
  const point = payload.point;
  return (
    payload.contractVersion === "feedback-public.v1" &&
    typeof payload.sessionToken === "string" &&
    typeof payload.expiresAt === "string" &&
    Boolean(
      point &&
      typeof point === "object" &&
      typeof (point as Record<string, unknown>).pointKey === "string",
    ) &&
    Boolean(
      survey &&
      typeof survey === "object" &&
      typeof (survey as Record<string, unknown>).versionKey === "string" &&
      Array.isArray((survey as Record<string, unknown>).aspects),
    )
  );
}

function normalizeTranslations(
  value: Readonly<Record<FeedbackLocale, unknown>>,
): FeedbackSurveyCopy {
  return {
    es: readCopy(value.es),
    en: readCopy(value.en),
    pt: readCopy(value.pt),
  };
}

function readCopy(value: unknown): Readonly<Record<string, string>> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function resolveAspectLabel(
  aspect: FeedbackAspectDefinition,
  locale: FeedbackLocale,
  onFallback?: (_missingLocale: FeedbackLocale) => void,
): string {
  const selected = aspect.labels[locale];
  if (selected) return selected;
  onFallback?.(locale);
  return aspect.labels.es || aspect.aspectKey;
}

function draftToState(draft: FeedbackDraft): FeedbackFormState {
  return {
    stage: draft.stage,
    overallRating: draft.overallRating,
    selectedAspectKeys: draft.selectedAspectKeys,
    sentiments: draft.sentiments,
    otherText: draft.otherText,
    comment: draft.comment,
  };
}

function getBrowserContext(): string {
  const existing = window.localStorage.getItem(BROWSER_CONTEXT_KEY);
  if (existing) return existing;
  const generated =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(BROWSER_CONTEXT_KEY, generated);
  return generated;
}

function createIdempotencyKey(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
