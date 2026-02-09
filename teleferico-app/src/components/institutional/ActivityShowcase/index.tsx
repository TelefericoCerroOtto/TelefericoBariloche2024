"use client";

import { useProxy } from "@/hooks/use-proxy";
import { formatPrice } from "@/lib/adapters";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type {
  Activity,
  ActivityTranslation,
  GetActivityResponse,
  Locales,
} from "@/types";
import { getI18n, seasonLabel } from "./data";
import ErrorState from "./ErrorState";
import Loader from "./Loader";
import { useSWRConfig } from "swr";
import { useMemo } from "react";
import { createRetryGuard } from "./retry-guard";

type Props = {
  documentId: string;
  locale: Locales;
};

/**
 * Selección robusta de traducción:
 * - Si existe algún campo locale dentro del record, intenta matchear.
 * - Si no, cae a la primera traducción.
 */
function pickTranslation(
  translations: ActivityTranslation[] | undefined,
  locale: Locales,
): ActivityTranslation | null {
  if (!translations?.length) return null;

  const l = String(locale);

  // Intento 1: si el StrapiRecord trae locale en attributes
  const byAttrLocale = translations.find((t) => {
    const anyT = t as unknown as { attributes?: { locale?: string | null } };
    return anyT.attributes?.locale && String(anyT.attributes.locale) === l;
  });
  if (byAttrLocale) return byAttrLocale;

  // Intento 2: si el record trae locale “plano”
  const byFlatLocale = translations.find((t) => {
    const anyT = t as unknown as { locale?: string | null };
    return anyT.locale && String(anyT.locale) === l;
  });
  if (byFlatLocale) return byFlatLocale;

  return translations[0] ?? null;
}

function getActivityTitle(activity: Activity, locale: Locales) {
  const tr = pickTranslation(activity.activity_translations, locale);
  return tr?.name?.trim() || activity.label;
}

function getActivityDescription(activity: Activity, locale: Locales) {
  const tr = pickTranslation(activity.activity_translations, locale);
  const d = tr?.description?.trim();
  return d || null;
}

function getActivityRequirements(activity: Activity, locale: Locales) {
  const tr = pickTranslation(activity.activity_translations, locale);
  const r = tr?.requirements?.trim();
  return r || null;
}

function formatAgeRangeValue(
  minAge: number | null | undefined,
  maxAge: number | null | undefined,
  t: ReturnType<typeof getI18n>,
): string {
  const min = typeof minAge === "number" ? minAge : null;
  const max = typeof maxAge === "number" && maxAge !== 0 ? maxAge : null; // 0 o null => sin máximo

  const hasMin = typeof min === "number" && min > 0; // 0 => sin mínimo
  const hasMax = typeof max === "number" && max > 0;

  // Sin restricciones
  if (!hasMin && !hasMax) return t.allAges;

  // Solo máximo
  if (!hasMin && hasMax) return `${t.maxAge} ${max}`;

  // Solo mínimo
  if (hasMin && !hasMax) return `${min}+`;

  // Rango
  if (hasMin && hasMax) {
    // Guard: si viniera max < min, priorizamos mínimo para evitar un rango inválido.
    if ((max as number) < (min as number)) return `${min}+`;
    return `${min}–${max}`;
  }

  return "—";
}

