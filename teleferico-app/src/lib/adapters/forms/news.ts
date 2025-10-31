import type {
  CreateNewFormData,
  CreateNewRequest,
  ExtendLocalizations,
  GetNewResponse,
  Locales,
  UpdateNewFormData,
  UpdateNewRequest,
} from "@/types";
import { createEmptyJSONContent } from "@/utils/tiptap";
import {
  StrapiBlocksContentToTiptapJSONContent,
  TiptapJSONContentToStrapiBlocksContent,
} from "../formats";
import { i18n } from "@/i18n";

export const getTitleKey = (locale: Locales) => `title_${locale}` as const;
export const getBodyKey = (locale: Locales) => `body_${locale}` as const;
export const getBriefKey = (locale: Locales) => `brief_${locale}` as const;

export const getNewsAdapter = (
  news: ExtendLocalizations<GetNewResponse>,
): UpdateNewFormData => {
  const { data } = news;
  const { documentId, highlighted, date, cover, title, body, brief, locale } =
    data;
  const { localizations } = news.data;

  const formData: UpdateNewFormData = {
    documentId,
    highlighted,
    date,
    "title_es-AR": "",
    title_en: "",
    title_pt: "",
    "body_es-AR": createEmptyJSONContent(),
    body_en: createEmptyJSONContent(),
    body_pt: createEmptyJSONContent(),
    "brief_es-AR": createEmptyJSONContent(),
    brief_en: createEmptyJSONContent(),
    brief_pt: createEmptyJSONContent(),
    newCoverImageFile: null,
    coverImage: {
      documentId: cover.documentId,
      id: cover.id,
      name: cover.name,
      size: cover.size,
      url: cover.formats.small.url,
    },
  };

  formData[getTitleKey(locale)] = title;
  formData[getBodyKey(locale)] = StrapiBlocksContentToTiptapJSONContent(body);
  formData[getBriefKey(locale)] = StrapiBlocksContentToTiptapJSONContent(brief);

  localizations.map((l) => {
    const { locale, body, brief, title } = l;
    formData[getTitleKey(locale)] = title;
    formData[getBodyKey(locale)] = StrapiBlocksContentToTiptapJSONContent(body);
    formData[getBriefKey(locale)] =
      StrapiBlocksContentToTiptapJSONContent(brief);
  });

  return formData;
};

export const updateNewsAdapter = ({
  values,
  locale = i18n.defaultLocale,
}: {
  values: Partial<UpdateNewFormData & { coverImageId: number }>;
  locale: Locales;
}): UpdateNewRequest => {
  const reqBody: UpdateNewRequest = {
    data: {},
  };

  const title = values[getTitleKey(locale)];
  const body = values[getBodyKey(locale)];
  const brief = values[getBriefKey(locale)];
  const date = values.date;
  const highlighted = values.highlighted;
  const coverImageId = values.coverImageId;

  if (title) reqBody.data.title = title;
  if (body) reqBody.data.body = TiptapJSONContentToStrapiBlocksContent(body);
  if (brief) reqBody.data.brief = TiptapJSONContentToStrapiBlocksContent(brief);
  if (date) reqBody.data.date = date;
  if ("highlighted" in values) reqBody.data.highlighted = highlighted;
  if (coverImageId) reqBody.data.cover = coverImageId;

  return reqBody;
};

export const createNewsAdapter = ({
  values,
  locale = i18n.defaultLocale,
}: {
  values: CreateNewFormData & { coverImageId: number };
  locale?: Locales;
}): CreateNewRequest => {
  const title = values[getTitleKey(locale)];
  const body = TiptapJSONContentToStrapiBlocksContent(
    values[getBodyKey(locale)],
  );
  const brief = TiptapJSONContentToStrapiBlocksContent(
    values[getBriefKey(locale)],
  );
  const date = values.date;
  const highlighted = values.highlighted;
  const cover = values.coverImageId;

  const reqBody: CreateNewRequest = {
    data: {
      title,
      body,
      brief,
      date,
      highlighted,
      cover,
    },
  };

  return reqBody;
};
