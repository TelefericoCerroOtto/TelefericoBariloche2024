"use client";

import { ButtonDos, FormError, Honeypot } from "@/components";
import { useLocale, useTranslation } from "@/hooks";
import { useAppAlert } from "@/hooks/use-app-alert";
import { buildContactSchema } from "@/lib/schemas";
import { ContactFormData, Locales } from "@/types";
import { Input, Textarea } from "@heroui/react";
import { useFormik } from "formik";
import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { contactUsAction } from "./actions";
import Fallback from "./Fallback";

const translations: Record<
  Locales,
  {
    success: { title: string; message: string };
    failed: { title: string; message: string };
    reload: { title: string; message: string };
    translationError: { title: string; message: string };
    captchaFailed: { title: string; message: string };
  }
> = {
  "es-AR": {
    success: { title: "Enviado", message: "Formulario enviado correctamente" },
    failed: { title: "Error", message: "Ocurrió un error inesperado" },
    reload: {
      title: "Recargar página",
      message:
        "Ocurrió un error inesperado con el formulario. Vamos a recargar la página para que puedas enviarlo de nuevo.",
    },
    translationError: {
      title: "Error de traducción",
      message: "No se pudo recuperar el contenido del formulario",
    },
    captchaFailed: {
      title: "Captcha fallido",
      message: "El captcha falló. Por favor, inténtalo de nuevo.",
    },
  },
  en: {
    success: {
      title: "Sent",
      message: "Form submitted successfully",
    },
    failed: {
      title: "Error",
      message: "An unexpected error occurred",
    },
    reload: {
      title: "Reload page",
      message:
        "An unexpected error occurred with the form. We'll reload the page so you can submit it again.",
    },
    translationError: {
      title: "Translation error",
      message: "The form content could not be retrieved",
    },
    captchaFailed: {
      title: "Captcha failed",
      message: "Captcha failed. Please try again.",
    },
  },
  pt: {
    success: {
      title: "Enviado",
      message: "Formulário enviado com sucesso",
    },
    failed: {
      title: "Erro",
      message: "Ocorreu um erro inesperado",
    },
    reload: {
      title: "Recarregar página",
      message:
        "Ocorreu um erro inesperado com o formulário. Vamos recarregar a página para que você possa enviá-lo novamente.",
    },
    translationError: {
      title: "Erro de tradução",
      message: "Não foi possível recuperar o conteúdo do formulário",
    },
    captchaFailed: {
      title: "Captcha falhou",
      message: "O captcha falhou. Por favor, tente novamente.",
    },
  },
};

export default function Form() {
  const { data, error, loading: loadingLocale } = useTranslation("forms");
  const { locale } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [formLoadedAt, setFormLoadedAt] = useState(() => Date.now());
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: ContactFormData) => {
    if (isSubmitting) return; // prevent double submits while a request is in flight
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await contactUsAction(token, {
        ...values,
        honeypot,
        formLoadedAt,
      });

      if (res.success) {
        showAlert({
          variant: "success",
          title: translations[locale].success.title,
          message: translations[locale].success.message,
        });
        setToken(null);
        setHoneypot("");
        setFormLoadedAt(Date.now());
        recaptchaRef.current?.reset();
        resetForm();
      } else {
        console.log("Contact form submission failed: ", res.message);

        const code = res.data?.code;
        if (code === "INVALID_FORM_AGE") {
          showAlert({
            variant: "warning",
            title: translations[locale].reload.title,
            message: translations[locale].reload.message,
          });
          window.location.reload();
          return;
        }

        if (code === "CAPTCHA_FAILED") {
          showAlert({
            variant: "danger",
            title: translations[locale].captchaFailed.title,
            message: translations[locale].captchaFailed.message,
          });
          recaptchaRef.current?.reset();
          return;
        }

        showAlert({
          variant: "danger",
          title: translations[locale].failed.title,
          message: translations[locale].failed.message,
        });
      }
    } catch (error) {
      console.log("Contact form onSubmit error: ", error);
      recaptchaRef.current?.reset();
      showAlert({
        variant: "danger",
        title: translations[locale].failed.title,
        message: translations[locale].failed.message,
      });
    } finally {
      setIsSubmitting(false);
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
      <FormError message={translations[locale].translationError.message} />
    );

  if (loadingLocale) return <Fallback />;

  const formIntl = data!.data[0].jsonValue;

  return (
    <form className="grid flex-grow grid-cols-1 gap-4" onSubmit={handleSubmit}>
      <Honeypot
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
      />
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
        isLoading={isSubmitting}
        disabled={
          isSubmitting ||
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
