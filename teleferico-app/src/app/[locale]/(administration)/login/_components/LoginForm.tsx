"use client";

import { ButtonDos, FormError } from "@/components";
import {
  ADMIN_LOGIN_QUERY_PARAMS,
  ADMIN_LOGIN_REASONS,
  ADMIN_ROUTES,
} from "@/lib/constants/routes.const";
import { formInputClassNames } from "@/lib/constants/styles.const";
import { loginSchema } from "@/lib/schemas";
import type { LoginFormData, LoginUserRequest } from "@/types";
import { Alert, Input, Spinner } from "@heroui/react";
import { useFormik } from "formik";
import { Eye, EyeOff } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginForm() {
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingSessionAlert, setIsClosingSessionAlert] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { update } = useSession();

  const reason = searchParams.get(ADMIN_LOGIN_QUERY_PARAMS.REASON);
  const showSessionExpiredAlert =
    reason === ADMIN_LOGIN_REASONS.SESSION_EXPIRED && !isClosingSessionAlert;

  const toggleVisibility = () => setIsVisible(!isVisible);

  useEffect(() => {
    setIsClosingSessionAlert(false);
  }, [reason]);

  const handleCloseSessionAlert = () => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    nextSearchParams.delete(ADMIN_LOGIN_QUERY_PARAMS.REASON);
    setIsClosingSessionAlert(true);

    const nextUrl = nextSearchParams.toString()
      ? `${pathname}?${nextSearchParams.toString()}`
      : pathname;

    router.replace(nextUrl, { scroll: false });
  };

  const onSubmit = async (values: LoginUserRequest) => {
    setIsSubmitting(true);
    try {
      const res = await signIn("credentials", { ...values, redirect: false });
      if (res?.error) {
        setIsSubmitting(false);
        return setError(res.error);
      }
      // Ensure the session is populated on the client immediately
      await update();
      router.replace(ADMIN_ROUTES.DASHBOARD);
      router.refresh();
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
      {showSessionExpiredAlert ? (
        <Alert
          color="warning"
          title="Sesión expirada"
          description="Por seguridad, tu sesión finalizó. Volvé a iniciar sesión para continuar."
          isClosable
          onClose={handleCloseSessionAlert}
        />
      ) : null}
      <Input
        id="identifier"
        name="identifier"
        label={<p className="text-lg font-bold">Correo Electrónico</p>}
        errorMessage={errors.identifier}
        isInvalid={errors.identifier !== undefined && touched.identifier}
        variant="bordered"
        radius="lg"
        labelPlacement="outside"
        type="text"
        className="w-full"
        classNames={formInputClassNames}
        onChange={(evt) => {
          if (error !== "") setError("");
          handleChange(evt);
        }}
        onBlur={handleBlur}
      />
      <Input
        id="password"
        name="password"
        label={<p className="text-lg font-bold">Contraseña</p>}
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
        classNames={formInputClassNames}
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
