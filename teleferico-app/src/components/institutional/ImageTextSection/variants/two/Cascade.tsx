"use client";

import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
} from "@/components";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import type { BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";
import type { TwoImagesProps } from "../../shared/types";

export default function Cascade(props: TwoImagesProps) {
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

  // Slot fallbacks
  const topMobile = mobileImages?.[0] ?? desktopImages?.[0] ?? null;
  const topDesktop = desktopImages?.[0] ?? mobileImages?.[0] ?? null;

  const bottomMobile = mobileImages?.[1] ?? desktopImages?.[1] ?? null;
  const bottomDesktop = desktopImages?.[1] ?? mobileImages?.[1] ?? null;

  // Bottom: max-w-xl (576px)
  const sizesBottomMobile = "(max-width: 640px) calc(100vw - 3rem), 576px";
  const sizesBottomDesktop = "576px";

  // Top: w-[72%] del contenedor (0.72 * 576 ≈ 414px)
  const sizesTopMobile =
    "(max-width: 640px) calc((100vw - 3rem) * 0.72), 414px";
  const sizesTopDesktop = "414px";

  return (
    <section className={`my-14 w-full ${bgStyles[bgColor]}`}>
      <div className="mx-auto w-full max-w-[1536px] px-6 md:px-12">
        <div
          className={[
            "grid grid-cols-1 items-center gap-10 lg:grid-cols-2",
            isInverted ? "lg:[&>*:first-child]:order-2" : "",
          ].join(" ")}
        >
          {/* Images: interlocking frames */}
          <div className="relative">
            <div className="relative mx-auto w-full max-w-xl">
              {/* Bottom (base) image */}
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-black/5 shadow-2xl shadow-black/10 ring-1 ring-red-500/15">
                <div className="relative h-full w-full lg:hidden">
                  <CustomImage image={bottomMobile} sizes={sizesBottomMobile} />
                </div>
                <div className="relative hidden h-full w-full lg:block">
                  <CustomImage
                    image={bottomDesktop}
                    sizes={sizesBottomDesktop}
                  />
                </div>

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"
                />
              </div>

              {/* Top (interlocking) image */}
              <div className="absolute left-1/2 top-0 w-[72%] -translate-x-1/2 -translate-y-[14%] overflow-visible">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl shadow-[0_30px_70px_-18px_rgba(0,0,0,0.55)]"
                />

                <div className="relative overflow-hidden rounded-3xl bg-background shadow-2xl shadow-black/25 ring-1 ring-black/10">
                  <div className="relative aspect-[16/11] overflow-hidden">
                    <div className="relative h-full w-full lg:hidden">
                      <CustomImage image={topMobile} sizes={sizesTopMobile} />
                    </div>
                    <div className="relative hidden h-full w-full lg:block">
                      <CustomImage image={topDesktop} sizes={sizesTopDesktop} />
                    </div>

                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-black/10"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.18),inset_0_-18px_30px_-20px_rgba(0,0,0,0.35)]"
                    />
                  </div>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-red-600/10 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-red-600/10 blur-2xl"
              />

              <div className="h-10 sm:h-12" />
            </div>
          </div>

          {/* Text */}
          <div className="flex w-full flex-col items-center lg:items-start">
            <div className="w-full rounded-3xl bg-background/80 px-8 py-10 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/80 backdrop-blur md:px-10 md:py-12">
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
                <div className="mt-4 space-y-4 text-center text-base leading-relaxed text-foreground/80 md:text-left md:text-lg">
                  <BlockRendererClient content={description as BlocksContent} />
                </div>
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
      </div>
    </section>
  );
}
