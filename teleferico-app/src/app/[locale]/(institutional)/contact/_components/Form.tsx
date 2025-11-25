"use client";

import { ButtonDos, FormError, InputSkeleton } from "@/components";
import { useLocale, useTranslation } from "@/hooks";
import { ContactFormData, Locales } from "@/types";
import { Input, Textarea } from "@heroui/react";
import { useFormik } from "formik";
import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { contactUsAction } from "./actions";
import { buildContactSchema } from "@/lib/schemas";

const translations: Record<
  Locales,
  { success: string; failed: string; reload: string; translationError: string }
> = {
  "es-AR": {
    success: "Formulario enviado correctamente",
    failed: "Ocurrio un error inesperado",
    reload:
      "Ocurrió un error inesperado con el formulario. Vamos a recargar la página para que puedas enviarlo de nuevo.",
    translationError: "No se pudo recuperar el contenido del formulario",
  },
  en: {
    success: "Form submitted successfully",
    failed: "An unexpected error occurred",
    reload:
      "An unexpected error occurred with the form. We will reload the page so you can submit it again.",
    translationError: "Could not retrieve the form content",
  },
  pt: {
    success: "Formulário enviado com sucesso",
    failed: "Ocorreu um erro inesperado",
    reload:
      "Ocorreu um erro inesperado com o formulário. Vamos recarregar a página para que você possa enviá-lo novamente.",
    translationError: "Não foi possível recuperar o conteúdo do formulário",
  },
};

export default function Form() {
  const { data, error, loading: loadingLocale } = useTranslation("forms");
  const { locale } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [formLoadedAt, setFormLoadedAt] = useState(() => Date.now());
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const onSubmit = async (values: ContactFormData) => {
    if (isLoading) return; // prevent double submits while a request is in flight
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await contactUsAction(token, {
        ...values,
        honeypot,
        formLoadedAt,
      });

      if (res.success) {
        alert(translations[locale].success);
        setToken(null);
        setHoneypot("");
        setFormLoadedAt(Date.now());
        recaptchaRef.current?.reset();
        resetForm();
      } else {
        console.log("Contact form submission failed: ", res.message);
        if (res.data?.code === "INVALID_FORM_AGE") {
          alert(translations[locale].reload);
          window.location.reload();
        }
        alert(translations[locale].failed);
      }
    } catch (error) {
      console.log("Contact form onSubmit error: ", error);
      recaptchaRef.current?.reset();
      alert(translations[locale].failed);
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
    return <FormError message={translations[locale].translationError} />;

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
