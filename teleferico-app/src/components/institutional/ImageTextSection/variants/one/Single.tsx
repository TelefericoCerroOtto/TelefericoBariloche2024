import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
} from "@/components";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import type { ImageTextBlock } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";

export default function Single(props: ImageTextBlock) {
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
      className={`my-14 flex flex-col gap-4 px-6 md:px-12 lg:gap-12 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} ${bgStyles[bgColor]} w-full items-center justify-center`}
    >
      <div className="group relative h-[500px] w-full overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 lg:h-[700px] lg:w-1/2">
        <CustomImage image={images[0]} />
      </div>
      <div
        className={`flex w-full flex-col items-center md:items-start lg:w-1/2 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-10"}`}
      >
        <div
          className={`relative w-full rounded-3xl bg-background/85 px-8 py-12 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/80 backdrop-blur lg:max-w-2xl ${isInverted ? "lg:ml-auto" : ""}`}
        >
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
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-foreground/70 md:text-base">
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
