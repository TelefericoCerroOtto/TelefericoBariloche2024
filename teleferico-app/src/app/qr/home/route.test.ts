// @vitest-environment node

import { describe, expect, it } from "vitest";
import { GET } from "./route";

const QR_URL = "https://telefericobariloche.com.ar/qr/home?source=poster";

function expectRootRedirect(response: Response) {
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/");
  expect(response.body).toBeNull();
}

describe("GET /qr/home", () => {
  it("returns a relative homepage redirect and discards the query", () => {
    const response = GET(new Request(QR_URL));

    expectRootRedirect(response);
  });

  it("does not expose an internal request origin", () => {
    const response = GET(
      new Request("https://localhost:8080/qr/home?source=poster"),
    );

    expectRootRedirect(response);
    expect(response.headers.get("location")).not.toContain("localhost");
  });

  it("produces the same redirect for Next.js HEAD delegation", () => {
    const response = GET(new Request(QR_URL, { method: "HEAD" }));

    expectRootRedirect(response);
  });
});
