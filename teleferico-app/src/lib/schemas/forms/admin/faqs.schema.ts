import { boolean, object, string } from "yup";
import { localeMessages } from "../i18n";

const { "es-AR": es } = localeMessages;

export const createFaqSchema = object({
  "question_es-AR": string()
    .required(es.string.required)
    .min(8, es.string.min(8))
    .max(100, es.string.max(100)),
  question_en: string()
    .required(es.string.required)
    .min(8, es.string.min(8))
    .max(100, es.string.max(100)),
  question_pt: string()
    .required(es.string.required)
    .min(8, es.string.min(8))
    .max(100, es.string.max(100)),
  "answer_es-AR": string()
    .required(es.string.required)
    .min(10, es.string.min(10))
    .max(250, es.string.max(250)),
  answer_en: string()
    .required(es.string.required)
    .min(10, es.string.min(10))
    .max(250, es.string.max(250)),
  answer_pt: string()
    .required(es.string.required)
    .min(10, es.string.min(10))
    .max(250, es.string.max(250)),
  featured: boolean().required(es.string.required),
});

export const updateFaqSchema = createFaqSchema.shape({
  documentId: string().required(es.string.required),
});
