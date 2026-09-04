import { expect, test } from "@playwright/test";

test("rejects cross-site requests to the public CMS proxy", async ({
  page,
}) => {
  const response = await page.request.get("/api/proxy/api/service-state", {
    headers: {
      Origin: "https://untrusted.example",
      "sec-fetch-site": "cross-site",
    },
  });

  expect(response.status()).toBe(403);
});
