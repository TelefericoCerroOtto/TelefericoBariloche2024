import type {
  ImageTextBlock,
  ImageTextVariants,
  OneImageVariant,
  Permutation,
  ThreeImagesVariant,
  TwoImagesVariant,
} from "@/types";
import { ImageTextRegistryKey } from "./registry";

type ImageBucket = 1 | 2 | 3;

interface ResolveRegistryKeyOk {
  ok: true;
  key: ImageTextRegistryKey;
  bucket: ImageBucket;
}

interface ResolveRegistryKeyErr {
  ok: false;
  message: string;
  details: {
    variant?: ImageTextBlock["variant"];
    imagesCount?: number;
  };
}

const allowedVariants: Record<
  ImageBucket,
  | Permutation<OneImageVariant>
  | Permutation<TwoImagesVariant>
  | Permutation<ThreeImagesVariant>
> = {
  1: ["single", "poster", "card", "panoramic", "spotlight"],
  2: ["double", "cascade"],
  3: ["horizontal", "masonry", "ladder", "miniatures"],
};

const isImagesCountValid = (
  imagesCount: number,
): imagesCount is ImageBucket => {
  if (imagesCount < 1) return false;

  if (imagesCount > 3) return false;

  return true;
};

const isVariantValid = (variant: ImageTextVariants, count: ImageBucket) => {
  return allowedVariants[count].find((v) => v === variant);
};

export function resolveImageTextRegistryKey(
  block: ImageTextBlock,
): ResolveRegistryKeyOk | ResolveRegistryKeyErr {
  const imagesCount = Array.isArray(block.images) ? block.images.length : 0;
  const variant = block.variant;

  if (!Array.isArray(block.images)) {
    return {
      ok: false,
      message: `ImageTextBlock inválido: "images" no es un array.`,
      details: { variant, imagesCount },
    };
  }

  if (!isImagesCountValid(imagesCount)) {
    return {
      ok: false,
      message: `ImageTextBlock inválido: La cantidad de imagenes recibidas no es váilda. Cantidad de imagenes enviada: ${imagesCount}`,
      details: { variant, imagesCount },
    };
  }

  const bucket = imagesCount;

  // Resolver por bucket para que TS quede feliz y la regla quede explícita
  if (!isVariantValid(variant, imagesCount))
    return {
      ok: false,
      message: `ImageTextBlock inválido: la variante ${variant} no está definida para la cantidad de ${imagesCount} ".`,
      details: { variant, imagesCount },
    };

  switch (bucket) {
    case 1: {
      return { ok: true, bucket, key: `1:${variant as OneImageVariant}` };
    }

    case 2: {
      return { ok: true, bucket, key: `2:${variant as TwoImagesVariant}` };
    }

    case 3: {
      return { ok: true, bucket, key: `3:${variant as ThreeImagesVariant}` };
    }
  }
}
