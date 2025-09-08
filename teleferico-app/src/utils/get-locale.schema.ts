import {
  contactSchema,
  contactSchemaEN,
  contactSchemaPT,
  postulationSchema,
  postulationSchemaEN,
  postulationSchemaPT,
} from "@/lib/schemas";
import type { Locales } from "@/types";
import { AnyObject, ObjectSchema } from "yup";

type Schemas = "postulationSchema" | "contactSchema";

export const getLocaleSchema = (locale: Locales, schema: Schemas) => {
  const index: Record<Schemas, Record<Locales, ObjectSchema<AnyObject>>> = {
    postulationSchema: {
      "es-AR": postulationSchema,
      en: postulationSchemaEN,
      pt: postulationSchemaPT,
    },
    contactSchema: {
      "es-AR": contactSchema,
      en: contactSchemaEN,
      pt: contactSchemaPT,
    },
  };

  return index[schema][locale];
};
