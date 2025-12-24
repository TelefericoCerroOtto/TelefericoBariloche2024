import { boolean, object, string } from "yup";
import { localeMessages } from "../i18n";
import { timeSchema } from "../primitives";

const { "es-AR": es, en, pt } = localeMessages;

export const createZoneSchema = object({});

export const updateZoneSchema = object({
  "zoneName_es-AR": string()
    .required(es.string.required)
    .min(2, es.string.min(2)),
  zoneName_en: string().required(es.string.required).min(2, en.string.min(2)),
  zoneName_pt: string().required(es.string.required).min(2, pt.string.min(2)),
  "zoneDescription_es-AR": string().max(500, es.string.max(500)),
  zoneDescription_en: string().max(500, en.string.max(500)),
  zoneDescription_pt: string().max(500, pt.string.max(500)),
  openTime: timeSchema,
  closeTime: timeSchema,
  isOpen: boolean().required(es.string.required),
  documentId: string().required(es.string.required),
  zoneTrasnlationDocumentId: string().required(es.string.required),
});
