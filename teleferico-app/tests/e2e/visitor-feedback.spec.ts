import { expect, test, type Page } from "@playwright/test";

const PUBLIC_CODE = "A".repeat(32);
const UNKNOWN_CODE = "B".repeat(32);

const copy = {
  es: {
    headerTitle: "Contanos cómo fue tu experiencia",
    localeLabel: "Idioma",
    localeEs: "ES",
    localeEn: "EN",
    localePt: "PT",
    progressLabel: "Pregunta {current} de {total}",
    overallQuestion: "¿Cómo fue tu experiencia general?",
    aspectsQuestion: "¿Qué aspectos querés destacar?",
    aspectsHint: "Podés elegir hasta tres opciones.",
    otherAspectLabel: "Otro",
    otherAspectPlaceholder: "Contanos cuál",
    sentimentsQuestion: "¿Cómo calificarías cada aspecto?",
    sentimentNegative: "Negativo",
    sentimentNeutral: "Neutral",
    sentimentPositive: "Positivo",
    commentQuestion: "¿Querés agregar un comentario?",
    commentHint: "No compartas datos personales.",
    commentPlaceholder: "Escribí tu comentario",
    commentLimit: "{count}/2000",
    verificationTitle: "Antes de enviar",
    verificationHint: "Completá la verificación para proteger este canal.",
    privacyNotice: "Usamos tu respuesta para mejorar la experiencia.",
    back: "Atrás",
    next: "Continuar",
    submit: "Enviar respuesta",
    ratingRequired: "Elegí una calificación para continuar.",
    aspectsRequired: "Elegí al menos un aspecto para continuar.",
    aspectsLimit: "Elegí hasta tres aspectos.",
    otherAspectRequired: "Describí el aspecto que elegiste.",
    sentimentsRequired: "Elegí una valoración para cada aspecto.",
    commentTooLong: "El comentario no puede superar los 2000 caracteres.",
    submissionError: "No pudimos enviar tu respuesta.",
    successTitle: "¡Gracias por compartir tu experiencia!",
    successBody: "Tu respuesta fue recibida correctamente.",
    reset: "Enviar otra respuesta",
    loadingStatus: "Cargando la encuesta…",
    loadingError:
      "No pudimos cargar la encuesta. Intentá nuevamente más tarde.",
  },
  en: {
    headerTitle: "Tell us about your experience",
    localeLabel: "Language",
    localeEs: "ES",
    localeEn: "EN",
    localePt: "PT",
    progressLabel: "Question {current} of {total}",
    overallQuestion: "How was your overall experience?",
    aspectsQuestion: "Which aspects would you like to highlight?",
    aspectsHint: "You can choose up to three options.",
    otherAspectLabel: "Other",
    otherAspectPlaceholder: "Tell us which one",
    sentimentsQuestion: "How would you rate each aspect?",
    sentimentNegative: "Negative",
    sentimentNeutral: "Neutral",
    sentimentPositive: "Positive",
    commentQuestion: "Would you like to add a comment?",
    commentHint: "Do not share personal data.",
    commentPlaceholder: "Write your comment",
    commentLimit: "{count}/2000",
    verificationTitle: "Before sending",
    verificationHint: "Complete the verification to protect this channel.",
    privacyNotice: "We use your response to improve the experience.",
    back: "Back",
    next: "Continue",
    submit: "Send response",
    ratingRequired: "Choose a rating to continue.",
    aspectsRequired: "Choose at least one aspect to continue.",
    aspectsLimit: "Choose up to three aspects.",
    otherAspectRequired: "Describe the aspect you chose.",
    sentimentsRequired: "Choose a rating for every aspect.",
    commentTooLong: "The comment cannot exceed 2000 characters.",
    submissionError: "We could not send your response.",
    successTitle: "Thank you for sharing your experience!",
    successBody: "Your response was received successfully.",
    reset: "Send another response",
    loadingStatus: "Loading the survey…",
    loadingError: "We could not load the survey.",
  },
  pt: {
    headerTitle: "Conte como foi sua experiência",
    localeLabel: "Idioma",
    localeEs: "ES",
    localeEn: "EN",
    localePt: "PT",
    progressLabel: "Pergunta {current} de {total}",
    overallQuestion: "Como foi sua experiência geral?",
    aspectsQuestion: "Quais aspectos você quer destacar?",
    aspectsHint: "Você pode escolher até três opções.",
    otherAspectLabel: "Outro",
    otherAspectPlaceholder: "Conte qual",
    sentimentsQuestion: "Como você avaliaria cada aspecto?",
    sentimentNegative: "Negativo",
    sentimentNeutral: "Neutro",
    sentimentPositive: "Positivo",
    commentQuestion: "Quer adicionar um comentário?",
    commentHint: "Não compartilhe dados pessoais.",
    commentPlaceholder: "Escreva seu comentário",
    commentLimit: "{count}/2000",
    verificationTitle: "Antes de enviar",
    verificationHint: "Complete a verificação para proteger este canal.",
    privacyNotice: "Usamos sua resposta para melhorar a experiência.",
    back: "Voltar",
    next: "Continuar",
    submit: "Enviar resposta",
    ratingRequired: "Escolha uma avaliação para continuar.",
    aspectsRequired: "Escolha pelo menos um aspecto para continuar.",
    aspectsLimit: "Escolha até três aspectos.",
    otherAspectRequired: "Descreva o aspecto escolhido.",
    sentimentsRequired: "Escolha uma avaliação para cada aspecto.",
    commentTooLong: "O comentário não pode exceder 2000 caracteres.",
    submissionError: "Não foi possível enviar sua resposta.",
    successTitle: "Obrigado por compartilhar sua experiência!",
    successBody: "Sua resposta foi recebida com sucesso.",
    reset: "Enviar outra resposta",
    loadingStatus: "Carregando a pesquisa…",
    loadingError: "Não foi possível carregar a pesquisa.",
  },
} as const;

