import type {
  CreateFaqFormData,
  CreateFaqRequest,
  ExtendLocalizations,
  GetFaqResponse,
  Locales,
  UpdateFaqFormData,
  UpdateFaqRequest,
} from "@/types";
import { createEmptyJSONContent } from "@/utils/tiptap";
import {
  StrapiBlocksContentToTiptapJSONContent,
  TiptapJSONContentToStrapiBlocksContent,
} from "../formats";

const getQuestionKey = (locale: Locales) => `question_${locale}` as const;
const getAnswerKey = (locale: Locales) => `answer_${locale}` as const;

export const getFaqAdapter = (
  faq: ExtendLocalizations<GetFaqResponse>,
): UpdateFaqFormData => {
  const { data } = faq;
  const { documentId, question, answer, featured, locale } = data;
  const { localizations } = faq.data;

  const formData: UpdateFaqFormData = {
    documentId,
    "question_es-AR": "",
    question_en: "",
    question_pt: "",
    "answer_es-AR": createEmptyJSONContent(),
    answer_en: createEmptyJSONContent(),
    answer_pt: createEmptyJSONContent(),
    featured,
  };

  formData[getQuestionKey(locale)] = question;
  formData[getAnswerKey(locale)] =
    StrapiBlocksContentToTiptapJSONContent(answer);

  localizations.map((l) => {
    const { locale, question, answer } = l;
    formData[getQuestionKey(locale)] = question;
    formData[getAnswerKey(locale)] =
      StrapiBlocksContentToTiptapJSONContent(answer);
  });

  return formData;
};

export const createFaqAdapter = (
  faq: CreateFaqFormData,
  locale: Locales,
): CreateFaqRequest => {
  const question = faq[getQuestionKey(locale)];
  const answer = TiptapJSONContentToStrapiBlocksContent(
    faq[getAnswerKey(locale)],
  );
  const featured = faq.featured ?? false;

  const reqBody: CreateFaqRequest = {
    data: { question, answer, featured },
  };

  return reqBody;
};

export const updateFaqAdapter = (
  faq: CreateFaqFormData | Partial<CreateFaqFormData>,
  locale: Locales,
): UpdateFaqRequest => {
  const reqBody: UpdateFaqRequest = { data: {} };

  const question = faq[getQuestionKey(locale)];
  const answer = faq[getAnswerKey(locale)];
  const featured = faq.featured;

  if (question) reqBody.data.question = question;
  if (answer)
    reqBody.data.answer = TiptapJSONContentToStrapiBlocksContent(answer);
  if (typeof featured === "boolean") reqBody.data.featured = featured;

  return reqBody;
};
