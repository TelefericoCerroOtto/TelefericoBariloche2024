import { expect, test } from "@playwright/test";

test("renders maintenance content and keeps language navigation inside the maintenance page", async ({
  page,
}) => {
  const response = await page.goto("/en/contact");

  expect(response?.headers()["retry-after"]).toBe("3600");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "We are performing maintenance",
  );

  await page
    .getByRole("button", { name: "Switch language to Portuguese" })
    .click();

  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Estamos realizando manutenção",
  );
});

test("keeps the narrow read-only service-state proxy available during maintenance", async ({
  page,
}) => {
  const response = await page.request.get("/api/proxy/api/service-state", {
    headers: {
      Origin: "http://localhost:3101",
      "sec-fetch-site": "same-origin",
    },
  });

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    data: { state: "normal" },
  });
});
