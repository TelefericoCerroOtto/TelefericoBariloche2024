import { blocksToExcerpt } from "@/lib/adapters";
import { fontSize } from "@/lib/constants/styles.const";
import type { ImageTextBlock } from "@/types";
import Image from "next/image";

export function Spotlight(props: ImageTextBlock) {
  const { images, title, description, epigraph } = props;

  return (
    <div className="relative mx-auto my-10 w-full max-w-6xl px-6 md:my-24 md:px-12">
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
            <Image
              src={images[0].image.url}
              alt={images[0].alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority={false}
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>
        </div>

        {/* Contenido */}
        <div className="relative flex w-full flex-col justify-center p-5 md:w-1/2 md:p-9 lg:p-10">
          <div className="max-w-xl">
            <div className="mb-3 h-1 w-12 bg-gray-900/90 md:hidden" />

            <h2 className="mb-3 text-3xl font-black uppercase leading-[0.95] tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
              {title}
            </h2>

            <p
              className={`mb-5 leading-relaxed text-gray-700 ${fontSize.base}`}
            >
              {blocksToExcerpt(description, { maxLength: 500 })}
            </p>

            {epigraph ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200/70 bg-white/85 px-4 py-2 text-sm font-bold italic text-red-700 shadow-sm backdrop-blur-md md:text-base">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 flex-shrink-0"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
                    clipRule="evenodd"
                  />
                </svg>
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
