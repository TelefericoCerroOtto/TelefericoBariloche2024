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

export default function Panoramic(props: ImageTextBlock) {
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
            <p className="inline-block border-l-2 border-red-500/40 pl-4 text-sm font-semibold uppercase tracking-[0.35em] text-foreground/70 md:text-base">
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
