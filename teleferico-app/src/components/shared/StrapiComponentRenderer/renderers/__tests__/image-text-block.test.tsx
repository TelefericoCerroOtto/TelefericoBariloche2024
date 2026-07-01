// @vitest-environment node

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const { imageTextRendererMock } = vi.hoisted(() => ({
  imageTextRendererMock: vi.fn(() => null),
}));

vi.mock("@/components", () => ({
  ImageTextRenderer: imageTextRendererMock,
}));

import { renderImageTextBlock } from "../image-text-block";

const createBlock = (
  isVisible?: boolean,
): Parameters<typeof renderImageTextBlock>[0] => {
  const block = {
    __component: "page-components.image-text-block",
    id: 1,
    isVisible,
  };

  return block as unknown as Parameters<typeof renderImageTextBlock>[0];
};

describe("renderImageTextBlock", () => {
  it("renders when isVisible is omitted", () => {
    const block = createBlock();

    const result = renderImageTextBlock(block, { locale: "en" });

    expect(result).not.toBeNull();
    expect((result as ReactElement).props.block).toBe(block);
  });

  it("renders when isVisible is true", () => {
    const block = createBlock(true);

    const result = renderImageTextBlock(block, { locale: "en" });

    expect(result).not.toBeNull();
    expect((result as ReactElement).props.block).toBe(block);
  });

  it("hides when isVisible is explicitly false", () => {
    const block = createBlock(false);

    const result = renderImageTextBlock(block, { locale: "en" });

    expect(result).toBeNull();
    expect(imageTextRendererMock).not.toHaveBeenCalled();
  });
});
