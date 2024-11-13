import type { LoginUserRequest } from "@/types/api";
import * as Yup from "yup";

export const loginSchema: Yup.ObjectSchema<LoginUserRequest> = Yup.object({
  identifier: Yup.string()
    .email("Direccion de mail invalida")
    .required("Campo requerido"),
  password: Yup.string().required("Campo requerido"),
});