export default function ActivityShowcaseBlock({ documentId, locale }: Props) {
  const t = getI18n(locale);
  const { mutate } = useSWRConfig();

  const retryGuard = useMemo(
    () =>
      createRetryGuard({ cooldownMs: 8000, windowMs: 60_000, maxInWindow: 5 }),
    [],
  );

  const { data, isLoading, isError, isValidating, key } =
    useProxy<GetActivityResponse>(
      `${STRAPI_ENDPOINTS.ACTIVITIES}/${documentId}`,
      {
        populate: {
          activity_translations: true,
          page: true,
        },
      },
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: true,
        errorRetryCount: 1,
        errorRetryInterval: 3000, // 3 seconds
        dedupingInterval: 8000, // 8 seconds
      },
    );

  if (isLoading) return <Loader label={t.loading} />;

  if (isError) {
    console.error("ActivityShowcaseBlock: error fetching activity", {
      documentId,
      locale,
      key,
      isError,
    });

    return (
      <ErrorState
        locale={locale}
        message={t.error}
        retryDisabled={isValidating || !key}
        onRetry={
          key
            ? async () => {
                if (isValidating) return;

                const verdict = retryGuard();
                if (!verdict.ok) return;

                await mutate(key);
              }
            : undefined
        }
      />
    );
  }

  const activity = data?.data;
  if (!activity) {
    return (
      <section
        className="my-12 w-11/12 md:w-3/4 lg:w-7/12"
        aria-label={t.empty}
      >
        <div className="rounded-2xl border border-default-200 bg-content1 p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-default-500 sm:text-sm">
            {t.eyebrow}
          </p>
          <p className="mt-2 text-sm text-default-600 sm:text-base">
            {t.empty}
          </p>
        </div>
      </section>
    );
  }

  const title = getActivityTitle(activity, locale);
  const description = getActivityDescription(activity, locale);
  const requirements = getActivityRequirements(activity, locale);

  const isAvailable = Boolean(activity.available);
  const price = activity.price;
  const minAge = activity.minAge;
  const maxAge = activity.maxAge;
  const season = activity.season;

  const headingId = `activity-showcase-${documentId}`;

  const priceValue =
    typeof price === "number" ? formatPrice(price, locale) : "—";
  const ageValue = formatAgeRangeValue(minAge, maxAge, t);
  const seasonValue = season ? seasonLabel(season, locale) : "—";

  return (
    <section
      className="my-12 w-11/12 md:w-3/4 lg:w-7/12"
      aria-labelledby={headingId}
    >
      <div className="relative w-full overflow-hidden rounded-2xl border border-default-200 bg-content1 shadow-sm after:absolute after:inset-x-0 after:top-0 after:h-1 after:bg-red-600">
        <div className="p-5 sm:p-7 lg:p-10">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-600 sm:text-base">
                {t.eyebrow}
              </p>

              <h2
                id={headingId}
                className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl lg:text-5xl"
              >
                {title}
              </h2>
            </div>

            <span
              className={[
                "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold sm:text-base",
                isAvailable
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger",
              ].join(" ")}
              aria-label={isAvailable ? t.available : t.unavailable}
            >
              <span
                aria-hidden="true"
                className={[
                  "h-2 w-2 rounded-full",
                  isAvailable ? "bg-success" : "bg-danger",
                ].join(" ")}
              />
              {isAvailable ? t.available : t.unavailable}
            </span>
          </div>

          {/* Description */}
          {description ? (
            <p className="mt-4 text-sm leading-relaxed text-default-600 sm:text-lg lg:text-2xl">
              {description}
            </p>
          ) : null}

          {/* Key info grid */}
          <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {/* Price */}
            <div className="rounded-xl border border-default-200 bg-default-50 p-4 transition-colors focus-within:border-red-600/30 focus-within:bg-red-600/5 hover:border-red-600/30 hover:bg-red-600/5">
              <dt className="text-sm font-semibold uppercase tracking-wide text-default-500 sm:text-base">
                {t.price}
              </dt>
              <dd className="mt-2 text-base font-semibold text-default-900 sm:text-lg lg:text-xl">
                {priceValue}
              </dd>
              <p className="mt-1 text-xs text-default-600 sm:text-sm">
                {t.priceHint}
              </p>
            </div>

            {/* Age (general) */}
            <div className="rounded-xl border border-default-200 bg-default-50 p-4 transition-colors focus-within:border-red-600/30 focus-within:bg-red-600/5 hover:border-red-600/30 hover:bg-red-600/5">
              <dt className="text-sm font-semibold uppercase tracking-wide text-default-500 sm:text-base">
                {t.age}
              </dt>
              <dd className="mt-2 text-base font-semibold text-default-900 sm:text-lg lg:text-xl">
                {ageValue}
              </dd>
              <p className="mt-1 text-xs text-default-600 sm:text-sm">
                {t.ageHint}
              </p>
            </div>

            {/* Season */}
            <div className="rounded-xl border border-default-200 bg-default-50 p-4 transition-colors focus-within:border-red-600/30 focus-within:bg-red-600/5 hover:border-red-600/30 hover:bg-red-600/5">
              <dt className="text-sm font-semibold uppercase tracking-wide text-default-500 sm:text-base">
                {t.season}
              </dt>
              <dd className="mt-2 text-base font-semibold text-default-900 sm:text-lg lg:text-xl">
                {seasonValue}
              </dd>
              <p className="mt-1 text-xs text-default-600 sm:text-sm">
                {t.seasonHint}
              </p>
            </div>

            {/* Availability */}
            <div
              className={[
                "rounded-xl border p-4 transition-colors",
                isAvailable
                  ? "border-red-600/30 bg-red-600/5"
                  : "border-default-200 bg-default-50",
              ].join(" ")}
            >
              <dt className="text-sm font-semibold uppercase tracking-wide text-default-500 sm:text-base">
                {t.availability}
              </dt>
              <dd className="mt-2">
                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold sm:text-sm",
                    isAvailable
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      "h-2 w-2 rounded-full",
                      isAvailable ? "bg-success" : "bg-danger",
                    ].join(" ")}
                  />
                  {isAvailable ? t.available : t.unavailable}
                </span>
              </dd>
              <p className="mt-2 text-xs text-default-600 sm:text-sm">
                {t.availabilityHint}
              </p>
            </div>
          </dl>

          {/* Requirements */}
          {requirements ? (
            <div className="mt-6 rounded-xl border border-default-200 bg-content2 p-4 sm:p-5">
              <p className="text-sm font-semibold text-default-900 sm:text-base lg:text-lg">
                {t.requirements}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-default-600 sm:text-base lg:text-lg">
                {requirements}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
