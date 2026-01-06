"use client";

import { Button } from "@heroui/react";
import {
  BlocksRenderer,
  type BlocksContent,
} from "@strapi/blocks-react-renderer";
import Image from "next/image";
import { useCallback, useMemo } from "react";
import type { Swiper as SwiperInstance } from "swiper";
import { A11y, Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import CustomLink from "@/components/shared/CustomLink";

export type CarrouselSlideLink = {
  href: string;
  label: string;
};

export type CarrouselSlide = {
  id: number;
  title?: string | null;
  epigraph?: string | null;
  description?: BlocksContent | string | null;
  link?: CarrouselSlideLink | null;
  image: {
    url: string;
    altText?: string | null;
  };
};

export interface CarrouselProps {
  items: CarrouselSlide[];
  autoplayMs?: number | null; // 0/undefined/null => manual
  pauseOnHover?: boolean; // controla pauseOnMouseEnter cuando hay autoplay
  className?: string;
}

const MAX_ITEMS = 15;

function clampItems(items: CarrouselSlide[]) {
  if (items.length <= MAX_ITEMS) return items;

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      `[Carrousel] Se recibieron ${items.length} items. Se renderizan solo los primeros ${MAX_ITEMS}.`,
    );
  }

  return items.slice(0, MAX_ITEMS);
}

function Description({ value }: { value: BlocksContent | string }) {
  if (typeof value === "string")
    return <p className="text-pretty text-center">{value}</p>;
  if (!Array.isArray(value)) return null;

  return (
    <BlocksRenderer
      content={value}
      blocks={{
        paragraph: ({ children }) => (
          <p className="mt-3 text-pretty text-center leading-relaxed">
            {children}
          </p>
        ),
        link: ({ children, url }) => (
          <CustomLink
            href={url}
            className="underline decoration-white/50 underline-offset-4 hover:decoration-white"
            showExternalIcon={false}
          >
            {children}
          </CustomLink>
        ),
      }}
    />
  );
}

export default function Carrousel({
  items,
  autoplayMs,
  pauseOnHover = true,
  className,
}: CarrouselProps) {
  const safeItems = useMemo(() => clampItems(items), [items]);

  const hasMultiple = safeItems.length > 1;
  const enableAutoplay = Boolean(autoplayMs && autoplayMs > 0 && hasMultiple);

  const swiperClassName = [
    "teleferico-swiper",
    hasMultiple ? "teleferico-swiper--nav" : null, // NEW: habilita el sombreado solo si hay navegación
    enableAutoplay ? "teleferico-swiper--autoplay" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const resetProgress = useCallback((swiper: SwiperInstance) => {
    swiper.el.style.setProperty("--teleferico-autoplay-progress", "0");
  }, []);

  const handleAutoplayTimeLeft = useCallback(
    (swiper: SwiperInstance, _timeLeftMs: number, progressLeft: number) => {
      // Swiper suele informar “fracción restante” (0..1). Convertimos a “transcurrido”.
      const elapsed = 1 - progressLeft;
      swiper.el.style.setProperty(
        "--teleferico-autoplay-progress",
        String(elapsed),
      );
    },
    [],
  );

  // Early return DESPUÉS de declarar hooks, para no violar el orden.
  if (!safeItems.length) return null;

  return (
    <section className="my-14 w-full px-6 sm:px-8 lg:px-14">
      <Swiper
        modules={[A11y, Navigation, Pagination, Autoplay]}
        className={swiperClassName}
        grabCursor
        watchOverflow
        loop={hasMultiple}
        navigation={hasMultiple}
        pagination={hasMultiple ? { clickable: true } : false}
        autoplay={
          enableAutoplay
            ? {
                delay: autoplayMs!,
                disableOnInteraction: false,
                pauseOnMouseEnter: Boolean(pauseOnHover),
              }
            : false
        }
        slidesPerView={1}
        spaceBetween={0}
        a11y={{
          enabled: true,
          prevSlideMessage: "Slide anterior",
          nextSlideMessage: "Siguiente slide",
        }}
        onInit={resetProgress}
        onSlideChange={resetProgress}
        onAutoplayTimeLeft={enableAutoplay ? handleAutoplayTimeLeft : undefined}
      >
        {safeItems.map((item, idx) => {
          const hasOverlay =
            Boolean(item.epigraph) ||
            Boolean(item.title) ||
            Boolean(item.description) ||
            Boolean(item.link);

          const alt =
            item.image.altText ??
            item.title ??
            item.epigraph ??
            "Imagen del carrusel";

          return (
            <SwiperSlide
              key={item.id ?? `${item.image.url}-${idx}`}
              className="h-auto"
            >
              <article className="relative overflow-hidden">
                <div className="relative min-h-[360px] w-full sm:min-h-[440px] lg:min-h-[560px]">
                  <Image
                    src={item.image.url}
                    alt={alt}
                    fill
                    priority={idx === 0}
                    sizes="100vw"
                    className={[
                      "object-cover transition-[filter] duration-300",
                      hasOverlay ? "brightness-[0.6]" : "",
                    ].join(" ")}
                  />

                  {hasOverlay ? (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-black/25" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full p-4 sm:px-16 sm:py-6 lg:px-20 lg:py-10">
                          <div className="mx-auto max-w-[62ch] text-center text-white">
                            {item.epigraph ? (
                              <p className="text-sm font-semibold tracking-wide text-white/90 sm:text-base lg:text-lg">
                                {item.epigraph}
                              </p>
                            ) : null}

                            {item.title ? (
                              <h3 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl lg:text-6xl">
                                {item.title}
                              </h3>
                            ) : null}

                            {item.description ? (
                              <div className="mt-4 text-base leading-relaxed text-white/90 sm:text-lg lg:text-2xl">
                                <Description
                                  value={
                                    item.description as BlocksContent | string
                                  }
                                />
                              </div>
                            ) : null}

                            {item.link ? (
                              <div className="mt-6 flex justify-center">
                                <Button
                                  as={CustomLink}
                                  href={item.link.href}
                                  radius="full"
                                  color="primary"
                                  variant="solid"
                                  size="md"
                                  className="w-full px-6 font-semibold sm:w-auto sm:px-8 sm:text-base lg:text-lg"
                                >
                                  {item.link.label}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
