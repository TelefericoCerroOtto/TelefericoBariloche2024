import { CustomLink } from "@/components";
import type { ImageTextBlock } from "@/types/api";
import Image from "next/image";
import { HighlightLastWord } from "../TitleDescBlock";

export function Default(props: ImageTextBlock) {
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
      <div className="relative h-[320px] w-full md:h-[500px] lg:h-[700px] lg:w-1/2">
        <Image
          src={images[0].src}
          alt={images[0].alt}
          fill
          className="object-cover"
        />
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

export function DefaultFW(props: ImageTextBlock) {
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
      className={`flex flex-col ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} w-full items-center justify-center`}
    >
      <div className="relative h-[500px] w-full lg:h-[700px] lg:w-1/2">
        <Image
          src={images[0].src}
          alt={images[0].alt}
          fill
          className="object-cover"
        />
      </div>
      <div
        className={`flex w-full flex-col items-center ps-0 md:items-start md:ps-12 lg:w-1/2 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-12"}`}
      >
        <div className={`w-3/4 ${isInverted ? "lg:w-1/2" : ""} py-20`}>
          <h4 className="mb-4 text-center text-3xl font-bold uppercase text-inherit md:text-start md:text-4xl">
            {isTitleHighlighted ? HighlightLastWord(title) : title}
          </h4>
          <p className="text-center md:text-start">{description}</p>
          {link ? <CustomLink href={link.href}>{link.label}</CustomLink> : null}
        </div>
      </div>
    </div>
  );
}

export function Panoramic(props: ImageTextBlock) {
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
      <div className="relative h-[320px] w-full md:h-[500px]">
        <Image
          src={images[0].src}
          alt={images[0].alt}
          fill
          className="object-cover"
        />
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
