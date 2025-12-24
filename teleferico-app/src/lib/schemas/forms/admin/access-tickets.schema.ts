import { LIFTING_MEANS } from "@/lib/constants/enum-fields.const";
import type { LiftingMean } from "@/types";
import { number, object, string } from "yup";
import { localeMessages } from "../i18n";

const { "es-AR": es } = localeMessages;

export const createAccessTicketSchema = object({
  accessName_en: string().required(es.string.required).min(2, es.string.min(2)),
  "accessName_es-AR": string()
    .required(es.string.required)
    .min(2, es.string.min(2)),
  accessName_pt: string().required(es.string.required).min(2, es.string.min(2)),
  price: number()
    .integer(es.number.integer)
    .required(es.number.required)
    .min(0, es.number.min(0)),
  liftingMean: string<LiftingMean>()
    .oneOf(LIFTING_MEANS)
    .required(es.string.required),
});

export const updateAccessTicketSchema = createAccessTicketSchema.shape({
  documentId: string().required(es.string.required),
});
