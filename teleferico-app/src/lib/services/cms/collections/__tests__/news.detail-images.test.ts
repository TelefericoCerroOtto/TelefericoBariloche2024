// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { strapiFetchMock } = vi.hoisted(() => ({
  strapiFetchMock: vi.fn(),
}));

vi.mock("@/lib/http/clients/strapi-fetch", () => ({
  strapiFetch: strapiFetchMock,
}));

import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { getNew, getNews } from "../news";

describe("news image population", () => {
  beforeEach(() => {
    strapiFetchMock.mockReset().mockResolvedValue({ ok: true });
  });

  it("populates nested detail-image media only in the news detail query", async () => {
    await getNew({ locale: "en", documentId: "news-id" });

    const detailRequest = strapiFetchMock.mock.calls[0];
    expect(detailRequest[0].endpoint).toBe(`${STRAPI_ENDPOINTS.NEWS}/news-id`);
    expect(detailRequest[0].qp).toContain("cover");
    expect(detailRequest[0].qp).toContain(
      "populate[detailImageMobile][populate][image]=true",
    );
    expect(detailRequest[0].qp).toContain(
      "populate[detailImageDesktop][populate][image]=true",
    );
    expect(detailRequest[0].qp).toContain("locale=en");

    strapiFetchMock.mockClear();
    await getNews({ locale: "en" });

    const listingQuery = strapiFetchMock.mock.calls[0][0].qp as string;
    expect(listingQuery).toContain("cover");
    expect(listingQuery).not.toContain("detailImageMobile");
    expect(listingQuery).not.toContain("detailImageDesktop");
  });

  it("populates localizations and both nested images for the all-locales query", async () => {
    await getNew({ locale: "all", documentId: "news-id" });

    const allLocalesQuery = strapiFetchMock.mock.calls[0][0].qp as string;
    expect(allLocalesQuery).toContain("populate[localizations]=true");
    expect(allLocalesQuery).toContain(
      "populate[detailImageMobile][populate][image]=true",
    );
    expect(allLocalesQuery).toContain(
      "populate[detailImageDesktop][populate][image]=true",
    );
    expect(allLocalesQuery).toContain("populate[cover]=true");
  });
});
