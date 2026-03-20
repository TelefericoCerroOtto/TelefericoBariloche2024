import type { ImageTextBlock } from "@/types";
import { ImageTextRegistryKey } from "./registry";
import type { ImageTextVariantProps } from "./shared/types";

interface ResolveRegistryKeyOk {
  ok: true;
  key: ImageTextRegistryKey;
  props: ImageTextVariantProps;
}

interface ResolveRegistryKeyErr {
  ok: false;
  message: string;
  details: {
    variant?: ImageTextBlock["variant"];
    imagesCount?: number;
  };
}

type NestedImageBlock = {
  variant?: ImageTextBlock["variant"];
  desktopImages?: unknown;
  mobileImages?: unknown;
};

type RuntimeImageTextBlock = ImageTextBlock & {
  desktopImages?: unknown;
  mobileImages?: unknown;
  oneImageBlock?: NestedImageBlock;
  twoImagesBlock?: NestedImageBlock;
  threeImagesBlock?: NestedImageBlock;
};

function resolveImages(
  topLevelDesktopImages: unknown,
  topLevelMobileImages: unknown,
  nestedBlock?: NestedImageBlock,
) {
  const desktopImages = Array.isArray(topLevelDesktopImages)
    ? topLevelDesktopImages
    : Array.isArray(nestedBlock?.desktopImages)
      ? nestedBlock.desktopImages
      : [];

  const mobileImages = Array.isArray(topLevelMobileImages)
    ? topLevelMobileImages
    : Array.isArray(nestedBlock?.mobileImages)
      ? nestedBlock.mobileImages
      : [];

  return { desktopImages, mobileImages };
}

export function normalizeImageTextBlock(
  block: ImageTextBlock,
): ResolveRegistryKeyOk | ResolveRegistryKeyErr {
  const runtimeBlock = block as RuntimeImageTextBlock;
  const {
    __component,
    id,
    desktopImages: topLevelDesktopImages,
    mobileImages: topLevelMobileImages,
    oneImageBlock,
    twoImagesBlock,
    threeImagesBlock,
    ...baseProps
  } = runtimeBlock;

  switch (block.imagesAmount) {
    case "one": {
      const { desktopImages, mobileImages } = resolveImages(
        topLevelDesktopImages,
        topLevelMobileImages,
        oneImageBlock,
      );
      const variant = oneImageBlock?.variant ?? block.variant;

      return {
        ok: true,
        key: `1:${variant}` as ImageTextRegistryKey,
        props: {
          ...baseProps,
          variant,
          desktopImages,
          mobileImages,
        } as unknown as ImageTextVariantProps,
      };
    }

    case "two": {
      const { desktopImages, mobileImages } = resolveImages(
        topLevelDesktopImages,
        topLevelMobileImages,
        twoImagesBlock,
      );
      const variant = twoImagesBlock?.variant ?? block.variant;

      return {
        ok: true,
        key: `2:${variant}` as ImageTextRegistryKey,
        props: {
          ...baseProps,
          variant,
          desktopImages,
          mobileImages,
        } as unknown as ImageTextVariantProps,
      };
    }

    case "three": {
      const { desktopImages, mobileImages } = resolveImages(
        topLevelDesktopImages,
        topLevelMobileImages,
        threeImagesBlock,
      );
      const variant = threeImagesBlock?.variant ?? block.variant;

      return {
        ok: true,
        key: `3:${variant}` as ImageTextRegistryKey,
        props: {
          ...baseProps,
          variant,
          desktopImages,
          mobileImages,
        } as unknown as ImageTextVariantProps,
      };
    }
  }
}
