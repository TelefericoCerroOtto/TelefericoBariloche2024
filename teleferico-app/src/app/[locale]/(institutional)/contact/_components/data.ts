import type { Locales } from "@/types";

export const translations: Record<
  Locales,
  {
    success: { title: string; message: string };
    failed: { title: string; message: string };
    reload: { title: string; message: string };
    translationError: { title: string; message: string };
    captchaFailed: { title: string; message: string };
    captchaMissing: { title: string; message: string };
    tooManyRequests: { title: string; message: string };
    tooManyEmails: { title: string; message: string };
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
    captchaMissing: {
      title: "Captcha faltante",
      message: "No se detectó el captcha. Por favor, inténtalo de nuevo.",
    },
    tooManyRequests: {
      title: "Demasiadas solicitudes",
      message:
        "Has enviado demasiadas solicitudes desde este dispositivo. Por favor, intentá de nuevo más tarde.",
    },
    tooManyEmails: {
      title: "Límite de mensajes",
      message: "Alcanzaste el límite de consultas permitidas con este correo electrónico.",
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
    captchaMissing: {
      title: "Missing Captcha",
      message: "Captcha was not detected. Please try again.",
    },
    tooManyRequests: {
      title: "Too Many Requests",
      message: "You have sent too many requests from this device. Please try again later.",
    },
    tooManyEmails: {
      title: "Message Limit Reached",
      message: "You have reached the maximum number of inquiries allowed for this email address.",
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
    captchaMissing: {
      title: "Captcha ausente",
      message: "O captcha não foi detectado. Por favor, tente novamente.",
    },
    tooManyRequests: {
      title: "Muitas solicitações",
      message:
        "Você enviou solicitações demais deste dispositivo. Por favor, tente novamente mais tarde.",
    },
    tooManyEmails: {
      title: "Limite de mensagens",
      message: "Você atingiu o limite de consultas permitidas com este endereço de e-mail.",
    },
  },
};
