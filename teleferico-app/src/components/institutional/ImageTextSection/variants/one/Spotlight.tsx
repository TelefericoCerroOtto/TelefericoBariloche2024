import { blocksToExcerpt } from "@/lib/adapters";
import { typography } from "@/lib/constants/typography.const";
import CustomImage from "../../shared/CustomImage";
import type { OneImageProps } from "../../shared/types";

export function Spotlight(props: OneImageProps) {
  const { desktopImages, mobileImages, title, description, epigraph } = props;

  const mobile0 = mobileImages?.[0] ?? desktopImages?.[0] ?? null;
  const desktop0 = desktopImages?.[0] ?? mobileImages?.[0] ?? null;

  const sizesMobile = "calc(100vw - 3rem)";
  // max-w-[84rem] (1344) + md:px-12 (6rem) => contenido cap ~1248, mitad ~624
  const sizesDesktop = "(max-width: 1344px) calc((100vw - 6rem) / 2), 624px";

  return (
    <div className="relative mx-auto my-10 w-full max-w-[84rem] px-6 md:my-24 md:px-12">
      <article className="relative isolate z-10 flex w-full flex-col overflow-hidden rounded-[2rem] border border-red-600 bg-white shadow-xl shadow-black/10 ring-1 ring-black/5 md:flex-row md:items-stretch">
        {/* ribbon */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-2 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-500"
        />
        {/* notch accent */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/15 blur-xl"
        />
        {/* micro texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(#ef4444_1px,transparent_1px)] [background-size:18px_18px]"
        />

        {/* left rail */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-red-600 via-rose-500 to-red-700"
        />

        {/* top microline */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-px w-full bg-red-500/30"
        />

        {/* Imagen */}
        <div className="relative w-full md:flex md:w-1/2 md:flex-col">
          <div className="relative h-[180px] flex-1 overflow-hidden md:min-h-[360px] lg:min-h-[400px]">
            {/* Mobile (<md) */}
            <div className="relative h-full w-full md:hidden">
              <CustomImage image={mobile0} sizes={sizesMobile} quality={78} />
            </div>

            {/* Desktop (>=md) */}
            <div className="relative hidden h-full w-full md:block">
              <CustomImage image={desktop0} sizes={sizesDesktop} quality={78} />
            </div>

            <div className="absolute inset-0 bg-black/10" />
          </div>
        </div>

        {/* Contenido */}
        <div className="relative flex w-full flex-col justify-center p-5 md:w-1/2 md:p-9 lg:p-10">
          <div className="max-w-xl">
            <div className="mb-3 h-1 w-12 bg-gray-900/90 md:hidden" />

            <h2
              className={`mb-3 font-black uppercase leading-[0.95] tracking-tight text-gray-900 ${typography.headings.spotlight}`}
            >
              {title}
            </h2>

            <p
              className={`mb-5 leading-relaxed text-gray-700 ${typography.content.section}`}
            >
              {blocksToExcerpt(description, { maxLength: 500 })}
            </p>

            {epigraph ? (
              <div
                className={`inline-flex items-center gap-2 rounded-full border border-red-200/70 bg-white/85 px-4 py-2 font-bold italic text-red-700 shadow-sm backdrop-blur-md ${typography.meta.featureEyebrow}`}
              >
                {/* ...icon... */}
                {epigraph}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}

export default Spotlight;
