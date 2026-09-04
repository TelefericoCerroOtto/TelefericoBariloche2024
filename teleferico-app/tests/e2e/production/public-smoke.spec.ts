import { expect, test } from "@playwright/test";

test("loads the public root without mutating production data", async ({
  page,
}) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
});
