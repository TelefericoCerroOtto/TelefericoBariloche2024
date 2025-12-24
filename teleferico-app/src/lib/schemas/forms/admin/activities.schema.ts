import { SEASONS } from "@/lib/constants/enum-fields.const";
import type { Season } from "@/types";
import { number, object, string } from "yup";
import { localeMessages } from "../i18n";

const { "es-AR": es } = localeMessages;

export const createActivitySchema = object({
  "activityName_es-AR": string().required(es.string.required),
  activityName_en: string().required(es.string.required),
  activityName_pt: string().required(es.string.required),
  "description_es-AR": string().max(500, es.string.max(500)),
  description_en: string().max(500, es.string.max(500)),
  description_pt: string().max(500, es.string.max(500)),
  price: number().integer(es.number.integer).required(es.number.required),
  minAge: number().integer(es.number.integer).required(es.number.required),
  season: string<Season>().oneOf(SEASONS).required(es.string.required),
  "requirements_es-AR": string(),
  requirements_en: string(),
  requirements_pt: string(),
});

export const updateActivitySchema = createActivitySchema.shape({
  activityDocumentId: string().required(es.string.required),
  activityTranslationDocumentId: string(),
});
