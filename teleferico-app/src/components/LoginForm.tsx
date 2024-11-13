"use client";

import { authenticate, signInAction } from "@/lib/actions/actions";
import { loginSchema } from "@/lib/schemas/forms/auth";
import type { LoginFormData } from "@/types/forms";
import { Spinner } from "@nextui-org/react";
import { useFormik } from "formik";
import Input from "./ui/Input";
import { useRouter } from "next/navigation";
// import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const onSubmit = async (values: LoginFormData) => {
    try {
      const responseNextAuth = await authenticate(values);
      console.log("responseNextAuth", responseNextAuth);
      // if (responseNextAuth) {

      // }
      // const res = await fetch("/api/login", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(values),
      // });

      // const { data } = await res.json();
      // if (!data.ok) {
      //   setErrors({
      //     identifier: "Credenciales incorrectas",
      //     password: "Credenciales incorrectas",
      //   });
      //   return;
      // }
      // router.push("/dashboard");
    } catch (error) {
      console.log("submit login error", error);
    }
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setErrors,
  } = useFormik<LoginFormData>({
    initialValues: { identifier: "", password: "" },
    validationSchema: loginSchema,
    onSubmit,
  });

  return (
    <form action={signInAction} className="flex flex-col gap-2">
      <Input
        label="Email"
        type="email"
        id="identifier"
        name="identifier"
        value={values.identifier}
        error={errors.identifier}
        touched={touched.identifier}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <Input
        label="Contraseña"
        type="password"
        id="password"
        name="password"
        value={values.password}
        error={errors.password}
        touched={touched.password}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <button
        type="submit"
        className="h-[45px] w-full rounded-md bg-[#bf2c37] p-2 text-white hover:bg-[#bf2c37]/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? <Spinner size="sm" color="primary" /> : "Ingresar"}
      </button>
    </form>
  );
}
