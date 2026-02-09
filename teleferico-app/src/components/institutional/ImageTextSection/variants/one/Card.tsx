"use client";

import {
  BlockRendererClient,
  CustomLink,
  HighlightLastWord,
} from "@/components";
import { bgStyles, caseStyles, fontSize } from "@/lib/constants/styles.const";
import type { ImageTextBlock } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";

export default function Card(props: ImageTextBlock) {
  const {
    images,
    title,
    titleCase = "normal",
    description,
    link,
    epigraph,
    bgColor,
    isHighlighted = false,
  } = props;

  return (
    <section className={`my-14 w-full ${bgStyles[bgColor]}`}>
      <div className="mx-auto w-full max-w-[1536px] px-6 md:px-12">
        <article className="overflow-hidden rounded-3xl bg-background shadow-xl shadow-black/10 ring-1 ring-red-500/15">
          {/* Media */}
          <div className="relative h-[280px] w-full overflow-hidden md:h-[420px]">
            <CustomImage image={images[0]} />
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
                  className={`text-center text-3xl font-bold ${caseStyles[titleCase]} text-foreground md:text-left md:text-4xl`}
                >
                  {isHighlighted ? HighlightLastWord(title) : title}
                </h4>

                {epigraph ? (
                  <p className="mt-2 text-center text-sm font-semibold uppercase tracking-[0.35em] text-foreground/70 md:text-left md:text-base">
                    {epigraph}
                  </p>
                ) : null}
              </div>
            </div>

            {description ? (
              <div
                className={`mt-6 space-y-4 text-center leading-relaxed text-foreground/80 md:text-left ${fontSize.base}`}
              >
                <BlockRendererClient content={description as BlocksContent} />
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
