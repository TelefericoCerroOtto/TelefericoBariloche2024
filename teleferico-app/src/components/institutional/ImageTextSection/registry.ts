import type {
  ImageTextBlock,
  OneImageVariant,
  ThreeImagesVariant,
  TwoImagesVariant,
} from "@/types";
import type { ComponentType } from "react";

import {
  DefaultFW,
  DefaultOne,
  DefaultTwo,
  Horizontal,
  Ladder,
  Miniatures,
  Panoramic,
  PanoramicFW,
  Spotlight,
} from "./variants/index";

// Keys válidas (acotadas) estructura {count}:{variant}
export type ImageTextRegistryKey =
  | `1:${OneImageVariant}`
  | `2:${TwoImagesVariant}`
  | `3:${ThreeImagesVariant}`;

type BlockComponent = ComponentType<ImageTextBlock>;

const IMAGE_TEXT_REGISTRY: Record<ImageTextRegistryKey, BlockComponent> = {
  // 1 imagen
  "1:default": DefaultOne,
  "1:defaultFW": DefaultFW,
  "1:panoramic": Panoramic,
  "1:panoramicFW": PanoramicFW,
  "1:spotlight": Spotlight,

  // 2 imágenes
  "2:default": DefaultTwo,

  // 3 imágenes
  "3:horizontal": Horizontal,
  "3:ladder": Ladder,
  "3:miniatures": Miniatures,
};

export function getImageTextComponentByKey(
  key: ImageTextRegistryKey,
): BlockComponent {
  return IMAGE_TEXT_REGISTRY[key];
}
