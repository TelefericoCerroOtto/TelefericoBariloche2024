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
      className="relative w-full overflow-hidden bg-gradient-to-br from-white via-white to-custom-gray/20"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-custom-red/30 to-transparent" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 lg:flex-row lg:items-center lg:gap-16 lg:px-20">
        <figure className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-custom-border/60 bg-muted shadow-lg ring-1 ring-custom-border/40 lg:order-2 lg:w-1/2">
          <Image
            src={imageSrc}
            alt={cover.alternativeText || "Featured news cover image"}
            fill
            priority
            sizes="(min-width: 1366px) 40vw, (min-width: 820px) 60vw, 100vw"
            className="h-full w-full object-cover transition-transform duration-700 ease-out motion-reduce:transform-none"
          />
          <figcaption className="sr-only">{title}</figcaption>
        </figure>

        <article
          aria-labelledby={headingId}
          className="relative flex w-full flex-1 flex-col gap-6 rounded-3xl bg-white/90 p-8 shadow-lg ring-1 ring-custom-border/60 backdrop-blur motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-reduce:animate-none"
        >
          <div className="pointer-events-none absolute -top-10 right-8 hidden h-24 w-24 opacity-25 lg:block lg:opacity-30">
            <div className="relative h-full w-full">
              <Image src={LogoRecortado} alt="" fill className="object-contain" />
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-custom-red/20 bg-custom-red/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-custom-red">
            {locale === "pt" ? "Em destaque" : locale === "en" ? "Featured" : "Noticia destacada"}
          </span>
          <h1
            id={headingId}
            className="text-3xl font-bold leading-tight text-foreground sm:text-4xl"
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
            <p className="text-base leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CustomLink href={`/news/${documentId}`} withButtonStyles intent="solid">
              {locale === "pt" ? "Ler notícia" : locale === "en" ? "Read article" : "Ver noticia"}
            </CustomLink>
            <CustomLink
              href="/news"
              withButtonStyles
              intent="ghost"
              className="text-sm"
            >
              {locale === "pt" ? "Ver todas" : locale === "en" ? "Browse all" : "Ver todas"}
            </CustomLink>
          </div>
        </article>
      </div>
    </section>
  );
}
