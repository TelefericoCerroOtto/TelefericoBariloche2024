import type {
  CreateFaqFormData,
  CreateFaqRequest,
  ExtendLocalizations,
  GetFaqResponse,
  Locales,
  UpdateFaqFormData,
  UpdateFaqRequest,
} from "@/types";

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
    "answer_es-AR": "",
    answer_en: "",
    answer_pt: "",
    featured,
  };

  formData[getQuestionKey(locale)] = question;
  formData[getAnswerKey(locale)] = answer;

  localizations.map((l) => {
    const { locale, question, answer } = l;
    formData[getQuestionKey(locale)] = question;
    formData[getAnswerKey(locale)] = answer;
  });

  return formData;
};

export const createFaqAdapter = (
  faq: CreateFaqFormData,
  locale: Locales,
): CreateFaqRequest => {
  const reqBody: CreateFaqRequest = {
    data: { question: "", answer: "", featured: false },
  };

  reqBody.data.question = faq[getQuestionKey(locale)];
  reqBody.data.answer = faq[getAnswerKey(locale)];
  reqBody.data.featured = faq.featured ?? false;

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
  if (answer) reqBody.data.answer = answer;
  if (typeof featured === "boolean") reqBody.data.featured = featured;

  return reqBody;
};
