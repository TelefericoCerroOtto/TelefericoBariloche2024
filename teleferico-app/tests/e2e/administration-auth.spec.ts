import { expect, test } from "@playwright/test";

test("redirects unauthenticated dashboard visitors to the localized login route", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/es-AR\/login$/);
  await expect(page.getByLabel("Correo Electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});

test("shows client-side validation before an unauthenticated login request", async ({
  page,
}) => {
  await page.goto("/es-AR/login", { waitUntil: "domcontentloaded" });
  const password = page.locator("#password");
  const visibilityToggle = page.getByLabel("toggle password visibility");
  await expect(async () => {
    if ((await password.getAttribute("type")) === "password") {
      await visibilityToggle.click();
    }
    await expect(password).toHaveAttribute("type", "text");
  }).toPass({ timeout: 20_000 });

  const identifier = page.locator("#identifier");
  await identifier.fill("not-an-email");
  await identifier.blur();

  await expect(
    page.getByText("El correo electrónico no es válido"),
  ).toBeVisible();
});
