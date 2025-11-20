"use client";

import { ButtonDos, FormError, InputSkeleton } from "@/components";
import { useLocale, useTranslation } from "@/hooks";
import { ContactFormData } from "@/types";
import { Input, Textarea } from "@heroui/react";
import { useFormik } from "formik";
import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { contactUsAction } from "./actions";
import { buildContactSchema } from "@/lib/schemas";

export default function Form() {
  const { data, error, loading: loadingLocale } = useTranslation("forms");
  const { locale } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const onSubmit = async (values: ContactFormData) => {
    setIsLoading(true);

    const res = await contactUsAction(token, values);

    setIsLoading(false);

    if (res.success) {
      alert("Formulario enviado correctamente");
      setToken(null);
      recaptchaRef.current?.reset();
      resetForm();
    } else {
      alert("Ocurrio un error inesperado");
      console.log("submit contact form error", res.message);
    }
  };

  const {
    values,
    handleChange,
    errors,
    handleSubmit,
    resetForm,
    touched,
    handleBlur,
  } = useFormik<ContactFormData>({
    initialValues: { name: "", email: "", consultation: "" },
    onSubmit,
    validationSchema: buildContactSchema(locale),
  });

  if (error)
    return (
      <FormError message="No se pudo recuperar el contenido de la formulario" />
    );

  if (loadingLocale)
    return (
      <div className="grid flex-grow grid-cols-1 gap-4">
        <InputSkeleton />
        <InputSkeleton />
        <InputSkeleton />
      </div>
    );

  const formIntl = data!.data[0].jsonValue;

  return (
    <form className="grid flex-grow grid-cols-1 gap-4" onSubmit={handleSubmit}>
      <Input
        id="name"
        name="name"
        onChange={handleChange}
        onBlur={handleBlur}
        value={values.name}
        label={formIntl.fields["name"].label}
        labelPlacement="outside"
        placeholder={formIntl.fields["name"].placeholder}
        errorMessage={errors.name}
        isInvalid={!!errors.name && touched.name}
      />
      <Input
        id="email"
        name="email"
        onChange={handleChange}
        onBlur={handleBlur}
        value={values.email}
        label={formIntl.fields["email"].label}
        labelPlacement="outside"
        placeholder={formIntl.fields["email"].placeholder}
        errorMessage={errors.email}
        isInvalid={!!errors.email && touched.email}
        type="email"
      />
      <Textarea
        id="consultation"
        name="consultation"
        onChange={handleChange}
        onBlur={handleBlur}
        value={values.consultation}
        label={formIntl.fields["consultation"].label}
        labelPlacement="outside"
        placeholder={formIntl.fields["consultation"].placeholder}
        errorMessage={errors.consultation}
        isInvalid={!!errors.consultation && touched.consultation}
      />
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ""}
        onChange={setToken}
      />
      <ButtonDos
        type="submit"
        className="w-[90px]"
        isLoading={isLoading}
        disabled={
          isLoading ||
          !token ||
          Object.keys(errors).length > 0 ||
          values.name === ""
        }
      >
        {formIntl.buttons.send}
      </ButtonDos>
    </form>
  );
}
