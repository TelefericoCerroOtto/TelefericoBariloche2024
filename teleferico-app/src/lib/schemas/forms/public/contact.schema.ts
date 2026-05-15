import type { Locales } from "@/types";
import { object, string } from "yup";
import { MAX_EMAIL_LENGTH } from "../constants";
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
      .max(MAX_EMAIL_LENGTH, m.string.max(MAX_EMAIL_LENGTH)),
    consultation: string()
      .required(m.string.required)
      .max(800, m.string.max(800)),
  });
};
