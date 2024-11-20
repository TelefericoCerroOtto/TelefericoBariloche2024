// import type { LoginUserRequest } from "@/types/api";
import * as Yup from "yup";

// TODO: Crear el tipo de la request
// export const accessTicketSchema: Yup.ObjectSchema<AccessTicketRequest> = Yup.object({
export const activityTicketSchema = Yup.object({
  activityNameEN: Yup.string().required("Campo requerido"),
  activityNameES: Yup.string().required("Campo requerido"),
  activityNamePT: Yup.string().required("Campo requerido"),
  price: Yup.number()
    .integer("El precio debe ser un numero entero")
    .required("Campo requerido"),
  minAge: Yup.number()
    .integer("El precio debe ser un numero entero")
    .required("Campo requerido"),
  season: Yup.string().oneOf([
    "verano",
    "otoño",
    "invierno",
    "primavera",
    "allSeasons",
  ]),
  requirementsEN: Yup.string().required("Campo requerido"),
  requirementsES: Yup.string().required("Campo requerido"),
  requirementsPT: Yup.string().required("Campo requerido"),
});

export const accessTicketSchema = Yup.object({
  accessNameEN: Yup.string().required("Campo requerido"),
  accessNameES: Yup.string().required("Campo requerido"),
  accessNamePT: Yup.string().required("Campo requerido"),
  price: Yup.number()
    .integer("El precio debe ser un numero entero")
    .required("Campo requerido"),
  elevationMethod: Yup.string().oneOf(["teleferico", "camino"]),
});
