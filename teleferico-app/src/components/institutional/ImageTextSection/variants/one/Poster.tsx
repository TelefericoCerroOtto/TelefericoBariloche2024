"use client";

import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
} from "@/components";
import { blocksToPlainText } from "@/lib/adapters/formats";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import { typography } from "@/lib/constants/typography.const";
import type { BlocksContent } from "@strapi/blocks-react-renderer";
import { ArrowRight } from "lucide-react";
import CustomImage from "../../shared/CustomImage";
import { IMAGE_TEXT_IMAGE_QUALITY } from "../../shared/image-policy";
import LogoBadge from "../../shared/LogoBadge";
import type { OneImageProps } from "../../shared/types";

type PosterState = "default" | "image-action-only" | "image-only";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

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

  const normalizedTitle = title.trim();
  const normalizedEpigraph = epigraph?.trim() ?? "";
  const hasDescription = blocksToPlainText(description).length > 0;
  const hasTitle = normalizedTitle.length > 0;
  const hasEpigraph = normalizedEpigraph.length > 0;
  const hasCopy = hasTitle || hasEpigraph || hasDescription;
  const normalizedLink =
    link && isNonEmptyString(link.href) && isNonEmptyString(link.label)
      ? {
          href: link.href.trim(),
          label: link.label.trim(),
        }
      : null;

  const posterState: PosterState = hasCopy
    ? "default"
    : normalizedLink
      ? "image-action-only"
      : "image-only";

  const sizesMobile = "calc(100vw - 3rem)";
  const sizesDesktop = "(max-width: 1536px) calc(100vw - 6rem), 1440px";

  return (
    <section className={`my-14 w-full ${bgStyles[bgColor]}`}>
      <div className="mx-auto w-full max-w-[1536px] px-6 md:px-12">
        <div
          className={[
            "relative overflow-hidden rounded-3xl shadow-2xl shadow-black/15 ring-1 ring-red-500/15",
            posterState === "image-action-only"
              ? "group transition-shadow duration-300 focus-within:shadow-black/25 hover:shadow-black/25"
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Background image */}
          <div className="relative aspect-[9/16] w-full overflow-hidden md:aspect-[21/9]">
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

            {posterState === "default" ? (
              <>
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-black/30"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/10"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 [background:radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.25)_55%,rgba(0,0,0,0.55)_100%)]"
                />
              </>
            ) : null}

            {posterState === "image-action-only" ? (
              <>
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-black/10 transition-colors duration-300 group-focus-within:bg-black/20 group-hover:bg-black/20"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100"
                />
              </>
            ) : null}
          </div>

          {posterState === "default" ? (
            <div className="absolute inset-0 flex items-center justify-center px-5 py-8">
              <article className="w-full max-w-3xl rounded-3xl bg-background/50 px-6 py-8 text-foreground shadow-2xl shadow-black/20 ring-1 ring-red-500/25 backdrop-blur-md sm:px-8 sm:py-10 md:px-12 md:py-12">
                <div
                  aria-hidden="true"
                  className="mb-5 h-1 w-16 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-500 sm:mb-6"
                />

                <div className="flex flex-col items-center gap-3 md:flex-row md:items-start md:gap-5">
                  <LogoBadge />

                  {hasTitle || hasEpigraph ? (
                    <div className="w-full">
                      {hasTitle ? (
                        <h4
                          className={`text-center font-bold ${caseStyles[titleCase]} text-inherit md:text-left ${typography.headings.feature} max-sm:text-3xl max-sm:leading-tight`}
                        >
                          {isHighlighted
                            ? HighlightLastWord(normalizedTitle)
                            : normalizedTitle}
                        </h4>
                      ) : null}

                      {hasEpigraph ? (
                        <p
                          className={`mt-2 text-center font-semibold uppercase tracking-[0.35em] text-foreground/70 md:text-left ${typography.meta.featureEyebrow} max-sm:text-sm`}
                        >
                          {normalizedEpigraph}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {hasDescription ? (
                  <div
                    className={`mt-5 space-y-4 text-center leading-relaxed text-foreground/80 md:mt-6 md:text-left ${typography.content.feature} max-sm:text-lg`}
                  >
                    <BlockRendererClient
                      content={description as BlocksContent}
                      prosePreset="feature"
                      className="max-sm:prose-lg"
                    />
                  </div>
                ) : null}

                {normalizedLink ? (
                  <div className="mt-6 flex justify-center md:mt-8 md:justify-start">
                    <CustomLink href={normalizedLink.href} withButtonStyles>
                      {normalizedLink.label}
                    </CustomLink>
                  </div>
                ) : null}
              </article>
            </div>
          ) : null}

          {posterState === "image-action-only" && normalizedLink ? (
            <CustomLink
              href={normalizedLink.href}
              aria-label={normalizedLink.label}
              className="group absolute inset-0 flex items-end justify-end rounded-3xl p-5 outline-none focus-visible:ring-4 focus-visible:ring-red-500/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black/20 md:p-8"
            >
              <span className="bg-background/88 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-background group-focus-visible:-translate-y-0.5 md:text-base">
                <span>{normalizedLink.label}</span>
                <ArrowRight aria-hidden className="h-4 w-4" />
              </span>
            </CustomLink>
          ) : null}

          {posterState === "image-only" ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
