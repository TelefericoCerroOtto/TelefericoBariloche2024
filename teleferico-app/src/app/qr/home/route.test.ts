// @vitest-environment node

import { describe, expect, it } from "vitest";
import { GET } from "./route";

const QR_URL = "https://telefericobariloche.com.ar/qr/home?source=poster";

describe("GET /qr/home", () => {
  it("redirects to the same-origin homepage with an explicit 302 and no query", () => {
    const response = GET(new Request(QR_URL));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://telefericobariloche.com.ar/",
    );
  });

  it("produces the same redirect for Next.js HEAD delegation", () => {
    const response = GET(new Request(QR_URL, { method: "HEAD" }));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://telefericobariloche.com.ar/",
    );
    expect(response.body).toBeNull();
  });
});
