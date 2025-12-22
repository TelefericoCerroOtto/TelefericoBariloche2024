import { blocksToExcerpt } from "@/lib/adapters";
import { Locales } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import Image from "next/image";
import Link from "next/link";

interface Props {
  documentId: string;
  imgSrc: string;
  imgAlt: string;
  title: string;
  brief: BlocksContent;
  locale: Locales;
  date?: string | null;
  highlighted?: boolean;
}

export default function Card(props: Props) {
  const {
    title,
    brief,
    documentId,
    imgAlt,
    imgSrc,
    locale,
    date,
    highlighted,
  } = props;

  const headingId = `news-card-${documentId}`;
  const excerpt = blocksToExcerpt(brief, { maxLength: 200 });
  const descriptionId = excerpt ? `${headingId}-description` : undefined;

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
    <Link
      href={`/${locale}/news/${documentId}`}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      className="group relative block h-full focus-visible:outline-none"
    >
      <article
        aria-labelledby={headingId}
        className="border-custom-border/60 motion-safe:group-hover:ring-custom-red/40 flex h-full flex-col overflow-hidden rounded-3xl border bg-card text-card-foreground shadow ring-1 ring-transparent transition-all duration-300 ease-out group-focus-visible:ring-2 group-focus-visible:ring-custom-red group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:shadow-lg motion-reduce:transform-none motion-reduce:shadow-none motion-reduce:transition-none"
      >
        <figure className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <Image
            src={imgSrc}
            alt={imgAlt}
            fill
            sizes="(min-width: 1366px) 280px, (min-width: 820px) 45vw, 100vw"
            className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03] motion-reduce:transform-none"
          />
          {highlighted ? (
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-custom-red px-3 py-1 text-sm font-semibold uppercase tracking-wide text-white shadow-sm">
              {locale === "pt"
                ? "Em destaque"
                : locale === "en"
                  ? "Featured"
                  : "Destacada"}
            </span>
          ) : null}
          <figcaption className="sr-only">{title}</figcaption>
        </figure>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <header className="flex flex-col gap-2">
            <h3
              id={headingId}
              className="text-xl font-semibold leading-snug text-foreground"
            >
              {title}
            </h3>
            {formattedDate ? (
              <time
                dateTime={date || undefined}
                className="text-sm font-medium text-muted-foreground"
              >
                {formattedDate}
              </time>
            ) : null}
          </header>

          {excerpt ? (
            <p
              id={descriptionId}
              className="text-sm leading-relaxed text-muted-foreground [-webkit-box-orient:vertical] [-webkit-line-clamp:4] [display:-webkit-box]"
            >
              {excerpt}
            </p>
          ) : null}

          <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-custom-red">
            {locale === "pt"
              ? "Ler notícia"
              : locale === "en"
                ? "Read article"
                : "Leer noticia"}
            <span
              aria-hidden
              className="transition-transform duration-300 motion-safe:group-hover:translate-x-1"
            >
              →
            </span>
          </span>
        </div>
      </article>
    </Link>
  );
}
