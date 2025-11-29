"use client";

import { FormButtons, FormError } from "@/components";
import {
  validateEmailAvailability,
  validateUsernameAvailability,
} from "@/lib/actions";
import { updateUserSchema } from "@/lib/schemas";
import type { UpdateUserFormData, UserResponse, UserRole } from "@/types";
import { ADMIN_ROUTES, selectInputStyles } from "@/utils";
import { Input, Select, SelectItem } from "@heroui/react";
import { useFormik } from "formik";
import debounce from "just-debounce-it";
import { isEqual } from "lodash";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { updateUserAction } from "../_components/actions";
import { useAppAlert } from "@/hooks";

interface Props {
  user: UserResponse<{ role: UserRole }>;
  roles: UserRole[];
}

const GEN_ERR_MSG = "Algo salió mal";

export default function Form(props: Props) {
  const { user, roles } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { showAlert } = useAppAlert();

  const onSubmit = useCallback(async (values: UpdateUserFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateUserAction(initialValues, values);
      if (res.ok) {
        setIsSubmitting(false);
        showAlert({
          title: "Éxito",
          message: "Usuario actualizado correctamente",
          variant: "success",
        });
        router.push(ADMIN_ROUTES.ADMIN_USERS);
        return;
      } else {
        setIsSubmitting(false);
        // Eval different failed cases
        switch (res.data?.error.status) {
          case 401:
            setError("No tienes permisos suficientes");
            break;

          default:
            setError(GEN_ERR_MSG);
            break;
        }
        return;
      }
    } catch (error) {
      setIsSubmitting(false);
      setError(GEN_ERR_MSG);
      console.log("new user submit error", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialValues = useMemo(
    () => ({
      id: user.id,
      name: user.name,
      surname: user.surname,
      username: user.username,
      email: user.email,
      password: "",
      role: user.role.id.toString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    values,
    errors,
    touched,
    handleChange,
    handleSubmit,
    handleBlur,
    setFieldError,
  } = useFormik<UpdateUserFormData>({
    initialValues,
    validationSchema: updateUserSchema,
    onSubmit,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUsernameValidate = useCallback(
    debounce(async (username: string) => {
      try {
        const isValid = await validateUsernameAvailability(username);
        if (!isValid && username !== initialValues.username)
          return setFieldError("username", "Nombre de usuario ya registrado");
        return;
      } catch (error) {
        console.log("validateUsernameAvailability error", error);
      }
    }, 500),
    [],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedEmailValidate = useCallback(
    debounce(async (email: string) => {
      try {
        const isValid = await validateEmailAvailability(email);
        if (!isValid && email !== initialValues.email)
          return setFieldError("email", "Email ya registrado");
        return;
      } catch (error) {
        console.log("validateEmailAvailability error", error);
      }
    }, 500),
    [],
  );

  const isUnchanged = isEqual(values, initialValues);
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <Input
        label="Nombre"
        name="name"
        id="name"
        autoComplete="off"
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.name}
        isInvalid={errors.name !== undefined && touched.name}
      />
      <Input
        label="Apellido"
        name="surname"
        id="surname"
        autoComplete="off"
        value={values.surname}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.surname}
        isInvalid={errors.surname !== undefined && touched.surname}
      />
      <Input
        label="Email"
        name="email"
        id="email"
        autoComplete="off"
        value={values.email}
        onChange={(evt) => {
          handleChange(evt);
          debouncedEmailValidate(evt.target.value);
        }}
        onBlur={handleBlur}
        errorMessage={errors.email}
        isInvalid={errors.email !== undefined && touched.email}
      />
      <Input
        label="Nombre de Usuario"
        name="username"
        id="username"
        autoComplete="off"
        value={values.username}
        onChange={(evt) => {
          handleChange(evt);
          debouncedUsernameValidate(evt.target.value);
        }}
        onBlur={handleBlur}
        errorMessage={errors.username}
        isInvalid={errors.username !== undefined && touched.username}
      />
      <Input
        label="Contraseña"
        name="password"
        id="password"
        autoComplete="off"
        type="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.password}
        isInvalid={errors.password !== undefined && touched.password}
      />
      <Select
        {...selectInputStyles}
        name="role"
        id="role"
        label="Rol"
        placeholder="Seleccionar"
        value={values.role as string}
        defaultSelectedKeys={values.role as string}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.role}
        isInvalid={errors.role !== undefined && touched.role}
        items={roles}
      >
        {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
      </Select>
      <FormError message={error} />
      <FormError message={error} />
      <FormButtons
        cancelRedirectRoute={ADMIN_ROUTES.PRICES}
        disableSubmitButton={isUnchanged || hasErrors}
        isSubmitting={isSubmitting}
      />
    </form>
  );
}
