import { expect, type Page } from "@playwright/test";

export const publicCopy = {
  es: {
    headerTitle: "Contanos cómo fue tu experiencia",
    localeLabel: "Idioma",
    progressLabel: "Pregunta {current} de {total}",
    overallQuestion: "¿Cómo fue tu experiencia general?",
    overallInstruction: "Seleccione una calificación del 1 al 5.",
    aspectsQuestion: "¿Qué aspectos querés destacar?",
    aspectsInstruction: "Seleccione hasta tres aspectos.",
    otherLabel: "Otro",
    sentimentQuestion: "¿Cómo calificarías cada aspecto?",
    sentimentInstruction: "Indique una valoración para cada aspecto.",
    commentQuestion: "¿Querés agregar un comentario?",
    commentInstruction: "El comentario es opcional.",
    commentLabel: "Comentario",
    personalDataWarning: "No incluya datos personales.",
    verificationTitle: "Antes de enviar",
    verificationInstruction: "Complete la verificación para continuar.",
    privacyNotice: "Tu respuesta nos ayuda a mejorar.",
    backLabel: "Atrás",
    nextLabel: "Continuar",
    submitLabel: "Enviar respuesta",
    loadingStatus: "Cargando la encuesta…",
    ratingRequired: "Seleccione una calificación para continuar.",
    aspectsRequired: "Seleccione al menos un aspecto para continuar.",
    otherRequired: "Describa el aspecto seleccionado.",
    sentimentsRequired: "Indique una valoración para cada aspecto.",
    verificationFailed: "No se pudo completar la verificación.",
    submittingStatus: "Enviando respuesta…",
    genericFailure: "No se pudo enviar la respuesta. Intente nuevamente.",
    successTitle: "Gracias por compartir su experiencia.",
    successMessage: "La respuesta se recibió correctamente.",
    receiptLabel: "Número de referencia:",
  },
  en: {
    headerTitle: "Tell us about your experience",
    localeLabel: "Language",
    progressLabel: "Question {current} of {total}",
    overallQuestion: "How was your overall experience?",
    overallInstruction: "Select a rating from 1 to 5.",
    aspectsQuestion: "Which aspects would you like to highlight?",
    aspectsInstruction: "Select up to three aspects.",
    otherLabel: "Other",
    sentimentQuestion: "How would you rate each aspect?",
    sentimentInstruction: "Choose a rating for each selected aspect.",
    commentQuestion: "Would you like to add a comment?",
    commentInstruction: "Comments are optional.",
    commentLabel: "Comment",
    personalDataWarning: "Do not include personal data.",
    verificationTitle: "Before you submit",
    verificationInstruction: "Complete verification to continue.",
    privacyNotice: "Your response helps us improve.",
    backLabel: "Back",
    nextLabel: "Continue",
    submitLabel: "Submit response",
    loadingStatus: "Loading the survey…",
    ratingRequired: "Select a rating to continue.",
    aspectsRequired: "Select at least one aspect to continue.",
    otherRequired: "Describe the selected aspect.",
    sentimentsRequired: "Choose a rating for each aspect.",
    verificationFailed: "Verification could not be completed.",
    submittingStatus: "Submitting response…",
    genericFailure: "The response could not be submitted. Please try again.",
    successTitle: "Thank you for sharing your experience.",
    successMessage: "Your response was received.",
    receiptLabel: "Reference number:",
  },
  pt: {
    headerTitle: "Conte-nos sobre sua experiência",
    localeLabel: "Idioma",
    progressLabel: "Pergunta {current} de {total}",
    overallQuestion: "Como foi sua experiência geral?",
    overallInstruction: "Selecione uma avaliação de 1 a 5.",
    aspectsQuestion: "Quais aspectos você gostaria de destacar?",
    aspectsInstruction: "Selecione até três aspectos.",
    otherLabel: "Outro",
    sentimentQuestion: "Como você avaliaria cada aspecto?",
    sentimentInstruction:
      "Escolha uma avaliação para cada aspecto selecionado.",
    commentQuestion: "Você gostaria de adicionar um comentário?",
    commentInstruction: "O comentário é opcional.",
    commentLabel: "Comentário",
    personalDataWarning: "Não inclua dados pessoais.",
    verificationTitle: "Antes de enviar",
    verificationInstruction: "Conclua a verificação para continuar.",
    privacyNotice: "Sua resposta nos ajuda a melhorar.",
    backLabel: "Voltar",
    nextLabel: "Continuar",
    submitLabel: "Enviar resposta",
    loadingStatus: "Carregando a pesquisa…",
    ratingRequired: "Selecione uma avaliação para continuar.",
    aspectsRequired: "Selecione pelo menos um aspecto para continuar.",
    otherRequired: "Descreva o aspecto selecionado.",
    sentimentsRequired: "Escolha uma avaliação para cada aspecto.",
    verificationFailed: "Não foi possível concluir a verificação.",
    submittingStatus: "Enviando resposta…",
    genericFailure: "Não foi possível enviar a resposta. Tente novamente.",
    successTitle: "Agradecemos por compartilhar sua experiência.",
    successMessage: "Sua resposta foi recebida.",
    receiptLabel: "Número de referência:",
  },
} as const;

export const publicSurveyResponse = {
  contractVersion: "feedback-public.v1",
  point: { pointKey: "summit", displayName: "Cumbre" },
  survey: {
    versionKey: "visitor-v1",
    translations: publicCopy,
    aspects: [
      {
        aspectKey: "views",
        sortOrder: 1,
        labels: { es: "Vistas", en: "Views", pt: "Vistas" },
      },
    ],
  },
  sessionToken: "synthetic-session-token",
  expiresAt: "2030-09-18T14:00:00.000Z",
};

export async function selectPublicRating(
  page: Page,
  rating: 1 | 2 | 3 | 4 | 5,
): Promise<void> {
  const star = page.locator(".feedback-star-choice").nth(rating - 1);
  await star.click();
  await expect(page.getByRole("radio", { name: String(rating) })).toBeChecked();
}

export async function installSyntheticCaptchaStub(page: Page): Promise<void> {
  await page.addInitScript({
    content:
      'window.grecaptcha={render:function(_,o){window.__tb113CaptchaCallback=o.callback;return 1;},getResponse:function(){return "synthetic-captcha-token";},reset:function(){}};',
  });
  await page.route("**/recaptcha/api.js**", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: 'window.grecaptcha={render:function(_,o){o.callback("synthetic-captcha-token");return 1;},getResponse:function(){return "synthetic-captcha-token";},reset:function(){}};window.onloadcallback();',
    });
  });
}
