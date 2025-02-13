import { CustomLink, TitleDescBlock } from "@/components";
import type { New } from "@/types";
import Image from "next/image";

interface Props {
  news: New;
}

export default function FeaturedNew(props: Props) {
  const { news } = props;
  const { title, images, summary, id } = news;
  return (
    <>
      <div className="flex w-full px-10 sm:px-20 lg:px-40">
        <TitleDescBlock title={title} desc={summary} size="lg" align="start">
          <CustomLink href={`/news/${id}`}>Ver noticia</CustomLink>
        </TitleDescBlock>
      </div>
      <div className="relative mb-14 h-[550px] w-full">
        <Image
          src={images.cover.src}
          alt={images.cover.alt}
          fill
          className="object-cover"
        />
      </div>
    </>
  );
}
