import { selectOriginalCmsImageUrl } from "@/lib/adapters";
import type { Image as StrapiImageComponent, StrapiImage } from "@/types";
import { getImageProps } from "next/image";

export const NEWS_DETAIL_IMAGE_FRAME_CLASS =
  "relative mb-14 w-full aspect-[2/3] min-[768px]:aspect-[21/9]";

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
  const coverSrc = selectOriginalCmsImageUrl(cover) ?? cover.url;
  const desktopSrc =
    selectOriginalCmsImageUrl(detailImageDesktop?.image) ?? coverSrc;
  const mobileSrc =
    selectOriginalCmsImageUrl(detailImageMobile?.image) ?? coverSrc;
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
    width: 2100,
    height: 900,
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
