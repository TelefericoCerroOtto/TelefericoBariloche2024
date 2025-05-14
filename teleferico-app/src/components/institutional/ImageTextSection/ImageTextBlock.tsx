import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
  TitleDescBlock,
} from "@/components";
import type { ImageTextBlock } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "./CustomImage";
import { bgStyles, caseStyles } from "@/utils/styles";

export function Default(props: ImageTextBlock) {
  const {
    images,
    title,
    titleCase = "normal",
    description,
    isInverted = false,
    isHighlighted = false,
    link,
    bgColor,
  } = props;

  return (
    <div
      className={`flex flex-col px-8 md:px-14 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} ${bgStyles[bgColor]} my-9 w-full max-w-[1536px] items-center justify-center`}
    >
      <div className="relative h-[320px] w-full md:h-[500px] lg:h-[700px] lg:w-1/2">
        <CustomImage image={images[0]} />
      </div>
      <div
        className={`flex w-full flex-col items-center px-0 md:items-start lg:w-1/2 lg:px-12 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-12"}`}
      >
        <div className="flex flex-col items-start gap-4 py-20">
          <h4
            className={`mb-4 text-center text-3xl font-bold ${caseStyles[titleCase]} text-inherit md:text-start md:text-4xl`}
          >
            {isHighlighted ? HighlightLastWord(title) : title}
          </h4>
          <BlockRendererClient content={description as BlocksContent} />
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
    titleCase = "normal",
    description,
    isInverted = false,
    isHighlighted = false,
    link,
    bgColor,
  } = props;

  return (
    <div
      className={`flex flex-col ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} ${bgStyles[bgColor]} w-full items-center justify-center`}
    >
      <div className="relative h-[500px] w-full lg:h-[700px] lg:w-1/2">
        <CustomImage image={images[0]} />
      </div>
      <div
        className={`flex w-full flex-col items-center ps-0 md:items-start md:ps-12 lg:w-1/2 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-12"}`}
      >
        <div className={`w-3/4 ${isInverted ? "lg:w-1/2" : ""} py-20`}>
          <h4
            className={`mb-4 text-center text-3xl font-bold ${caseStyles[titleCase]} text-inherit md:text-start md:text-4xl`}
          >
            {isHighlighted ? HighlightLastWord(title) : title}
          </h4>
          <div className="text-center md:text-start">
            <BlockRendererClient content={description as BlocksContent} />
          </div>
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
    titleCase = "normal",
    description,
    isInverted = false,
    isHighlighted = false,
    link,
    bgColor,
  } = props;

  return (
    <div
      className={`flex ${isInverted ? "flex-col" : "flex-col-reverse"} ${bgStyles[bgColor]} my-9 w-full max-w-[1536px] items-center justify-center gap-10 px-8 md:px-14`}
    >
      <div className="relative h-[320px] w-full md:h-[500px]">
        <CustomImage image={images[0]} />
      </div>
      <div className="flex w-full flex-col items-center gap-4 md:w-3/5">
        <h4
          className={`mb-4 text-center text-3xl font-bold ${caseStyles[titleCase]} text-inherit md:text-4xl`}
        >
          {isHighlighted ? HighlightLastWord(title) : title}
        </h4>
        <div className="text-center">
          <BlockRendererClient content={description as BlocksContent} />
        </div>
        {link ? <CustomLink href={link.href}>{link.label}</CustomLink> : null}
      </div>
    </div>
  );
}

export function PanoramicFW(props: ImageTextBlock) {
  const {
    images,
    title,
    titleCase = "normal",
    description,
    link,
    isInverted,
    epigraph,
    bgColor,
  } = props;

  return (
    <section
      className={`mb-14 flex w-full ${isInverted ? "flex-col-reverse" : "flex-col"} ${bgStyles[bgColor]}`}
    >
      <div className="my-14 flex w-full flex-col items-stretch px-10 lg:flex-row lg:px-32">
        <TitleDescBlock
          title={title}
          titleCase={titleCase}
          desc={description}
          epigraph={epigraph}
          align="start"
        />
        {link ? (
          <div className="flex h-full w-full items-end justify-start lg:justify-end">
            <CustomLink href={link?.href}>{link.label}</CustomLink>
          </div>
        ) : null}
      </div>
      <div className="relative h-[550px] w-full">
        <CustomImage image={images[0]} />
      </div>
    </section>
  );
}
