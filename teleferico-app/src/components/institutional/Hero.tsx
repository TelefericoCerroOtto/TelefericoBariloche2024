import { CustomLink } from "@/components";
import { typography } from "@/lib/constants/typography.const";
import notFoundImg from "@/public/image-not-found.jpg";
import { Link } from "@/types";
import Image, { getImageProps } from "next/image";

interface Props {
  content: {
    desktopCover: { src: string; alt: string };
    mobileCover: { src: string; alt: string };
    title?: string;
    description?: string;
    align?: "bottom" | "center";
    firstLink?: Link;
    secondLink?: Link;
    logo?: { src: string; alt: string };
  };
}

export default function Hero(props: Props) {
  const { content } = props;
  const {
    desktopCover,
    mobileCover,
    title,
    description,
    align = "bottom",
    firstLink,
    secondLink,
    logo,
  } = content;

  const alt = mobileCover?.alt ?? desktopCover?.alt ?? "imagen de fondo gris";

  const desktopSrc = desktopCover?.src ?? mobileCover?.src ?? notFoundImg.src;
  const mobileSrc = mobileCover?.src ?? desktopCover?.src ?? notFoundImg.src;

  const common = { alt, sizes: "100vw" };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    ...common,
    src: desktopSrc,
    width: 1920,
    height: 1080,
    quality: 72,
  });
  const {
    props: { srcSet: mobileSrcSet, ...imgProps },
  } = getImageProps({
    ...common,
    src: mobileSrc,
    width: 2560,
    height: 1100,
    quality: 70,
  });

  return (
    <div className="relative mb-14 min-h-[600px] w-full md:h-3/4 lg:h-1/2">
      <picture className="absolute inset-0 z-0">
        {/* Desktop >= md */}
        <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
        {/* Mobile < md */}
        <source srcSet={mobileSrcSet} />
        <img
          {...imgProps}
          alt={alt}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      <div
        className={`absolute z-10 flex h-full w-5/6 max-w-[1536px] gap-6 pb-16 text-white sm:w-3/4 ${align === "bottom" ? "justify-end" : "justify-center"} left-1/2 right-auto -translate-x-1/2 transform flex-col`}
      >
        {title ? (
          <h1
            className={`${typography.headings.hero} font-bold capitalize text-inherit`}
          >
            {title}
          </h1>
        ) : null}
        {description ? (
          <p className={typography.content.section}>{description}</p>
        ) : null}
        <div
          className={`flex gap-4 ${align === "center" ? "justify-center" : "justify-start"}`}
        >
          {logo ? (
            <Image src={logo.src} width={550} height={125} alt={logo.alt} />
          ) : null}
          {firstLink ? (
            <CustomLink
              href={firstLink.href}
              withButtonStyles
              intent="outlineWhite"
            >
              {firstLink.label}
            </CustomLink>
          ) : null}
          {secondLink ? (
            <CustomLink
              href={secondLink.href}
              withButtonStyles
              intent="ghostWhite"
            >
              {secondLink.label}
            </CustomLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}
