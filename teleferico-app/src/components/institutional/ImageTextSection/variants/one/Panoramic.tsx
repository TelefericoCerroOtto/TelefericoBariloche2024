"use client";

import { BlockRendererClient, CustomLink } from "@/components";
import { bgStyles, fontSize } from "@/lib/constants/styles.const";
import type { ImageTextBlock } from "@/types";
import { Button } from "@heroui/react";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "../../shared/CustomImage";

export default function Panoramic(props: ImageTextBlock) {
  const {
    images,
    title,
    titleCase = "normal",
    description,
    link,
    epigraph,
    bgColor,
  } = props;

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
          <CustomImage image={images[0]} />
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
                className={`mb-3 font-bold uppercase tracking-wide text-red-600 ${fontSize.epigraph}`}
              >
                {epigraph}
              </p>
            ) : null}

            {title ? (
              <h2
                className={[
                  "font-black tracking-tight text-white sm:tracking-normal",
                  fontSize.title,
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
                  className={[
                    // override del renderer base (evita text-black/text-2xl)
                    "prose-invert text-white",
                    "text-sm sm:text-base md:text-lg",
                    // centrado real en rich text
                    "text-center",
                    "prose-headings:text-center prose-p:text-center prose-li:text-center",
                    // espaciado más prolijo en overlay
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
                  className={`px-6 font-semibold ${fontSize.base}`}
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
