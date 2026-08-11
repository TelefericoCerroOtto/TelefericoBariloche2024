import { describe, expect, it } from "vitest";

import {
  selectCmsImageUrl,
  selectOriginalCmsImageUrl,
  type CmsImageLike,
} from "./cms-images";

const image: CmsImageLike = {
  url: "/uploads/original.webp",
  formats: {
    large: { url: "/uploads/large.webp" },
    medium: { url: "/uploads/medium.webp" },
  } as CmsImageLike["formats"],
};

describe("CMS image source selection", () => {
  it("keeps derivative-first selection as the default", () => {
    expect(selectCmsImageUrl(image)).toBe("/api/media/uploads/large.webp");
  });

  it("selects the original asset when explicitly requested", () => {
    expect(selectOriginalCmsImageUrl(image)).toBe(
      "/api/media/uploads/original.webp",
    );
  });
});
