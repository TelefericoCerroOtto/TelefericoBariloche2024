import Card from "./Card";
import NoNewsFound from "./NoNewsFound";
import { getNews } from "@/lib/services";
import { Locales } from "@/types";
import { Alert } from "@heroui/react";
import { BlocksContent } from "@strapi/blocks-react-renderer";

interface Props {
  locale: Locales;
}

const titles: Record<Locales, string> = {
  "es-AR": "Todas las noticias",
  en: "All the news",
  pt: "Todas as notícias",
};

const subtitles: Record<Locales, string> = {
  "es-AR": "Descubrí las novedades institucionales y las actividades más recientes.",
  en: "Catch up with institutional highlights and the most recent activities.",
  pt: "Acompanhe os destaques institucionais e as atividades mais recentes.",
};

export default async function News(props: Props) {
  const { locale } = props;
  const { ok, data } = await getNews({ locale });

  if (!ok)
    return (
      <section
        aria-live="polite"
        role="status"
        className="w-full px-6 py-12 sm:px-10 lg:px-20"
      >
        <Alert
          color="danger"
          description="Internal Server Error while trying to get the latest news"
        />
      </section>
    );

  if (data.data.length === 0) return <NoNewsFound locale={locale} />;

  const { data: news } = data;
  const sectionId = `news-collection-${locale}`;

  return (
    <section
      aria-labelledby={sectionId}
      className="w-full px-6 py-12 sm:px-10 lg:px-20"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div>
            <h2
              id={sectionId}
              className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              {titles[locale]}
            </h2>
            <div className="mt-3 h-1 w-16 rounded-full bg-custom-red" />
          </div>
          <p className="max-w-2xl text-base text-muted-foreground">
            {subtitles[locale]}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-10" role="list">
          {news.map((item) => {
            const imageFormats = item.cover.formats;
            const imageSrc =
              imageFormats?.medium?.url ??
              imageFormats?.small?.url ??
              imageFormats?.thumbnail?.url ??
              item.cover.url;

            return (
              <div key={item.id} role="listitem" className="h-full">
                <Card
                  locale={locale}
                  title={item.title}
                  documentId={item.documentId}
                  imgAlt={item.cover.alternativeText || "News cover image"}
                  imgSrc={imageSrc}
                  brief={item.brief as BlocksContent}
                  date={item.date}
                  highlighted={item.highlighted}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
