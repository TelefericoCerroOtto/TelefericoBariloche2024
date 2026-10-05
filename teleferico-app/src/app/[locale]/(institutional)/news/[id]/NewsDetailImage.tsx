import { selectCmsImageUrl } from "@/lib/adapters";
import type { Image as StrapiImageComponent, StrapiImage } from "@/types";
import { getImageProps } from "next/image";

const PREFERRED_FORMATS = ["large", "medium", "small", "thumbnail"] as const;

type Props = {
  cover: StrapiImage;
  detailImageMobile?: StrapiImageComponent | null;
  detailImageDesktop?: StrapiImageComponent | null;
};

export default function NewsDetailImage({
  cover,
  detailImageMobile,
  detailImageDesktop,
}: Props) {
  const coverSrc =
    selectCmsImageUrl(cover, [...PREFERRED_FORMATS]) ?? cover.url;
  const desktopSrc =
    selectCmsImageUrl(detailImageDesktop?.image, [...PREFERRED_FORMATS]) ??
    coverSrc;
  const mobileSrc =
    selectCmsImageUrl(detailImageMobile?.image, [...PREFERRED_FORMATS]) ??
    coverSrc;
  const alt =
    (detailImageDesktop?.image && detailImageDesktop.alt) ||
    (detailImageMobile?.image && detailImageMobile.alt) ||
    cover.alternativeText ||
    "News cover image";

  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    src: desktopSrc,
    alt,
    sizes: "100vw",
    width: 1920,
    height: 823,
  });
  const {
    props: { srcSet: mobileSrcSet, ...imageProps },
  } = getImageProps({
    src: mobileSrc,
    alt,
    sizes: "100vw",
    width: 1080,
    height: 1620,
  });

  return (
    <picture className="absolute inset-0">
      <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
      <source media="(max-width: 767px)" srcSet={mobileSrcSet} />
      <img
        {...imageProps}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}
