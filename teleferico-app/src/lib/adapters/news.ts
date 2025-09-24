import { i18n } from "@/i18n";
import type {
  Locales,
  NewsCreateDto,
  NewsEntity,
  NewsFormData,
  NewsUpdateDto,
} from "@/types";
import type { BlocksContent } from "@strapi/blocks-react-renderer";

const toJson = (value: string): BlocksContent => {
  try {
    return JSON.parse(value) as BlocksContent;
  } catch {
    return [] as BlocksContent;
  }
};

const getTitleKey = (locale: Locales) => `title_${locale}` as keyof NewsFormData;
const getBodyKey = (locale: Locales) => `body_${locale}` as keyof NewsFormData;
const getBriefKey = (locale: Locales) => `brief_${locale}` as keyof NewsFormData;
const getCoverAltKey = (locale: Locales) => `coverAlt_${locale}` as keyof NewsFormData;

const locales = i18n.locales;

const resolveMediaUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = process.env.BUILD_STRAPI_BASE_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "";
  return base ? `${base}${url}` : url;
};

export const getNewsAdapter = (apiResponse: { data: NewsEntity }): NewsFormData => {
  const { data } = apiResponse;

  const formData: Record<string, unknown> = {
    documentId: data.documentId,
    highglighted: data.highlighted,
    date: data.date,
  };

  let fallbackCover = data.cover;

  locales.forEach((locale) => {
    const localeEntry =
      locale === data.locale
        ? data
        : data.localizations?.find((item) => item.locale === locale);

    if (!fallbackCover && localeEntry?.cover) {
      fallbackCover = localeEntry.cover;
    }

    formData[getTitleKey(locale)] = localeEntry?.title ?? "";
    formData[getBodyKey(locale)] = JSON.stringify(localeEntry?.body ?? []);
    formData[getBriefKey(locale)] = JSON.stringify(localeEntry?.brief ?? []);
    formData[getCoverAltKey(locale)] = localeEntry?.cover?.alt ?? "";
  });

  formData.coverImage = fallbackCover?.image?.documentId ?? "";
  formData.coverImageUrl = resolveMediaUrl(fallbackCover?.image?.url);

  return formData as NewsFormData;
};

// The CMS uses the correct field name `highlighted`, while the dashboard form must expose it as `highglighted`.
// These adapters ensure the alias is resolved before persisting or reading data from Strapi.
export const postNewsAdapter = (
  form: NewsFormData,
  locale: Locales = i18n.defaultLocale,
): NewsCreateDto => ({
  data: {
    title: form[getTitleKey(locale)] as string,
    body: toJson(form[getBodyKey(locale)] as string),
    brief: toJson(form[getBriefKey(locale)] as string),
    highlighted: form.highglighted,
    date: form.date,
    cover: {
      alt: form[getCoverAltKey(locale)] as string,
      image: {
        connect: [{ documentId: form.coverImage }],
      },
    },
  },
});

export const patchNewsAdapter = (
  form: NewsFormData,
  locale: Locales = i18n.defaultLocale,
): NewsUpdateDto => ({
  data: {
    title: form[getTitleKey(locale)] as string,
    body: toJson(form[getBodyKey(locale)] as string),
    brief: toJson(form[getBriefKey(locale)] as string),
    highlighted: form.highglighted,
    date: form.date,
    cover: {
      alt: form[getCoverAltKey(locale)] as string,
      image: {
        connect: [{ documentId: form.coverImage }],
      },
    },
  },
});
