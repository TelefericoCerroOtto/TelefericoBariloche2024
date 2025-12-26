import { boolean, object, string } from "yup";
import { localeMessages } from "../i18n";
import {
  imageStoredSchema,
  imageUploadSchema,
  tiptapJsonSchema,
} from "../primitives";

const { "es-AR": es } = localeMessages;

export const createNewSchema = object({
  "title_es-AR": string().required(es.string.required).min(3, es.string.min(3)),
  title_en: string().required(es.string.required).min(3, es.string.min(3)),
  title_pt: string().required(es.string.required).min(3, es.string.min(3)),
  "body_es-AR": tiptapJsonSchema.required(es.string.required),
  body_en: tiptapJsonSchema.required(es.string.required),
  body_pt: tiptapJsonSchema.required(es.string.required),
  "brief_es-AR": tiptapJsonSchema.required(es.string.required),
  brief_en: tiptapJsonSchema.required(es.string.required),
  brief_pt: tiptapJsonSchema.required(es.string.required),
  newCoverImageFile: imageUploadSchema.required(es.mixed.required).nullable(),
  date: string()
    .required(es.string.required)
    .test("valid-date", "La fecha no es válida", (value) => {
      if (!value) return false;
      return !Number.isNaN(Date.parse(value));
    }),
  highlighted: boolean().default(false),
});

export const updateNewSchema = createNewSchema.shape({
  newCoverImageFile: imageUploadSchema,
  coverImage: imageStoredSchema,
  documentId: string().required(es.string.required),
});
