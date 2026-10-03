import { expect, test, type Page } from "@playwright/test";
import {
  installSyntheticCaptchaStub,
  publicCopy as copy,
  publicSurveyResponse,
  selectPublicRating,
} from "./feedback-public-fixture";

const PUBLIC_CODE = "A".repeat(32);
const UNKNOWN_CODE = "B".repeat(32);

type Submission = {
  readonly locale: string;
  readonly overallRating: number;
  readonly aspects: readonly { aspectKey: string; rating: string }[];
  readonly comment?: string;
  readonly captchaToken?: string;
  readonly formLoadedAt?: number;
  readonly website?: string;
};

async function installSyntheticQrStack(page: Page) {
  const submissions: Submission[] = [];
  const browserRequests: string[] = [];

  page.on("request", (request) => {
    browserRequests.push(request.url());
  });
  await installSyntheticCaptchaStub(page);
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
      body: JSON.stringify(publicSurveyResponse),
    });
  });
  await page.route("**/api/feedback/submissions", async (route) => {
    submissions.push(route.request().postDataJSON() as Submission);
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
  await selectPublicRating(page, 5);
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await page.getByRole("checkbox", { name: "Vistas" }).check();
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await page.getByRole("radio", { name: "Positivo" }).check();
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
}

async function expectFooterPinnedToStage(page: Page) {
  const stage = await page.locator(".feedback-stage-viewport").boundingBox();
  const footer = await page.locator(".feedback-form-footer").boundingBox();
  const viewportHeight = page.viewportSize()?.height;

  expect(stage).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(viewportHeight).toBeDefined();
  expect(footer!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height - 1);
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(viewportHeight!);
  await expect(page.locator(".feedback-stage-scroll")).toHaveCSS(
    "overflow-y",
    "auto",
  );
}

async function provideSyntheticCaptcha(page: Page) {
  await page.evaluate(() => {
    const callback = (
      window as typeof window & {
        __tb113CaptchaCallback?: (_token: string) => void;
      }
    ).__tb113CaptchaCallback;
    if (!callback) {
      throw new Error("Synthetic CAPTCHA callback was not registered");
    }
    callback("synthetic-captcha-token");
  });
}

test("visitor completes the QR-only journey with accessible mobile controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const stack = await installSyntheticQrStack(page);
  await page.goto(`/qr/feedback/${PUBLIC_CODE}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: copy.es.headerTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Teleférico Cerro Otto" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: copy.es.localeLabel }),
  ).toHaveValue("es");
  const ratingGroup = page.getByRole("group", {
    name: copy.es.overallQuestion,
  });
  await expect(ratingGroup.getByRole("radio")).toHaveCount(5);
  await expect(
    page.getByRole("region", { name: "Pregunta 1 de 4" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Saltar a la pregunta" }),
  ).toHaveAttribute("href", "#feedback-stage");
  await expect(
    page.getByRole("button", { name: copy.es.nextLabel }),
  ).toBeVisible();
  await expectFooterPinnedToStage(page);

  await advanceStandardJourney(page);
  await page
    .getByRole("combobox", { name: copy.es.localeLabel })
    .selectOption("en");
  await expect(
    page.getByRole("heading", { name: copy.en.headerTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: copy.en.commentQuestion }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: copy.en.commentLabel })
    .fill("The view was excellent.");
  await page.getByRole("button", { name: copy.en.nextLabel }).click();
  await expect(
    page.getByRole("heading", { name: copy.en.verificationTitle }),
  ).toBeVisible();
  await expect(page.getByText(copy.en.privacyNotice)).toBeVisible();
  await provideSyntheticCaptcha(page);
  await expect(
    page.getByRole("button", { name: copy.en.submitLabel }),
  ).toBeEnabled();
  await expectFooterPinnedToStage(page);
  await page.getByRole("button", { name: copy.en.submitLabel }).click();
  await expect(
    page.getByRole("heading", { name: copy.en.successTitle }),
  ).toBeVisible();
  await expect(page.getByText("synthetic-receipt")).toBeVisible();

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

test("desktop QR journey keeps responsive navigation and rejects unknown codes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installSyntheticQrStack(page);
  await page.goto(`/qr/feedback/${UNKNOWN_CODE}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator(".feedback-state-viewport [role='alert']"),
  ).toHaveText("No se pudo cargar la encuesta. Intente nuevamente más tarde.");
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();

  await page.goto(`/qr/feedback/${PUBLIC_CODE}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: copy.es.headerTitle }),
  ).toBeVisible();
  await expectFooterPinnedToStage(page);
  await advanceStandardJourney(page);
  await page.getByRole("button", { name: copy.es.backLabel }).click();
  await expect(
    page.getByRole("heading", { name: copy.es.sentimentQuestion }),
  ).toBeFocused();
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await expect(
    page.getByRole("heading", { name: copy.es.verificationTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Pregunta 4 de 4" }),
  ).toBeVisible();
  await expectFooterPinnedToStage(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
