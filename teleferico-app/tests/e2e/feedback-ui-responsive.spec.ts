import { expect, test, type Page } from "@playwright/test";
import {
  installSyntheticCaptchaStub,
  publicCopy as copy,
  publicSurveyResponse,
  selectPublicRating,
} from "./feedback-public-fixture";

async function stubFeedbackApi(page: Page) {
  await installSyntheticCaptchaStub(page);
  await page.route("**/api/feedback/surveys/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(publicSurveyResponse),
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
      name: copy.es.headerTitle,
    }),
  ).toBeVisible();
  await selectPublicRating(page, 5);
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await page.getByRole("checkbox", { name: "Vistas" }).check();
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await page.getByRole("radio", { name: "Positivo" }).check();
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await expect(
    page.getByRole("heading", { name: copy.es.verificationTitle }),
  ).toBeVisible();
}

async function expectFooterAtViewportBottom(page: Page) {
  const stage = await page.locator(".feedback-stage-viewport").boundingBox();
  const footer = await page.locator(".feedback-form-footer").boundingBox();
  const viewportHeight = page.viewportSize()?.height;
  expect(stage).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(footer!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height - 1);
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(viewportHeight!);
  await expect(page.locator(".feedback-stage-scroll")).toHaveCSS(
    "overflow-y",
    "auto",
  );
}

test("visitor feedback responsive journey preserves a draft on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubFeedbackApi(page);
  await page.goto("/qr/feedback/summit-public", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("combobox", { name: copy.es.localeLabel }),
  ).toHaveValue("es");
  await expect(
    page.getByRole("img", { name: "Teleférico Cerro Otto" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "5" })).toBeVisible();
  await expectFooterAtViewportBottom(page);
  await selectPublicRating(page, 5);
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await page.getByRole("checkbox", { name: "Vistas" }).check();
  await page.getByRole("button", { name: copy.es.nextLabel }).click();
  await expect(
    page.getByRole("heading", { name: copy.es.sentimentQuestion }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: copy.es.localeLabel })
    .selectOption("en");
  await expect(
    page.getByRole("heading", { name: copy.en.sentimentQuestion }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "Views" })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: copy.en.sentimentQuestion }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: copy.en.localeLabel }),
  ).toHaveValue("en");
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
      locale: "en",
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
  await expect(page.getByText(copy.es.privacyNotice)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Pregunta 4 de 4" }),
  ).toBeVisible();
  await expectFooterAtViewportBottom(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
