"use client";

import { ButtonDos, FormError } from "@/components";
import { loginAction } from "@/lib/actions";
import { loginSchema } from "@/lib/schemas/forms";
import type { LoginFormData, LoginUserRequest } from "@/types";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { Input, Spinner } from "@heroui/react";
import { useFormik } from "formik";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const toggleVisibility = () => setIsVisible(!isVisible);

  const onSubmit = async (values: LoginUserRequest) => {
    setIsSubmitting(true);
    try {
      const res = await loginAction(values);
      if (res.error) {
        setIsSubmitting(false);
        return setError(res.error);
      }
      router.push(ADMIN_ROUTES.DASHBOARD);
    } catch (error) {
      setIsSubmitting(false);
      setError("Algo salio mal");
      console.log("login submit error", error);
    }
  };

  const { values, handleChange, handleSubmit, handleBlur, errors, touched } =
    useFormik<LoginFormData>({
      initialValues: {
        identifier: "",
        password: "",
      },
      validationSchema: loginSchema,
      onSubmit,
    });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Input
        id="identifier"
        name="identifier"
        label={<p className="font-bold">Correo Electrónico</p>}
        errorMessage={errors.identifier}
        isInvalid={errors.identifier !== undefined && touched.identifier}
        variant="bordered"
        radius="lg"
        labelPlacement="outside"
        type="text"
        className="w-full"
        onChange={(evt) => {
          if (error !== "") setError("");
          handleChange(evt);
        }}
        onBlur={handleBlur}
      />
      <Input
        id="password"
        name="password"
        label={<p className="font-bold">Contraseña</p>}
        errorMessage={errors.password}
        isInvalid={errors.password !== undefined && touched.password}
        variant="bordered"
        radius="lg"
        labelPlacement="outside"
        value={values.password}
        onChange={(evt) => {
          if (error !== "") setError("");
          handleChange(evt);
        }}
        onBlur={handleBlur}
        endContent={
          <button
            className="focus:outline-none"
            type="button"
            onClick={toggleVisibility}
            aria-label="toggle password visibility"
          >
            {isVisible ? (
              <EyeOff className="pointer-events-none text-2xl text-default-400" />
            ) : (
              <Eye className="pointer-events-none text-2xl text-default-400" />
            )}
          </button>
        }
        type={isVisible ? "text" : "password"}
        className="w-full"
      />
      <ButtonDos type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? <Spinner size="sm" color="white" /> : "Acceder"}
      </ButtonDos>
      <FormError message={error} />
    </form>
  );
}
