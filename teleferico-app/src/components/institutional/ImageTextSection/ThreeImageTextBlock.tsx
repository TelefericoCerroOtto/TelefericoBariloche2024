import { CustomLink, HighlightLastWord } from "@/components";
import type { ImageTextBlock } from "@/types";
import Image from "next/image";

export function Horizontal(props: ImageTextBlock) {
  const {
    images,
    title,
    description,
    isInverted = false,
    isTitleHighlighted = false,
    link,
  } = props;

  return (
    <div
      className={`flex ${isInverted ? "flex-col" : "flex-col-reverse"} my-9 w-full max-w-[1536px] items-center justify-center gap-10 px-8 md:px-14`}
    >
      <div className="h-[300px] w-full overflow-x-scroll md:h-[430px]">
        <div className="flex h-full w-full min-w-[355px] gap-4">
          <div className="relative h-full min-w-[250px] flex-grow">
            <Image
              src={images[0].src}
              alt={images[0].alt}
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-full min-w-[250px] flex-grow">
            <Image
              src={images[1].src}
              alt={images[1].alt}
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-full min-w-[250px] flex-grow">
            <Image
              src={images[2].src}
              alt={images[2].alt}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-center gap-4 md:w-3/5">
        <h4 className="mb-4 text-center text-3xl font-bold capitalize text-inherit md:text-4xl">
          {isTitleHighlighted ? HighlightLastWord(title) : title}
        </h4>
        <p className="text-center">{description}</p>
        {link ? <CustomLink href={link.href}>{link.label}</CustomLink> : null}
      </div>
    </div>
  );
}

export function Ladder(props: ImageTextBlock) {
  const {
    images,
    title,
    description,
    isInverted = false,
    isTitleHighlighted = false,
    link,
  } = props;

  return (
    <div
      className={`flex flex-col px-8 md:px-14 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} my-9 w-full max-w-[1536px] items-center justify-center`}
    >
      <div className="h-[360px] w-full overflow-x-scroll sm:h-[700px] lg:w-1/2">
        <div className="relative h-full w-full min-w-[420px]">
          <div className="absolute right-0 z-20 h-3/4 w-2/5 min-w-[200px]">
            <Image
              src={images[0].src}
              alt={images[0].alt}
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute right-1/4 top-1/2 z-10 h-3/4 w-2/5 min-w-[200px] -translate-y-1/2 transform">
            <Image
              src={images[1].src}
              alt={images[1].alt}
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute bottom-0 z-0 h-3/4 w-2/5 min-w-[200px]">
            <Image
              src={images[2].src}
              alt={images[2].alt}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
      <div
        className={`flex w-full flex-col items-center px-0 md:items-start lg:w-1/2 lg:px-12 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-12"}`}
      >
        <div className="flex flex-col items-start gap-4 py-20">
          <h4 className="mb-4 text-center text-3xl font-bold capitalize text-inherit md:text-start md:text-4xl">
            {isTitleHighlighted ? HighlightLastWord(title) : title}
          </h4>
          <p className="text-start">{description}</p>
          {link ? <CustomLink href={link.href}>{link.label}</CustomLink> : null}
        </div>
      </div>
    </div>
  );
}

export function Miniatures(props: ImageTextBlock) {
  const {
    images,
    title,
    description,
    isInverted = false,
    isTitleHighlighted = false,
    link,
  } = props;

  return (
    <div
      className={`flex flex-col px-8 md:px-14 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} my-9 w-full max-w-[1536px] items-center justify-center`}
    >
      <div className="h-[360px] w-full overflow-x-scroll sm:h-[750px] lg:w-1/2">
        <div className="relative h-full w-full min-w-[380px]">
          <div className="absolute left-1/2 top-1/2 z-0 aspect-square h-4/5 -translate-x-1/2 -translate-y-1/2 transform">
            <Image
              src={images[0].src}
              alt={images[0].alt}
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute z-10 h-1/3 w-5/12 sm:h-1/4">
            <Image
              src={images[1].src}
              alt={images[1].alt}
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute bottom-0 right-0 z-10 h-1/3 w-5/12 sm:h-1/4">
            <Image
              src={images[2].src}
              alt={images[2].alt}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
      <div
        className={`flex w-full flex-col items-center px-0 md:items-start lg:w-1/2 lg:px-12 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-12"}`}
      >
        <div className="flex flex-col items-start gap-4 py-20">
          <h4 className="mb-4 text-center text-3xl font-bold capitalize text-inherit md:text-start md:text-4xl">
            {isTitleHighlighted ? HighlightLastWord(title) : title}
          </h4>
          <p className="text-start">{description}</p>
          {link ? <CustomLink href={link.href}>{link.label}</CustomLink> : null}
        </div>
      </div>
    </div>
  );
}
