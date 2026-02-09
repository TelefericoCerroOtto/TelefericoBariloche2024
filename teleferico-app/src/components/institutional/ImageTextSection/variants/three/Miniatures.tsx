import { HighlightLastWord } from "@/components/institutional/TitleDescBlock";
import { BlockRendererClient, CustomLink } from "@/components/shared";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import { ImageTextBlock } from "@/types";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";

export default function Miniatures(props: ImageTextBlock) {
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
      className={`flex flex-col gap-12 px-6 md:px-12 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} ${bgStyles[bgColor]} my-9 w-full max-w-[1536px] items-center justify-center`}
    >
      <div className="h-[360px] w-full overflow-x-scroll sm:h-[750px] lg:w-1/2">
        <div className="relative h-full w-full min-w-[380px]">
          <div className="group absolute left-1/2 top-1/2 z-0 aspect-square h-4/5 -translate-x-1/2 -translate-y-1/2 transform overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
            <CustomImage image={images[0]} />
          </div>
          <div className="group absolute z-10 h-1/3 w-5/12 overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 sm:h-1/4">
            <CustomImage image={images[1]} />
          </div>
          <div className="group absolute bottom-0 right-0 z-10 h-1/3 w-5/12 overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 sm:h-1/4">
            <CustomImage image={images[2]} />
          </div>
        </div>
      </div>
      <div
        className={`flex w-full flex-col items-center px-0 md:items-start lg:w-1/2 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-10"}`}
      >
        <div className="w-full max-w-xl rounded-3xl bg-background/80 px-8 py-10 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/80 backdrop-blur">
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
          {description ? (
            typeof description === "string" ? (
              <p className="mt-4 text-left text-base leading-relaxed text-foreground/80 md:text-lg">
                {description}
              </p>
            ) : (
              <div className="mt-4 space-y-4 text-left text-base leading-relaxed text-foreground/80 md:text-lg">
                <BlockRendererClient content={description} />
              </div>
            )
          ) : null}
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
