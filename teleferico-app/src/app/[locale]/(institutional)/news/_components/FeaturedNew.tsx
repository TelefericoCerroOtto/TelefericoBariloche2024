import { CustomLink, TitleDescBlock } from "@/components";
import { selectCmsImageUrl } from "@/lib/adapters";
import { getNews } from "@/lib/services";
import { Locales } from "@/types";
import { Alert } from "@heroui/react";
import { BlocksContent } from "@strapi/blocks-react-renderer";
import Image from "next/image";
import NoFeaturedNewsFound from "./NoFeaturedNewsFound";

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
    return <NoFeaturedNewsFound locale={locale} />;

  const { cover, documentId, title, brief, date } = data.data[0];
  const imageSrc =
    selectCmsImageUrl(cover, ["large", "medium", "small", "thumbnail"]) ??
    cover.url;

  const headingId = `featured-news-${documentId}`;
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
        <div className="group relative isolate overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-red-500/60">
          <div className="via-custom-red/40 pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent to-transparent" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
            <article
              aria-labelledby={headingId}
              className="relative flex h-full flex-col justify-center gap-6 overflow-hidden p-8 motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-left-6 motion-reduce:animate-none sm:p-10"
            >
              <span className="border-custom-red/25 bg-custom-red/10 inline-flex w-fit items-center rounded-full border px-4 py-1 text-sm font-semibold uppercase tracking-wider text-custom-red">
                {locale === "pt"
                  ? "Em destaque"
                  : locale === "en"
                    ? "Featured"
                    : "Noticia destacada"}
              </span>
              <TitleDescBlock
                title={title}
                desc={brief as BlocksContent}
                epigraph={formattedDate}
                align="start"
              />
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
              </div>
            </article>

            <figure className="relative order-first h-full overflow-hidden bg-muted motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-right-6 motion-reduce:animate-none lg:order-none">
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
