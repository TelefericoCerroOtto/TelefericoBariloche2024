import { boolean, object, string } from "yup";
import { localeMessages } from "../i18n";
import { timeSchema } from "../primitives";

const { "es-AR": es, en, pt } = localeMessages;

const DESC_MAX_CHARS = 200;
const DESC_MIN_CHARS = 10;

export const createZoneSchema = object({
  label: string()
    .required(es.string.required)
    .min(2, es.string.min(2))
    .max(20, es.string.max(20))
    .matches(
      /^[a-zñ]+$/,
      "Usá solo letras minúsculas (a-z), sin espacios ni caracteres especiales.",
    ),
  "zoneName_es-AR": string()
    .required(es.string.required)
    .min(2, es.string.min(2)),
  zoneName_en: string().required(es.string.required).min(2, en.string.min(2)),
  zoneName_pt: string().required(es.string.required).min(2, pt.string.min(2)),
  "zoneDescription_es-AR": string()
    .min(DESC_MIN_CHARS, es.string.min(DESC_MIN_CHARS))
    .max(DESC_MAX_CHARS, es.string.max(DESC_MAX_CHARS)),
  zoneDescription_en: string()
    .min(DESC_MIN_CHARS, es.string.min(DESC_MIN_CHARS))
    .max(DESC_MAX_CHARS, en.string.max(DESC_MAX_CHARS)),
  zoneDescription_pt: string()
    .min(DESC_MIN_CHARS, es.string.min(DESC_MIN_CHARS))
    .max(DESC_MAX_CHARS, pt.string.max(DESC_MAX_CHARS)),
  openTime: timeSchema,
  closeTime: timeSchema,
  isOpen: boolean().required(es.string.required),
});

export const updateZoneSchema = createZoneSchema.shape({
  documentId: string().required(es.string.required),
  zoneTranslationDocumentId: string().required(es.string.required),
});
