// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { GetPageResponse, Locales, Page } from "@/types";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { strapiFetchMock } = vi.hoisted(() => ({
  strapiFetchMock: vi.fn(),
}));

vi.mock("@/lib/http/clients/strapi-fetch", () => ({
  strapiFetch: strapiFetchMock,
}));

import { getPageContent } from "../pages";

type PageRecord = GetPageResponse["data"][number];
type PageContentResponse = Awaited<ReturnType<typeof getPageContent>>;

const createImageTextBlock = (isVisible?: boolean) =>
  ({
    __component: "page-components.image-text-block",
    id: 101,
    isVisible,
  }) as PageRecord["blocks"][number];

const createPageRecord = (
  locale: Locales,
  isVisible?: boolean,
): PageRecord =>
  ({
    id: locale === "en" ? 1 : 2,
    documentId: `page-${locale}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: "2026-01-01T00:00:00.000Z",
    locale,
    route: PUBLIC_ROUTES.ACTIVITIES,
    blocks: [createImageTextBlock(isVisible)],
  }) as PageRecord;

const createResponse = (
  locale: Locales,
  isVisible?: boolean,
): { ok: true; data: GetPageResponse } => ({
  ok: true,
  data: {
    data: [createPageRecord(locale, isVisible)] as Page[],
    meta: {
      pagination: {
        page: 1,
        pageCount: 1,
        pageSize: 1,
        total: 1,
      },
    },
  },
});

const getResponseData = (response: PageContentResponse): GetPageResponse => {
  if (!response.ok) {
    throw new Error("Expected a successful page content response");
  }

  if (response.data === null) {
    throw new Error("Expected page content response data");
  }

  return response.data as GetPageResponse;
};

const getFirstPage = (response: GetPageResponse): PageRecord => {
  const page = response.data[0];

  if (!page) {
    throw new Error("Expected a page record in the response");
  }

  return page;
};

const loadImageTextBlockSchema = () => {
  const schemaPath = resolve(
    process.cwd(),
    "../teleferico-cms/src/components/page-components/image-text-block.json",
  );

  return JSON.parse(readFileSync(schemaPath, "utf8")) as {
    attributes: {
      isVisible?: {
        default?: boolean;
        type?: string;
      };
    };
  };
};

describe("getPageContent image text block visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the Strapi default visible flag on the component schema", () => {
    const schema = loadImageTextBlockSchema();

    expect(schema.attributes.isVisible).toMatchObject({
      type: "boolean",
      default: true,
    });
  });

  it("preserves persisted false visibility for a localized page", async () => {
    strapiFetchMock.mockResolvedValueOnce(createResponse("en", false));

    const result = await getPageContent("en", PUBLIC_ROUTES.ACTIVITIES);

    expect(strapiFetchMock).toHaveBeenCalledTimes(1);
    expect(strapiFetchMock.mock.calls[0][0]).toMatchObject({
      endpoint: STRAPI_ENDPOINTS.PAGES,
    });
    expect(strapiFetchMock.mock.calls[0][0].qp).toContain("locale=en");
    expect(getFirstPage(getResponseData(result)).blocks[0]).toMatchObject({
      __component: "page-components.image-text-block",
      isVisible: false,
    });
  });

  it("keeps locale-specific visibility isolated across repeated fetches", async () => {
    strapiFetchMock
      .mockResolvedValueOnce(createResponse("en", true))
      .mockResolvedValueOnce(createResponse("es-AR", false))
      .mockResolvedValueOnce(createResponse("en", false));

    const englishVisible = await getPageContent("en", PUBLIC_ROUTES.ACTIVITIES);
    const spanishHidden = await getPageContent("es-AR", PUBLIC_ROUTES.ACTIVITIES);
    const englishUpdated = await getPageContent("en", PUBLIC_ROUTES.ACTIVITIES);

    expect(strapiFetchMock).toHaveBeenCalledTimes(3);
    expect(strapiFetchMock.mock.calls[0][0].qp).toContain("locale=en");
    expect(strapiFetchMock.mock.calls[1][0].qp).toContain("locale=es-AR");
    expect(strapiFetchMock.mock.calls[2][0].qp).toContain("locale=en");

    expect(getFirstPage(getResponseData(englishVisible)).blocks[0]).toMatchObject({
      __component: "page-components.image-text-block",
      isVisible: true,
    });
    expect(getFirstPage(getResponseData(spanishHidden)).blocks[0]).toMatchObject({
      __component: "page-components.image-text-block",
      isVisible: false,
    });
    expect(getFirstPage(getResponseData(englishUpdated)).blocks[0]).toMatchObject({
      __component: "page-components.image-text-block",
      isVisible: false,
    });
    expect(getFirstPage(getResponseData(spanishHidden)).blocks[0]).toMatchObject({
      __component: "page-components.image-text-block",
      isVisible: false,
    });
  });
});
