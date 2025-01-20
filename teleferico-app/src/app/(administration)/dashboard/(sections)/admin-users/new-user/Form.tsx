"use client";

import { FormButtons, Input } from "@/components";
import { newUserSchema } from "@/lib/schemas/forms";
import type { NewUserFormData } from "@/types/forms";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { selectInputStyles } from "@/utils/styles";
import { Select, SelectItem } from "@nextui-org/react";
import { useFormik } from "formik";

export default function Form() {
  const onSubmit = async (values: NewUserFormData) => {
    console.log("form values", values);
  };

  const { values, handleChange, handleSubmit, errors } =
    useFormik<NewUserFormData>({
      initialValues: {
        name: "",
        surname: "",
        email: "",
        password: "",
        role: "administrative",
      },
      validationSchema: newUserSchema,
      onSubmit,
    });

  console.log("errors", errors);

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <Input
        label="Nombre"
        name="name"
        id="name"
        value={values.name}
        onChange={handleChange}
      />
      <Input
        label="Apellido"
        name="surname"
        id="surname"
        value={values.surname}
        onChange={handleChange}
      />
      <Input
        label="Email"
        name="email"
        id="email"
        value={values.email}
        onChange={handleChange}
      />
      <Input
        label="Contraseña"
        name="password"
        id="password"
        type="password"
        value={values.password}
        onChange={handleChange}
      />
      <Select
        {...selectInputStyles}
        name="role"
        id="role"
        label="Rol"
        placeholder="Seleccionar"
        value={values.role}
        onChange={handleChange}
      >
        <SelectItem key="administrative">Administrativo</SelectItem>
        <SelectItem key="recluter">Reclutador</SelectItem>
        <SelectItem key="photographer">Fotografo</SelectItem>
        <SelectItem key="admin">Administrador</SelectItem>
      </Select>
      <FormButtons cancelRedirectRoute={ADMIN_ROUTES.PRICES} />
    </form>
  );
}
