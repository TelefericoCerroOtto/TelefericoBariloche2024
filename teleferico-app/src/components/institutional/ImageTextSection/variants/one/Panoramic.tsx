"use client";

import { BlockRendererClient, CustomLink } from "@/components";
import { bgStyles } from "@/lib/constants/styles.const";
import { typography } from "@/lib/constants/typography.const";
import { Button } from "@heroui/react";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "../../shared/CustomImage";
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
      <div className="relative h-[550px] w-full overflow-hidden shadow-2xl shadow-black/25 ring-1 ring-red-500/15">
        {/* Imagen */}
        <div className="absolute inset-0">
          {/* Mobile (<md) */}
          <div className="relative h-full w-full md:hidden">
            <CustomImage image={mobile0} sizes={sizesMobile} quality={68} />
          </div>

          {/* Desktop (>=md) */}
          <div className="relative hidden h-full w-full md:block">
            <CustomImage image={desktop0} sizes={sizesDesktop} quality={68} />
          </div>
        </div>

        {/* Oscurecer fondo */}
        <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/45 to-black/25"
        />

        {/* Contenido centrado */}
        <div className="relative z-10 flex h-full w-full items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
            {epigraph ? (
              <p
                className={`mb-3 font-bold uppercase tracking-wide text-red-600 ${typography.meta.eyebrow}`}
              >
                {epigraph}
              </p>
            ) : null}

            {title ? (
              <h2
                className={[
                  "font-black tracking-tight text-white sm:tracking-normal",
                  typography.headings.hero,
                  titleCaseClass,
                ].join(" ")}
              >
                {title}
              </h2>
            ) : null}

            {description ? (
              <div className="mt-4 w-full">
                <BlockRendererClient
                  content={description as BlocksContent}
                  prosePreset="feature"
                  className={[
                    "prose-invert text-white",
                    "text-center",
                    "prose-headings:text-center prose-p:text-center prose-li:text-center",
                    "prose-headings:leading-tight prose-p:leading-relaxed",
                    "prose-a:text-custom-red",
                  ].join(" ")}
                />
              </div>
            ) : null}

            {link ? (
              <div className="mt-6 flex justify-center">
                <Button
                  as={CustomLink}
                  href={link.href}
                  radius="full"
                  color="primary"
                  variant="solid"
                  size="lg"
                  className={`px-6 font-semibold ${typography.ui.prominentAction}`}
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
