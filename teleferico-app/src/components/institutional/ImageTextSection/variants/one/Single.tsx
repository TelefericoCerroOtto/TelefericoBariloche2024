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
import type { OneImageProps } from "../../shared/types";

export default function Single(props: OneImageProps) {
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

  // Breakpoint efectivo: lg (cuando pasa a 2 columnas)
  // - mobile (<lg): imagen ocupa el ancho completo (restando padding)
  // - desktop (>=lg): imagen ~1/2 del ancho, restando padding + gap (lg:gap-12 => 3rem)
  const sizesMobile =
    "(max-width: 768px) calc(100vw - 3rem), (max-width: 1024px) calc(100vw - 6rem), 928px";

  const sizesDesktop = "(max-width: 1536px) calc((100vw - 9rem) / 2), 50vw";

  return (
    <section className={`my-14 w-full ${bgStyles[bgColor]}`}>
      <div
        className={`mx-auto flex w-full max-w-[1536px] flex-col items-center justify-center gap-4 px-6 md:px-12 lg:gap-12 ${
          isInverted ? "lg:flex-row-reverse" : "lg:flex-row"
        }`}
      >
        <div className="group relative aspect-[2/3] w-full overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15 lg:aspect-square lg:w-1/2">
        {/* Mobile (<lg) */}
        <div className="relative h-full w-full lg:hidden">
          <CustomImage image={mobile0} sizes={sizesMobile} quality={76} />
        </div>

        {/* Desktop (>=lg) */}
        <div className="relative hidden h-full w-full lg:block">
          <CustomImage image={desktop0} sizes={sizesDesktop} quality={76} />
        </div>
      </div>

      <div
        className={`flex w-full flex-col items-center md:items-start lg:w-1/2 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-10"}`}
      >
        <div
          className={`relative w-full rounded-3xl bg-background/85 px-8 py-12 text-foreground shadow-xl shadow-black/5 ring-1 ring-red-500/80 backdrop-blur lg:max-w-2xl ${isInverted ? "lg:ml-auto" : ""}`}
        >
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
    </section>
  );
}
