// @vitest-environment node

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const {
  blocksRendererMock,
  getActivitiesMock,
  getPageContentMock,
  noContentMock,
} = vi.hoisted(() => ({
  blocksRendererMock: vi.fn(() => null),
  getActivitiesMock: vi.fn(),
  getPageContentMock: vi.fn(),
  noContentMock: vi.fn(() => null),
}));

vi.mock("@/components", () => ({
  BlocksRenderer: blocksRendererMock,
  NoContent: noContentMock,
}));

vi.mock("@/lib/services", () => ({
  getActivities: getActivitiesMock,
  getPageContent: getPageContentMock,
}));

import ActivitiesPage from "../page";

describe("ActivitiesPage", () => {
  it("keeps an active image text block even when the renderer will hide it", async () => {
    const block = {
      __component: "page-components.image-text-block",
      id: 7,
      isVisible: false,
      link: { href: "/activities/alpine" },
    } as const;

    getPageContentMock.mockResolvedValueOnce({
      ok: true,
      data: {
        data: [
          {
            blocks: [block],
          },
        ],
      },
    });
    getActivitiesMock.mockResolvedValueOnce({
      ok: true,
      data: {
        data: [{ label: "alpine", isActive: true }],
      },
    });

    const result = (await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    })) as ReactElement;

    expect(result.type).toBe(blocksRendererMock);
    expect(result.props.blocks).toEqual([block]);
  });

  it("removes inactive activities before rendering regardless of block visibility", async () => {
    const block = {
      __component: "page-components.image-text-block",
      id: 8,
      isVisible: true,
      link: { href: "/activities/alpine" },
    } as const;

    getPageContentMock.mockResolvedValueOnce({
      ok: true,
      data: {
        data: [
          {
            blocks: [block],
          },
        ],
      },
    });
    getActivitiesMock.mockResolvedValueOnce({
      ok: true,
      data: {
        data: [{ label: "alpine", isActive: false }],
      },
    });

    const result = (await ActivitiesPage({
      params: Promise.resolve({ locale: "en" }),
    })) as ReactElement;

    expect(result.type).toBe(blocksRendererMock);
    expect(result.props.blocks).toEqual([]);
  });
});
