import { LIFTING_MEANS } from "@/lib/constants/enum-fields.const";
import type { LiftingMean } from "@/types";
import { number, object, string } from "yup";
import { localeMessages } from "../i18n";

const { "es-AR": es } = localeMessages;
const MIN_NAME_LENGTH = 2;
const MAX_DESCRIPTION_LENGTH = 500;
const MIN_PRICE = 0;

export const createAccessTicketSchema = object({
  accessName_en: string()
    .required(es.string.required)
    .min(MIN_NAME_LENGTH, es.string.min(MIN_NAME_LENGTH)),
  "accessName_es-AR": string()
    .required(es.string.required)
    .min(MIN_NAME_LENGTH, es.string.min(MIN_NAME_LENGTH)),
  accessName_pt: string()
    .required(es.string.required)
    .min(MIN_NAME_LENGTH, es.string.min(MIN_NAME_LENGTH)),
  "accessDescription_es-AR": string().max(
    MAX_DESCRIPTION_LENGTH,
    es.string.max(MAX_DESCRIPTION_LENGTH),
  ),
  accessDescription_en: string().max(
    MAX_DESCRIPTION_LENGTH,
    es.string.max(MAX_DESCRIPTION_LENGTH),
  ),
  accessDescription_pt: string().max(
    MAX_DESCRIPTION_LENGTH,
    es.string.max(MAX_DESCRIPTION_LENGTH),
  ),
  price: number()
    .integer(es.number.integer)
    .required(es.number.required)
    .min(MIN_PRICE, es.number.min(MIN_PRICE)),
  liftingMean: string<LiftingMean>()
    .oneOf(LIFTING_MEANS)
    .required(es.string.required),
});

export const updateAccessTicketSchema = createAccessTicketSchema.shape({
  documentId: string().required(es.string.required),
});
