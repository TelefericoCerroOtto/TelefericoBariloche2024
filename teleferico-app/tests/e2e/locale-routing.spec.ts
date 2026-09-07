import { expect, test } from "@playwright/test";

test.use({ locale: "es-AR" });

test("redirects the public root to the default locale and persists its cookie", async ({
  context,
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/es-AR$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");

  const cookies = await context.cookies();
  expect(cookies).toContainEqual(
    expect.objectContaining({ name: "NEXT_LOCALE", value: "es-AR" }),
  );
});

test("persists a locale selected through a public route", async ({
  context,
  page,
}) => {
  await page.goto("/en", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  const cookies = await context.cookies();
  expect(cookies).toContainEqual(
    expect.objectContaining({ name: "NEXT_LOCALE", value: "en" }),
  );
});
