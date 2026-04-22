"use client";

import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
} from "@/components";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import { typography } from "@/lib/constants/typography.const";
import type { BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";
import type { OneImageProps } from "../../shared/types";

export default function Poster(props: OneImageProps) {
  const {
    desktopImages,
    mobileImages,
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

  const sizesMobile = "calc(100vw - 3rem)";
  const sizesDesktop = "(max-width: 1536px) calc(100vw - 6rem), 1440px";

  return (
    <section className={`my-14 w-full ${bgStyles[bgColor]}`}>
      <div className="mx-auto w-full max-w-[1536px] px-6 md:px-12">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-black/15 ring-1 ring-red-500/15">
          {/* Background image */}
          <div className="relative h-[620px] w-full overflow-hidden">
            {/* Mobile (<md) */}
            <div className="relative h-full w-full md:hidden">
              <CustomImage image={mobile0} sizes={sizesMobile} quality={68} />
            </div>

            {/* Desktop (>=md) */}
            <div className="relative hidden h-full w-full md:block">
              <CustomImage image={desktop0} sizes={sizesDesktop} quality={68} />
            </div>

            <div aria-hidden="true" className="absolute inset-0 bg-black/30" />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/10"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 [background:radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.25)_55%,rgba(0,0,0,0.55)_100%)]"
            />
          </div>

          {/* Center content card */}
          <div className="absolute inset-0 flex items-center justify-center px-5 py-8">
            <article className="w-full max-w-3xl rounded-3xl bg-background/50 px-8 py-10 text-foreground shadow-2xl shadow-black/20 ring-1 ring-red-500/25 backdrop-blur-md md:px-12 md:py-12">
              <div
                aria-hidden="true"
                className="mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-500"
              />

              <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-5">
                <LogoBadge />

                <div className="w-full">
                  <h4
                    className={`text-center font-bold ${caseStyles[titleCase]} text-inherit md:text-left ${typography.headings.feature}`}
                  >
                    {isHighlighted ? HighlightLastWord(title) : title}
                  </h4>

                  {epigraph ? (
                    <p
                      className={`mt-2 text-center font-semibold uppercase tracking-[0.35em] text-foreground/70 md:text-left ${typography.meta.featureEyebrow}`}
                    >
                      {epigraph}
                    </p>
                  ) : null}
                </div>
              </div>

              {description ? (
                <div
                  className={`mt-6 space-y-4 text-center leading-relaxed text-foreground/80 md:text-left ${typography.content.feature}`}
                >
                  <BlockRendererClient
                    content={description as BlocksContent}
                    prosePreset="feature"
                  />
                </div>
              ) : null}

              {link ? (
                <div className="mt-8 flex justify-center md:justify-start">
                  <CustomLink href={link.href} withButtonStyles>
                    {link.label}
                  </CustomLink>
                </div>
              ) : null}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
