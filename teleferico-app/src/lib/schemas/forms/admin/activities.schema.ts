import { SEASONS } from "@/lib/constants/enum-fields.const";
import type { Season } from "@/types";
import { boolean, number, object, string } from "yup";
import { localeMessages } from "../i18n";

const { "es-AR": es } = localeMessages;
const DESC_MIN_CHARS = 10;
const DESC_MAX_CHARS = 500;

const MAXAGE_MAX_LIMIT = 80;
const MAXAGE_MIN_LIMIT = 0;

const MINAGE_MAX_LIMIT = 80;
const MINAGE_MIN_LIMIT = 0;

const MIN_LABEL_LENGTH = 2;
const MAX_LABEL_LENGTH = 20;

export const createActivitySchema = object({
  label: string()
    .required(es.string.required)
    .min(MIN_LABEL_LENGTH, es.string.min(MIN_LABEL_LENGTH))
    .max(MAX_LABEL_LENGTH, es.string.max(MAX_LABEL_LENGTH))
    .matches(
      /^[a-zñ]+$/,
      "Usá solo letras minúsculas (a-z), sin espacios ni caracteres especiales.",
    ),
  price: number().integer(es.number.integer).required(es.number.required),
  minAge: number()
    .integer(es.number.integer)
    .required(es.number.required)
    .max(MINAGE_MAX_LIMIT, es.number.max(MINAGE_MAX_LIMIT))
    .min(MINAGE_MIN_LIMIT, es.number.min(MINAGE_MIN_LIMIT)),
  maxAge: number()
    .integer(es.number.integer)
    .max(MAXAGE_MAX_LIMIT, es.number.max(MAXAGE_MAX_LIMIT))
    .min(MAXAGE_MIN_LIMIT, es.number.min(MAXAGE_MIN_LIMIT)),
  season: string<Season>().oneOf(SEASONS).required(es.string.required),
  available: boolean().required(es.string.required),
  isActive: boolean().required(es.string.required),
  "activityName_es-AR": string().required(es.string.required),
  activityName_en: string().required(es.string.required),
  activityName_pt: string().required(es.string.required),
  "description_es-AR": string()
    .required(es.string.required)
    .max(DESC_MAX_CHARS, es.string.max(DESC_MAX_CHARS))
    .min(10, es.string.min(DESC_MIN_CHARS)),
  description_en: string()
    .required(es.string.required)
    .max(DESC_MAX_CHARS, es.string.max(DESC_MAX_CHARS))
    .min(10, es.string.min(DESC_MIN_CHARS)),
  description_pt: string()
    .required(es.string.required)
    .max(DESC_MAX_CHARS, es.string.max(DESC_MAX_CHARS))
    .min(10, es.string.min(DESC_MIN_CHARS)),
  "requirements_es-AR": string(),
  requirements_en: string(),
  requirements_pt: string(),
});

export const updateActivitySchema = createActivitySchema.shape({
  activityDocumentId: string().required(es.string.required),
  activityTranslationDocumentId: string(),
});
