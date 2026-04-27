import type {
  OneImageVariant,
  ThreeImagesVariant,
  TwoImagesVariant,
} from "@/types";
import type { ComponentType } from "react";
import type {
  OneImageProps,
  ThreeImagesProps,
  TwoImagesProps,
} from "./shared/types";

import {
  Card,
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

// Keys válidas
export type ImageTextRegistryKey =
  | `1:${OneImageVariant}`
  | `2:${TwoImagesVariant}`
  | `3:${ThreeImagesVariant}`;

// Props esperadas según la key
type PropsByKey<K extends ImageTextRegistryKey> =
  K extends `1:${OneImageVariant}`
    ? OneImageProps
    : K extends `2:${TwoImagesVariant}`
      ? TwoImagesProps
      : K extends `3:${ThreeImagesVariant}`
        ? ThreeImagesProps
        : never;

// Registro: cada key tiene SU componente con SUS props
type ImageTextRegistry = {
  [K in ImageTextRegistryKey]: ComponentType<PropsByKey<K>>;
};

export const IMAGE_TEXT_REGISTRY = {
  "1:single": Single,
  "1:poster": Poster,
  "1:card": Card,
  "1:panoramic": Panoramic,
  "1:spotlight": Spotlight,
  "2:double": Double,
  "2:cascade": Cascade,
  "3:horizontal": Horizontal,
  "3:masonry": Masonry,
  "3:ladder": Ladder,
  "3:miniatures": Miniatures,
} satisfies ImageTextRegistry;

// “vista” tipada para indexar correlacionando K
const IMAGE_TEXT_REGISTRY_TYPED: ImageTextRegistry = IMAGE_TEXT_REGISTRY;

export function getImageTextComponentByKey<K extends ImageTextRegistryKey>(
  key: K,
): ComponentType<PropsByKey<K>> {
  return IMAGE_TEXT_REGISTRY_TYPED[key];
}
