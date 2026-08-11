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
import { IMAGE_TEXT_IMAGE_QUALITY } from "../../shared/image-policy";
import LogoBadge from "../../shared/LogoBadge";
import type { OneImageProps } from "../../shared/types";

export default function Card(props: OneImageProps) {
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

  // Slot 0 fallbacks (mobile <-> desktop)
  const mobile0 = mobileImages?.[0] ?? desktopImages?.[0] ?? null;
  const desktop0 = desktopImages?.[0] ?? mobileImages?.[0] ?? null;

  // sizes:
  // - mobile: contenedor = 100vw - px-6 (3rem)
  // - desktop (>=md): contenedor dentro de max-w[1536] con px-12 (6rem) => cap aprox 1440px
  const sizesMobile = "calc(100vw - 3rem)";
  const sizesDesktop = "(max-width: 1536px) calc(100vw - 6rem), 1440px";

  return (
    <section className={`my-14 w-full ${bgStyles[bgColor]}`}>
      <div className="mx-auto w-full max-w-[1536px] px-6 md:px-12">
        <article className="overflow-hidden rounded-3xl bg-background shadow-xl shadow-black/10 ring-1 ring-red-500/15">
          {/* Media */}
          <div className="relative aspect-[4/3] w-full overflow-hidden md:aspect-[24/7]">
            {/* Mobile (<md) */}
            <div className="relative h-full w-full md:hidden">
              <CustomImage
                image={mobile0}
                sizes={sizesMobile}
                quality={IMAGE_TEXT_IMAGE_QUALITY.primary}
              />
            </div>

            {/* Desktop (>=md) */}
            <div className="relative hidden h-full w-full md:block">
              <CustomImage
                image={desktop0}
                sizes={sizesDesktop}
                quality={IMAGE_TEXT_IMAGE_QUALITY.primary}
              />
            </div>

            <div aria-hidden="true" className="absolute inset-0 bg-black/10" />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/35 via-black/10 to-transparent"
            />
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-5">
              <LogoBadge />
              <div className="w-full">
                <h4
                  className={`text-center font-bold ${caseStyles[titleCase]} text-foreground md:text-left ${typography.headings.feature}`}
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
                className={`mt-6 space-y-4 text-center leading-relaxed text-foreground/80 md:text-left ${typography.content.section}`}
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
          </div>
        </article>
      </div>
    </section>
  );
}
