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
  const [honeypot, setHoneypot] = useState("");
  const [submittedAt, setSubmittedAt] = useState(() => Date.now());
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const onSubmit = async (values: ContactFormData) => {
    if (isLoading) return; // prevent double submits while a request is in flight
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await contactUsAction({
        token,
        values,
        honeypot,
        submittedAt,
      });

      const message = res.message;

      if (res.success) {
        alert(message || "Formulario enviado correctamente");
        setToken(null);
        setHoneypot("");
        setSubmittedAt(Date.now());
        recaptchaRef.current?.reset();
        resetForm();
      } else {
        alert(message || "Ocurrio un error inesperado");
      }
    } catch (error) {
      console.error(
        "submit contact form error",
        error instanceof Error ? error.message : error,
      );
      alert("Ocurrio un error inesperado");
    } finally {
      setIsLoading(false);
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
      {/* Honeypot field discourages bots while staying invisible to real users. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="company" aria-hidden="true">
          Do not fill out
        </label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
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
