import { object, string } from "yup";
import { timeSchema } from "../primitives";
import { localeMessages } from "../i18n";

const { "es-AR": es } = localeMessages;

export const createBusTripSchema = object({
  origin: string().required(es.string.required),
  destination: string().required(es.string.required),
  depTime: timeSchema,
  arrTime: timeSchema,
});

export const updateBusTripSchema = createBusTripSchema.shape({
  documentId: string().required(es.string.required),
});
