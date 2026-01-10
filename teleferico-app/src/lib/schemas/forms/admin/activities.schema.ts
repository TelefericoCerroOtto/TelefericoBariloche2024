import { SEASONS } from "@/lib/constants/enum-fields.const";
import type { Season } from "@/types";
import { boolean, number, object, string } from "yup";
import { localeMessages } from "../i18n";

const { "es-AR": es } = localeMessages;
const DESC_MIN_CHARS = 10;
const DESC_MAX_CHARS = 500;

export const createActivitySchema = object({
  label: string()
    .required(es.string.required)
    .min(2, es.string.min(2))
    .max(20, es.string.max(20))
    .matches(
      /^[a-zñ]+$/,
      "Usá solo letras minúsculas (a-z), sin espacios ni caracteres especiales.",
    ),
  price: number().integer(es.number.integer).required(es.number.required),
  minAge: number().integer(es.number.integer).required(es.number.required),
  season: string<Season>().oneOf(SEASONS).required(es.string.required),
  available: boolean().required(es.string.required),
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
