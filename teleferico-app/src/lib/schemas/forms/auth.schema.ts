import type { LoginUserRequest } from "@/types";
import { object, type ObjectSchema, string } from "yup";
import { localeMessages } from "./i18n";

const { "es-AR": es } = localeMessages;

export const loginSchema: ObjectSchema<LoginUserRequest> = object({
  identifier: string().email(es.string.email).required(es.string.required),
  password: string().required(es.string.required),
});
