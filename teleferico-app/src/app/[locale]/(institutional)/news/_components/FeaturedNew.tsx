import { CustomLink } from "@/components";
import { getNews } from "@/lib/services";
import LogoRecortado from "@/public/logo-recortado.svg";
import { Locales } from "@/types";
import { blocksToExcerpt } from "@/utils";
import { Alert } from "@heroui/react";
import { BlocksContent } from "@strapi/blocks-react-renderer";
import Image from "next/image";

interface Props {
  locale: Locales;
}

export default async function FeaturedNew(props: Props) {
  const { locale } = props;
  const { ok, data } = await getNews({ locale, highlighted: true });

  if (!ok)
    return (
      <section
        aria-live="polite"
        role="status"
        className="w-full px-6 py-12 sm:px-10 lg:px-20"
      >
        <Alert
          color="danger"
          description="Internal Server Error while trying to get the featured news"
        />
      </section>
    );

  if (data.data.length === 0)
    return (
      <section
        aria-live="polite"
        role="status"
        className="w-full px-6 py-12 sm:px-10 lg:px-20"
      >
        <Alert color="warning" description="No featured new was found" />
      </section>
    );

  const { cover, documentId, title, brief, date } = data.data[0];
  const imageSrc =
    cover.formats?.large?.url ??
    cover.formats?.medium?.url ??
    cover.formats?.small?.url ??
    cover.url;

  const headingId = `featured-news-${documentId}`;
  const excerpt = blocksToExcerpt(brief as BlocksContent, { maxLength: 340 });
  const parsedDate = date ? new Date(date) : null;
  const isValidDate = parsedDate && !Number.isNaN(parsedDate.valueOf());
  const formattedDate = isValidDate
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(parsedDate)
    : null;

  return (
    <section
      aria-labelledby={headingId}
      className="w-full px-6 py-12 sm:px-10 lg:px-20"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="group relative isolate overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-custom-border/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-custom-red/40 to-transparent" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
            <article
              aria-labelledby={headingId}
              className="relative flex h-full flex-col justify-center gap-6 overflow-hidden p-8 sm:p-10 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-left-6 motion-safe:duration-500 motion-reduce:animate-none"
            >
              {/*
                Props remain stable; animations rely on Tailwind's motion-safe utilities (see className above).
                Remove the motion-safe classes to disable the hero entrance while keeping reduced-motion users unaffected.
                The watermark logo stays clipped inside the article to prevent any overflow.
              */}
              <div className="pointer-events-none absolute -right-6 bottom-8 hidden h-28 w-28 opacity-25 lg:block">
                <Image
                  src={LogoRecortado}
                  alt=""
                  fill
                  className="object-contain"
                />
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-custom-red/25 bg-custom-red/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-custom-red">
                {locale === "pt"
                  ? "Em destaque"
                  : locale === "en"
                    ? "Featured"
                    : "Noticia destacada"}
              </span>
              <h1
                id={headingId}
                className="text-balance text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                {title}
              </h1>
              {formattedDate ? (
                <time
                  dateTime={date || undefined}
                  className="text-sm font-medium text-muted-foreground"
                >
                  {formattedDate}
                </time>
              ) : null}
              {excerpt ? (
                <p
                  className="max-w-2xl text-base leading-relaxed text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5]"
                >
                  {excerpt}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <CustomLink
                  href={`/news/${documentId}`}
                  withButtonStyles
                  intent="solid"
                  className="min-h-[44px] px-6 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-red"
                >
                  {locale === "pt"
                    ? "Ler notícia"
                    : locale === "en"
                      ? "Read article"
                      : "Ver noticia"}
                </CustomLink>
                <CustomLink
                  href="/news"
                  withButtonStyles
                  intent="ghost"
                  className="min-h-[44px] px-6 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-red"
                >
                  {locale === "pt"
                    ? "Ver todas"
                    : locale === "en"
                      ? "Browse all"
                      : "Ver todas"}
                </CustomLink>
              </div>
            </article>

            <figure className="relative order-first h-full overflow-hidden bg-muted motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-right-6 motion-safe:duration-500 motion-reduce:animate-none lg:order-none">
              <div className="relative aspect-[4/3] w-full sm:aspect-[3/2] lg:aspect-[5/4] lg:h-full">
                <Image
                  src={imageSrc}
                  alt={cover.alternativeText || "Featured news cover image"}
                  fill
                  priority
                  sizes="(min-width: 1366px) 45vw, (min-width: 820px) 60vw, 100vw"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:scale-100 motion-reduce:duration-0"
                />
              </div>
              <figcaption className="sr-only">{title}</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
