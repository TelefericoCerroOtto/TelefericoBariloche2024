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
import type { ThreeImagesProps } from "../../shared/types";

export default function Masonry(props: ThreeImagesProps) {
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

  // En <lg, el bloque de imágenes ocupa 100% y cada celda ~ 1/2 (menos gap-4=1rem)
  const sizesMobileCell =
    "(max-width: 768px) calc((100vw - 3rem - 1rem) / 2), (max-width: 1024px) calc((100vw - 6rem - 1rem) / 2), 360px";

  // En >=lg, el bloque de imágenes es 1/2 del layout, y cada celda ~ 1/2 de esa mitad => ~ 1/4 del viewport (menos gaps)
  const sizesDesktopCell =
    "(max-width: 1536px) calc((100vw - 6rem - 1rem) / 4), 360px";

  return (
    <section className={`my-14 w-full ${bgStyles[bgColor]}`}>
      <div className="mx-auto w-full max-w-[1536px] px-6 md:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          {/* Images */}
          <div className={isInverted ? "lg:order-2" : "lg:order-1"}>
            <div className="grid h-[420px] grid-cols-2 grid-rows-2 gap-4 md:h-[620px]">
              <div className="group relative row-span-2 overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
                <div className="relative h-full w-full lg:hidden">
                  <CustomImage image={mobile0} sizes={sizesMobileCell} />
                </div>
                <div className="relative hidden h-full w-full lg:block">
                  <CustomImage image={desktop0} sizes={sizesDesktopCell} />
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
                <div className="relative h-full w-full lg:hidden">
                  <CustomImage image={mobile1} sizes={sizesMobileCell} />
                </div>
                <div className="relative hidden h-full w-full lg:block">
                  <CustomImage image={desktop1} sizes={sizesDesktopCell} />
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
                <div className="relative h-full w-full lg:hidden">
                  <CustomImage image={mobile2} sizes={sizesMobileCell} />
                </div>
                <div className="relative hidden h-full w-full lg:block">
                  <CustomImage image={desktop2} sizes={sizesDesktopCell} />
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className={isInverted ? "lg:order-1" : "lg:order-2"}>
            <div className="w-full rounded-3xl bg-background/80 px-8 py-10 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/80 backdrop-blur">
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
                  <BlockRendererClient
                    content={description as BlocksContent}
                    prosePreset="feature"
                  />
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
