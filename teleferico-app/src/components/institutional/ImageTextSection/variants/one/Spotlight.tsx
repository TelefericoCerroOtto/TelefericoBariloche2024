import { blocksToExcerpt } from "@/lib/adapters";
import type { ImageTextBlock } from "@/types";
import Image from "next/image";

export function Spotlight(props: ImageTextBlock) {
  const { images, title, description, epigraph } = props;

  return (
    // WRAPPER:
    // - Bloqueamos overflow SOLO en X (sin generar scroll interno en Y)
    // - En Y queda visible (si crece, que empuje la página, no que scrollee adentro)
    <div className="relative mx-auto my-10 w-full max-w-6xl overflow-x-hidden overflow-y-visible md:my-14 md:overflow-visible">
      {/* FIGURA */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* capa principal */}
        <div
          className={[
            // Mobile: centrada, más grande
            "absolute left-1/2 top-1/2 h-[122%] w-[120%] -translate-x-1/2 -translate-y-1/2",
            "bg-red-600 opacity-95",
            // Desktop: desplazada y un poco más grande también
            "md:left-[-7rem] md:h-[118%] md:w-[102%] md:translate-x-0",
            "lg:left-[-9rem] lg:w-[132%]",
          ].join(" ")}
          style={{
            clipPath:
              "polygon(0 18%, 10% 6%, 38% 0, 70% 8%, 88% 0, 100% 20%, 92% 44%, 100% 64%, 86% 92%, 58% 100%, 22% 94%, 0 78%, 6% 46%)",
          }}
        />

        {/* capa de profundidad */}
        <div
          className={[
            "absolute left-1/2 top-1/2 h-[120%] w-[118%] -translate-x-1/2 -translate-y-1/2",
            "bg-red-700/35",
            "md:left-[-5rem] md:h-[116%] md:w-[98%] md:translate-x-0",
            "lg:left-[-7rem] lg:w-[126%]",
          ].join(" ")}
          style={{
            clipPath:
              "polygon(0 20%, 12% 8%, 40% 2%, 70% 10%, 86% 2%, 98% 22%, 90% 44%, 98% 64%, 84% 90%, 58% 98%, 24% 92%, 2% 76%, 8% 46%)",
          }}
        />

        {/* acento sutil */}
        <div
          className={[
            "absolute left-1/2 top-1/2 h-[112%] w-[112%] -translate-x-1/2 -translate-y-1/2",
            "bg-white/10",
            "md:left-12 md:h-[110%] md:w-[90%] md:translate-x-0",
          ].join(" ")}
          style={{
            clipPath:
              "polygon(0 24%, 14% 10%, 42% 6%, 70% 14%, 84% 6%, 96% 26%, 88% 46%, 96% 64%, 82% 86%, 56% 94%, 26% 90%, 4% 74%, 10% 48%)",
          }}
        />
      </div>

      {/* CARD: más bajo en Y */}
      <article className="relative z-10 flex w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-black/10 ring-1 ring-black/5 md:flex-row md:items-stretch">
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

            <p className="mb-5 text-base leading-relaxed text-gray-700 md:text-lg">
              {blocksToExcerpt(description)}
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
