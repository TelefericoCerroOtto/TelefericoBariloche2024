"use client";

import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
} from "@/components";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import { typography } from "@/lib/constants/typography.const";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";
import type { TwoImagesProps } from "../../shared/types";

export default function Double(props: TwoImagesProps) {
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

  // Cada square es w-3/5 del rail. En <lg, rail es full width.
  const sizesSquareMobile =
    "(max-width: 640px) calc((100vw - 3rem) * 0.6), (max-width: 1024px) calc((100vw - 6rem) * 0.6), 500px";

  // En >=lg, rail es 1/2 del layout, y el square es 3/5 de esa mitad => ~0.3 del viewport (con padding+gap)
  const sizesSquareDesktop =
    "(max-width: 1536px) calc((100vw - 9rem) * 0.3), 460px";

  return (
    <div
      className={`flex flex-col gap-12 px-6 md:px-12 ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} ${bgStyles[bgColor]} my-9 w-full max-w-[1536px] items-center justify-center`}
    >
      <div className="relative aspect-square w-full overflow-x-scroll lg:w-1/2">
        <div className="group absolute right-0 top-0 z-10 aspect-square w-3/5 min-w-[160px] max-w-[270px] overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 sm:max-w-[500px] lg:max-w-full">
          <div className="relative h-full w-full lg:hidden">
            <CustomImage image={mobile0} sizes={sizesSquareMobile} />
          </div>
          <div className="relative hidden h-full w-full lg:block">
            <CustomImage image={desktop0} sizes={sizesSquareDesktop} />
          </div>
        </div>

        <div className="group absolute bottom-0 z-0 aspect-square w-3/5 min-w-[160px] max-w-[270px] overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 sm:max-w-[500px] lg:max-w-full">
          <div className="relative h-full w-full lg:hidden">
            <CustomImage image={mobile1} sizes={sizesSquareMobile} />
          </div>
          <div className="relative hidden h-full w-full lg:block">
            <CustomImage image={desktop1} sizes={sizesSquareDesktop} />
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
              className={`text-center font-bold ${caseStyles[titleCase]} text-inherit md:text-left ${typography.headings.feature} max-sm:text-3xl max-sm:leading-tight`}
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

          <div
            className={`mt-4 space-y-4 text-center leading-relaxed text-foreground/80 md:text-left ${typography.content.feature}`}
          >
            <BlockRendererClient
              content={description as BlocksContent}
              prosePreset="feature"
              className="max-sm:prose-lg"
            />
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
