import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
  TitleDescBlock,
} from "@/components";
import type { ImageTextBlock } from "@/types";
import { bgStyles, caseStyles } from "@/utils";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import Image from "next/image";
import gondola from "@/public/gondola.svg";
import CustomImage from "./CustomImage";

const LogoBadge = () => (
  <span
    aria-hidden="true"
    className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30"
  >
    <Image
      src={gondola}
      alt=""
      className="h-5 w-5 text-red-600"
      width={20}
      height={20}
      aria-hidden="true"
      sizes="40px"
    />
  </span>
);

export function Default(props: ImageTextBlock) {
  const {
    images,
    title,
    titleCase = "normal",
    description,
    isInverted = false,
    isHighlighted = false,
    link,
    epigraph,
    bgColor,
  } = props;

  return (
    <div
      className={`flex flex-col gap-10 px-6 md:px-12 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} ${bgStyles[bgColor]} my-9 w-full max-w-[1536px] items-center justify-center`}
    >
      <div className="group relative h-[320px] w-full overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 md:h-[500px] lg:h-[700px] lg:w-1/2">
        <CustomImage image={images[0]} />
      </div>
      <div
        className={`flex w-full flex-col items-center px-0 md:items-start lg:w-1/2 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-10"}`}
      >
        <div className="relative flex w-full max-w-xl flex-col gap-6 rounded-3xl bg-background/80 px-8 py-10 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/15 backdrop-blur">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-5">
            <LogoBadge />
            <h4
              className={`text-center text-3xl font-bold ${caseStyles[titleCase]} text-inherit md:text-left md:text-4xl`}
            >
              {isHighlighted ? HighlightLastWord(title) : title}
            </h4>
          </div>
          <div className="mt-2 min-h-[1.5rem] text-center md:text-left">
            {epigraph ? (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-foreground/70 md:text-sm">
                {epigraph}
              </p>
            ) : null}
          </div>
          <div className="space-y-4 text-center text-base leading-relaxed text-foreground/80 md:text-left md:text-lg">
            <BlockRendererClient content={description as BlocksContent} />
          </div>
          {link ? (
            <CustomLink href={link.href} withButtonStyles>
              {link.label}
            </CustomLink>
          ) : null}
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
    epigraph,
    bgColor,
  } = props;

  return (
    <div
      className={`flex flex-col gap-12 px-6 md:px-12 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} ${bgStyles[bgColor]} w-full items-center justify-center`}
    >
      <div className="group relative h-[500px] w-full overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 lg:h-[700px] lg:w-1/2">
        <CustomImage image={images[0]} />
      </div>
      <div
        className={`flex w-full flex-col items-center ps-0 md:items-start md:ps-12 lg:w-1/2 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-10"}`}
      >
        <div className={`relative w-full max-w-2xl rounded-3xl bg-background/85 px-8 py-12 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/15 backdrop-blur ${isInverted ? "lg:ml-auto" : ""}`}>
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-5">
            <LogoBadge />
            <h4
              className={`text-center text-3xl font-bold ${caseStyles[titleCase]} text-inherit md:text-left md:text-4xl`}
            >
              {isHighlighted ? HighlightLastWord(title) : title}
            </h4>
          </div>
          <div className="mt-2 min-h-[1.5rem] text-center md:text-left">
            {epigraph ? (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-foreground/70 md:text-sm">
                {epigraph}
              </p>
            ) : null}
          </div>
          <div className="mt-4 space-y-4 text-center text-base leading-relaxed text-foreground/80 md:text-left md:text-lg">
            <BlockRendererClient content={description as BlocksContent} />
          </div>
          {link ? (
            <div className="mt-6">
              <CustomLink href={link.href} withButtonStyles>
                {link.label}
              </CustomLink>
            </div>
          ) : null}
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
    epigraph,
    bgColor,
  } = props;

  return (
    <div
      className={`flex ${isInverted ? "flex-col" : "flex-col-reverse"} ${bgStyles[bgColor]} my-9 w-full max-w-[1536px] items-center justify-center gap-10 px-6 md:px-14`}
    >
      <div className="group relative h-[320px] w-full overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 md:h-[500px]">
        <CustomImage image={images[0]} />
      </div>
      <div className="flex w-full flex-col items-center gap-6 md:w-3/5">
        <div className="flex flex-col items-center gap-4">
          <LogoBadge />
          <h4
            className={`text-center text-3xl font-bold ${caseStyles[titleCase]} text-inherit md:text-4xl`}
          >
            {isHighlighted ? HighlightLastWord(title) : title}
          </h4>
        </div>
        <div className="mt-2 min-h-[1.5rem] text-center">
          {epigraph ? (
            <p className="inline-block border-l-2 border-red-500/40 pl-4 text-xs font-semibold uppercase tracking-[0.35em] text-foreground/70 md:text-sm">
              {epigraph}
            </p>
          ) : null}
        </div>
        <div className="space-y-4 text-center text-base leading-relaxed text-foreground/80 md:text-lg">
          <BlockRendererClient content={description as BlocksContent} />
        </div>
        {link ? (
          <CustomLink href={link.href} withButtonStyles>
            {link.label}
          </CustomLink>
        ) : null}
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
      className={`mb-14 flex w-full gap-12 ${isInverted ? "flex-col-reverse" : "flex-col"} ${bgStyles[bgColor]}`}
    >
      <div className="my-10 flex w-full flex-col items-stretch gap-10 px-6 md:px-12 lg:flex-row lg:px-32">
        <div className="w-full rounded-3xl bg-background/85 px-8 py-12 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/15 backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
              <LogoBadge />
              <div className="flex-1">
                <TitleDescBlock
                  title={title}
                  titleCase={titleCase}
                  desc={description}
                  epigraph={epigraph}
                  align="start"
                />
              </div>
            </div>
            {link ? (
              <div className="flex justify-start pt-2">
                <CustomLink href={link?.href} withButtonStyles>
                  {link.label}
                </CustomLink>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="group relative h-[550px] w-full overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
        <CustomImage image={images[0]} />
      </div>
    </section>
  );
}
