import { expect, test, type Page } from "@playwright/test";

const surveyResponse = {
  contractVersion: "feedback-public.v1",
  point: { pointKey: "summit", displayName: "Cumbre" },
  survey: {
    versionKey: "visitor-v1",
    translations: {
      es: {
        headerTitle: "Contanos cómo fue tu experiencia",
        overallQuestion: "¿Cómo fue tu experiencia general?",
        aspectsQuestion: "¿Qué aspectos querés destacar?",
        sentimentsQuestion: "¿Cómo calificarías cada aspecto?",
        commentQuestion: "¿Querés agregar un comentario?",
        verificationTitle: "Antes de enviar",
        verificationHint: "Completá la verificación para proteger este canal.",
        privacyNotice: "Tu respuesta nos ayuda a mejorar.",
        successTitle: "Gracias",
        successBody: "Tu respuesta fue recibida correctamente.",
      },
      en: {},
      pt: {},
    },
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

async function stubFeedbackApi(page: Page) {
  await page.route("**/api/feedback/surveys/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(surveyResponse),
    });
  });
  await page.route("**/api/feedback/submissions", async (route) => {
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
}

async function advanceToVerification(page: Page) {
  await expect(
    page.getByRole("heading", {
      name: surveyResponse.survey.translations.es.headerTitle,
    }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "5" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("checkbox", { name: "Vistas" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Positivo" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "Antes de enviar" }),
  ).toBeVisible();
}

test("visitor feedback responsive journey preserves a draft on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubFeedbackApi(page);
  await page.goto("/qr/feedback/summit-public", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("radio", { name: "5" })).toBeVisible();
  await page.getByRole("radio", { name: "5" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("checkbox", { name: "Vistas" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Cómo calificarías cada aspecto?" }),
  ).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "¿Cómo calificarías cada aspecto?" }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const entry = Object.entries(localStorage).find(([key]) =>
          key.startsWith("tb113-feedback-draft:"),
        );
        return entry ? JSON.parse(entry[1]) : null;
      }),
    )
    .toMatchObject({
      overallRating: 5,
      selectedAspectKeys: ["views"],
      stage: "sentiments",
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("visitor feedback responsive journey reaches privacy verification on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubFeedbackApi(page);
  await page.goto("/qr/feedback/summit-public", {
    waitUntil: "domcontentloaded",
  });

  await advanceToVerification(page);
  await expect(
    page.getByText("Tu respuesta nos ayuda a mejorar."),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "4",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
