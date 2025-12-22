import type { Locales } from "@/types";

export const translations: Record<
  Locales,
  {
    success: { title: string; message: string };
    failed: { title: string; message: string };
    translationError: string;
    reload: { title: string; message: string };
    captchaFailed: { title: string; message: string };
    captchaMissing: { title: string; message: string };
    tooManyRequests: { title: string; message: string };
  }
> = {
  "es-AR": {
    success: { title: "Enviado", message: "Formulario enviado correctamente" },
    failed: { title: "Error", message: "Ocurrió un error inesperado" },
    translationError: "No se pudo recuperar el contenido del formulario",
    reload: {
      title: "Recargar página",
      message:
        "Ocurrió un error inesperado con el formulario. Vamos a recargar la página para que puedas enviarlo de nuevo.",
    },
    captchaFailed: {
      title: "Captcha fallido",
      message: "El captcha falló. Por favor, inténtalo de nuevo.",
    },
    captchaMissing: {
      title: "Captcha faltante",
      message: "No se detectó el captcha. Por favor, inténtalo de nuevo.",
    },
    tooManyRequests: {
      title: "Demasiadas solicitudes",
      message:
        "Has enviado demasiadas solicitudes, por favor intentalo más tarde.",
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
    translationError: "Could not retrieve form content",
    reload: {
      title: "Reload page",
      message:
        "An unexpected error occurred with the form. We'll reload the page so you can submit it again.",
    },
    captchaFailed: {
      title: "Captcha failed",
      message: "Captcha failed. Please try again.",
    },
    captchaMissing: {
      title: "Missing Captcha",
      message: "Captcha was not detected. Please try again.",
    },
    tooManyRequests: {
      title: "Too Many Requests",
      message: "You have sent too many requests, please try again later.",
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
    translationError: "Não foi possível recuperar o conteúdo do formulário",
    reload: {
      title: "Recarregar página",
      message:
        "Ocorreu um erro inesperado com o formulário. Vamos recarregar a página para que você possa enviá-lo novamente.",
    },
    captchaFailed: {
      title: "Captcha falhou",
      message: "O captcha falhou. Por favor, tente novamente.",
    },
    captchaMissing: {
      title: "Captcha ausente",
      message: "O captcha não foi detectado. Por favor, tente novamente.",
    },
    tooManyRequests: {
      title: "Muitas solicitações",
      message:
        "Você enviou solicitações demais, por favor tente novamente mais tarde.",
    },
  },
};
