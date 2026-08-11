import { selectOriginalCmsImageUrl } from "@/lib/adapters";
import type { Image as StrapiImage } from "@/types";
import NextImage from "next/image";
import notFoundImg from "@/public/image-not-found.jpg";
import { IMAGE_TEXT_IMAGE_QUALITY } from "./image-policy";

interface Props {
  image?: StrapiImage | null;

  sizes?: string;
  quality?: number;
  priority?: boolean;
  objectPosition?: string;
}

export default function CustomImage({
  image,
  sizes = "(max-width: 1280px) 100vw, 1280px",
  quality = IMAGE_TEXT_IMAGE_QUALITY.supporting,
  priority = false,
  objectPosition,
}: Props) {
  return (
    <NextImage
      src={selectOriginalCmsImageUrl(image?.image) ?? notFoundImg.src}
      alt={image?.alt ?? "imagen de fondo gris"}
      fill
      sizes={sizes}
      quality={quality}
      priority={priority}
      style={objectPosition ? { objectPosition } : undefined}
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
    />
  );
}
