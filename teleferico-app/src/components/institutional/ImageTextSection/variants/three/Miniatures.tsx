import { HighlightLastWord } from "@/components/institutional/TitleDescBlock";
import { BlockRendererClient, CustomLink } from "@/components/shared";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import { typography } from "@/lib/constants/typography.const";
import CustomImage from "../../shared/CustomImage";
import { IMAGE_TEXT_IMAGE_QUALITY } from "../../shared/image-policy";
import LogoBadge from "../../shared/LogoBadge";
import type { ThreeImagesProps } from "../../shared/types";

export default function Miniatures(props: ThreeImagesProps) {
  const {
    desktopImages,
    mobileImages,
    isInverted,
    title,
    titleCase = "normal",
    description,
    link,
    epigraph,
    bgColor,
    isHighlighted = false,
  } = props;

  const mobile0 = mobileImages?.[0] ?? desktopImages?.[0] ?? null;
  const desktop0 = desktopImages?.[0] ?? mobileImages?.[0] ?? null;

  const mobile1 = mobileImages?.[1] ?? desktopImages?.[1] ?? null;
  const desktop1 = desktopImages?.[1] ?? mobileImages?.[1] ?? null;

  const mobile2 = mobileImages?.[2] ?? desktopImages?.[2] ?? null;
  const desktop2 = desktopImages?.[2] ?? mobileImages?.[2] ?? null;

  // Slot 0 follows the full-width image rail and can exceed 600px before the desktop split.
  const sizesMainMobile =
    "(max-width: 451px) calc(100vw - 2rem), (max-width: 639px) 420px, (max-width: 767px) calc(100vw - 3rem), calc(100vw - 6rem)";
  const sizesMainDesktop =
    "(max-width: 1535px) calc((100vw - 9rem) / 2), 696px";

  // Slots 1/2 are 5/12 of the image rail, with a 420px inner cap below sm.
  const sizesThumbMobile =
    "(max-width: 451px) calc((100vw - 2rem) * 0.4167), (max-width: 639px) 175px, (max-width: 767px) calc((100vw - 3rem) * 0.4167), calc((100vw - 6rem) * 0.4167)";
  const sizesThumbDesktop =
    "(max-width: 1535px) calc((100vw - 9rem) * 0.2083), 290px";

  return (
    <section className={`my-9 w-full ${bgStyles[bgColor]}`}>
      <div
        className={`mx-auto flex w-full max-w-[1536px] flex-col items-center justify-center gap-8 px-4 sm:px-6 md:gap-12 md:px-12 ${
          isInverted ? "lg:flex-row-reverse" : "lg:flex-row"
        }`}
      >
        {/* IMAGES */}
        <div className="aspect-[4/5] w-full min-w-0 overflow-x-hidden overflow-y-visible lg:w-1/2">
          <div className="relative mx-auto h-full w-full min-w-0 max-w-[420px] sm:min-w-[380px] sm:max-w-none">
            <div className="group absolute left-1/2 top-1/2 z-0 aspect-square h-4/5 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
              <div className="relative h-full w-full lg:hidden">
                <CustomImage
                  image={mobile0}
                  sizes={sizesMainMobile}
                  quality={IMAGE_TEXT_IMAGE_QUALITY.primary}
                />
              </div>
              <div className="relative hidden h-full w-full lg:block">
                <CustomImage
                  image={desktop0}
                  sizes={sizesMainDesktop}
                  quality={IMAGE_TEXT_IMAGE_QUALITY.primary}
                />
              </div>
            </div>

            <div className="group absolute left-0 top-0 z-10 h-1/3 w-5/12 overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 sm:h-1/4">
              <div className="relative h-full w-full lg:hidden">
                <CustomImage
                  image={mobile1}
                  sizes={sizesThumbMobile}
                  quality={IMAGE_TEXT_IMAGE_QUALITY.thumbnail}
                />
              </div>
              <div className="relative hidden h-full w-full lg:block">
                <CustomImage
                  image={desktop1}
                  sizes={sizesThumbDesktop}
                  quality={IMAGE_TEXT_IMAGE_QUALITY.thumbnail}
                />
              </div>
            </div>

            <div className="group absolute bottom-0 right-0 z-10 h-1/3 w-5/12 overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 sm:h-1/4">
              <div className="relative h-full w-full lg:hidden">
                <CustomImage
                  image={mobile2}
                  sizes={sizesThumbMobile}
                  quality={IMAGE_TEXT_IMAGE_QUALITY.thumbnail}
                />
              </div>
              <div className="relative hidden h-full w-full lg:block">
                <CustomImage
                  image={desktop2}
                  sizes={sizesThumbDesktop}
                  quality={IMAGE_TEXT_IMAGE_QUALITY.thumbnail}
                />
              </div>
            </div>
          </div>
        </div>

        {/* TEXT */}
        <div
          className={`flex w-full min-w-0 flex-col items-center px-0 md:items-start lg:w-1/2 ${
            isInverted ? "lg:items-center" : "lg:items-start lg:px-10"
          }`}
        >
          <div className="w-full max-w-xl rounded-3xl bg-background/80 px-5 py-7 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/80 backdrop-blur sm:px-8 sm:py-10">
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-start md:gap-5">
              <LogoBadge />
              <h4
                className={`text-center font-bold ${caseStyles[titleCase]} text-inherit md:text-left ${typography.headings.feature} max-sm:text-3xl max-sm:leading-tight`}
              >
                {isHighlighted ? HighlightLastWord(title) : title}
              </h4>
            </div>

            <div className="mt-2 min-h-[1.5rem] text-center md:text-left">
              {epigraph ? (
                <p
                  className={`${typography.meta.featureEyebrow} font-semibold uppercase tracking-[0.35em] text-foreground/70 max-sm:text-sm`}
                >
                  {epigraph}
                </p>
              ) : null}
            </div>

            {description ? (
              typeof description === "string" ? (
                <p
                  className={`mt-4 text-left leading-relaxed text-foreground/80 ${typography.content.feature} max-sm:text-lg`}
                >
                  {description}
                </p>
              ) : (
                <div
                  className={`mt-4 space-y-4 text-left leading-relaxed text-foreground/80 ${typography.content.feature} max-sm:text-lg`}
                >
                  <BlockRendererClient
                    content={description}
                    prosePreset="feature"
                    className="max-sm:prose-lg"
                  />
                </div>
              )
            ) : null}

            {link ? (
              <div className="mt-5">
                <CustomLink href={link.href} withButtonStyles>
                  {link.label}
                </CustomLink>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
