import { HighlightLastWord } from "@/components/institutional/TitleDescBlock";
import { BlockRendererClient, CustomLink } from "@/components/shared";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import { typography } from "@/lib/constants/typography.const";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";
import type { ThreeImagesProps } from "../../shared/types";

export default function Ladder(props: ThreeImagesProps) {
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

  // Cada frame es w-2/5 con min-w-[200px]. En sm/md suele rondar 240-280.
  const sizesMobileFrame = "(max-width: 640px) 200px, 280px";
  // En lg la columna es ~1/2; 2/5 de eso suele quedar ~280-320.
  const sizesDesktopFrame = "(max-width: 1536px) 320px, 360px";

  return (
    <div
      className={`flex flex-col gap-12 px-6 md:px-12 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} ${bgStyles[bgColor]} my-9 w-full max-w-[1536px] items-center justify-center`}
    >
      <div className="h-[360px] w-full overflow-x-scroll sm:h-[700px] lg:w-1/2">
        <div className="relative h-full w-full min-w-[420px]">
          <div className="group absolute right-0 z-20 h-3/4 w-2/5 min-w-[200px] overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
            <div className="relative h-full w-full lg:hidden">
              <CustomImage image={mobile0} sizes={sizesMobileFrame} />
            </div>
            <div className="relative hidden h-full w-full lg:block">
              <CustomImage image={desktop0} sizes={sizesDesktopFrame} />
            </div>
          </div>

          <div className="group absolute right-1/4 top-1/2 z-10 h-3/4 w-2/5 min-w-[200px] -translate-y-1/2 transform overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
            <div className="relative h-full w-full lg:hidden">
              <CustomImage image={mobile1} sizes={sizesMobileFrame} />
            </div>
            <div className="relative hidden h-full w-full lg:block">
              <CustomImage image={desktop1} sizes={sizesDesktopFrame} />
            </div>
          </div>

          <div className="group absolute bottom-0 z-0 h-3/4 w-2/5 min-w-[200px] overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
            <div className="relative h-full w-full lg:hidden">
              <CustomImage image={mobile2} sizes={sizesMobileFrame} />
            </div>
            <div className="relative hidden h-full w-full lg:block">
              <CustomImage image={desktop2} sizes={sizesDesktopFrame} />
            </div>
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
              className={`text-center font-bold ${caseStyles[titleCase]} text-inherit md:text-left ${typography.headings.feature}`}
            >
              {isHighlighted ? HighlightLastWord(title) : title}
            </h4>
          </div>

          <div className="mt-2 min-h-[1.5rem] text-center md:text-left">
            {epigraph ? (
              <p
                className={`${typography.meta.featureEyebrow} font-semibold uppercase tracking-[0.35em] text-foreground/70`}
              >
                {epigraph}
              </p>
            ) : null}
          </div>

          {description ? (
            typeof description === "string" ? (
              <p
                className={`mt-4 text-left leading-relaxed text-foreground/80 ${typography.content.feature}`}
              >
                {description}
              </p>
            ) : (
              <div
                className={`mt-4 space-y-4 text-left leading-relaxed text-foreground/80 ${typography.content.feature}`}
              >
                <BlockRendererClient
                  content={description}
                  prosePreset="feature"
                />
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
