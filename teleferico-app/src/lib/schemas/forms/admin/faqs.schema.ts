import { boolean, object, string } from "yup";
import { localeMessages } from "../i18n";
import { tiptapJsonSchema } from "../primitives";

const { "es-AR": es } = localeMessages;

const QUESTION_MIN_LENGTH = 8;
const QUESTION_MAX_LENGTH = 150;

export const createFaqSchema = object({
  "question_es-AR": string()
    .required(es.string.required)
    .min(QUESTION_MIN_LENGTH, es.string.min(QUESTION_MIN_LENGTH))
    .max(QUESTION_MAX_LENGTH, es.string.max(QUESTION_MAX_LENGTH)),
  question_en: string()
    .required(es.string.required)
    .min(QUESTION_MIN_LENGTH, es.string.min(QUESTION_MIN_LENGTH))
    .max(QUESTION_MAX_LENGTH, es.string.max(QUESTION_MAX_LENGTH)),
  question_pt: string()
    .required(es.string.required)
    .min(QUESTION_MIN_LENGTH, es.string.min(QUESTION_MIN_LENGTH))
    .max(QUESTION_MAX_LENGTH, es.string.max(QUESTION_MAX_LENGTH)),
  "answer_es-AR": tiptapJsonSchema.required(es.string.required),
  answer_en: tiptapJsonSchema.required(es.string.required),
  answer_pt: tiptapJsonSchema.required(es.string.required),
  featured: boolean().required(es.string.required),
});

export const updateFaqSchema = createFaqSchema.shape({
  documentId: string().required(es.string.required),
});
