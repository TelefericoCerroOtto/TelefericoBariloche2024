import {
  validateEmailAvailability,
  validateUsernameAvailability,
} from "@/lib/actions";
import type { LoginUserRequest } from "@/types";
import { mixed, number, object, string, type ObjectSchema } from "yup";
import { sectorOptions } from "@/app/(administration)/dashboard/(sections)/recruitment/_components/data";

// TODO: Crear el tipo de las requests
// export const mySchema: Yup.ObjectSchema<myRequestType> = object({ ... })

export const loginSchema: ObjectSchema<LoginUserRequest> = object({
  identifier: string()
    .email("Direccion de mail invalida")
    .required("Campo requerido"),
  password: string().required("Campo requerido"),
});

export const activityTicketSchema = object({
  activityNameEN: string().required("Campo requerido"),
  activityNameES: string().required("Campo requerido"),
  activityNamePT: string().required("Campo requerido"),
  price: number()
    .integer("El precio debe ser un numero entero")
    .required("Campo requerido"),
  minAge: number()
    .integer("El precio debe ser un numero entero")
    .required("Campo requerido"),
  season: string().oneOf([
    "verano",
    "otoño",
    "invierno",
    "primavera",
    "allSeasons",
  ]),
  requirementsEN: string().required("Campo requerido"),
  requirementsES: string().required("Campo requerido"),
  requirementsPT: string().required("Campo requerido"),
});

export const accessTicketSchema = object({
  accessNameEN: string().required("Campo requerido"),
  accessNameES: string().required("Campo requerido"),
  accessNamePT: string().required("Campo requerido"),
  price: number()
    .integer("El precio debe ser un numero entero")
    .required("Campo requerido"),
  elevationMethod: string().oneOf(["teleferico", "camino"]),
});

export const timeSchema = object({
  hour: number()
    .integer("La hora debe ser un numero entero")
    .min(0, "La hora minima es las 0hs")
    .max(23, "La hora maxima es las 23hs")
    .required("Campo requerido"),
  mins: number()
    .integer("Los minutos deben ser un numero entero")
    .min(0, "Los minutos minimos son 0")
    .max(23, "Los minutos maximos son 59")
    .required("Campo requerido"),
});

export const zoneScheduleSchema = object({
  openTime: timeSchema,
  closeTime: timeSchema,
});

export const BusTravelSchema = object({
  depPoint: string().required("Campo requerido"),
  arrPoint: string().required("Campo requerido"),
  depTime: timeSchema,
  arrTime: timeSchema,
});

export const newUserSchema = object({
  // id value is deleted within the adapter
  id: number(),
  username: string()
    .required("Campo requerido")
    .min(2, "El nombre de usuario debe contener al menos 2 caracteres")
    .test(
      "unique-username",
      "Usuario ya registrado",
      validateUsernameAvailability,
    ),
  name: string()
    .required("Campo requerido")
    .min(2, "El nombre debe contener al menos 2 caracteres"),
  surname: string()
    .required("Campo requerido")
    .min(2, "El apellido debe contener al menos 2 caracteres"),
  email: string()
    .email("Debe ser un email valido")
    .required("Campo requerido")
    .test("unique-email", "Email ya registrado", validateEmailAvailability),
  password: string().required("Campo requerido"),
  role: string()
    .matches(/^\d+$/, "Debe ser un id con caracteres numericos")
    .required("Campo requerido"),
});

export const updateUserSchema = object({
  id: number().integer().required(),
  username: string()
    .required("Campo requerido")
    .min(2, "El nombre de usuario debe contener al menos 2 caracteres"),
  name: string()
    .required("Campo requerido")
    .min(2, "El nombre debe contener al menos 2 caracteres"),
  surname: string()
    .required("Campo requerido")
    .min(2, "El apellido debe contener al menos 2 caracteres"),
  email: string().email("Debe ser un email valido").required("Campo requerido"),
  password: string(),
  role: string()
    .matches(/^\d+$/, "Debe ser un id con caracteres numericos")
    .required("Campo requerido"),
});

// MIME types de los formatos de archivo
// Si solo validáramos por extensión, alguien podría subir un archivo malicioso renombrado como
// cv.docx.exe. Por eso, validar por MIME type es más seguro.

const FILE_TYPES = [
  "application/pdf", // PDF
  "application/msword", // DOC (Word 97-2003)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX (Word moderno)
  "text/plain", // TXT
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const postulationSchema = object({
  name: string()
    .required("Campo requerido")
    .min(2, "El nombre debe contener al menos 2 caracteres")
    .max(30, "El nombre no puede contener mas de 30 caracteres"),
  surname: string()
    .required("Campo requerido")
    .min(2, "El nombre debe contener al menos 2 caracteres")
    .max(30, "El nombre no puede contener mas de 30 caracteres"),
  genre: string()
    .required("Campo requerido")
    .oneOf(["male", "female", "other"]),
  age: number()
    .integer()
    .required("Campo requerido")
    .min(18, "El postulante debe ser mayor de 18 años")
    .max(80, "Supera los 80 años"),
  email: string().email("Debe ser un email valido").required("Campo requerido"),
  sector: string()
    .required("Campo requerido")
    .oneOf(sectorOptions.map((sector) => sector.key)),
  note: string().max(400, "La nota no puede tener mas de 400 caracteres"),
  campNo: number().integer(),
  resume: mixed<File>()
    .required("El currículum es obligatorio")
    .test(
      "fileType",
      "Solo se permiten archivos PDF, DOC, DOCX o TXT",
      (file) => {
        return file && FILE_TYPES.includes(file.type);
      },
    )
    .test("fileSize", "El archivo no debe superar los 5MB", (file) => {
      return file && file.size <= MAX_FILE_SIZE;
    }),
});
