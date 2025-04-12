import { getNews } from "@/lib/services";
import Card from "./Card";
import { Locales } from "@/types";
import { Alert } from "@nextui-org/react";

interface Props {
  locale: Locales;
}

const titles = {
  "es-AR": "Todas las noticias",
  en: "All the news",
  pt: "Todas as notícias",
};

export default async function News(props: Props) {
  const { locale } = props;
  const { ok, data } = await getNews({ locale });

  if (!ok)
    return (
      <Alert
        color="danger"
        description="Internal Server Error while trying to get the latest featured new"
      />
    );
  if (data.data.length === 0)
    return <Alert color="warning" description="No news were found" />;

  const { data: news } = data;
  news.forEach((item) => console.log(item.cover.image.formats));

  return (
    <div className="flex w-full flex-col gap-6 px-10 sm:px-20 lg:px-40">
      <h2 className="text-4xl font-bold">{titles[locale]}</h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {news.map((item) => (
          <Card
            key={item.id}
            title={item.title}
            documentId={item.documentId}
            imgAlt={item.cover.alt}
            imgSrc={item.cover.image.formats.small.url}
            brief={item.brief}
          />
        ))}
      </div>
    </div>
  );
}
