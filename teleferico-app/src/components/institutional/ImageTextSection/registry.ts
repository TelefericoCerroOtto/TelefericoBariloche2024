import type {
  ImageTextBlock,
  OneImageVariant,
  ThreeImagesVariant,
  TwoImagesVariant,
} from "@/types";
import type { ComponentType } from "react";

import {
  Cascade,
  Double,
  Horizontal,
  Ladder,
  Masonry,
  Miniatures,
  Panoramic,
  Poster,
  Single,
  Spotlight,
} from "./variants/index";
import Card from "./variants/one/Card";

// Keys válidas (acotadas) estructura {count}:{variant}
export type ImageTextRegistryKey =
  | `1:${OneImageVariant}`
  | `2:${TwoImagesVariant}`
  | `3:${ThreeImagesVariant}`;

type BlockComponent = ComponentType<ImageTextBlock>;

const IMAGE_TEXT_REGISTRY: Record<ImageTextRegistryKey, BlockComponent> = {
  // 1 imagen
  "1:single": Single,
  "1:poster": Poster,
  "1:card": Card,
  "1:panoramic": Panoramic,
  "1:spotlight": Spotlight,

  // 2 imágenes
  "2:double": Double,
  "2:cascade": Cascade,

  // 3 imágenes
  "3:horizontal": Horizontal,
  "3:masonry": Masonry,
  "3:ladder": Ladder,
  "3:miniatures": Miniatures,
};

export function getImageTextComponentByKey(
  key: ImageTextRegistryKey,
): BlockComponent {
  return IMAGE_TEXT_REGISTRY[key];
}
