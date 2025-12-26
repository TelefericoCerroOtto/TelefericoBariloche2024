import type { Locales } from "@/types";
import { object, string } from "yup";
import { localeMessages } from "../i18n";

export const buildContactSchema = (locale: Locales) => {
  const m = localeMessages[locale];

  return object({
    name: string()
      .required(m.string.required)
      .min(2, m.string.min(2))
      .max(80, m.string.max(80)),
    email: string()
      .required(m.string.required)
      .email(m.string.email)
      .max(254, m.string.max(254)),
    consultation: string()
      .required(m.string.required)
      .max(800, m.string.max(800)),
  });
};
