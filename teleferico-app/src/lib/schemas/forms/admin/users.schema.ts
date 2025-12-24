import {
  validateEmailAvailability,
  validateUsernameAvailability,
} from "@/lib/actions";
import { number, object, string } from "yup";
import { localeMessages } from "../i18n";

const { "es-AR": es } = localeMessages;

export const newUserSchema = object({
  // id value is deleted within the adapter
  id: number(),
  username: string()
    .required(es.string.required)
    .min(2, es.string.min(2))
    .test(
      "unique-username",
      "Usuario ya registrado",
      validateUsernameAvailability,
    ),
  name: string().required(es.string.required).min(2, es.string.min(2)),
  surname: string().required(es.string.required).min(2, es.string.min(2)),
  email: string()
    .email(es.string.email)
    .required(es.string.required)
    .test("unique-email", "Email ya registrado", validateEmailAvailability),
  password: string().required("Campo requerido"),
  role: string()
    .matches(/^\d+$/, "Debe ser un id con caracteres numericos")
    .required(es.string.required),
});

export const updateUserSchema = object({
  id: number().integer(es.number.integer).required(es.number.required),
  username: string().required(es.string.required).min(2, es.string.min(2)),
  name: string().required(es.string.required).min(2, es.string.min(2)),
  surname: string().required(es.string.required).min(2, es.string.min(2)),
  email: string().email(es.string.email).required(es.string.required),
  password: string(),
  role: string()
    .matches(/^\d+$/, "Debe ser un id con caracteres numericos")
    .required(es.string.required),
});
