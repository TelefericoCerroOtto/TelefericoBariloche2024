"use client";

import ReCAPTCHA from "react-google-recaptcha";
import Image from "next/image";
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
import negativeLogo from "@/public/logo-negativo.svg";

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
const HOME_PATHS: Readonly<Record<FeedbackLocale, string>> = {
  es: "/es-AR",
  en: "/en",
  pt: "/pt",
};

export default function FeedbackForm({ publicCode }: Props) {
  const [survey, setSurvey] = useState<PublicSurveyPayload | null>(null);
  const [translations, setTranslations] = useState<FeedbackSurveyCopy>({
    es: {},
    en: {},
    pt: {},
  });
  const [locale, setLocale] = useState<FeedbackLocale>("es");
  const requestedLocaleRef = useRef<FeedbackLocale>("es");
  const hasExplicitLocaleChoiceRef = useRef(false);
  const [state, setState] = useState<FeedbackFormState>(
    createInitialFeedbackState,
  );
  const [hoverRating, setHoverRating] = useState(0);
  const [submissionReceipt, setSubmissionReceipt] = useState<string | null>(
    null,
  );
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [status, setStatus] = useState<
    "loading" | "ready" | "submitting" | "error" | "success"
  >("loading");
  const [statusKey, setStatusKey] = useState<string>("loadingStatus");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [draftExpired, setDraftExpired] = useState(false);
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const fallbackKeys = useRef(new Set<string>());
  const formLoadedAt = useRef(Date.now());
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftExpiredRef = useRef(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const stageScrollRef = useRef<HTMLDivElement>(null);
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStageRef = useRef<FeedbackStage>(state.stage);

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

  function expireFeedbackSession(activeDraftKey = draftKey) {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
    draftExpiredRef.current = true;
    setDraftExpired(true);
    if (activeDraftKey) {
      createFeedbackDraftStore(window.localStorage).remove(activeDraftKey);
    }
    setStatus("error");
    setStatusKey("sessionExpired");
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
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          expireFeedbackSession(nextDraftKey);
          return;
        }
        const store = createFeedbackDraftStore(window.localStorage);
        const draft = store.read(nextDraftKey);
        const nextState = draft
          ? draftToState(draft)
          : createInitialFeedbackState();

        setSurvey(payload);
        setTranslations(normalizedTranslations);
        setDraftKey(nextDraftKey);
        setState(nextState);
        draftExpiredRef.current = false;
        setDraftExpired(false);
        const nextLocale = hasExplicitLocaleChoiceRef.current
          ? requestedLocaleRef.current
          : (draft?.locale ?? requestedLocaleRef.current);
        requestedLocaleRef.current = nextLocale;
        setLocale(nextLocale);
        setHydratedDraft(true);
        setStatus("ready");
        formLoadedAt.current = Date.now();

        if (expiryTimer.current) clearTimeout(expiryTimer.current);
        if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
          expiryTimer.current = setTimeout(() => {
            expireFeedbackSession(nextDraftKey);
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
  }, [loadAttempt, publicCode]);

  useEffect(() => {
    if (
      !draftKey ||
      !survey ||
      !hydratedDraft ||
      status === "success" ||
      draftExpired ||
      draftExpiredRef.current
    )
      return;
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
  }, [draftExpired, draftKey, hydratedDraft, locale, state, status, survey]);

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

  useEffect(() => {
    if (previousStageRef.current === state.stage) return;
    previousStageRef.current = state.stage;
    if (stageScrollRef.current) stageScrollRef.current.scrollTop = 0;
    requestAnimationFrame(() =>
      stageHeadingRef.current?.focus({ preventScroll: true }),
    );
  }, [state.stage]);

  if (status === "loading") {
    return (
      <FeedbackShell
        ariaLabel={survey ? t("headerTitle") : t("loadingFallback")}
        locale={locale}
        localeLabel={survey ? t("localeLabel") : t("languageControlLabel")}
        onLocaleChange={changeLocale}
        skipLabel={t("skipToQuestion")}
      >
        <section
          className="feedback-state-viewport"
          id="feedback-stage"
          aria-labelledby="feedback-loading-title"
        >
          <div className="feedback-state-content">
            <span className="feedback-loading-indicator" aria-hidden="true" />
            <h2
              id="feedback-loading-title"
              className="feedback-question"
              role="status"
            >
              {survey ? t("loadingStatus") : t("loadingFallback")}
            </h2>
          </div>
        </section>
      </FeedbackShell>
    );
  }

  if (status === "error" || !survey) {
    return (
      <FeedbackShell
        ariaLabel={survey ? t("headerTitle") : t("loadingError")}
        locale={locale}
        localeLabel={survey ? t("localeLabel") : t("languageControlLabel")}
        onLocaleChange={changeLocale}
        skipLabel={t("skipToQuestion")}
      >
        <section
          className="feedback-state-viewport"
          id="feedback-stage"
          aria-labelledby="feedback-error-title"
        >
          <div className="feedback-state-content">
            <div role="alert">
              <h2 id="feedback-error-title" className="feedback-question">
                {t(statusKey || "loadingError")}
              </h2>
            </div>
            <button
              type="button"
              className="feedback-nav-button feedback-nav-button-primary"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            >
              {t("retry")}
            </button>
          </div>
        </section>
      </FeedbackShell>
    );
  }

  if (status === "success") {
    return (
      <FeedbackShell
        ariaLabel={t("headerTitle")}
        locale={locale}
        localeLabel={t("localeLabel")}
        onLocaleChange={changeLocale}
        skipLabel={t("skipToQuestion")}
      >
        <section
          className="feedback-state-viewport"
          id="feedback-stage"
          aria-labelledby="feedback-success-title"
        >
          <div className="feedback-state-content feedback-success-content">
            <span className="feedback-success-mark" aria-hidden="true">
              ✓
            </span>
            <h2
              id="feedback-success-title"
              className="feedback-question"
              ref={stageHeadingRef}
              tabIndex={-1}
            >
              {t("successTitle")}
            </h2>
            <p className="feedback-stage-intro" role="status">
              {t("successMessage")}
            </p>
            {submissionReceipt && (
              <p className="feedback-receipt">
                <span>{t("receiptLabel")} </span>
                <span>{submissionReceipt}</span>
              </p>
            )}
            <a
              className="feedback-nav-button feedback-nav-button-secondary"
              href={HOME_PATHS[locale]}
            >
              {t("homeLabel")}
            </a>
          </div>
        </section>
      </FeedbackShell>
    );
  }

  const currentProgress = STAGE_PROGRESS[state.stage];

  function updateState(patch: Partial<FeedbackFormState>) {
    setState((previous) => ({ ...previous, ...patch }));
    setStatusKey("");
  }

  function changeLocale(nextLocale: FeedbackLocale) {
    requestedLocaleRef.current = nextLocale;
    hasExplicitLocaleChoiceRef.current = true;
    setLocale(nextLocale);
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

    if (Date.parse(survey.expiresAt) <= Date.now()) {
      expireFeedbackSession();
      return;
    }

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
      if (!response.ok && isExpiredFeedbackSession(payload)) {
        expireFeedbackSession();
        return;
      }
      if (!response.ok || !isAuthoritativeReceipt(payload))
        throw new Error("submission-failed");

      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
      if (draftKey)
        createFeedbackDraftStore(window.localStorage).remove(draftKey);
      setSubmissionReceipt(payload.submissionReceipt);
      setStatus("success");
      setState((previous) => ({ ...previous, stage: "success" }));
    } catch {
      if (
        draftExpiredRef.current ||
        Date.parse(survey.expiresAt) <= Date.now()
      ) {
        expireFeedbackSession();
        return;
      }
      setStatus("ready");
      setStatusKey("genericFailure");
    }
  }

  return (
    <FeedbackShell
      ariaLabel={t("headerTitle")}
      locale={locale}
      localeLabel={t("localeLabel")}
      onLocaleChange={changeLocale}
      skipLabel={t("skipToQuestion")}
    >
      <section
        className="feedback-progress-region"
        aria-label={t("progressLabel", {
          current: currentProgress,
          total: FEEDBACK_TOTAL,
        })}
      >
        <p className="feedback-progress-copy">
          <strong>
            {t("progressLabel", {
              current: currentProgress,
              total: FEEDBACK_TOTAL,
            })}
          </strong>
        </p>
      </section>

      <form className="feedback-form" onSubmit={submitFeedback} noValidate>
        <div className="feedback-stage-viewport">
          <div
            id="feedback-stage"
            className="feedback-stage-scroll"
            ref={stageScrollRef}
            tabIndex={-1}
          >
            <div className="feedback-stage-content">
              <p className="feedback-status" role="status" aria-live="polite">
                {statusKey ? t(statusKey) : ""}
              </p>
              {state.stage === "overall" && (
                <section aria-labelledby="overall-question">
                  <h2
                    id="overall-question"
                    className="feedback-question"
                    ref={stageHeadingRef}
                    tabIndex={-1}
                  >
                    {t("overallQuestion")}
                  </h2>
                  <p className="feedback-stage-intro">
                    {t("overallInstruction")}
                  </p>
                  <fieldset
                    className="feedback-star-fieldset"
                    onBlur={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node,
                        )
                      )
                        setHoverRating(0);
                    }}
                  >
                    <legend className="sr-only">{t("overallQuestion")}</legend>
                    <div
                      className="feedback-star-group"
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      {([1, 2, 3, 4, 5] as const).map((rating) => (
                        <label
                          key={rating}
                          className="feedback-star-choice"
                          data-filled={Boolean(
                            (hoverRating || state.overallRating || 0) >= rating,
                          )}
                          onMouseEnter={() => setHoverRating(rating)}
                          onFocus={() => setHoverRating(rating)}
                        >
                          <input
                            id={`overall-rating-${rating}`}
                            type="radio"
                            name="overall-rating"
                            value={rating}
                            checked={state.overallRating === rating}
                            onChange={() => {
                              updateState({ overallRating: rating });
                              setHoverRating(0);
                            }}
                          />
                          <span aria-hidden="true">★</span>
                          <span className="sr-only">{rating}</span>
                        </label>
                      ))}
                    </div>
                    <p className="feedback-selection-summary" role="status">
                      {state.overallRating
                        ? formatFeedbackCopy(t("ratingSelection"), {
                            rating: state.overallRating,
                          })
                        : ""}
                    </p>
                  </fieldset>
                </section>
              )}

              {state.stage === "aspects" && (
                <section aria-labelledby="aspects-question">
                  <h2
                    id="aspects-question"
                    className="feedback-question"
                    ref={stageHeadingRef}
                    tabIndex={-1}
                  >
                    {t("aspectsQuestion")}
                  </h2>
                  <p className="feedback-stage-intro">
                    {t("aspectsInstruction")}
                  </p>
                  <div className="feedback-aspect-toolbar">
                    <p role="status" aria-live="polite">
                      {formatFeedbackCopy(t("aspectSelectionCount"), {
                        selected: state.selectedAspectKeys.length,
                        maximum: 3,
                      })}
                    </p>
                  </div>
                  <div className="feedback-aspect-list mt-4">
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
                                : [
                                    ...state.selectedAspectKeys,
                                    aspect.aspectKey,
                                  ];
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
                          const selected =
                            state.selectedAspectKeys.includes("other");
                          updateState({
                            selectedAspectKeys: selected
                              ? state.selectedAspectKeys.filter(
                                  (key) => key !== "other",
                                )
                              : [...state.selectedAspectKeys, "other"],
                          });
                        }}
                      />
                      <span>{t("otherLabel")}</span>
                    </label>
                  </div>
                  {state.selectedAspectKeys.includes("other") && (
                    <label
                      className="mt-4 block text-sm font-medium text-white"
                      htmlFor="other-aspect-input"
                    >
                      {t("otherLabel")}
                      <input
                        id="other-aspect-input"
                        value={state.otherText}
                        maxLength={300}
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
                  <h2
                    id="sentiments-question"
                    className="feedback-question"
                    ref={stageHeadingRef}
                    tabIndex={-1}
                  >
                    {t("sentimentQuestion")}
                  </h2>
                  <p className="feedback-stage-intro">
                    {t("sentimentInstruction")}
                  </p>
                  <div className="feedback-sentiment-list mt-5">
                    {selectedAspects.map((aspect) => (
                      <fieldset
                        key={aspect.aspectKey}
                        className="feedback-sentiment-card"
                      >
                        <legend className="font-medium text-slate-900">
                          {resolveAspectLabel(aspect, locale, (missingLocale) =>
                            recordAspectFallback(
                              aspect.aspectKey,
                              missingLocale,
                            ),
                          )}
                        </legend>
                        <div className="feedback-sentiment-options">
                          {(["negative", "neutral", "positive"] as const).map(
                            (sentiment) => (
                              <label
                                key={sentiment}
                                className="feedback-sentiment-choice"
                              >
                                <input
                                  id={`sentiment-${aspect.aspectKey}-${sentiment}`}
                                  type="radio"
                                  name={`sentiment-${aspect.aspectKey}`}
                                  checked={
                                    state.sentiments[aspect.aspectKey] ===
                                    sentiment
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
                                  <span aria-hidden="true">
                                    {sentiment === "negative"
                                      ? "👎"
                                      : sentiment === "neutral"
                                        ? "😐"
                                        : "👍"}
                                  </span>
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
                      <fieldset className="feedback-sentiment-card">
                        <legend className="font-medium text-slate-900">
                          {t("otherLabel")}
                        </legend>
                        <div className="feedback-sentiment-options">
                          {(["negative", "neutral", "positive"] as const).map(
                            (sentiment) => (
                              <label
                                key={sentiment}
                                className="feedback-sentiment-choice"
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
                                  <span aria-hidden="true">
                                    {sentiment === "negative"
                                      ? "👎"
                                      : sentiment === "neutral"
                                        ? "😐"
                                        : "👍"}
                                  </span>
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
                  <h2
                    id="comment-question"
                    className="feedback-question"
                    ref={stageHeadingRef}
                    tabIndex={-1}
                  >
                    {t("commentQuestion")}
                  </h2>
                  <p
                    id="feedback-comment-instruction"
                    className="feedback-stage-intro"
                  >
                    {t("commentInstruction")}
                  </p>
                  <div className="feedback-comment-card">
                    <label htmlFor="feedback-comment">
                      {t("commentLabel")}
                    </label>
                    <textarea
                      id="feedback-comment"
                      value={state.comment}
                      maxLength={2000}
                      aria-describedby="feedback-comment-instruction feedback-comment-warning feedback-comment-limit"
                      onChange={(event) =>
                        updateState({ comment: event.target.value })
                      }
                      placeholder={t("commentPlaceholder")}
                      className="feedback-input"
                    />
                  </div>
                  <p
                    id="feedback-comment-warning"
                    className="feedback-stage-intro"
                  >
                    {t("personalDataWarning")}
                  </p>
                  <p
                    id="feedback-comment-limit"
                    className="feedback-comment-limit"
                    role="status"
                    aria-live="polite"
                  >
                    {t("commentLimit", { count: state.comment.length })}
                  </p>
                </section>
              )}

              {state.stage === "verification" && (
                <section
                  aria-labelledby="verification-title"
                  className="space-y-5"
                >
                  <div>
                    <h2
                      id="verification-title"
                      className="feedback-question"
                      ref={stageHeadingRef}
                      tabIndex={-1}
                    >
                      {t("verificationTitle")}
                    </h2>
                    <p className="feedback-stage-intro">
                      {t("verificationInstruction")}
                    </p>
                  </div>
                  <div className="feedback-verification-panel">
                    <ReCAPTCHA
                      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ""}
                      onChange={setCaptchaToken}
                    />
                  </div>
                  <p className="feedback-stage-intro">{t("privacyNotice")}</p>
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
            </div>
          </div>
        </div>
        <footer className="feedback-form-footer">
          <div className="feedback-footer-inner">
            {state.stage !== "overall" && (
              <button
                type="button"
                className="feedback-nav-button feedback-nav-button-secondary"
                onClick={goBack}
              >
                {t("backLabel")}
              </button>
            )}
            {state.stage !== "verification" ? (
              <button
                type="button"
                className="feedback-nav-button feedback-nav-button-primary"
                onClick={goNext}
              >
                {t("nextLabel")}
              </button>
            ) : (
              <button
                type="submit"
                className="feedback-nav-button feedback-nav-button-primary"
                disabled={status === "submitting" || !captchaToken}
              >
                {status === "submitting"
                  ? t("submittingStatus")
                  : t("submitLabel")}
              </button>
            )}
          </div>
        </footer>
      </form>
    </FeedbackShell>
  );
}

type FeedbackShellProps = Readonly<{
  ariaLabel: string;
  children: React.ReactNode;
  locale: FeedbackLocale;
  localeLabel: string;
  onLocaleChange: (_locale: FeedbackLocale) => void;
  skipLabel: string;
}>;

function FeedbackShell({
  ariaLabel,
  children,
  locale,
  localeLabel,
  onLocaleChange,
  skipLabel,
}: FeedbackShellProps) {
  return (
    <main className="feedback-app" aria-label={ariaLabel}>
      <a className="feedback-skip-link" href="#feedback-stage">
        {skipLabel}
      </a>
      <header className="feedback-header">
        <div className="feedback-header-inner">
          <div className="feedback-brand">
            <Image
              src={negativeLogo}
              alt="Teleférico Cerro Otto"
              width={156}
              height={61}
              priority
              className="feedback-brand-logo"
            />
            <div className="feedback-brand-copy">
              <h1 className="feedback-header-title">{ariaLabel}</h1>
            </div>
          </div>
          <label className="feedback-language-control">
            <span className="sr-only">{localeLabel}</span>
            <select
              value={locale}
              onChange={(event) =>
                onLocaleChange(event.target.value as FeedbackLocale)
              }
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
              <option value="pt">PT</option>
            </select>
          </label>
        </div>
      </header>
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

function isExpiredFeedbackSession(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const error = (value as Record<string, unknown>).error;
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Record<string, unknown>).code === "SESSION_EXPIRED"
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
