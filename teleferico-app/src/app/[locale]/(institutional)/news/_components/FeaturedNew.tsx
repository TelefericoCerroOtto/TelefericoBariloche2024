import { CustomLink, TitleDescBlock } from "@/components";
import { getNews } from "@/lib/services";
import { Locales } from "@/types";
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
      <Alert
        color="danger"
        description="Internal Server Error while trying to get the latest featured new"
      />
    );
  if (data.data.length === 0)
    return <Alert color="warning" description="No featured new was found" />;

  const { cover, documentId, title, brief } = data.data[0];

  return (
    <>
      <div className="mb-14 flex w-full px-10 sm:px-20 lg:px-40">
        <TitleDescBlock
          title={title}
          desc={brief as BlocksContent}
          size="lg"
          align="start"
        >
          <CustomLink href={`/news/${documentId}`} withButtonStyles>
            Ver noticia
          </CustomLink>
        </TitleDescBlock>
      </div>
      <div className="relative mb-14 h-[550px] w-full">
        <Image
          src={cover.url}
          alt={cover.alternativeText || "Featured new cover image"}
          fill
          className="object-cover"
        />
      </div>
    </>
  );
}
