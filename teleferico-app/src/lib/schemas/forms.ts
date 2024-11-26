import type { LoginUserRequest } from "@/types/api";
import { number, object, string, type ObjectSchema } from "yup";

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

export const zoneScheduleSchema = object({
  openHour: number()
    .integer("La hora debe ser un numero entero")
    .min(0, "La hora minima es las 0hs")
    .max(23, "La hora maxima es las 23hs")
    .required("Campo requerido"),
  closeHour: number()
    .integer("La hora debe ser un numero entero")
    .min(0, "La hora minima es las 0hs")
    .max(23, "La hora maxima es las 23hs")
    .required("Campo requerido"),
  openMins: number()
    .integer("Los minutos deben ser un numero entero")
    .min(0, "Los minutos minimos son 0")
    .max(23, "Los minutos maximos son 59")
    .required("Campo requerido"),
  closeMins: number()
    .integer("Los minutos deben ser un numero entero")
    .min(0, "Los minutos minimos son 0")
    .max(23, "Los minutos maximos son 59")
    .required("Campo requerido"),
});
