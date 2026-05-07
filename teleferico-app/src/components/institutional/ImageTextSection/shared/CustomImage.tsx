// teleferico-app/src/components/shared/CustomImage.tsx
import type { Image as StrapiImage } from "@/types";
import NextImage from "next/image";
import notFoundImg from "@/public/image-not-found.jpg";

interface Props {
  image?: StrapiImage | null;

  /**
   * CRÍTICO para evitar que Next asuma 100vw en fill.
   * Pasalo por slot; si no, se usa un default "seguro" con cap.
   */
  sizes?: string;

  /**
   * Ayuda a bajar CPU/mem del optimizador.
   * Ajustalo por slot si querés.
   */
  quality?: number;

  /**
   * Solo para LCP/above-the-fold.
   */
  priority?: boolean;

  /**
   * Útil si querés encuadre fino sin tocar className (object-cover).
   * Ej: "50% 30%"
   */
  objectPosition?: string;
}

export default function CustomImage({
  image,
  sizes = "(max-width: 1280px) 100vw, 1280px",
  quality = 72,
  priority = false,
  objectPosition,
}: Props) {
  return (
    <NextImage
      src={image?.image?.url ?? notFoundImg.src}
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