const surveyResponse = {
  contractVersion: "feedback-public.v1",
  point: { pointKey: "summit", displayName: "Cumbre" },
  survey: {
    versionKey: "visitor-v1",
    translations: copy,
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

type Submission = {
  readonly locale: string;
  readonly overallRating: number;
  readonly aspects: readonly { aspectKey: string; rating: string }[];
  readonly comment?: string;
};

async function installSyntheticQrStack(page: Page) {
  const submissions: Submission[] = [];
  const browserRequests: string[] = [];

  page.on("request", (request) => {
    browserRequests.push(request.url());
  });

  await page.addInitScript({
    content: `window.grecaptcha={render:function(_,o){window.__tb113CaptchaCallback=o.callback;return 1;},getResponse:function(){return "synthetic-captcha-token";},reset:function(){}};`,
  });
  await page.route("**/recaptcha/api.js**", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `window.grecaptcha={render:function(_,o){o.callback("synthetic-captcha-token");return 1;},getResponse:function(){return "synthetic-captcha-token";},reset:function(){}};window.onloadcallback();`,
    });
  });
  await page.route("**/api/feedback/surveys/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith(`/surveys/${PUBLIC_CODE}`)) {
      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "SURVEY_UNAVAILABLE" } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(surveyResponse),
    });
  });
  await page.route("**/api/feedback/submissions", async (route) => {
    const body = route.request().postDataJSON() as Submission & {
      captchaToken?: string;
      formLoadedAt?: number;
      website?: string;
    };
    submissions.push(body);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        submissionReceipt: "synthetic-receipt",
        acceptedAt: "2030-09-18T12:00:00.000Z",
        guardUntil: "2030-09-19T12:00:00.000Z",
      }),
    });
  });

  return { browserRequests, submissions };
}

async function advanceStandardJourney(page: Page) {
  await page.getByRole("radio", { name: "5" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("checkbox", { name: "Vistas" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Positivo" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
}

test("visitor can enter the QR-only feedback journey", async ({ page }) => {
  const stack = await installSyntheticQrStack(page);
  await page.goto(`/qr/feedback/${PUBLIC_CODE}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: copy.es.headerTitle }),
  ).toBeVisible();
  expect(await page.getByRole("link").count()).toBe(0);
  await advanceStandardJourney(page);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: copy.en.commentQuestion }),
  ).toBeVisible();
  await page
    .getByPlaceholder(copy.en.commentPlaceholder)
    .fill("The view was excellent.");
  await page.getByRole("button", { name: copy.en.next, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: copy.en.verificationTitle }),
  ).toBeVisible();
  await expect(page.getByText(copy.en.privacyNotice)).toBeVisible();
  await page.evaluate(() => {
    const callback = (
      window as typeof window & {
        __tb113CaptchaCallback?: (_token: string) => void;
      }
    ).__tb113CaptchaCallback;
    if (!callback)
      throw new Error("Synthetic CAPTCHA callback was not registered");
    callback("synthetic-captcha-token");
  });
  await expect(
    page.getByRole("button", { name: copy.en.submit }),
  ).toBeEnabled();
  await page.getByRole("button", { name: copy.en.submit }).click();
  await expect(
    page.getByRole("heading", { name: copy.en.successTitle }),
  ).toBeVisible();

  expect(stack.submissions).toHaveLength(1);
  expect(stack.submissions[0]).toMatchObject({
    locale: "en",
    overallRating: 5,
    aspects: [{ aspectKey: "views", rating: "positive" }],
    comment: "The view was excellent.",
    captchaToken: "synthetic-captcha-token",
    website: "",
  });
  expect(stack.browserRequests.some((url) => url.includes(":4100"))).toBe(
    false,
  );
  expect(stack.browserRequests.some((url) => url.includes("/api/tb113/"))).toBe(
    false,
  );
});

test("desktop visitor feedback keeps QR context and rejects an unavailable code", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installSyntheticQrStack(page);
  await page.goto(`/qr/feedback/${UNKNOWN_CODE}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('p[role="alert"]')).toHaveText(
    copy.es.loadingError,
  );

  await page.goto(`/qr/feedback/${PUBLIC_CODE}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: copy.es.headerTitle }),
  ).toBeVisible();
  await advanceStandardJourney(page);
  await page.getByRole("button", { name: "Atrás" }).click();
  await expect(
    page.getByRole("heading", { name: copy.es.sentimentsQuestion }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: copy.es.verificationTitle }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
