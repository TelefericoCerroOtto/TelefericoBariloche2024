import { CustomLink } from "@/components";
import { typography } from "@/lib/constants/typography.const";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { getComponentTranslation } from "@/lib/services/cms/collections/component-translations";
import type { Locales, PoliciesCalloutContent } from "@/types";
import { ScrollText } from "lucide-react";

interface Props {
  id: number;
  locale: Locales;
}

const TRANSLATION_KEY = "policies-callout";

function isPoliciesCalloutContent(
  value: unknown,
): value is PoliciesCalloutContent {
  if (!value || typeof value !== "object") return false;

  const content = value as Record<string, unknown>;
  return ["epigraph", "title", "description", "ctaLabel"].every(
    (field) =>
      typeof content[field] === "string" && content[field].trim().length > 0,
  );
}

function handleInvalidTranslation(locale: Locales, reason: string) {
  console.error("PoliciesCallout translation unavailable", {
    key: TRANSLATION_KEY,
    locale,
    reason,
  });

  return null;
}

export default async function PoliciesCallout({ id, locale }: Props) {
  const response = await getComponentTranslation(locale, TRANSLATION_KEY);

  let content: PoliciesCalloutContent | null;

  if (!response.ok) {
    content = handleInvalidTranslation(locale, "fetch failed");
  } else if (!Array.isArray(response.data?.data)) {
    content = handleInvalidTranslation(locale, "invalid response");
  } else if (response.data.data.length === 0) {
    content = handleInvalidTranslation(locale, "no results");
  } else if (response.data.data.length > 1) {
    content = handleInvalidTranslation(locale, "multiple results");
  } else if (!isPoliciesCalloutContent(response.data.data[0]?.jsonValue)) {
    content = handleInvalidTranslation(locale, "invalid JSON value");
  } else {
    content = response.data.data[0].jsonValue;
  }

  if (!content) return null;

  const headingId = `policies-callout-heading-${id}`;

  return (
    <section aria-labelledby={headingId} className="my-10 w-full">
      <div className="mx-auto w-full max-w-[1536px] px-6 md:px-12">
        <article className="relative isolate min-w-0 overflow-hidden rounded-3xl border border-custom-border bg-background shadow-lg shadow-black/5 ring-1 ring-red-500/15">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-500"
          />

          <div className="grid min-w-0 md:grid-cols-[14rem_minmax(0,1fr)]">
            <div className="relative flex h-24 items-center justify-center overflow-hidden border-b border-custom-border bg-red-500/5 md:h-auto md:min-h-full md:border-b-0 md:border-r">
              <ScrollText
                aria-hidden="true"
                strokeWidth={1.1}
                className="h-20 w-20 text-red-500 opacity-[0.08] md:h-36 md:w-36"
              />
            </div>

            <div className="min-w-0 break-words px-6 py-7 sm:px-8 sm:py-8 md:px-10 md:py-9 lg:px-12 lg:py-10">
              <div className="min-w-0 max-w-4xl">
                <p
                  className={`${typography.meta.featureEyebrow} mb-1 uppercase tracking-[0.28em] text-primary max-sm:text-sm`}
                >
                  {content.epigraph}
                </p>
                <h2
                  id={headingId}
                  className="text-pretty text-2xl font-bold leading-tight md:text-3xl"
                >
                  {content.title}
                </h2>
                <p className="mt-2 break-words text-lg leading-relaxed text-foreground/80 md:text-xl">
                  {content.description}
                </p>

                <div className="mt-4 flex">
                  <CustomLink
                    href={PUBLIC_ROUTES.POLICIES}
                    withButtonStyles
                    intent="outlineRed"
                    className="min-h-12 max-w-full touch-manipulation whitespace-normal break-words px-6 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    {content.ctaLabel}
                  </CustomLink>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
