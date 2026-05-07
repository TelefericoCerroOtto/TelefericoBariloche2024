import { boolean, object, string } from "yup";
import { localeMessages } from "../i18n";
import { timeSchema } from "../primitives";

const { "es-AR": es } = localeMessages;

const NAME_MIN_CHARS = 2;
const NAME_MAX_CHARS = 100;

const DESC_MAX_CHARS = 500;
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
    .min(NAME_MIN_CHARS, es.string.min(NAME_MIN_CHARS))
    .max(NAME_MAX_CHARS, es.string.max(NAME_MAX_CHARS)),
  zoneName_en: string()
    .required(es.string.required)
    .min(NAME_MIN_CHARS, es.string.min(NAME_MIN_CHARS))
    .max(NAME_MAX_CHARS, es.string.max(NAME_MAX_CHARS)),
  zoneName_pt: string()
    .required(es.string.required)
    .min(NAME_MIN_CHARS, es.string.min(NAME_MIN_CHARS))
    .max(NAME_MAX_CHARS, es.string.max(NAME_MAX_CHARS)),
  "zoneDescription_es-AR": string()
    .min(DESC_MIN_CHARS, es.string.min(DESC_MIN_CHARS))
    .max(DESC_MAX_CHARS, es.string.max(DESC_MAX_CHARS)),
  zoneDescription_en: string()
    .min(DESC_MIN_CHARS, es.string.min(DESC_MIN_CHARS))
    .max(DESC_MAX_CHARS, es.string.max(DESC_MAX_CHARS)),
  zoneDescription_pt: string()
    .min(DESC_MIN_CHARS, es.string.min(DESC_MIN_CHARS))
    .max(DESC_MAX_CHARS, es.string.max(DESC_MAX_CHARS)),
  openTime: timeSchema,
  closeTime: timeSchema,
  isOpen: boolean().required(es.string.required),
  featured: boolean().required(es.string.required),
  hide: boolean().required(es.string.required),
});

export const updateZoneSchema = createZoneSchema.shape({
  documentId: string().required(es.string.required),
  zoneTranslationDocumentId: string().required(es.string.required),
});
