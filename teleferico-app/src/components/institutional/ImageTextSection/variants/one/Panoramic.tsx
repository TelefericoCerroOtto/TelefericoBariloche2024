"use client";

import { BlockRendererClient, CustomLink } from "@/components";
import { bgStyles } from "@/lib/constants/styles.const";
import { typography } from "@/lib/constants/typography.const";
import { Button } from "@heroui/react";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "../../shared/CustomImage";
import { IMAGE_TEXT_IMAGE_QUALITY } from "../../shared/image-policy";
import type { OneImageProps } from "../../shared/types";

export default function Panoramic(props: OneImageProps) {
  const {
    desktopImages,
    mobileImages,
    title,
    titleCase = "normal",
    description,
    link,
    epigraph,
    bgColor,
  } = props;

  const mobile0 = mobileImages?.[0] ?? desktopImages?.[0] ?? null;
  const desktop0 = desktopImages?.[0] ?? mobileImages?.[0] ?? null;

  // Full-bleed background => siempre 100vw
  const sizesMobile = "100vw";
  const sizesDesktop = "100vw";

  const titleCaseClass =
    titleCase === "uppercase"
      ? "uppercase"
      : titleCase === "capitalize"
        ? "capitalize"
        : "normal-case";

  return (
    <section className={`my-14 w-full ${bgStyles[bgColor]}`}>
      <div className="relative aspect-[2/3] w-full overflow-hidden shadow-2xl shadow-black/25 ring-1 ring-red-500/15 md:aspect-[21/9]">
        {/* Imagen */}
        <div className="absolute inset-0">
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
        </div>

        {/* Oscurecer fondo */}
        <div aria-hidden="true" className="absolute inset-0 bg-black/25" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent"
        />

        {/* Contenido centrado */}
        <div className="relative z-10 flex h-full w-full items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
            {epigraph ? (
              <p
                className={`mb-6 inline-flex items-center rounded-full bg-black/25 px-3 py-1 font-semibold uppercase tracking-[0.28em] text-red-200 shadow-sm backdrop-blur-sm sm:mb-10 ${typography.meta.eyebrow} max-sm:text-xs`}
              >
                {epigraph}
              </p>
            ) : null}

            {title ? (
              <h2
                className={[
                  "font-black tracking-tight text-white max-sm:text-2xl max-sm:leading-tight sm:tracking-normal",
                  typography.headings.hero,
                  titleCaseClass,
                ].join(" ")}
              >
                {title}
              </h2>
            ) : null}

            {description ? (
              <div className="mt-8 w-full sm:mt-12">
                <BlockRendererClient
                  content={description as BlocksContent}
                  prosePreset="feature"
                  className={[
                    "prose-invert max-w-none text-white",
                    "text-center",
                    "prose-headings:text-center prose-p:text-center prose-li:text-center",
                    "prose-headings:leading-tight prose-p:leading-relaxed",
                    "prose-a:text-custom-red",
                    "max-sm:prose-xl",
                  ].join(" ")}
                />
              </div>
            ) : null}

            {link ? (
              <div className="mt-10 flex justify-center sm:mt-14">
                <Button
                  as={CustomLink}
                  href={link.href}
                  radius="full"
                  color="primary"
                  variant="solid"
                  size="lg"
                  className={`px-5 font-semibold ${typography.ui.prominentAction} max-sm:px-4 max-sm:text-base`}
                >
                  {link.label}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
