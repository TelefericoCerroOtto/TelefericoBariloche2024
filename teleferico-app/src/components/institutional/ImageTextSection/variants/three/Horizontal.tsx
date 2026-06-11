import { HighlightLastWord } from "@/components/institutional/TitleDescBlock";
import { BlockRendererClient, CustomLink } from "@/components/shared";
import { bgStyles, caseStyles } from "@/lib/constants/styles.const";
import { typography } from "@/lib/constants/typography.const";
import CustomImage from "../../shared/CustomImage";
import LogoBadge from "../../shared/LogoBadge";
import type { ThreeImagesProps } from "../../shared/types";

export default function Horizontal(props: ThreeImagesProps) {
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
  const mobile0 = mobileImages?.[0] ?? desktopImages?.[0] ?? null;
  const desktop0 = desktopImages?.[0] ?? mobileImages?.[0] ?? null;

  const mobile1 = mobileImages?.[1] ?? desktopImages?.[1] ?? null;
  const desktop1 = desktopImages?.[1] ?? mobileImages?.[1] ?? null;

  const mobile2 = mobileImages?.[2] ?? desktopImages?.[2] ?? null;
  const desktop2 = desktopImages?.[2] ?? mobileImages?.[2] ?? null;

  // Cada card tiene min-w-[250px]. En scroll, es lo más estable para mobile.
  const sizesMobileCard = "250px";
  // En desktop, suele terminar cerca de 1/3 del contenedor (cuando deja de scrollear).
  const sizesDesktopCard =
    "(max-width: 1024px) 250px, (max-width: 1536px) calc((100vw - 7rem - 2rem) / 3), 480px";

  return (
    <div
      className={`flex ${isInverted ? "flex-col" : "flex-col-reverse"} ${bgStyles[bgColor]} my-9 w-full max-w-[1536px] items-center justify-center gap-10 px-6 md:px-14`}
    >
      <div className="aspect-[24/7] w-full overflow-x-scroll max-md:aspect-[4/3]">
        <div className="flex h-full w-full min-w-[355px] gap-4">
          <div className="group relative h-full min-w-[250px] flex-grow overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
            {/* Mobile (<md) */}
            <div className="relative h-full w-full md:hidden">
              <CustomImage image={mobile0} sizes={sizesMobileCard} />
            </div>
            {/* Desktop (>=md) */}
            <div className="relative hidden h-full w-full md:block">
              <CustomImage image={desktop0} sizes={sizesDesktopCard} />
            </div>
          </div>

          <div className="group relative h-full min-w-[250px] flex-grow overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
            <div className="relative h-full w-full md:hidden">
              <CustomImage image={mobile1} sizes={sizesMobileCard} />
            </div>
            <div className="relative hidden h-full w-full md:block">
              <CustomImage image={desktop1} sizes={sizesDesktopCard} />
            </div>
          </div>

          <div className="group relative h-full min-w-[250px] flex-grow overflow-hidden rounded-3xl bg-black/5 shadow-lg shadow-black/10 ring-1 ring-red-500/15">
            <div className="relative h-full w-full md:hidden">
              <CustomImage image={mobile2} sizes={sizesMobileCard} />
            </div>
            <div className="relative hidden h-full w-full md:block">
              <CustomImage image={desktop2} sizes={sizesDesktopCard} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-6 md:w-3/5">
        <div className="flex flex-col items-center gap-4">
          <LogoBadge />
          <h4
            className={`text-center font-bold ${caseStyles[titleCase]} text-inherit ${typography.headings.feature} max-sm:text-3xl max-sm:leading-tight`}
          >
            {isHighlighted ? HighlightLastWord(title) : title}
          </h4>
        </div>

        <div className="min-h-[1.5rem] text-center">
          {epigraph ? (
            <p
              className={`inline-block border-l-2 border-red-500/40 pl-4 font-semibold uppercase tracking-[0.35em] text-foreground/70 ${typography.meta.featureEyebrow} max-sm:text-sm`}
            >
              {epigraph}
            </p>
          ) : null}
        </div>

        {description ? (
          typeof description === "string" ? (
            <p
              className={`text-center leading-relaxed text-foreground/80 ${typography.content.feature} max-sm:text-lg`}
            >
              {description}
            </p>
          ) : (
            <div
              className={`space-y-4 text-center leading-relaxed text-foreground/80 ${typography.content.feature}`}
            >
              <BlockRendererClient
                content={description}
                prosePreset="feature"
                className="max-sm:prose-lg"
              />
            </div>
          )
        ) : null}

        {link ? (
          <CustomLink href={link.href} withButtonStyles>
            {link.label}
          </CustomLink>
        ) : null}
      </div>
    </div>
  );
}
