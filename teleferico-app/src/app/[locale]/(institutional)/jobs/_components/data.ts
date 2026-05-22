import type { Locales } from "@/types";

export const translations: Record<
  Locales,
  {
    success: { title: string; message: string };
    failed: { title: string; message: string };
    translationError: string;
    optional: string;
    privacyNotice: {
      beforeLink: string;
      linkLabel: string;
      afterLink: string;
    };
    reload: { title: string; message: string };
    captchaFailed: { title: string; message: string };
    captchaMissing: { title: string; message: string };
    tooManyRequests: { title: string; message: string };
    duplicateSubmission: { title: string; message: string };
    sectorEmpty: string;
  }
> = {
  "es-AR": {
    success: { title: "Enviado", message: "Formulario enviado correctamente" },
    failed: { title: "Error", message: "Ocurrió un error inesperado" },
    translationError: "No se pudo recuperar el contenido del formulario",
    optional: "opcional",
    privacyNotice: {
      beforeLink:
        "Al enviar este formulario, autorizás al Complejo Turístico Teleférico Cerro Otto a tratar tus datos personales y tu currículum vitae para evaluar tu postulación laboral. Podés leer más en",
      linkLabel: "la política de privacidad",
      afterLink:
        ". Los datos se almacenan de forma privada y solo accede personal autorizado.",
    },
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
    duplicateSubmission: {
      title: "Solicitud duplicada",
      message: "Ya enviaste una solicitud de trabajo para este sector.",
    },
    sectorEmpty:
      "No hay sectores activos disponibles en este momento. Volvé a intentarlo más tarde.",
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
    optional: "optional",
    privacyNotice: {
      beforeLink:
        "By submitting this form, you authorize Complejo Turístico Teleférico Cerro Otto to process your personal data and CV to evaluate your job application. You can read more in",
      linkLabel: "the privacy policy",
      afterLink:
        ". The data is stored privately and only authorized staff can access it.",
    },
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
    duplicateSubmission: {
      title: "Duplicate Request",
      message: "You have already submitted a job application for this sector.",
    },
    sectorEmpty:
      "There are no active sectors available at the moment. Please try again later.",
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
    optional: "opcional",
    privacyNotice: {
      beforeLink:
        "Ao enviar este formulário, você autoriza o Complejo Turístico Teleférico Cerro Otto a tratar seus dados pessoais e currículo para avaliar sua candidatura. Você pode ler mais em",
      linkLabel: "a política de privacidade",
      afterLink:
        ". Os dados ficam armazenados de forma privada e apenas pessoal autorizado tem acesso.",
    },
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
    duplicateSubmission: {
      title: "Solicitação duplicada",
      message: "Você já enviou uma solicitação de emprego para este setor.",
    },
    sectorEmpty:
      "Não há setores ativos disponíveis no momento. Tente novamente mais tarde.",
  },
};
