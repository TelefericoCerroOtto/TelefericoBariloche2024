// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PUBLIC_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { describe, expect, it, vi } from "vitest";

const { strapiFetchMock } = vi.hoisted(() => ({
  strapiFetchMock: vi.fn().mockResolvedValue({ ok: true, data: { data: [] } }),
}));

vi.mock("@/lib/http/clients/strapi-fetch", () => ({
  strapiFetch: strapiFetchMock,
}));

import { getPageContent } from "../pages";

const readCmsJson = (relativePath: string) =>
  JSON.parse(
    readFileSync(
      resolve(process.cwd(), "../teleferico-cms", relativePath),
      "utf8",
    ),
  ) as Record<string, unknown>;

describe("EditorialAlert page block contract", () => {
  it("defines required editorial fields and optional epigraph/link without visual overrides", () => {
    const schema = readCmsJson(
      "src/components/page-components/editorial-alert.json",
    ) as {
      attributes: Record<string, Record<string, unknown>>;
    };
    const { attributes } = schema;

    expect(attributes.title).toMatchObject({ type: "string", required: true });
    expect(attributes.description).toMatchObject({
      type: "blocks",
      required: true,
    });
    expect(attributes.variant).toMatchObject({
      type: "enumeration",
      enum: ["default", "promotion", "warning", "info"],
      default: "default",
      required: true,
    });
    expect(attributes.epigraph).toMatchObject({ type: "string" });
    expect(attributes.link).toMatchObject({
      type: "component",
      component: "utils-components.link",
      repeatable: false,
    });
    expect(attributes).not.toHaveProperty("bgColor");
    expect(attributes).not.toHaveProperty("textColor");
    expect(attributes).not.toHaveProperty("icon");
  });

  it("registers the block in the localized page zone and populates its CTA link", async () => {
    const pageSchema = readCmsJson(
      "src/api/page/content-types/page/schema.json",
    ) as {
      attributes: { blocks: { components: string[] } };
    };

    expect(pageSchema.attributes.blocks.components).toContain(
      "page-components.editorial-alert",
    );

    await getPageContent("es-AR", PUBLIC_ROUTES.ACTIVITIES);

    const [request] = strapiFetchMock.mock.calls[0] as [
      { endpoint: string; qp: string },
    ];
    expect(request.endpoint).toBe(STRAPI_ENDPOINTS.PAGES);
    expect(request.qp).toContain("locale=es-AR");
    expect(request.qp).toContain(
      "populate[blocks][on][page-components.editorial-alert][populate][0]=link",
    );
  });
});
